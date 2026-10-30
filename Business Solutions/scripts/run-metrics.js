const { buildContainer } = require('../src/container');
const { checkDatabaseHealth, closePool } = require('../src/config/database');

async function runMetrics() {
  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.error(`[CONSULTA DE MÉTRICAS PENDIENTE DE CONEXIÓN] ${health.message}`);
    process.exitCode = 1;
    return;
  }

  const container = buildContainer();
  const { metricsService } = container.services;

  const report = {
    cpc: await metricsService.calculateCPC(),
    ctr: await metricsService.calculateCTR(),
    cac: await metricsService.calculateCAC(),
    roas: await metricsService.calculateROAS(),
    conversiones_embudo: await metricsService.calculateFunnelConversions(),
    ciclo_venta: await metricsService.calculateSalesCycle(),
    ticket_promedio: await metricsService.calculateAverageTicket(),
    vanidad_vs_negocio: await metricsService.compareVanityVsBusiness(),
  };

  console.log(JSON.stringify(report, null, 2));
}

runMetrics()
  .catch((err) => {
    console.error('[ERROR AL EJECUTAR MÉTRICAS]:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

