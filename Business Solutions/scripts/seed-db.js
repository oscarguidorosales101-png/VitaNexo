const fs = require('fs');
const path = require('path');
const { getPool, closePool, checkDatabaseHealth } = require('../src/config/database');
const { splitSqlStatementsQuoteAware } = require('../src/utils/sqlParser');

const DESTRUCTIVE_SQL_REGEX = /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i;

async function seedDatabase() {
  const seedPath = path.resolve(__dirname, '../sql/02_seed_data.sql');
  const sqlContent = fs.readFileSync(seedPath, 'utf8');
  const statements = splitSqlStatementsQuoteAware(sqlContent);

  if (statements.some((stmt) => DESTRUCTIVE_SQL_REGEX.test(stmt))) {
    throw new Error('Abortado por seguridad: 02_seed_data.sql contiene instrucciones destructivas prohibidas.');
  }

  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.error(`[CARGA DE DATOS PENDIENTE DE CONEXIÓN] ${health.message}`);
    process.exitCode = 1;
    return;
  }

  const pool = getPool();

  for (const stmt of statements) {
    await pool.query(stmt);
  }

  const [tables] = await pool.query(
    `SELECT TABLE_NAME AS table_name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`
  );

  console.log('=== RESUMEN DE REGISTROS EN VITABASE TRAS CARGA IDEMPOTENTE ===');
  for (const t of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${t.table_name}\``);
    console.log(` - ${t.table_name}: ${rows[0].total} registros`);
  }
}

seedDatabase()
  .catch((err) => {
    console.error('[ERROR EN CARGA DE DATOS FICTICIOS]:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
