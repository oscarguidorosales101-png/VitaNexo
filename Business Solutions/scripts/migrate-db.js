const fs = require('fs');
const path = require('path');
const { getPool, closePool, checkDatabaseHealth } = require('../src/config/database');
const { splitSqlStatementsQuoteAware } = require('../src/utils/sqlParser');

const DESTRUCTIVE_SQL_REGEX = /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i;

function extractCreateTableDefinitions(statements) {
  const defs = new Map();
  for (const stmt of statements) {
    const match = stmt.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?\s*\(([\s\S]+)\)\s*ENGINE/i);
    if (match) {
      const tableName = match[1];
      const body = match[2];
      const cols = [];
      for (const rawLine of body.split(/\r?\n/)) {
        const line = rawLine.trim();
        const colMatch = line.match(/^`([a-zA-Z0-9_]+)`\s+/);
        if (colMatch) {
          cols.push(colMatch[1]);
        }
      }
      defs.set(tableName, cols);
    }
  }
  return defs;
}

async function ensureDatabaseExistsIfAuthorized() {
  const mysql = require('mysql2/promise');
  const { env } = require('../src/config/env');
  if (!env.mysql.host || !env.mysql.user) return;
  let conn;
  try {
    conn = await mysql.createConnection({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      connectTimeout: env.mysql.connectTimeout || 5000,
    });
    await conn.query('CREATE DATABASE IF NOT EXISTS `VitaBase` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  } catch (_) {
    // Si el usuario no tiene permiso CREATE a nivel de esquema, checkDatabaseHealth informará el estado real.
  } finally {
    if (conn) await conn.end();
  }
}

async function migrateDatabase() {
  const sqlFiles = [
    '../sql/01_schema.sql',
    '../sql/04_automatizaciones_n8n.sql',
    '../sql/05_centro_ia_asincrono_y_proveedores.sql',
  ];
  const statements = [];

  for (const relFile of sqlFiles) {
    const fullPath = path.resolve(__dirname, relFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const parsed = splitSqlStatementsQuoteAware(content);
      if (parsed.some((stmt) => DESTRUCTIVE_SQL_REGEX.test(stmt))) {
        throw new Error(`Abortado por seguridad: ${path.basename(fullPath)} contiene instrucciones destructivas prohibidas.`);
      }
      statements.push(...parsed);
    }
  }

  await ensureDatabaseExistsIfAuthorized();

  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.error(`[MIGRACIÓN PENDIENTE DE CONEXIÓN] ${health.message}`);
    process.exitCode = 1;
    return;
  }

  const expectedDefs = extractCreateTableDefinitions(statements);
  const pool = getPool();

  // Inspeccionar tablas existentes antes de crear/modificar para detectar conflictos
  const [existingTables] = await pool.query(
    `SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );
  const existingSet = new Set(existingTables.map((r) => r.table_name));

  for (const [tableName, requiredCols] of expectedDefs.entries()) {
    if (existingSet.has(tableName)) {
      const [existingColsRows] = await pool.query(
        `SELECT COLUMN_NAME AS col_name
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );
      const existingColSet = new Set(existingColsRows.map((c) => c.col_name));
      const missingCols = requiredCols.filter((c) => !existingColSet.has(c));
      if (missingCols.length > 0) {
        throw new Error(
          `Conflicto detectado en tabla preexistente '${tableName}': faltan columnas requeridas (${missingCols.join(
            ', '
          )}). Se detiene la migración sin modificar datos para solicitar autorización.`
        );
      }
    }
  }

  let executed = 0;
  for (const stmt of statements) {
    await pool.query(stmt);
    executed += 1;
  }

  console.log(
    `[MIGRACIÓN COMPLETADA] ${executed} sentencias CREATE TABLE IF NOT EXISTS verificadas en VitaBase sin pérdida de datos.`
  );
}

migrateDatabase()
  .catch((err) => {
    console.error('[ERROR EN MIGRACIÓN]:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
