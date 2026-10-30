const express = require('express');
const { body, param } = require('express-validator');
const {
  validateRequest,
  allowOnlyFields,
  asyncHandler,
} = require('../middlewares/validateRequest');

const idParamRule = param('id').isInt({ min: 1 }).withMessage('El parámetro id debe ser un entero positivo.');

function createMetricsOrchestratorRoutes(controller) {
  const router = express.Router();

  // Mediciones base de campañas
  router.get('/metricas/mediciones', asyncHandler(controller.listMeasurements));
  router.get('/metricas/mediciones/:id', [idParamRule, validateRequest], asyncHandler(controller.getMeasurement));
  router.post(
    '/metricas/mediciones',
    [
      allowOnlyFields([
        'campana_id',
        'canal_id',
        'periodo_inicio',
        'periodo_fin',
        'impresiones',
        'clics',
        'alcance',
        'visualizaciones',
        'interacciones',
        'seguidores_ganados',
        'gasto_publicitario_crc',
        'costo_mercadeo_operativo_crc',
        'costo_ventas_atribuible_crc',
        'leads_generados',
        'conversiones_clientes',
        'ingresos_atribuibles_crc',
        'notas',
      ]),
      body('campana_id').isInt({ min: 1 }).withMessage('campana_id es obligatorio.'),
      body('canal_id').isInt({ min: 1 }).withMessage('canal_id es obligatorio.'),
      body('periodo_inicio').isISO8601().withMessage('periodo_inicio inválido.'),
      body('periodo_fin').isISO8601().withMessage('periodo_fin inválido.'),
      body('impresiones').optional().isInt({ min: 0 }),
      body('clics').optional().isInt({ min: 0 }),
      body('alcance').optional().isInt({ min: 0 }),
      body('visualizaciones').optional().isInt({ min: 0 }),
      body('interacciones').optional().isInt({ min: 0 }),
      body('seguidores_ganados').optional().isInt({ min: 0 }),
      body('gasto_publicitario_crc').optional().isFloat({ min: 0 }),
      body('costo_mercadeo_operativo_crc').optional().isFloat({ min: 0 }),
      body('costo_ventas_atribuible_crc').optional().isFloat({ min: 0 }),
      body('leads_generados').optional().isInt({ min: 0 }),
      body('conversiones_clientes').optional().isInt({ min: 0 }),
      body('ingresos_atribuibles_crc').optional().isFloat({ min: 0 }),
      validateRequest,
    ],
    asyncHandler(controller.createMeasurement)
  );
  router.patch(
    '/metricas/mediciones/:id',
    [
      idParamRule,
      allowOnlyFields([
        'impresiones',
        'clics',
        'alcance',
        'visualizaciones',
        'interacciones',
        'seguidores_ganados',
        'gasto_publicitario_crc',
        'costo_mercadeo_operativo_crc',
        'costo_ventas_atribuible_crc',
        'leads_generados',
        'conversiones_clientes',
        'ingresos_atribuibles_crc',
        'notas',
      ]),
      validateRequest,
    ],
    asyncHandler(controller.updateMeasurement)
  );

  // Consultas SQL de indicadores
  router.get('/metricas/indicadores/cpc', asyncHandler(controller.getCPC));
  router.get('/metricas/indicadores/ctr', asyncHandler(controller.getCTR));
  router.get('/metricas/indicadores/cac', asyncHandler(controller.getCAC));
  router.get('/metricas/indicadores/roas', asyncHandler(controller.getROAS));
  router.get('/metricas/indicadores/conversiones-embudo', asyncHandler(controller.getFunnelConversions));
  router.get('/metricas/indicadores/ciclo-venta', asyncHandler(controller.getSalesCycle));
  router.get('/metricas/indicadores/ticket-promedio', asyncHandler(controller.getAverageTicket));
  router.get('/metricas/indicadores/vanidad-vs-negocio', asyncHandler(controller.getVanityVsBusiness));

  // Agentes y Orquestador central
  router.get('/agentes', asyncHandler(controller.listAgents));
  router.get('/agentes/capacidades', asyncHandler(controller.listCapabilities));
  router.get('/agentes/ejecuciones', asyncHandler(controller.listAgentExecutions));
  router.get('/agentes/ejecuciones/:id', [idParamRule, validateRequest], asyncHandler(controller.getAgentExecution));

  router.post(
    '/orquestador/ejecutar',
    [
      allowOnlyFields(['tipo_tarea', 'codigo_agente', 'parametros', 'idempotency_key']),
      body('tipo_tarea').trim().notEmpty().withMessage('tipo_tarea es obligatorio.'),
      body('codigo_agente').optional({ nullable: true }).isString(),
      body('parametros').optional().isObject().withMessage('parametros debe ser un objeto JSON.'),
      validateRequest,
    ],
    asyncHandler(controller.executeOrchestratorTask)
  );

  return router;
}

module.exports = {
  createMetricsOrchestratorRoutes,
};

