const defaultDb = require('./config/database');
const { createCatalogsRepository } = require('./repositories/catalogsRepository');
const { createClientsServicesRepository } = require('./repositories/clientsServicesRepository');
const { createCampaignsRepository } = require('./repositories/campaignsRepository');
const { createContentsRepository } = require('./repositories/contentsRepository');
const { createCrmSalesRepository } = require('./repositories/crmSalesRepository');
const { createMetricsRepository } = require('./repositories/metricsRepository');
const { createAgentExecutionsRepository } = require('./repositories/agentExecutionsRepository');
const { createAutomationsRepository } = require('./repositories/automationsRepository');
const { createAiCenterRepository } = require('./repositories/aiCenterRepository');

const { createClientsServicesService } = require('./services/clientsServicesService');
const { createCampaignsService } = require('./services/campaignsService');
const { createContentsService } = require('./services/contentsService');
const { createCrmSalesService } = require('./services/crmSalesService');
const { createMetricsService } = require('./services/metricsService');
const { createAuthService } = require('./services/authService');
const { createN8nGeminiBridgeService } = require('./services/n8nGeminiBridgeService');
const { createAutomationsService } = require('./services/automationsService');
const { createDashboardService } = require('./services/dashboardService');
const { createAiPolicyGuardService } = require('./services/aiPolicyGuardService');
const { createAiProvidersService } = require('./services/aiProvidersService');
const { createAiCenterService } = require('./services/aiCenterService');

const { createCampaignsAgent } = require('./agents/campaignsAgent');
const { createContentAgent } = require('./agents/contentAgent');
const { createMetricsAgent } = require('./agents/metricsAgent');
const { createSalesContactsAgent } = require('./agents/salesContactsAgent');
const { createCentralOrchestrator } = require('./orchestrator/orchestrator');

/**
 * Construye todas las dependencias del backend conectadas por defecto
 * al pool real de MySQL VitaBase y al puente local n8n + Gemini API.
 * Permite inyectar un adaptador db controlado exclusivamente en pruebas
 * automatizadas sin alterar el comportamiento real.
 */
function buildContainer(db = defaultDb, options = {}) {
  const catalogsRepo = createCatalogsRepository(db);
  const clientsServicesRepo = createClientsServicesRepository(db);
  const campaignsRepo = createCampaignsRepository(db);
  const contentsRepo = createContentsRepository(db);
  const crmSalesRepo = createCrmSalesRepository(db);
  const metricsRepo = createMetricsRepository(db);
  const agentExecutionsRepo = createAgentExecutionsRepository(db);
  const automationsRepo = createAutomationsRepository(db);
  const aiCenterRepo = createAiCenterRepository(db);

  const authService = createAuthService({
    catalogsRepo,
  });

  const aiPolicyGuardService = createAiPolicyGuardService({
    limits: options.aiLimits,
  });

  const aiProvidersService = createAiProvidersService({
    db,
    envSource: options.envSource || process.env,
  });

  const n8nBridge =
    options.n8nBridge ||
    createN8nGeminiBridgeService({
      automationsRepo,
    });

  const clientsServicesService = createClientsServicesService({
    catalogsRepo,
    clientsServicesRepo,
  });

  const campaignsService = createCampaignsService({
    catalogsRepo,
    campaignsRepo,
  });

  const contentsService = createContentsService({
    catalogsRepo,
    campaignsRepo,
    contentsRepo,
  });

  const crmSalesService = createCrmSalesService({
    catalogsRepo,
    campaignsRepo,
    contentsRepo,
    crmSalesRepo,
  });

  const metricsService = createMetricsService({
    catalogsRepo,
    campaignsRepo,
    metricsRepo,
  });

  // Los 4 agentes especializados reciben su servicio de dominio y el puente n8n/Gemini
  // (no se comunican directamente entre sí).
  const campaignsAgent = createCampaignsAgent({
    campaignsService,
    clientsServicesService,
    n8nBridge,
  });
  const contentAgent = createContentAgent({
    contentsService,
    campaignsService,
    clientsServicesService,
    n8nBridge,
  });
  const metricsAgent = createMetricsAgent({
    metricsService,
    n8nBridge,
  });
  const salesContactsAgent = createSalesContactsAgent({
    crmSalesService,
    clientsServicesService,
    n8nBridge,
  });

  const orchestrator = createCentralOrchestrator({
    agents: [campaignsAgent, contentAgent, metricsAgent, salesContactsAgent],
    agentExecutionsRepo,
    automationsRepo,
  });

  const automationsService = createAutomationsService({
    automationsRepo,
    n8nBridge,
    orchestrator,
  });

  const dashboardService = createDashboardService({
    db,
    metricsService,
    automationsService,
  });

  const aiCenterService = createAiCenterService({
    aiCenterRepo,
    aiProvidersService,
    aiPolicyGuardService,
    orchestrator,
    agentExecutionsRepo,
    maxConcurrent: options.aiMaxConcurrent || 4,
  });

  return {
    db,
    repositories: {
      catalogsRepo,
      clientsServicesRepo,
      campaignsRepo,
      contentsRepo,
      crmSalesRepo,
      metricsRepo,
      agentExecutionsRepo,
      automationsRepo,
      aiCenterRepo,
    },
    services: {
      authService,
      n8nBridge,
      automationsService,
      dashboardService,
      clientsServicesService,
      campaignsService,
      contentsService,
      crmSalesService,
      metricsService,
      aiPolicyGuardService,
      aiProvidersService,
      aiCenterService,
    },
    agents: {
      campaignsAgent,
      contentAgent,
      metricsAgent,
      salesContactsAgent,
    },
    orchestrator,
  };
}

module.exports = {
  buildContainer,
};
