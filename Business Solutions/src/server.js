const { createApp } = require('./app');
const { env } = require('./config/env');
const { checkDatabaseHealth, closePool } = require('./config/database');

async function startServer() {
  const app = createApp();
  const dbHealth = await checkDatabaseHealth();

  if (dbHealth.connected) {
    console.log(`[VitaNexo] Conexión verificada a MySQL (${dbHealth.database}) en ${dbHealth.latency_ms} ms.`);
    if (app.locals?.container?.services?.aiCenterService) {
      app.locals.container.services.aiCenterService.recoverOnStartup().catch(() => {});
    }
  } else {
    console.warn(`[VitaNexo] Aviso de base de datos (${dbHealth.status}): ${dbHealth.message}`);
  }

  const bindHost = process.env.HOST || '127.0.0.1';
  const server = app.listen(env.port, bindHost, () => {
    console.log(`[VitaNexo] Backend REST escuchando en http://${bindHost}:${env.port} (${env.nodeEnv}).`);
  });

  let shuttingDown = false;
  const gracefulShutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[VitaNexo] Señal ${signal} recibida. Cerrando servidor HTTP y pool de MySQL...`);

    server.close(async () => {
      try {
        await closePool();
        console.log('[VitaNexo] Pool de conexiones MySQL cerrado correctamente.');
        process.exit(0);
      } catch (err) {
        console.error('[VitaNexo] Error al cerrar el pool de conexiones:', err.message);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};

