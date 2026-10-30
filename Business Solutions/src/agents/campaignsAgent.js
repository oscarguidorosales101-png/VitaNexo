const { AppError } = require('../utils/AppError');

const AGENT_CODE = 'agente_campanas';

const SUPPORTED_TASKS = [
  'proponer_campana',
  'registrar_asignacion_presupuesto',
  'consultar_campanas',
  'analizar_estrategia_campana_ia',
  'recomendar_distribucion_presupuesto_ia',
];

function evaluateStageChannelCoherence(etapaRecorrido, clasificacionCanal) {
  if (etapaRecorrido === 'decision' && clasificacionCanal === 'pagado') {
    return 'ALTA_AFINIDAD_INTENCION_DIRECTA';
  }
  if (etapaRecorrido === 'conciencia' && clasificacionCanal === 'organico') {
    return 'ALTA_AFINIDAD_EDUCATIVA_SOSTENIBLE';
  }
  return 'COMBINACION_VALIDA_COMPLEMENTARIA';
}

function createCampaignsAgent({ campaignsService, clientsServicesService, n8nBridge = null }) {
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

      if (taskType === 'proponer_campana') {
        const required = [
          'nombre',
          'descripcion',
          'objetivo',
          'etapa_recorrido',
          'canal_principal_id',
          'fecha_inicio',
          'fecha_fin',
          'justificacion_presupuesto',
        ];
        for (const field of required) {
          if (params[field] === undefined || params[field] === null || params[field] === '') {
            throw new AppError(
              `Falta el campo obligatorio '${field}' para proponer_campana.`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }

        if (params.estado && params.estado !== 'propuesta') {
          throw new AppError(
            'El agente de campañas no puede activar publicidad ni gastar dinero real; solo genera propuestas en estado propuesta.',
            403,
            'AGENT_CAMPAIGN_ACTIVATION_FORBIDDEN'
          );
        }

        const channel = await clientsServicesService.getChannelById(params.canal_principal_id);
        const campaign = await campaignsService.createCampaign(
          {
            ...params,
            estado: 'propuesta',
          },
          { isAgent: true }
        );

        const startMs = Date.parse(campaign.fecha_inicio);
        const endMs = Date.parse(campaign.fecha_fin);
        const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
        const dailyReferenceCrc = Number((Number(campaign.presupuesto_total_crc) / durationDays).toFixed(2));

        return {
          summary: {
            codigo_campana: campaign.codigo_campana,
            estado: campaign.estado,
            presupuesto_total_crc: campaign.presupuesto_total_crc,
          },
          references: {
            campana_id: campaign.id,
          },
          result: {
            propuesta_campana: campaign,
            evaluacion_determinista: {
              duracion_dias: durationDays,
              referencia_diaria_crc: dailyReferenceCrc,
              afinidad_etapa_canal: evaluateStageChannelCoherence(
                campaign.etapa_recorrido,
                channel.clasificacion
              ),
              requiere_revision_humana: true,
              publicidad_activada: false,
            },
          },
        };
      }

      if (taskType === 'registrar_asignacion_presupuesto') {
        const required = [
          'campana_id',
          'canal_id',
          'responsable_id',
          'periodo_inicio',
          'periodo_fin',
          'monto_asignado_crc',
          'razon_decision',
        ];
        for (const field of required) {
          if (params[field] === undefined || params[field] === null || params[field] === '') {
            throw new AppError(
              `Falta el campo obligatorio '${field}' para registrar_asignacion_presupuesto.`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }

        const allocation = await campaignsService.createBudgetAllocation(params, { isAgent: true });
        return {
          summary: {
            asignacion_id: allocation.id,
            campana_id: allocation.campana_id,
            monto_asignado_crc: allocation.monto_asignado_crc,
            estado_asignacion: allocation.estado_asignacion,
          },
          references: {
            campana_id: allocation.campana_id,
          },
          result: allocation,
        };
      }

      if (taskType === 'consultar_campanas') {
        const rows = await campaignsService.listCampaigns(params);
        return {
          summary: { total_campanas: rows.length },
          references: {},
          result: rows,
        };
      }

      if (taskType === 'analizar_estrategia_campana_ia' || taskType === 'recomendar_distribucion_presupuesto_ia') {
        const bridge = requireAiBridge();
        if (!params.objetivo_comercial && !params.campana_id) {
          throw new AppError(
            'Debe indicar objetivo_comercial (o campana_id existente) para ejecutar el análisis con Gemini.',
            400,
            'VALIDATION_ERROR'
          );
        }

        const [canalesActivos, campanasActuales] = await Promise.all([
          clientsServicesService.listChannels({ activo: 1 }),
          campaignsService.listCampaigns(),
        ]);

        const campanaObjetivo = params.campana_id
          ? campanasActuales.find((c) => Number(c.id) === Number(params.campana_id)) || null
          : null;

        const aiResponse = await bridge.invokeAgentWorkflow({
          codigo_ejecucion: executionContext.codigo_ejecucion,
          codigo_agente: AGENT_CODE,
          tipo_tarea: taskType,
          idempotency_key: executionContext.idempotency_key || null,
          reintento_de_id: params._reintento_workflow_id || null,
          parametros: {
            objetivo_comercial: params.objetivo_comercial || campanaObjetivo?.objetivo || 'Captación B2B de clínicas en Costa Rica',
            presupuesto_disponible_crc: Number(params.presupuesto_disponible_crc ?? campanaObjetivo?.presupuesto_total_crc ?? 350000),
            etapa_recorrido_preferida: params.etapa_recorrido || campanaObjetivo?.etapa_recorrido || 'consideracion',
            segmento_objetivo: params.segmento_objetivo || 'Clínicas pequeñas, consultorios médicos y centros de fisioterapia en Costa Rica',
          },
          contexto: {
            canales_disponibles_vitabase: canalesActivos.map((c) => ({
              id: c.id,
              codigo_canal: c.codigo_canal,
              nombre: c.nombre,
              clasificacion: c.clasificacion,
              plataforma: c.plataforma,
            })),
            resumen_campanas_existentes: campanasActuales.slice(0, 8).map((c) => ({
              id: c.id,
              codigo_campana: c.codigo_campana,
              nombre: c.nombre,
              etapa_recorrido: c.etapa_recorrido,
              canal_principal_nombre: c.canal_principal_nombre,
              presupuesto_total_crc: c.presupuesto_total_crc,
              estado: c.estado,
            })),
            campana_seleccionada: campanaObjetivo,
          },
          requiredOutputKeys: [
            'analisis_objetivo',
            'estrategia_recomendada',
            'propuesta_campana',
            'canales_recomendados',
            'distribucion_presupuesto',
            'explicacion_decisiones',
          ],
        });

        const ia = aiResponse.analisis_ia;
        let savedCampaign = null;

        if (taskType === 'analizar_estrategia_campana_ia' && params.guardar_propuesta === true) {
          const validStages = ['conciencia', 'consideracion', 'decision'];
          const stage = validStages.includes(ia.propuesta_campana?.etapa_recorrido)
            ? ia.propuesta_campana.etapa_recorrido
            : params.etapa_recorrido || 'consideracion';

          const suggestedChannelId = Number(ia.propuesta_campana?.canal_principal_id);
          const channelMatch =
            canalesActivos.find((c) => c.id === suggestedChannelId) || canalesActivos[0];

          if (!channelMatch) {
            throw new AppError('No hay canales activos en VitaBase para guardar la propuesta.', 400, 'NO_ACTIVE_CHANNELS');
          }

          const today = new Date();
          const startStr = params.fecha_inicio || today.toISOString().slice(0, 10);
          const endObj = new Date(today.getTime() + 30 * 86400000);
          const endStr = params.fecha_fin || endObj.toISOString().slice(0, 10);
          const budgetCrc = Math.max(
            0,
            Number(ia.propuesta_campana?.presupuesto_sugerido_crc ?? params.presupuesto_disponible_crc ?? 250000)
          );

          savedCampaign = await campaignsService.createCampaign(
            {
              nombre: String(ia.propuesta_campana?.nombre_sugerido || `Propuesta IA ${Date.now()}`).slice(0, 135),
              descripcion: String(ia.propuesta_campana?.descripcion || ia.estrategia_recomendada),
              objetivo: String(ia.propuesta_campana?.objetivo || params.objetivo_comercial),
              etapa_recorrido: stage,
              canal_principal_id: channelMatch.id,
              responsable_id: params.responsable_id || null,
              fecha_inicio: startStr,
              fecha_fin: endStr,
              presupuesto_total_crc: budgetCrc,
              justificacion_presupuesto: String(
                ia.propuesta_campana?.justificacion_presupuesto || ia.analisis_objetivo
              ),
              costo_operativo_mercadeo_crc: Number(params.costo_operativo_mercadeo_crc || 0),
              estado: 'propuesta',
            },
            { isAgent: true }
          );
        }

        return {
          summary: {
            proveedor_ia: aiResponse.proveedor_ia,
            modelo_ia: aiResponse.modelo_ia,
            workflow_id: aiResponse.workflow_id,
            campana_guardada_id: savedCampaign?.id || null,
            canales_recomendados: Array.isArray(ia.canales_recomendados) ? ia.canales_recomendados.length : 0,
            publicidad_activada: false,
          },
          references: {
            campana_id: savedCampaign?.id || campanaObjetivo?.id || null,
            traza_n8n_id: aiResponse.traza_n8n?.id || null,
          },
          result: {
            ...ia,
            restricciones_seguridad: {
              publicidad_activada: false,
              gasto_ejecutado_crc: 0,
              requiere_aprobacion_humana: true,
            },
            campana_persistida_vitabase: savedCampaign,
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
  createCampaignsAgent,
  AGENT_CODE,
  SUPPORTED_TASKS,
};
