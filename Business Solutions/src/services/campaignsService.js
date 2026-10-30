const { AppError } = require('../utils/AppError');
const { generateBusinessCode } = require('../utils/sanitize');

function createCampaignsService({ catalogsRepo, campaignsRepo }) {
  return {
    async listCampaigns(filters = {}) {
      return campaignsRepo.listCampaigns(filters);
    },

    async getCampaignDetail(id) {
      const campaign = await campaignsRepo.getCampaignById(id);
      if (!campaign) {
        throw new AppError(`Campaña con id ${id} no encontrada.`, 404, 'CAMPAIGN_NOT_FOUND');
      }
      const asignaciones = await campaignsRepo.listBudgetAllocations({ campana_id: id });
      return {
        ...campaign,
        asignaciones_presupuesto: asignaciones,
      };
    },

    async createCampaign(payload, options = { isAgent: false }) {
      if (payload.fecha_fin < payload.fecha_inicio) {
        throw new AppError(
          'La fecha_fin de la campaña no puede ser anterior a fecha_inicio.',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      // Regla de seguridad: los agentes solo pueden registrar propuestas, nunca activar campañas reales
      if (options.isAgent && payload.estado && payload.estado !== 'propuesta') {
        throw new AppError(
          'El agente de campañas solo está autorizado a crear propuestas para revisión (estado = propuesta), nunca a activar publicidad.',
          403,
          'AGENT_CAMPAIGN_ACTIVATION_FORBIDDEN'
        );
      }

      const channel = await catalogsRepo.getChannelById(payload.canal_principal_id);
      if (!channel) {
        throw new AppError(
          `El canal principal ${payload.canal_principal_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      if (payload.responsable_id) {
        const responsable = await catalogsRepo.getCollaboratorById(payload.responsable_id);
        if (!responsable) {
          throw new AppError(
            `El colaborador responsable ${payload.responsable_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }

      const presupuestoTotal = Number(payload.presupuesto_total_crc ?? 0);
      if (presupuestoTotal < 0) {
        throw new AppError(
          'El presupuesto_total_crc no puede ser negativo.',
          400,
          'INVALID_BUDGET_AMOUNT'
        );
      }

      if (channel.clasificacion === 'organico' && presupuestoTotal > 0 && !payload.permitir_pauta_secundaria) {
        throw new AppError(
          'Una campaña cuyo canal principal es orgánico no debe registrar presupuesto publicitario pagado salvo que habilite permitir_pauta_secundaria; utilice costo_operativo_mercadeo_crc para costos operativos.',
          400,
          'ORGANIC_CAMPAIGN_AD_BUDGET_CONFLICT'
        );
      }

      const targetState = options.isAgent ? 'propuesta' : payload.estado || 'propuesta';
      if (channel.clasificacion === 'pagado' && targetState === 'activa' && presupuestoTotal <= 0) {
        throw new AppError(
          'No se puede activar una campaña de canal pagado con presupuesto_total_crc igual a cero.',
          400,
          'PAID_CAMPAIGN_REQUIRES_BUDGET'
        );
      }

      return campaignsRepo.createCampaign({
        ...payload,
        codigo_campana: payload.codigo_campana || generateBusinessCode('CMP'),
        presupuesto_total_crc: presupuestoTotal,
        costo_operativo_mercadeo_crc: Number(payload.costo_operativo_mercadeo_crc ?? 0),
        estado: targetState,
        creada_por_agente: Boolean(options.isAgent),
      });
    },

    async updateCampaign(id, payload, options = { isAgent: false }) {
      const existing = await campaignsRepo.getCampaignById(id);
      if (!existing) {
        throw new AppError(`Campaña con id ${id} no encontrada.`, 404, 'CAMPAIGN_NOT_FOUND');
      }

      if (options.isAgent && payload.estado === 'activa') {
        throw new AppError(
          'Los agentes no pueden activar campañas publicitarias reales.',
          403,
          'AGENT_CAMPAIGN_ACTIVATION_FORBIDDEN'
        );
      }

      const newStart = payload.fecha_inicio || existing.fecha_inicio;
      const newEnd = payload.fecha_fin || existing.fecha_fin;
      if (newEnd < newStart) {
        throw new AppError(
          'La fecha_fin de la campaña no puede ser anterior a fecha_inicio.',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      if (payload.canal_principal_id) {
        const channel = await catalogsRepo.getChannelById(payload.canal_principal_id);
        if (!channel) {
          throw new AppError(
            `El canal principal ${payload.canal_principal_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }

      return campaignsRepo.updateCampaign(id, payload);
    },

    // -------------------- ASIGNACIONES DE PRESUPUESTO --------------------
    async listBudgetAllocations(filters = {}) {
      return campaignsRepo.listBudgetAllocations(filters);
    },

    async createBudgetAllocation(payload, options = { isAgent: false }) {
      if (payload.periodo_fin < payload.periodo_inicio) {
        throw new AppError(
          'El periodo_fin de la asignación no puede ser anterior a periodo_inicio.',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      const campaign = await campaignsRepo.getCampaignById(payload.campana_id);
      if (!campaign) {
        throw new AppError(
          `La campaña ${payload.campana_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      const channel = await catalogsRepo.getChannelById(payload.canal_id);
      if (!channel) {
        throw new AppError(`El canal ${payload.canal_id} no existe.`, 400, 'FOREIGN_KEY_VIOLATION');
      }

      const responsable = await catalogsRepo.getCollaboratorById(payload.responsable_id);
      if (!responsable) {
        throw new AppError(
          `El colaborador responsable ${payload.responsable_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      const monto = Number(payload.monto_asignado_crc);
      if (monto < 0) {
        throw new AppError(
          'El monto_asignado_crc no puede ser negativo.',
          400,
          'INVALID_BUDGET_AMOUNT'
        );
      }

      if (channel.clasificacion === 'organico' && monto > 0) {
        throw new AppError(
          'No se debe asignar gasto de pauta publicitaria mayor a cero a un canal clasificado como orgánico.',
          400,
          'ORGANIC_CHANNEL_AD_SPEND_FORBIDDEN'
        );
      }

      const nuevoAcumulado = Number(campaign.presupuesto_asignado_canales_crc || 0) + monto;
      if (nuevoAcumulado > Number(campaign.presupuesto_total_crc)) {
        throw new AppError(
          `La asignación (${monto} CRC) excede el presupuesto total disponible de la campaña (${campaign.presupuesto_total_crc} CRC).`,
          409,
          'BUDGET_ALLOCATION_EXCEEDS_CAMPAIGN_TOTAL'
        );
      }

      if (options.isAgent && payload.estado_asignacion && payload.estado_asignacion !== 'propuesta') {
        throw new AppError(
          'El agente solo puede registrar asignaciones en estado propuesta para revisión humana.',
          403,
          'AGENT_BUDGET_EXECUTION_FORBIDDEN'
        );
      }

      return campaignsRepo.createBudgetAllocation({
        ...payload,
        monto_asignado_crc: monto,
        estado_asignacion: options.isAgent ? 'propuesta' : payload.estado_asignacion || 'propuesta',
      });
    },
  };
}

module.exports = {
  createCampaignsService,
};

