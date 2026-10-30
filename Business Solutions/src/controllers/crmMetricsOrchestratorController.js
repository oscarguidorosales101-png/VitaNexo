const { sendSuccess, sendCreated } = require('../utils/response');

function createCrmMetricsOrchestratorController({ crmSalesService, metricsService, orchestrator }) {
  return {
    // -------------------- CONTACTOS Y EMBUDO --------------------
    async listFunnelStages(_req, res) {
      const data = await crmSalesService.listFunnelStages();
      return sendSuccess(res, data);
    },

    async listContacts(req, res) {
      const data = await crmSalesService.listContacts(req.query);
      return sendSuccess(res, data);
    },

    async getContact(req, res) {
      const data = await crmSalesService.getContactDetail(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createContact(req, res) {
      const data = await crmSalesService.createContact(req.body);
      return sendCreated(res, data, 'Lead/contacto registrado exitosamente.');
    },

    async updateContact(req, res) {
      const data = await crmSalesService.updateContact(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Contacto actualizado exitosamente.');
    },

    async changeContactStage(req, res) {
      const data = await crmSalesService.changeContactStage(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Transición de etapa registrada exitosamente.');
    },

    async recordContentConsumption(req, res) {
      const data = await crmSalesService.recordContentConsumption(Number(req.params.id), req.body);
      return sendCreated(res, data, 'Interacción de contenido registrada exitosamente.');
    },

    async listPendingFollowUps(req, res) {
      const data = await crmSalesService.listPendingFollowUps(req.query.hasta_fecha || null);
      return sendSuccess(res, data);
    },

    // -------------------- TRASPASOS A VENTAS --------------------
    async listHandoffs(req, res) {
      const data = await crmSalesService.listHandoffs(req.query);
      return sendSuccess(res, data);
    },

    async getHandoff(req, res) {
      const data = await crmSalesService.getHandoffById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createHandoff(req, res) {
      const data = await crmSalesService.createHandoff(req.body);
      return sendCreated(res, data, 'Traspaso de mercadeo a ventas registrado exitosamente.');
    },

    async respondToHandoff(req, res) {
      const data = await crmSalesService.respondToHandoff(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Respuesta de ventas registrada en el traspaso.');
    },

    // -------------------- OPORTUNIDADES --------------------
    async listOpportunities(req, res) {
      const data = await crmSalesService.listOpportunities(req.query);
      return sendSuccess(res, data);
    },

    async getOpportunity(req, res) {
      const data = await crmSalesService.getOpportunityById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createOpportunity(req, res) {
      const data = await crmSalesService.createOpportunity(req.body);
      return sendCreated(res, data, 'Oportunidad comercial creada exitosamente.');
    },

    async updateOpportunity(req, res) {
      const data = await crmSalesService.updateOpportunity(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Oportunidad comercial actualizada exitosamente.');
    },

    async closeOpportunity(req, res) {
      const data = await crmSalesService.closeOpportunity(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Cierre de oportunidad registrado exitosamente.');
    },

    // -------------------- MÉTRICAS E INDICADORES --------------------
    async listMeasurements(req, res) {
      const data = await metricsService.listMeasurements(req.query);
      return sendSuccess(res, data);
    },

    async getMeasurement(req, res) {
      const data = await metricsService.getMeasurementById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createMeasurement(req, res) {
      const data = await metricsService.createMeasurement(req.body);
      return sendCreated(res, data, 'Medición de campaña registrada exitosamente.');
    },

    async updateMeasurement(req, res) {
      const data = await metricsService.updateMeasurement(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Medición de campaña actualizada exitosamente.');
    },

    async getCPC(req, res) {
      const data = await metricsService.calculateCPC(req.query);
      return sendSuccess(res, data);
    },

    async getCTR(req, res) {
      const data = await metricsService.calculateCTR(req.query);
      return sendSuccess(res, data);
    },

    async getCAC(req, res) {
      const data = await metricsService.calculateCAC(req.query);
      return sendSuccess(res, data);
    },

    async getROAS(req, res) {
      const data = await metricsService.calculateROAS(req.query);
      return sendSuccess(res, data);
    },

    async getFunnelConversions(req, res) {
      const data = await metricsService.calculateFunnelConversions(req.query);
      return sendSuccess(res, data);
    },

    async getSalesCycle(req, res) {
      const data = await metricsService.calculateSalesCycle(req.query);
      return sendSuccess(res, data);
    },

    async getAverageTicket(req, res) {
      const data = await metricsService.calculateAverageTicket(req.query);
      return sendSuccess(res, data);
    },

    async getVanityVsBusiness(req, res) {
      const data = await metricsService.compareVanityVsBusiness(req.query);
      return sendSuccess(res, data);
    },

    // -------------------- AGENTES Y ORQUESTADOR --------------------
    async listCapabilities(_req, res) {
      const data = orchestrator.getCapabilities();
      return sendSuccess(res, data);
    },

    async listAgents(_req, res) {
      const data = await orchestrator.listRegisteredAgents();
      return sendSuccess(res, data);
    },

    async listAgentExecutions(req, res) {
      const data = await orchestrator.listExecutions(req.query);
      return sendSuccess(res, data);
    },

    async getAgentExecution(req, res) {
      const data = await orchestrator.getExecutionById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async executeOrchestratorTask(req, res) {
      const idempotencyKey =
        req.headers['x-idempotency-key'] || req.body?.idempotency_key || null;
      const data = await orchestrator.dispatch({
        ...(req.body || {}),
        idempotency_key: idempotencyKey,
      });
      return sendSuccess(res, data, 'Tarea ejecutada y auditada mediante el orquestador central.');
    },
  };
}

module.exports = {
  createCrmMetricsOrchestratorController,
};

