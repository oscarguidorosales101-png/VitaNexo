const { AppError } = require('../utils/AppError');

const AGENT_CODE = 'agente_contenido';

const SUPPORTED_TASKS = [
  'generar_borrador_contenido',
  'enviar_borrador_a_revision',
  'registrar_decision_revision',
  'consultar_historial_revisiones',
  'generar_publicacion_ia',
  'generar_calendario_editorial_ia',
  'revisar_texto_y_variantes_ia',
];

/**
 * Plantillas deterministas en español para servicios tecnológicos administrativos
 * orientados a clínicas, consultorios y centros de fisioterapia en Costa Rica.
 */
function buildDeterministicDraft({
  tipo_contenido,
  etapa_recorrido,
  segmento_objetivo = 'clínicas pequeñas y centros de fisioterapia en Costa Rica',
  problema_administrativo = 'desorden en la agenda y ausentismo en citas programadas',
  beneficio_clave = 'automatizar recordatorios y centralizar la recepción administrativa',
  llamado_accion = 'Solicite una demostración operativa con el equipo de VitaNexo.',
}) {
  const encabezadosEtapa = {
    conciencia: 'Guía informativa de eficiencia administrativa',
    consideracion: 'Comparativa práctica de modernización operativa',
    decision: 'Propuesta directa de implementación tecnológica',
  };

  const enfoque = encabezadosEtapa[etapa_recorrido] || encabezadosEtapa.conciencia;

  const templates = {
    publicacion_social: `[${enfoque}] En ${segmento_objetivo}, enfrentar ${problema_administrativo} consume horas valiosas de recepción. Con VitaNexo es posible ${beneficio_clave} con tarifas claras en colones. ${llamado_accion}`,
    correo_electronico: `Asunto sugerido: ${enfoque} para ${segmento_objetivo}\n\nEstimado equipo administrativo:\nIdentificamos que ${problema_administrativo} afecta la ocupación semanal. Nuestra plataforma permite ${beneficio_clave} sin interrumpir la operación diaria.\n\nPróximo paso: ${llamado_accion}`,
    anuncio_pagado: `${enfoque}: Solución en Costa Rica para ${segmento_objetivo}. Resuelva ${problema_administrativo} y logre ${beneficio_clave}. ${llamado_accion}`,
    articulo_blog: `Introducción: ${enfoque} aplicado a ${segmento_objetivo}.\n1. Reto frecuente: ${problema_administrativo}.\n2. Mejora operativa: ${beneficio_clave}.\n3. Conclusión administrativa: ${llamado_accion}`,
    guia_descargable: `Lista de verificación operativa — ${enfoque}.\nDirigido a: ${segmento_objetivo}.\nDiagnóstico administrativo: ${problema_administrativo}.\nAcción recomendada: ${beneficio_clave}.\nContacto comercial: ${llamado_accion}`,
    guion_webinar: `Apertura (10 min): Contexto de ${segmento_objetivo}.\nDesarrollo (25 min): Cómo abordar ${problema_administrativo} para ${beneficio_clave}.\nCierre comercial (10 min): Preguntas administrativas y ${llamado_accion}`,
  };

  const cuerpo = templates[tipo_contenido];
  if (!cuerpo) {
    throw new AppError(
      `Tipo de contenido no soportado por las plantillas deterministas: '${tipo_contenido}'.`,
      400,
      'INVALID_CONTENT_TYPE'
    );
  }

  return {
    titulo_sugerido: `${enfoque}: ${beneficio_clave}`.slice(0, 175),
    cuerpo_generado: cuerpo,
  };
}

function createContentAgent({ contentsService, campaignsService = null, clientsServicesService = null, n8nBridge = null }) {
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

      if (taskType === 'generar_borrador_contenido') {
        const required = ['campana_id', 'canal_id', 'etapa_recorrido', 'tipo_contenido'];
        for (const field of required) {
          if (!params[field]) {
            throw new AppError(
              `Falta el campo obligatorio '${field}' para generar_borrador_contenido.`,
              400,
              'VALIDATION_ERROR'
            );
          }
        }

        const generated = buildDeterministicDraft(params);
        const created = await contentsService.createContentDraft(
          {
            campana_id: params.campana_id,
            canal_id: params.canal_id,
            autor_colaborador_id: params.autor_colaborador_id || null,
            titulo: params.titulo || generated.titulo_sugerido,
            etapa_recorrido: params.etapa_recorrido,
            tipo_contenido: params.tipo_contenido,
            cuerpo_borrador: params.cuerpo_borrador || generated.cuerpo_generado,
            fecha_programada_publicacion: params.fecha_programada_publicacion || null,
          },
          { agentCode: AGENT_CODE }
        );

        return {
          summary: {
            codigo_contenido: created.codigo_contenido,
            estado: created.estado,
            tipo_contenido: created.tipo_contenido,
          },
          references: {
            campana_id: created.campana_id,
            contenido_id: created.id,
          },
          result: {
            borrador: created,
            metodo_generacion: 'plantilla_determinista_reglas_locales',
            publicado_externamente: false,
          },
        };
      }

      if (taskType === 'enviar_borrador_a_revision') {
        if (!params.contenido_id || !params.revisor_id) {
          throw new AppError(
            'Se requieren contenido_id y revisor_id para enviar un borrador a revisión.',
            400,
            'VALIDATION_ERROR'
          );
        }
        const res = await contentsService.reviewContent(
          params.contenido_id,
          {
            decision: 'enviar_a_revision',
            revisor_id: params.revisor_id,
            comentarios: params.comentarios || 'Enviado a cola de revisión editorial.',
            actor_tipo: 'humano',
          },
          { isAgent: false }
        );
        return {
          summary: {
            contenido_id: res.contenido.id,
            estado_resultante: res.contenido.estado,
          },
          references: {
            campana_id: res.contenido.campana_id,
            contenido_id: res.contenido.id,
          },
          result: res,
        };
      }

      if (taskType === 'registrar_decision_revision') {
        if (!params.contenido_id || !params.decision) {
          throw new AppError(
            'Se requieren contenido_id y decision para registrar_decision_revision.',
            400,
            'VALIDATION_ERROR'
          );
        }

        const isHumanVerified = params.actor_tipo === 'humano' && Boolean(params.revisor_id);
        if (params.decision === 'aprobar' && !isHumanVerified) {
          throw new AppError(
            'El agente de contenido tiene prohibido aprobar sus propios borradores. La aprobación requiere actor_tipo="humano" y un revisor_id autorizado.',
            403,
            'AGENT_SELF_APPROVAL_FORBIDDEN'
          );
        }

        const res = await contentsService.reviewContent(
          params.contenido_id,
          {
            decision: params.decision,
            revisor_id: params.revisor_id,
            comentarios: params.comentarios || 'Revisión registrada.',
            actor_tipo: params.actor_tipo || 'agente',
          },
          { isAgent: !isHumanVerified }
        );

        return {
          summary: {
            contenido_id: res.contenido.id,
            decision: params.decision,
            estado_resultante: res.contenido.estado,
          },
          references: {
            campana_id: res.contenido.campana_id,
            contenido_id: res.contenido.id,
          },
          result: res,
        };
      }

      if (taskType === 'consultar_historial_revisiones') {
        if (!params.contenido_id) {
          throw new AppError(
            'Se requiere contenido_id para consultar_historial_revisiones.',
            400,
            'VALIDATION_ERROR'
          );
        }
        const detail = await contentsService.getContentDetail(params.contenido_id);
        return {
          summary: {
            codigo_contenido: detail.codigo_contenido,
            estado_actual: detail.estado,
            total_revisiones: detail.historial_revisiones.length,
          },
          references: {
            campana_id: detail.campana_id,
            contenido_id: detail.id,
          },
          result: detail,
        };
      }

      if (
        taskType === 'generar_publicacion_ia' ||
        taskType === 'generar_calendario_editorial_ia' ||
        taskType === 'revisar_texto_y_variantes_ia'
      ) {
        const bridge = requireAiBridge();

        let existingContent = null;
        if (params.contenido_id) {
          existingContent = await contentsService.getContentDetail(params.contenido_id);
        }

        const campanaId = Number(params.campana_id || existingContent?.campana_id || 0);
        const canalId = Number(params.canal_id || existingContent?.canal_id || 0);

        if (taskType === 'generar_publicacion_ia' && (!campanaId || !canalId)) {
          throw new AppError(
            'Se requieren campana_id y canal_id válidos para generar_publicacion_ia.',
            400,
            'VALIDATION_ERROR'
          );
        }
        if (taskType === 'revisar_texto_y_variantes_ia' && !existingContent && !params.texto_borrador) {
          throw new AppError(
            'Debe proporcionar contenido_id existente o texto_borrador para revisar_texto_y_variantes_ia.',
            400,
            'VALIDATION_ERROR'
          );
        }

        const campanaInfo =
          campanaId && campaignsService ? await campaignsService.getCampaignDetail(campanaId) : null;
        const canalInfo =
          canalId && clientsServicesService ? await clientsServicesService.getChannelById(canalId) : null;

        const validTypes = [
          'publicacion_social',
          'correo_electronico',
          'anuncio_pagado',
          'articulo_blog',
          'guia_descargable',
          'guion_webinar',
        ];
        const validStages = ['conciencia', 'consideracion', 'decision'];

        const requestedType = validTypes.includes(params.tipo_contenido)
          ? params.tipo_contenido
          : existingContent?.tipo_contenido || 'publicacion_social';
        const requestedStage = validStages.includes(params.etapa_recorrido)
          ? params.etapa_recorrido
          : existingContent?.etapa_recorrido || campanaInfo?.campana?.etapa_recorrido || 'consideracion';

        const aiResponse = await bridge.invokeAgentWorkflow({
          codigo_ejecucion: executionContext.codigo_ejecucion,
          codigo_agente: AGENT_CODE,
          tipo_tarea: taskType,
          idempotency_key: executionContext.idempotency_key || null,
          reintento_de_id: params._reintento_workflow_id || null,
          parametros: {
            tema_central: params.tema_central || 'Automatización de agenda, recordatorios y facturación en clínicas de Costa Rica',
            tipo_contenido: requestedType,
            etapa_recorrido: requestedStage,
            audiencia: params.audiencia || 'Administradores y directores de clínicas pequeñas y centros de fisioterapia en Costa Rica',
            semanas_calendario: Number(params.semanas_calendario || 4),
          },
          contexto: {
            campana: campanaInfo?.campana || null,
            canal: canalInfo || null,
            contenido_existente_a_revisar: existingContent
              ? {
                  id: existingContent.id,
                  codigo_contenido: existingContent.codigo_contenido,
                  titulo: existingContent.titulo,
                  cuerpo_borrador: existingContent.cuerpo_borrador,
                  version_actual: existingContent.version_actual,
                  estado: existingContent.estado,
                }
              : params.texto_borrador
              ? { cuerpo_borrador: params.texto_borrador }
              : null,
          },
          requiredOutputKeys: ['pieza_principal', 'variantes', 'calendario_editorial', 'revision_editorial'],
        });

        const ia = aiResponse.analisis_ia;
        let persistedDraft = null;

        if (taskType === 'generar_publicacion_ia' && params.guardar_borrador !== false && campanaId && canalId) {
          const finalType = validTypes.includes(ia.pieza_principal?.tipo_contenido)
            ? ia.pieza_principal.tipo_contenido
            : requestedType;
          const finalStage = validStages.includes(ia.pieza_principal?.etapa_recorrido)
            ? ia.pieza_principal.etapa_recorrido
            : requestedStage;

          persistedDraft = await contentsService.createContentDraft(
            {
              campana_id: campanaId,
              canal_id: canalId,
              autor_colaborador_id: params.autor_colaborador_id || null,
              titulo: String(ia.pieza_principal?.titulo || `Publicación IA ${requestedType}`).slice(0, 175),
              etapa_recorrido: finalStage,
              tipo_contenido: finalType,
              cuerpo_borrador: String(
                ia.pieza_principal?.cuerpo_texto || 'Borrador generado para revisión humana.'
              ),
              fecha_programada_publicacion: params.fecha_programada_publicacion || null,
            },
            { agentCode: AGENT_CODE }
          );

          // Si se solicita enviar inmediatamente a la bandeja de revisión humana (sin autoaprobar jamás)
          if (params.enviar_a_revision && params.revisor_id) {
            const reviewRes = await contentsService.reviewContent(
              persistedDraft.id,
              {
                decision: 'enviar_a_revision',
                revisor_id: Number(params.revisor_id),
                comentarios: 'Propuesta generada con Gemini enviada automáticamente a cola de aprobación humana.',
                actor_tipo: 'humano',
              },
              { isAgent: false }
            );
            persistedDraft = reviewRes.contenido;
          }
        }

        return {
          summary: {
            proveedor_ia: aiResponse.proveedor_ia,
            modelo_ia: aiResponse.modelo_ia,
            contenido_guardado_id: persistedDraft?.id || existingContent?.id || null,
            estado_contenido: persistedDraft?.estado || existingContent?.estado || 'propuesta_no_guardada',
            cantidad_variantes: Array.isArray(ia.variantes) ? ia.variantes.length : 0,
            autoaprobado: false,
            publicado_externamente: false,
          },
          references: {
            campana_id: campanaId || null,
            contenido_id: persistedDraft?.id || existingContent?.id || null,
            traza_n8n_id: aiResponse.traza_n8n?.id || null,
          },
          result: {
            ...ia,
            control_aprobacion: {
              autoaprobado: false,
              publicado_externamente: false,
              requiere_revision_humana: true,
            },
            borrador_persistido_vitabase: persistedDraft,
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
  createContentAgent,
  buildDeterministicDraft,
  AGENT_CODE,
  SUPPORTED_TASKS,
};
