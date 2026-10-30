const { AppError } = require('../utils/AppError');
const { generateBusinessCode } = require('../utils/sanitize');

function createClientsServicesService({ catalogsRepo, clientsServicesRepo }) {
  return {
    // -------------------- CATÁLOGOS DE APOYO --------------------
    async listOrganizationTypes() {
      return catalogsRepo.listOrganizationTypes();
    },

    async listCollaborators(filters = {}) {
      return catalogsRepo.listCollaborators(filters);
    },

    async listChannels(filters = {}) {
      return catalogsRepo.listChannels(filters);
    },

    async getChannelById(id) {
      const channel = await catalogsRepo.getChannelById(id);
      if (!channel) {
        throw new AppError(`Canal con id ${id} no encontrado.`, 404, 'CHANNEL_NOT_FOUND');
      }
      return channel;
    },

    async createChannel(payload) {
      return catalogsRepo.createChannel({
        ...payload,
        codigo_canal: payload.codigo_canal || generateBusinessCode('CAN'),
      });
    },

    async updateChannel(id, payload) {
      await this.getChannelById(id);
      return catalogsRepo.updateChannel(id, payload);
    },

    // -------------------- CLIENTES --------------------
    async listClients(filters = {}) {
      return clientsServicesRepo.listClients(filters);
    },

    async getClientDetail(id) {
      const client = await clientsServicesRepo.getClientById(id);
      if (!client) {
        throw new AppError(`Cliente con id ${id} no encontrado.`, 404, 'CLIENT_NOT_FOUND');
      }
      const contactos = await clientsServicesRepo.listClientContacts(id);
      const contratos = await clientsServicesRepo.listContracts({ cliente_id: id });
      return {
        ...client,
        contactos_comerciales: contactos,
        servicios_contratados: contratos,
      };
    },

    async createClient(payload) {
      const orgType = await catalogsRepo.getOrganizationTypeById(payload.tipo_organizacion_id);
      if (!orgType) {
        throw new AppError(
          `El tipo de organización ${payload.tipo_organizacion_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      return clientsServicesRepo.createClient({
        ...payload,
        codigo_cliente: payload.codigo_cliente || generateBusinessCode('CLI'),
        fecha_alta: payload.fecha_alta || new Date().toISOString().slice(0, 10),
      });
    },

    async updateClient(id, payload) {
      const existing = await clientsServicesRepo.getClientById(id);
      if (!existing) {
        throw new AppError(`Cliente con id ${id} no encontrado.`, 404, 'CLIENT_NOT_FOUND');
      }
      if (payload.tipo_organizacion_id) {
        const orgType = await catalogsRepo.getOrganizationTypeById(payload.tipo_organizacion_id);
        if (!orgType) {
          throw new AppError(
            `El tipo de organización ${payload.tipo_organizacion_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }
      return clientsServicesRepo.updateClient(id, payload);
    },

    async addClientContact(clienteId, payload) {
      const existing = await clientsServicesRepo.getClientById(clienteId);
      if (!existing) {
        throw new AppError(`Cliente con id ${clienteId} no encontrado.`, 404, 'CLIENT_NOT_FOUND');
      }
      return clientsServicesRepo.createClientContact({
        ...payload,
        cliente_id: Number(clienteId),
      });
    },

    // -------------------- CATÁLOGO DE SERVICIOS --------------------
    async listServices(filters = {}) {
      return clientsServicesRepo.listServices(filters);
    },

    async getServiceById(id) {
      const service = await clientsServicesRepo.getServiceById(id);
      if (!service) {
        throw new AppError(`Servicio con id ${id} no encontrado.`, 404, 'SERVICE_NOT_FOUND');
      }
      return service;
    },

    async createService(payload) {
      return clientsServicesRepo.createService({
        ...payload,
        codigo_servicio: payload.codigo_servicio || generateBusinessCode('SRV'),
      });
    },

    async updateService(id, payload) {
      await this.getServiceById(id);
      return clientsServicesRepo.updateService(id, payload);
    },

    // -------------------- CONTRATOS DE SERVICIOS --------------------
    async listContracts(filters = {}) {
      return clientsServicesRepo.listContracts(filters);
    },

    async getContractById(id) {
      const contract = await clientsServicesRepo.getContractById(id);
      if (!contract) {
        throw new AppError(`Contrato con id ${id} no encontrado.`, 404, 'CONTRACT_NOT_FOUND');
      }
      return contract;
    },

    async createContract(payload) {
      const client = await clientsServicesRepo.getClientById(payload.cliente_id);
      if (!client) {
        throw new AppError(
          `El cliente ${payload.cliente_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }
      const service = await clientsServicesRepo.getServiceById(payload.servicio_id);
      if (!service) {
        throw new AppError(
          `El servicio ${payload.servicio_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      if (
        payload.fecha_fin_servicio &&
        payload.fecha_fin_servicio < payload.fecha_inicio_servicio
      ) {
        throw new AppError(
          'La fecha_fin_servicio no puede ser anterior a fecha_inicio_servicio.',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      return clientsServicesRepo.createContract({
        ...payload,
        codigo_contrato: payload.codigo_contrato || generateBusinessCode('CTR'),
      });
    },

    async updateContract(id, payload) {
      const existing = await this.getContractById(id);
      if (
        payload.fecha_fin_servicio &&
        payload.fecha_fin_servicio < existing.fecha_inicio_servicio
      ) {
        throw new AppError(
          'La fecha_fin_servicio no puede ser anterior a fecha_inicio_servicio.',
          400,
          'INVALID_DATE_RANGE'
        );
      }
      return clientsServicesRepo.updateContract(id, payload);
    },
  };
}

module.exports = {
  createClientsServicesService,
};

