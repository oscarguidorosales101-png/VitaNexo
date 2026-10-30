const { sendSuccess, sendCreated } = require('../utils/response');

function createCampaignsContentsController({ campaignsService, contentsService }) {
  return {
    // -------------------- CAMPAÑAS --------------------
    async listCampaigns(req, res) {
      const data = await campaignsService.listCampaigns(req.query);
      return sendSuccess(res, data);
    },

    async getCampaign(req, res) {
      const data = await campaignsService.getCampaignDetail(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createCampaign(req, res) {
      const data = await campaignsService.createCampaign(req.body, { isAgent: false });
      return sendCreated(res, data, 'Campaña registrada exitosamente.');
    },

    async updateCampaign(req, res) {
      const data = await campaignsService.updateCampaign(Number(req.params.id), req.body, {
        isAgent: false,
      });
      return sendSuccess(res, data, 'Campaña actualizada exitosamente.');
    },

    async listBudgetAllocations(req, res) {
      const data = await campaignsService.listBudgetAllocations(req.query);
      return sendSuccess(res, data);
    },

    async createBudgetAllocation(req, res) {
      const data = await campaignsService.createBudgetAllocation(req.body, { isAgent: false });
      return sendCreated(res, data, 'Asignación de presupuesto registrada exitosamente.');
    },

    // -------------------- CONTENIDOS Y APROBACIONES --------------------
    async listContents(req, res) {
      const data = await contentsService.listContents(req.query);
      return sendSuccess(res, data);
    },

    async getContent(req, res) {
      const data = await contentsService.getContentDetail(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createContent(req, res) {
      const data = await contentsService.createContentDraft(req.body, { agentCode: null });
      return sendCreated(res, data, 'Borrador de contenido creado exitosamente.');
    },

    async updateContent(req, res) {
      const data = await contentsService.updateContent(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Contenido actualizado exitosamente.');
    },

    async listReviews(req, res) {
      const data = await contentsService.listReviews(req.query);
      return sendSuccess(res, data);
    },

    async reviewContent(req, res) {
      const isAgentActor = req.body.actor_tipo === 'agente';
      const reviewPayload = {
        ...req.body,
        revisor_id:
          req.body.revisor_id !== undefined
            ? req.body.revisor_id
            : !isAgentActor && req.user?.sub
            ? req.user.sub
            : undefined,
      };
      const data = await contentsService.reviewContent(Number(req.params.id), reviewPayload, {
        isAgent: isAgentActor,
      });
      return sendCreated(res, data, 'Decisión de revisión registrada en el historial de auditoría.');
    },

    async publishContent(req, res) {
      const isAgentActor = req.body && req.body.actor_tipo === 'agente';
      const data = await contentsService.publishContent(Number(req.params.id), {
        isAgent: isAgentActor,
      });
      return sendSuccess(res, data, 'Contenido marcado como publicado en el calendario editorial.');
    },
  };
}

module.exports = {
  createCampaignsContentsController,
};

