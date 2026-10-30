const express = require('express');
const {
  createHealthController,
  createClientsServicesController,
} = require('../controllers/clientsServicesController');
const { createCampaignsContentsController } = require('../controllers/campaignsContentsController');
const {
  createCrmMetricsOrchestratorController,
} = require('../controllers/crmMetricsOrchestratorController');
const { createPlatformController } = require('../controllers/platformController');
const { createAiCenterController } = require('../controllers/aiCenterController');
const { createAuthMiddleware } = require('../middlewares/authMiddleware');

const { createHealthRoutes } = require('./healthRoutes');
const { createPlatformRoutes } = require('./platformRoutes');
const { createClientsServicesRoutes } = require('./clientsServicesRoutes');
const { createCampaignsContentsRoutes } = require('./campaignsContentsRoutes');
const { createCrmSalesRoutes } = require('./crmSalesRoutes');
const { createMetricsOrchestratorRoutes } = require('./metricsOrchestratorRoutes');
const { createAiCenterRoutes } = require('./aiCenterRoutes');

function createApiRouter(container, options = {}) {
  const router = express.Router();

  router.use(
    createAuthMiddleware({
      authService: container.services.authService,
      enforceAuth: options.enforceAuth,
    })
  );

  const healthController = createHealthController({ db: container.db });
  const platformController = createPlatformController({
    authService: container.services.authService,
    dashboardService: container.services.dashboardService,
    automationsService: container.services.automationsService,
  });
  const clientsServicesController = createClientsServicesController({
    clientsServicesService: container.services.clientsServicesService,
  });
  const campaignsContentsController = createCampaignsContentsController({
    campaignsService: container.services.campaignsService,
    contentsService: container.services.contentsService,
  });
  const crmMetricsOrchestratorController = createCrmMetricsOrchestratorController({
    crmSalesService: container.services.crmSalesService,
    metricsService: container.services.metricsService,
    orchestrator: container.orchestrator,
  });
  const aiCenterController = createAiCenterController({
    aiCenterService: container.services.aiCenterService,
    aiProvidersService: container.services.aiProvidersService,
    n8nBridge: container.services.n8nBridge,
  });

  router.use(createHealthRoutes(healthController));
  router.use(createPlatformRoutes(platformController));
  router.use(createClientsServicesRoutes(clientsServicesController));
  router.use(createCampaignsContentsRoutes(campaignsContentsController));
  router.use(createCrmSalesRoutes(crmMetricsOrchestratorController));
  router.use(createMetricsOrchestratorRoutes(crmMetricsOrchestratorController));
  router.use(createAiCenterRoutes(aiCenterController));

  return router;
}

module.exports = {
  createApiRouter,
};
