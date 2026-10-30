const { AppError } = require('../utils/AppError');
const { generateBusinessCode, containsProhibitedClinicalData } = require('../utils/sanitize');

function formatNowMysql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function createCrmSalesService({ catalogsRepo, campaignsRepo, contentsRepo, crmSalesRepo }) {
  return {
    async listFunnelStages() {
      return catalogsRepo.listFunnelStages();
    },

    // -------------------- CONTACTOS Y LEADS --------------------
    async listContacts(filters = {}) {
      return crmSalesRepo.listContacts(filters);
    },

    async getContactDetail(id) {
      const contact = await crmSalesRepo.getContactById(id);
      if (!contact) {
        throw new AppError(`Contacto con id ${id} no encontrado.`, 404, 'CONTACT_NOT_FOUND');
      }
      const historialEtapas = await crmSalesRepo.listContactStageHistory(id);
      const contenidosConsumidos = await crmSalesRepo.listConsumedContentByContact(id);
      return {
        ...contact,
        historial_etapas: historialEtapas,
        contenidos_consumidos: contenidosConsumidos,
      };
    },

    async createContact(payload) {
      if (containsProhibitedClinicalData(payload.necesidad_comercial)) {
        throw new AppError(
          'No se permite almacenar diagnósticos clínicos ni información médica de pacientes en contactos comerciales.',
          400,
          'PROHIBITED_CLINICAL_DATA'
        );
      }

      const orgType = await catalogsRepo.getOrganizationTypeById(payload.tipo_organizacion_id);
      if (!orgType) {
        throw new AppError(
          `El tipo de organización ${payload.tipo_organizacion_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      let stage = null;
      if (payload.etapa_actual_id) {
        stage = await catalogsRepo.getFunnelStageById(payload.etapa_actual_id);
      } else {
        stage = await catalogsRepo.getFunnelStageByCode(payload.codigo_etapa || 'lead');
      }
      if (!stage) {
        throw new AppError('La etapa inicial del embudo indicada no existe.', 400, 'INVALID_FUNNEL_STAGE');
      }

      if (payload.campana_origen_id) {
        const campaign = await campaignsRepo.getCampaignById(payload.campana_origen_id);
        if (!campaign) {
          throw new AppError(
            `La campaña de origen ${payload.campana_origen_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }

      if (payload.canal_origen_id) {
        const channel = await catalogsRepo.getChannelById(payload.canal_origen_id);
        if (!channel) {
          throw new AppError(
            `El canal de origen ${payload.canal_origen_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }

      const fechaCaptura = payload.fecha_captura_lead || formatNowMysql();

      return crmSalesRepo.withTransaction(async (tx) => {
        const created = await crmSalesRepo.insertContact(
          {
            ...payload,
            codigo_contacto: payload.codigo_contacto || generateBusinessCode('LEAD'),
            etapa_actual_id: stage.id,
            fecha_captura_lead: fechaCaptura,
          },
          tx
        );

        await crmSalesRepo.insertStageHistory(
          {
            contacto_id: created.id,
            etapa_anterior_id: null,
            etapa_nueva_id: stage.id,
            cambiado_por_id: payload.responsable_comercial_id || null,
            fecha_transicion: fechaCaptura,
            motivo: 'Captura inicial del contacto en el embudo comercial.',
          },
          tx
        );

        return created;
      });
    },

    async updateContact(id, payload) {
      const existing = await crmSalesRepo.getContactById(id);
      if (!existing) {
        throw new AppError(`Contacto con id ${id} no encontrado.`, 404, 'CONTACT_NOT_FOUND');
      }

      if (payload.etapa_actual_id !== undefined || payload.codigo_etapa !== undefined) {
        throw new AppError(
          'Para cambiar la etapa del embudo utilice la operación formal de transición de etapa para conservar trazabilidad.',
          400,
          'USE_STAGE_TRANSITION_ENDPOINT'
        );
      }

      const allowed = [
        'nombre_completo',
        'cargo',
        'nombre_organizacion',
        'tipo_organizacion_id',
        'telefono',
        'provincia',
        'puntuacion_lead',
        'necesidad_comercial',
        'presupuesto_declarado_crc',
        'responsable_comercial_id',
        'fecha_proximo_seguimiento',
        'activo',
      ];
      const fieldsMap = {};
      for (const k of allowed) {
        if (payload[k] !== undefined) {
          fieldsMap[k] = k === 'activo' ? Number(Boolean(payload[k])) : payload[k];
        }
      }
      return crmSalesRepo.updateContactFields(id, fieldsMap);
    },

    async changeContactStage(contactoId, payload) {
      const contact = await crmSalesRepo.getContactById(contactoId);
      if (!contact) {
        throw new AppError(`Contacto con id ${contactoId} no encontrado.`, 404, 'CONTACT_NOT_FOUND');
      }

      let targetStage = null;
      if (payload.etapa_nueva_id) {
        targetStage = await catalogsRepo.getFunnelStageById(payload.etapa_nueva_id);
      } else if (payload.codigo_etapa_nueva) {
        targetStage = await catalogsRepo.getFunnelStageByCode(payload.codigo_etapa_nueva);
      }

      if (!targetStage) {
        throw new AppError('La etapa destino del embudo no existe.', 400, 'INVALID_FUNNEL_STAGE');
      }

      if (Number(contact.etapa_actual_id) === Number(targetStage.id)) {
        throw new AppError(
          `El contacto ya se encuentra actualmente en la etapa '${targetStage.codigo_etapa}'.`,
          409,
          'DUPLICATE_STAGE_TRANSITION'
        );
      }

      if (payload.cambiado_por_id) {
        const col = await catalogsRepo.getCollaboratorById(payload.cambiado_por_id);
        if (!col) {
          throw new AppError(
            `El colaborador ${payload.cambiado_por_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }

      const fechaTransicion = payload.fecha_transicion || formatNowMysql();

      return crmSalesRepo.withTransaction(async (tx) => {
        await crmSalesRepo.insertStageHistory(
          {
            contacto_id: Number(contactoId),
            etapa_anterior_id: contact.etapa_actual_id,
            etapa_nueva_id: targetStage.id,
            cambiado_por_id: payload.cambiado_por_id || null,
            fecha_transicion: fechaTransicion,
            motivo: payload.motivo || `Cambio manual a etapa ${targetStage.nombre}.`,
          },
          tx
        );

        return crmSalesRepo.updateContactFields(
          contactoId,
          {
            etapa_actual_id: targetStage.id,
            fecha_proximo_seguimiento:
              payload.fecha_proximo_seguimiento !== undefined
                ? payload.fecha_proximo_seguimiento
                : contact.fecha_proximo_seguimiento,
          },
          tx
        );
      });
    },

    async recordContentConsumption(contactoId, payload) {
      const contact = await crmSalesRepo.getContactById(contactoId);
      if (!contact) {
        throw new AppError(`Contacto con id ${contactoId} no encontrado.`, 404, 'CONTACT_NOT_FOUND');
      }
      const content = await contentsRepo.getContentById(payload.contenido_id);
      if (!content) {
        throw new AppError(
          `El contenido ${payload.contenido_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }
      return crmSalesRepo.recordContentConsumption({
        contacto_id: Number(contactoId),
        contenido_id: Number(payload.contenido_id),
        tipo_interaccion: payload.tipo_interaccion,
        fecha_interaccion: payload.fecha_interaccion || formatNowMysql(),
      });
    },

    // -------------------- TRASPASOS DE MERCADEO A VENTAS --------------------
    async listHandoffs(filters = {}) {
      return crmSalesRepo.listHandoffs(filters);
    },

    async getHandoffById(id) {
      const handoff = await crmSalesRepo.getHandoffById(id);
      if (!handoff) {
        throw new AppError(`Traspaso con id ${id} no encontrado.`, 404, 'HANDOFF_NOT_FOUND');
      }
      return handoff;
    },

    async createHandoff(payload) {
      if (
        containsProhibitedClinicalData(payload.necesidad_detectada) ||
        containsProhibitedClinicalData(payload.observaciones_seguimiento)
      ) {
        throw new AppError(
          'El traspaso contiene datos clínicos o médicos prohibidos. Solo se permite información comercial y administrativa.',
          400,
          'PROHIBITED_CLINICAL_DATA'
        );
      }

      const contact = await crmSalesRepo.getContactById(payload.contacto_id);
      if (!contact) {
        throw new AppError(
          `El contacto ${payload.contacto_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      const sender = await catalogsRepo.getCollaboratorById(payload.entregado_por_id);
      const receiver = await catalogsRepo.getCollaboratorById(payload.recibido_por_id);
      if (!sender || !receiver) {
        throw new AppError(
          'Tanto entregado_por_id como recibido_por_id deben ser colaboradores válidos.',
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      let referencias = payload.referencias_contenidos || null;
      if (!referencias) {
        const consumed = await crmSalesRepo.listConsumedContentByContact(contact.id);
        if (consumed.length > 0) {
          referencias = consumed
            .map((c) => `${c.codigo_contenido} (${c.tipo_interaccion})`)
            .join(', ');
        }
      }

      const puntuacion =
        payload.puntuacion_al_traspaso !== undefined
          ? Number(payload.puntuacion_al_traspaso)
          : Number(contact.puntuacion_lead || 0);

      if (puntuacion < 0 || puntuacion > 100) {
        throw new AppError(
          'La puntuacion_al_traspaso debe estar entre 0 y 100.',
          400,
          'INVALID_LEAD_SCORE'
        );
      }

      return crmSalesRepo.insertHandoff({
        codigo_traspaso: payload.codigo_traspaso || generateBusinessCode('TRP'),
        contacto_id: Number(payload.contacto_id),
        entregado_por_id: Number(payload.entregado_por_id),
        recibido_por_id: Number(payload.recibido_por_id),
        puntuacion_al_traspaso: puntuacion,
        necesidad_detectada: payload.necesidad_detectada || contact.necesidad_comercial,
        presupuesto_declarado_crc:
          payload.presupuesto_declarado_crc !== undefined
            ? payload.presupuesto_declarado_crc
            : contact.presupuesto_declarado_crc,
        referencias_contenidos: referencias,
        observaciones_seguimiento: payload.observaciones_seguimiento,
        fecha_traspaso: payload.fecha_traspaso || formatNowMysql(),
      });
    },

    async respondToHandoff(traspasoId, payload) {
      const handoff = await crmSalesRepo.getHandoffById(traspasoId);
      if (!handoff) {
        throw new AppError(`Traspaso con id ${traspasoId} no encontrado.`, 404, 'HANDOFF_NOT_FOUND');
      }

      if (handoff.decision_ventas !== 'pendiente') {
        throw new AppError(
          `El traspaso ya fue respondido previamente con decisión '${handoff.decision_ventas}'. El historial no puede sobrescribirse.`,
          409,
          'HANDOFF_ALREADY_DECIDED'
        );
      }

      const { decision_ventas, motivo_decision } = payload;
      if (!['aceptado', 'rechazado'].includes(decision_ventas)) {
        throw new AppError(
          `La decisión de ventas debe ser 'aceptado' o 'rechazado'.`,
          400,
          'INVALID_HANDOFF_DECISION'
        );
      }

      if (decision_ventas === 'rechazado' && (!motivo_decision || !motivo_decision.trim())) {
        throw new AppError(
          'Cuando ventas rechaza un traspaso es obligatorio especificar el motivo_decision.',
          400,
          'REJECTION_REASON_REQUIRED'
        );
      }

      const now = payload.fecha_respuesta || formatNowMysql();

      return crmSalesRepo.withTransaction(async (tx) => {
        const updatedHandoff = await crmSalesRepo.updateHandoffDecision(
          traspasoId,
          {
            decision_ventas,
            motivo_decision: motivo_decision || 'Traspaso aceptado por el equipo comercial.',
            fecha_respuesta: now,
          },
          tx
        );

        const contact = await crmSalesRepo.getContactById(handoff.contacto_id, tx);
        const targetStageCode =
          decision_ventas === 'aceptado' ? 'oportunidad_comercial' : 'nutricion_futura';
        const targetStage = await catalogsRepo.getFunnelStageByCode(targetStageCode, tx);

        if (contact && targetStage && Number(contact.etapa_actual_id) !== Number(targetStage.id)) {
          await crmSalesRepo.insertStageHistory(
            {
              contacto_id: contact.id,
              etapa_anterior_id: contact.etapa_actual_id,
              etapa_nueva_id: targetStage.id,
              cambiado_por_id: handoff.recibido_por_id,
              fecha_transicion: now,
              motivo:
                decision_ventas === 'aceptado'
                  ? `Traspaso ${handoff.codigo_traspaso} aceptado por ventas.`
                  : `Traspaso ${handoff.codigo_traspaso} rechazado: ${motivo_decision}`,
            },
            tx
          );

          await crmSalesRepo.updateContactFields(
            contact.id,
            {
              etapa_actual_id: targetStage.id,
              responsable_comercial_id:
                decision_ventas === 'aceptado'
                  ? handoff.recibido_por_id
                  : contact.responsable_comercial_id,
            },
            tx
          );
        }

        return updatedHandoff;
      });
    },

    // -------------------- OPORTUNIDADES COMERCIALES --------------------
    async listOpportunities(filters = {}) {
      return crmSalesRepo.listOpportunities(filters);
    },

    async getOpportunityById(id) {
      const opp = await crmSalesRepo.getOpportunityById(id);
      if (!opp) {
        throw new AppError(`Oportunidad con id ${id} no encontrada.`, 404, 'OPPORTUNITY_NOT_FOUND');
      }
      return opp;
    },

    async createOpportunity(payload) {
      const contact = await crmSalesRepo.getContactById(payload.contacto_id);
      if (!contact) {
        throw new AppError(
          `El contacto ${payload.contacto_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      const rep = await catalogsRepo.getCollaboratorById(payload.responsable_ventas_id);
      if (!rep) {
        throw new AppError(
          `El responsable de ventas ${payload.responsable_ventas_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      if (payload.estado_oportunidad && ['ganada', 'perdida'].includes(payload.estado_oportunidad)) {
        throw new AppError(
          'Una oportunidad nueva debe abrirse en estado activa/en_negociacion/propuesta_enviada y cerrarse mediante la operación formal de cierre.',
          400,
          'INVALID_INITIAL_OPPORTUNITY_STATE'
        );
      }

      const fechaApertura = payload.fecha_apertura || formatNowMysql();

      return crmSalesRepo.withTransaction(async (tx) => {
        const created = await crmSalesRepo.insertOpportunity(
          {
            ...payload,
            codigo_oportunidad: payload.codigo_oportunidad || generateBusinessCode('OPP'),
            campana_atribuida_id: payload.campana_atribuida_id || contact.campana_origen_id || null,
            fecha_apertura: fechaApertura,
          },
          tx
        );

        const oppStage = await catalogsRepo.getFunnelStageByCode('oportunidad_comercial', tx);
        if (
          oppStage &&
          ['lead', 'prospecto_calificado'].includes(contact.etapa_actual_codigo)
        ) {
          await crmSalesRepo.insertStageHistory(
            {
              contacto_id: contact.id,
              etapa_anterior_id: contact.etapa_actual_id,
              etapa_nueva_id: oppStage.id,
              cambiado_por_id: Number(payload.responsable_ventas_id),
              fecha_transicion: fechaApertura,
              motivo: `Apertura de oportunidad comercial ${created.codigo_oportunidad}.`,
            },
            tx
          );
          await crmSalesRepo.updateContactFields(
            contact.id,
            {
              etapa_actual_id: oppStage.id,
              responsable_comercial_id: Number(payload.responsable_ventas_id),
            },
            tx
          );
        }

        return created;
      });
    },

    async updateOpportunity(id, payload) {
      const existing = await this.getOpportunityById(id);

      if (existing.resultado_cierre !== 'pendiente') {
        throw new AppError(
          `La oportunidad ya fue cerrada como '${existing.resultado_cierre}' y no admite ediciones ordinarias.`,
          409,
          'OPPORTUNITY_ALREADY_CLOSED'
        );
      }

      if (
        ['ganada', 'perdida'].includes(payload.estado_oportunidad) ||
        ['ganada', 'perdida'].includes(payload.resultado_cierre)
      ) {
        throw new AppError(
          'No se puede declarar ganada o perdida una oportunidad sin ejecutar la operación formal de cierre con todos sus datos obligatorios.',
          400,
          'USE_FORMAL_CLOSE_OPERATION'
        );
      }

      const allowed = [
        'titulo_propuesta',
        'servicio_principal_id',
        'valor_estimado_crc',
        'estado_oportunidad',
        'fecha_proximo_seguimiento',
        'responsable_ventas_id',
      ];
      const fieldsMap = {};
      for (const k of allowed) {
        if (payload[k] !== undefined) {
          fieldsMap[k] = payload[k];
        }
      }
      return crmSalesRepo.updateOpportunityFields(id, fieldsMap);
    },

    async closeOpportunity(id, payload) {
      const opp = await this.getOpportunityById(id);
      if (opp.resultado_cierre !== 'pendiente') {
        throw new AppError(
          `La oportunidad ya se encuentra cerrada con resultado '${opp.resultado_cierre}'.`,
          409,
          'OPPORTUNITY_ALREADY_CLOSED'
        );
      }

      const { resultado_cierre, monto_cierre_crc, motivo_cierre, cliente_id } = payload;
      const fechaCierre = payload.fecha_cierre || formatNowMysql();

      if (!['ganada', 'perdida'].includes(resultado_cierre)) {
        throw new AppError(
          `El resultado_cierre debe ser 'ganada' o 'perdida'.`,
          400,
          'INVALID_CLOSE_RESULT'
        );
      }

      if (!motivo_cierre || !String(motivo_cierre).trim()) {
        throw new AppError(
          'Es obligatorio indicar motivo_cierre para cerrar una oportunidad.',
          400,
          'CLOSE_REASON_REQUIRED'
        );
      }

      if (opp.fecha_captura_lead && fechaCierre < opp.fecha_captura_lead) {
        throw new AppError(
          'La fecha_cierre no puede ser anterior a la fecha_captura_lead del contacto.',
          400,
          'INVALID_CLOSE_DATE'
        );
      }

      if (resultado_cierre === 'ganada') {
        const monto = Number(monto_cierre_crc);
        if (monto_cierre_crc === undefined || monto_cierre_crc === null || Number.isNaN(monto) || monto <= 0) {
          throw new AppError(
            'No se puede declarar ganada una venta sin un monto_cierre_crc válido mayor a cero.',
            400,
            'WIN_AMOUNT_REQUIRED'
          );
        }
      }

      return crmSalesRepo.withTransaction(async (tx) => {
        const updatedOpp = await crmSalesRepo.updateOpportunityFields(
          id,
          {
            estado_oportunidad: resultado_cierre,
            resultado_cierre,
            monto_cierre_crc: resultado_cierre === 'ganada' ? Number(monto_cierre_crc) : null,
            motivo_cierre: motivo_cierre.trim(),
            fecha_cierre: fechaCierre,
            fecha_proximo_seguimiento: null,
            cliente_id: cliente_id !== undefined ? cliente_id : opp.cliente_id,
          },
          tx
        );

        const contact = await crmSalesRepo.getContactById(opp.contacto_id, tx);
        const targetStageCode = resultado_cierre === 'ganada' ? 'cierre_ganado' : 'cierre_perdido';
        const targetStage = await catalogsRepo.getFunnelStageByCode(targetStageCode, tx);

        if (contact && targetStage && Number(contact.etapa_actual_id) !== Number(targetStage.id)) {
          await crmSalesRepo.insertStageHistory(
            {
              contacto_id: contact.id,
              etapa_anterior_id: contact.etapa_actual_id,
              etapa_nueva_id: targetStage.id,
              cambiado_por_id: opp.responsable_ventas_id,
              fecha_transicion: fechaCierre,
              motivo: `Cierre de oportunidad ${opp.codigo_oportunidad} (${resultado_cierre}): ${motivo_cierre}`,
            },
            tx
          );
          await crmSalesRepo.updateContactFields(
            contact.id,
            {
              etapa_actual_id: targetStage.id,
              fecha_proximo_seguimiento: null,
            },
            tx
          );
        }

        return updatedOpp;
      });
    },

    async listPendingFollowUps(hastaFecha = null) {
      return crmSalesRepo.listPendingFollowUps(hastaFecha);
    },
  };
}

module.exports = {
  createCrmSalesService,
};

