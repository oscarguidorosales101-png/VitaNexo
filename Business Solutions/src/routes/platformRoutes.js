const express = require('express');
const { asyncHandler } = require('../middlewares/validateRequest');

function createPlatformRoutes(controller) {
  const router = express.Router();

  // Autenticación corporativa
  router.get('/auth/colaboradores-disponibles', asyncHandler(controller.listLoginCollaborators));
  router.post('/auth/login', asyncHandler(controller.login));
  router.get('/auth/perfil', asyncHandler(controller.getProfile));

  // Dashboard consolidado en tiempo real
  router.get('/dashboard/resumen', asyncHandler(controller.getDashboardSummary));

  // Centro de automatizaciones n8n + Gemini
  router.get('/automatizaciones/estado', asyncHandler(controller.getAutomationsStatus));
  router.get('/automatizaciones/workflows', asyncHandler(controller.listWorkflows));
  router.get('/automatizaciones/ejecuciones', asyncHandler(controller.listAutomationExecutions));
  router.get('/automatizaciones/ejecuciones/:id', asyncHandler(controller.getAutomationExecution));
  router.post(
    '/automatizaciones/ejecuciones/:id/reintentar',
    asyncHandler(controller.retryAutomationExecution)
  );

  return router;
}

module.exports = {
  createPlatformRoutes,
};
