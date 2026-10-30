const { AppError } = require('../utils/AppError');

const AGENT_CODE = 'agente_contactos_ventas';

const SUPPORTED_TASKS = [
  'registrar_lead',
  'consultar_leads',
  'cambiar_etapa_contacto',
  'crear_oportunidad',
  'actualizar_oportunidad',
  'cerrar_oportunidad',
  'registrar_traspaso_ventas',
  'responder_traspaso_ventas',
  'identificar_seguimientos_pendientes',
  'analizar_embudo_y_priorizar_leads_ia',
  'redactar_mensaje_comercial_ia',
];

/**
 * Regla determinista de calificación inicial cuando no se envía puntuacion_lead explícita.
 */
function calculateDeterministicLeadScore(params) {
  let score = 35;
  const budget = Number(params.presupuesto_declarado_crc || 0);
  if (budget >= 100000) score += 30;
  else if (budget >= 50000) score += 20;
  else if (budget > 0) score += 10;

  if (params.necesidad_comercial && String(params.necesidad_comercial).trim().length >= 30) {
    score += 20;
  }
  if (params.campana_origen_id) {
    score += 10;
  }
  return Math.min(100, score);
}

function createSalesContactsAgent({ crmSalesService, clientsServicesService = null, n8nBridge = null }) {
  function requireAiBridge() {
    if (!n8nBridge) {
      throw new AppError(
        'El puente de automatización n8n/Gemini no está disponible en esta instancia.',
        503,
        'AI_BRIDGE_NOT_CONFIGURED'
      );
    }
    return n8nBridge;
  }

  return {
    agentCode: AGENT_CODE,
    supportedTasks: SUPPORTED_TASKS,

    async execute(taskType, params = {}, executionContext = {}) {
      if (!SUPPORTED_TASKS.includes(taskType)) {
        throw new AppError(
          `El agente '${AGENT_CODE}' no soporta la tarea '${taskType}'.`,
          400,
          'UNSUPPORTED_AGENT_TASK'
        );
      }

      if (taskType === 'registrar_lead') {
        const required = [
          'nombre_completo',
          'cargo',
          'nombre_organizacion',
          'tipo_organizacion_id',
          'correo',
          'telefono',
          'provincia',
          'fuente_origen',
          'necesidad_comercial',
        ];
        for (const field of required) {
          if (!params[field]) {
            throw new AppError(
              `Falta el campo obligatorio '${field}' para registrar_lead.`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }

        const score =
          params.puntuacion_lead !== undefined
            ? Number(params.puntuacion_lead)
            : calculateDeterministicLeadScore(params);

        const created = await crmSalesService.createContact({
          ...params,
          puntuacion_lead: score,
        });

        return {
          summary: {
            codigo_contacto: created.codigo_contacto,
            etapa_actual: created.etapa_actual_codigo,
            puntuacion_lead: created.puntuacion_lead,
          },
          references: {
            campana_id: created.campana_origen_id || null,
            contacto_id: created.id,
          },
          result: created,
        };
      }

      if (taskType === 'consultar_leads') {
        const contacts = await crmSalesService.listContacts(params);
        return {
          summary: { total_contactos: contacts.length },
          references: {},
          result: contacts,
        };
      }

      if (taskType === 'cambiar_etapa_contacto') {
        if (!params.contacto_id || (!params.etapa_nueva_id && !params.codigo_etapa_nueva)) {
          throw new AppError(
            'Se requiere contacto_id y etapa_nueva_id (o codigo_etapa_nueva) para cambiar_etapa_contacto.',
            400,
            'VALIDATION_ERROR'
          );
        }
        const updated = await crmSalesService.changeContactStage(params.contacto_id, params);
        return {
          summary: {
            contacto_id: updated.id,
            nueva_etapa: updated.etapa_actual_codigo,
          },
          references: {
            contacto_id: updated.id,
          },
          result: updated,
        };
      }

      if (taskType === 'crear_oportunidad') {
        const required = ['contacto_id', 'responsable_ventas_id', 'titulo_propuesta', 'valor_estimado_crc'];
        for (const field of required) {
          if (params[field] === undefined || params[field] === null || params[field] === '') {
            throw new AppError(
              `Falta el campo obligatorio '${field}' para crear_oportunidad.`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }
        const opp = await crmSalesService.createOpportunity(params);
        return {
          summary: {
            codigo_oportunidad: opp.codigo_oportunidad,
            estado_oportunidad: opp.estado_oportunidad,
            valor_estimado_crc: opp.valor_estimado_crc,
          },
          references: {
            campana_id: opp.campana_atribuida_id || null,
            contacto_id: opp.contacto_id,
            oportunidad_id: opp.id,
          },
          result: opp,
        };
      }

      if (taskType === 'actualizar_oportunidad') {
        if (!params.oportunidad_id) {
          throw new AppError('Se requiere oportunidad_id para actualizar_oportunidad.', 400, 'VALIDATION_ERROR');
        }
        const opp = await crmSalesService.updateOpportunity(params.oportunidad_id, params);
        return {
          summary: {
            codigo_oportunidad: opp.codigo_oportunidad,
            estado_oportunidad: opp.estado_oportunidad,
          },
          references: {
            contacto_id: opp.contacto_id,
            oportunidad_id: opp.id,
          },
          result: opp,
        };
      }

      if (taskType === 'cerrar_oportunidad') {
        if (!params.oportunidad_id || !params.resultado_cierre) {
          throw new AppError(
            'Se requieren oportunidad_id y resultado_cierre para cerrar_oportunidad.',
            400,
            'VALIDATION_ERROR'
          );
        }
        const closed = await crmSalesService.closeOpportunity(params.oportunidad_id, params);
        return {
          summary: {
            codigo_oportunidad: closed.codigo_oportunidad,
            resultado_cierre: closed.resultado_cierre,
            monto_cierre_crc: closed.monto_cierre_crc,
          },
          references: {
            campana_id: closed.campana_atribuida_id || null,
            contacto_id: closed.contacto_id,
            oportunidad_id: closed.id,
          },
          result: closed,
        };
      }

      if (taskType === 'registrar_traspaso_ventas') {
        const required = ['contacto_id', 'entregado_por_id', 'recibido_por_id', 'observaciones_seguimiento'];
        for (const field of required) {
          if (!params[field]) {
            throw new AppError(
              `Falta el campo obligatorio '${field}' para registrar_traspaso_ventas.`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }
        const handoff = await crmSalesService.createHandoff(params);
        return {
          summary: {
            codigo_traspaso: handoff.codigo_traspaso,
            decision_ventas: handoff.decision_ventas,
          },
          references: {
            contacto_id: handoff.contacto_id,
          },
          result: handoff,
        };
      }

      if (taskType === 'responder_traspaso_ventas') {
        if (!params.traspaso_id || !params.decision_ventas) {
          throw new AppError(
            'Se requieren traspaso_id y decision_ventas para responder_traspaso_ventas.',
            400,
            'VALIDATION_ERROR'
          );
        }
        const updated = await crmSalesService.respondToHandoff(params.traspaso_id, params);
        return {
          summary: {
            codigo_traspaso: updated.codigo_traspaso,
            decision_ventas: updated.decision_ventas,
          },
          references: {
            contacto_id: updated.contacto_id,
          },
          result: updated,
        };
      }

      if (taskType === 'identificar_seguimientos_pendientes') {
        const pending = await crmSalesService.listPendingFollowUps(params.hasta_fecha || null);
        return {
          summary: {
            contactos_pendientes: pending.contactos_pendientes.length,
            oportunidades_pendientes: pending.oportunidades_pendientes.length,
          },
          references: {},
          result: pending,
        };
      }

      if (
        taskType === 'analizar_embudo_y_priorizar_leads_ia' ||
        taskType === 'redactar_mensaje_comercial_ia'
      ) {
        const bridge = requireAiBridge();

        let contactoSeleccionado = null;
        if (params.contacto_id) {
          contactoSeleccionado = await crmSalesService.getContactDetail(params.contacto_id);
        }

        if (taskType === 'redactar_mensaje_comercial_ia' && !contactoSeleccionado && !params.organizacion_objetivo) {
          throw new AppError(
            'Debe proporcionar contacto_id existente (u organizacion_objetivo) para redactar_mensaje_comercial_ia.',
            400,
            'VALIDATION_ERROR'
          );
        }

        const [contactos, oportunidades, seguimientos, servicios] = await Promise.all([
          crmSalesService.listContacts({ activo: 1 }),
          crmSalesService.listOpportunities(),
          crmSalesService.listPendingFollowUps(params.hasta_fecha || null),
          clientsServicesService ? clientsServicesService.listServices({ activo: 1 }) : Promise.resolve([]),
        ]);

        const aiResponse = await bridge.invokeAgentWorkflow({
          codigo_ejecucion: executionContext.codigo_ejecucion,
          codigo_agente: AGENT_CODE,
          tipo_tarea: taskType,
          idempotency_key: executionContext.idempotency_key || null,
          reintento_de_id: params._reintento_workflow_id || null,
          parametros: {
            objetivo_comercial:
              params.objetivo_comercial ||
              (taskType === 'redactar_mensaje_comercial_ia'
                ? 'Redactar propuesta comercial personalizada sujeta a autorización humana antes del envío.'
                : 'Priorizar leads activos, identificar oportunidades B2B y recomendar seguimientos inmediatos.'),
            organizacion_objetivo: contactoSeleccionado?.nombre_organizacion || params.organizacion_objetivo || null,
            tono_mensaje: params.tono_mensaje || 'Ejecutivo, cercano y profesional costarricense B2B',
          },
          contexto: {
            contacto_foco: contactoSeleccionado
              ? {
                  id: contactoSeleccionado.id,
                  codigo_contacto: contactoSeleccionado.codigo_contacto,
                  nombre_completo: contactoSeleccionado.nombre_completo,
                  cargo: contactoSeleccionado.cargo,
                  nombre_organizacion: contactoSeleccionado.nombre_organizacion,
                  provincia: contactoSeleccionado.provincia,
                  etapa_actual_codigo: contactoSeleccionado.etapa_actual_codigo,
                  puntuacion_lead: contactoSeleccionado.puntuacion_lead,
                  necesidad_comercial: contactoSeleccionado.necesidad_comercial,
                  presupuesto_declarado_crc: contactoSeleccionado.presupuesto_declarado_crc,
                  contenidos_consumidos: (contactoSeleccionado.contenidos_consumidos || []).slice(0, 5),
                }
              : null,
            leads_y_contactos_activos: contactos.slice(0, 12).map((c) => ({
              id: c.id,
              codigo_contacto: c.codigo_contacto,
              nombre_organizacion: c.nombre_organizacion,
              cargo: c.cargo,
              provincia: c.provincia,
              etapa_actual_codigo: c.etapa_actual_codigo,
              puntuacion_lead: c.puntuacion_lead,
              necesidad_comercial: c.necesidad_comercial,
              presupuesto_declarado_crc: c.presupuesto_declarado_crc,
              fecha_proximo_seguimiento: c.fecha_proximo_seguimiento,
            })),
            oportunidades_pipeline: oportunidades.slice(0, 10).map((o) => ({
              id: o.id,
              codigo_oportunidad: o.codigo_oportunidad,
              titulo_propuesta: o.titulo_propuesta,
              organizacion: o.nombre_organizacion,
              valor_estimado_crc: o.valor_estimado_crc,
              estado_oportunidad: o.estado_oportunidad,
              resultado_cierre: o.resultado_cierre,
            })),
            seguimientos_pendientes_resumen: {
              total_contactos_pendientes: seguimientos.contactos_pendientes.length,
              total_oportunidades_pendientes: seguimientos.oportunidades_pendientes.length,
            },
            catalogo_servicios_crc: servicios.map((s) => ({
              id: s.id,
              codigo_servicio: s.codigo_servicio,
              nombre: s.nombre,
              modalidad_cobro: s.modalidad_cobro,
              tarifa_base_crc: s.tarifa_base_crc,
            })),
          },
          requiredOutputKeys: [
            'diagnostico_embudo',
            'priorizacion_leads',
            'oportunidades_detectadas',
            'seguimientos_recomendados',
            'borradores_mensajes_comerciales',
          ],
        });

        const ia = aiResponse.analisis_ia;
        const borradoresSeguros = Array.isArray(ia.borradores_mensajes_comerciales)
          ? ia.borradores_mensajes_comerciales.map((b) => ({
              ...b,
              enviado_externamente: false,
              requiere_autorizacion_humana: true,
            }))
          : [];

        return {
          summary: {
            proveedor_ia: aiResponse.proveedor_ia,
            modelo_ia: aiResponse.modelo_ia,
            leads_priorizados: Array.isArray(ia.priorizacion_leads) ? ia.priorizacion_leads.length : 0,
            borradores_generados: borradoresSeguros.length,
            enviado_externamente: false,
          },
          references: {
            contacto_id: contactoSeleccionado?.id || null,
            traza_n8n_id: aiResponse.traza_n8n?.id || null,
          },
          result: {
            ...ia,
            borradores_mensajes_comerciales: borradoresSeguros,
            control_autorizacion: {
              enviado_externamente: false,
              requiere_autorizacion_humana: true,
            },
            metadatos_ia: {
              proveedor: aiResponse.proveedor_ia,
              modelo: aiResponse.modelo_ia,
              workflow_n8n: aiResponse.workflow_id,
              duracion_n8n_ms: aiResponse.duracion_n8n_ms,
              intentos: aiResponse.intentos_realizados,
            },
          },
        };
      }

      throw new AppError(`Tarea no implementada: ${taskType}`, 400, 'UNSUPPORTED_AGENT_TASK');
    },
  };
}

module.exports = {
  createSalesContactsAgent,
  calculateDeterministicLeadScore,
  AGENT_CODE,
  SUPPORTED_TASKS,
};
