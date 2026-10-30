const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/AppError');

function createPlatformController({ authService, dashboardService, automationsService }) {
  return {
    // -------------------- AUTENTICACIÓN Y SESIÓN CORPORATIVA --------------------
    async listLoginCollaborators(_req, res) {
      const data = await authService.listAvailableCollaboratorsForLogin();
      return sendSuccess(res, data);
    },

    async login(req, res) {
      const data = await authService.login(req.body || {});
      return sendSuccess(res, data, 'Sesión corporativa iniciada exitosamente.');
    },

    async getProfile(req, res) {
      if (!req.user) {
        throw new AppError('No hay una sesión activa autenticada.', 401, 'UNAUTHENTICATED');
      }
      return sendSuccess(res, {
        id: req.user.sub,
        codigo_colaborador: req.user.codigo_colaborador,
        nombre_completo: req.user.nombre_completo,
        correo: req.user.correo,
        rol: req.user.rol,
        permisos: req.user.permisos,
        expira_timestamp: req.user.exp,
      });
    },

    // -------------------- DASHBOARD EJECUTIVO --------------------
    async getDashboardSummary(_req, res) {
      const data = await dashboardService.getExecutiveSummary();
      return sendSuccess(res, data);
    },

    // -------------------- AUTOMATIZACIONES N8N --------------------
    async getAutomationsStatus(_req, res) {
      const data = await automationsService.getStatusOverview();
      return sendSuccess(res, data);
    },

    async listWorkflows(_req, res) {
      const data = await automationsService.listWorkflowsWithStats();
      return sendSuccess(res, data);
    },

    async listAutomationExecutions(req, res) {
      const data = await automationsService.listExecutions(req.query);
      return sendSuccess(res, data);
    },

    async getAutomationExecution(req, res) {
      const data = await automationsService.getExecutionById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async retryAutomationExecution(req, res) {
      const data = await automationsService.retryExecution(Number(req.params.id));
      return sendSuccess(
        res,
        data,
        'Reintento de automatización ejecutado y registrado en VitaBase.'
      );
    },
  };
}

module.exports = {
  createPlatformController,
};

