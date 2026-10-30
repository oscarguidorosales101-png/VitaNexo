const express = require('express');
const { asyncHandler } = require('../middlewares/validateRequest');

function createAiCenterRoutes(controller) {
  const router = express.Router();

  // Hilos de conversación
  router.get('/ia/conversaciones', asyncHandler(controller.listConversations));
  router.post('/ia/conversaciones', asyncHandler(controller.createConversation));
  router.get('/ia/conversaciones/:id', asyncHandler(controller.getConversation));

  // Solicitudes asíncronas persistentes
  router.get('/ia/solicitudes', asyncHandler(controller.listRequests));
  router.post('/ia/solicitudes', asyncHandler(controller.submitRequest));
  router.get('/ia/solicitudes/:id', asyncHandler(controller.getRequest));
  router.post('/ia/solicitudes/:id/cancelar', asyncHandler(controller.cancelRequest));
  router.post('/ia/solicitudes/:id/reintentar', asyncHandler(controller.retryRequest));

  // Gestión de proveedores y modelos de IA
  router.get('/ia/proveedores', asyncHandler(controller.listProviders));
  router.patch('/ia/proveedores/:codigo', asyncHandler(controller.updateProvider));
  router.post('/ia/proveedores/:codigo/verificar', asyncHandler(controller.verifyProvider));
  router.post('/ia/agentes/:codigo/asignar-proveedor', asyncHandler(controller.assignProviderToAgent));

  return router;
}

module.exports = {
  createAiCenterRoutes,
};

