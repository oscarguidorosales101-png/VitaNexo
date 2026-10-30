const { sendSuccess, sendCreated } = require('../utils/response');

function createHealthController({ db }) {
  return {
    async getHealth(_req, res) {
      const dbStatus = await db.checkDatabaseHealth();
      const httpStatus = dbStatus.connected ? 200 : 503;

      return res.status(httpStatus).json({
        ok: dbStatus.connected,
        service: 'VitaNexo Backend API',
        api_status: 'online',
        timestamp: new Date().toISOString(),
        database: dbStatus,
      });
    },
  };
}

function createClientsServicesController({ clientsServicesService }) {
  return {
    async listOrganizationTypes(_req, res) {
      const data = await clientsServicesService.listOrganizationTypes();
      return sendSuccess(res, data);
    },

    async listCollaborators(req, res) {
      const data = await clientsServicesService.listCollaborators(req.query);
      return sendSuccess(res, data);
    },

    async listChannels(req, res) {
      const data = await clientsServicesService.listChannels(req.query);
      return sendSuccess(res, data);
    },

    async getChannel(req, res) {
      const data = await clientsServicesService.getChannelById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createChannel(req, res) {
      const data = await clientsServicesService.createChannel(req.body);
      return sendCreated(res, data, 'Canal de mercadeo creado exitosamente.');
    },

    async updateChannel(req, res) {
      const data = await clientsServicesService.updateChannel(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Canal actualizado exitosamente.');
    },

    async listClients(req, res) {
      const data = await clientsServicesService.listClients(req.query);
      return sendSuccess(res, data);
    },

    async getClient(req, res) {
      const data = await clientsServicesService.getClientDetail(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createClient(req, res) {
      const data = await clientsServicesService.createClient(req.body);
      return sendCreated(res, data, 'Cliente registrado exitosamente.');
    },

    async updateClient(req, res) {
      const data = await clientsServicesService.updateClient(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Cliente actualizado exitosamente.');
    },

    async addClientContact(req, res) {
      const data = await clientsServicesService.addClientContact(Number(req.params.id), req.body);
      return sendCreated(res, data, 'Contacto comercial asociado al cliente exitosamente.');
    },

    async listServices(req, res) {
      const data = await clientsServicesService.listServices(req.query);
      return sendSuccess(res, data);
    },

    async getService(req, res) {
      const data = await clientsServicesService.getServiceById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createService(req, res) {
      const data = await clientsServicesService.createService(req.body);
      return sendCreated(res, data, 'Servicio agregado al catálogo exitosamente.');
    },

    async updateService(req, res) {
      const data = await clientsServicesService.updateService(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Servicio actualizado exitosamente.');
    },

    async listContracts(req, res) {
      const data = await clientsServicesService.listContracts(req.query);
      return sendSuccess(res, data);
    },

    async getContract(req, res) {
      const data = await clientsServicesService.getContractById(Number(req.params.id));
      return sendSuccess(res, data);
    },

    async createContract(req, res) {
      const data = await clientsServicesService.createContract(req.body);
      return sendCreated(res, data, 'Contrato de servicio registrado exitosamente.');
    },

    async updateContract(req, res) {
      const data = await clientsServicesService.updateContract(Number(req.params.id), req.body);
      return sendSuccess(res, data, 'Contrato de servicio actualizado exitosamente.');
    },
  };
}

module.exports = {
  createHealthController,
  createClientsServicesController,
};

