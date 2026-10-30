const mysql = require('mysql2/promise');
const { env } = require('./env');
const { AppError, mapDatabaseError } = require('../utils/AppError');

let activePool = null;

function assertValidDatabaseConfig(mysqlConfig) {
  if (!mysqlConfig.database || mysqlConfig.database.toLowerCase() !== 'vitabase') {
    throw new AppError(
      'Configuración inválida: MYSQL_DATABASE debe apuntar exclusivamente a VitaBase.',
      500,
      'INVALID_DATABASE_NAME'
    );
  }

  if (!mysqlConfig.host || !mysqlConfig.user) {
    throw new AppError(
      'La conexión a la base de datos MySQL (VitaBase) aún no está configurada en las variables de entorno del servidor.',
      503,
      'DATABASE_NOT_CONFIGURED'
    );
  }
}

function getPool(mysqlConfig = env.mysql) {
  assertValidDatabaseConfig(mysqlConfig);

  if (!activePool) {
    activePool = mysql.createPool({
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: mysqlConfig.connectionLimit || 10,
      queueLimit: 0,
      connectTimeout: mysqlConfig.connectTimeout || 5000,
      decimalNumbers: true,
      dateStrings: true,
    });
  }

  return activePool;
}

async function query(sql, params = []) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    throw mapDatabaseError(err);
  }
}

async function withTransaction(work) {
  let connection;
  try {
    const pool = getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const txExecutor = {
      async query(sql, params = []) {
        try {
          const [rows] = await connection.execute(sql, params);
          return rows;
        } catch (err) {
          throw mapDatabaseError(err);
        }
      },
    };

    const result = await work(txExecutor);
    await connection.commit();
    return result;
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        // Ignorar error secundario de rollback para preservar la causa raíz
      }
    }
    throw mapDatabaseError(err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function checkDatabaseHealth() {
  const targetDb = env.mysql.database || 'VitaBase';
  try {
    assertValidDatabaseConfig(env.mysql);
    const pool = getPool();
    const start = Date.now();
    const [rows] = await pool.query('SELECT DATABASE() AS current_db, 1 AS alive');
    const latencyMs = Date.now() - start;
    const currentDb = rows && rows[0] ? rows[0].current_db : targetDb;

    return {
      connected: true,
      database: currentDb,
      latency_ms: latencyMs,
      status: 'connected',
      message: 'Conexión activa y verificada contra MySQL VitaBase.',
    };
  } catch (err) {
    const mapped = mapDatabaseError(err);
    return {
      connected: false,
      database: targetDb,
      latency_ms: null,
      status: mapped.errorCode === 'DATABASE_NOT_CONFIGURED' ? 'not_configured' : 'unavailable',
      error_code: mapped.errorCode,
      message: mapped.message,
    };
  }
}

async function closePool() {
  if (activePool) {
    const poolToClose = activePool;
    activePool = null;
    await poolToClose.end();
  }
}

module.exports = {
  getPool,
  query,
  withTransaction,
  checkDatabaseHealth,
  closePool,
  assertValidDatabaseConfig,
};
