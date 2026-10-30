const { AppError } = require('../utils/AppError');
const { generateBusinessCode } = require('../utils/sanitize');
const { runWithAiRequestContext } = require('./aiRequestContext');

const DEFAULT_TASKS_BY_AGENT = {
  agente_campanas: 'analizar_estrategia_campana_ia',
  agente_contenido: 'revisar_texto_y_variantes_ia',
  agente_metricas: 'interpretar_metricas_ia',
  agente_contactos_ventas: 'analizar_embudo_y_priorizar_leads_ia',
};

function createAiCenterService({
  aiCenterRepo,
  aiProvidersService,
  aiPolicyGuardService,
  orchestrator,
  agentExecutionsRepo,
  maxConcurrent = 4,
}) {
  const activeControllers = new Map();
  const queue = [];
  let runningCount = 0;

  function pumpQueue() {
    while (runningCount < maxConcurrent && queue.length > 0) {
      const nextFn = queue.shift();
      runningCount += 1;
      nextFn().finally(() => {
        runningCount = Math.max(0, runningCount - 1);
        pumpQueue();
      });
    }
  }

  function enqueue(fn) {
    queue.push(fn);
    setImmediate(pumpQueue);
  }

  const self = {
    async recoverOnStartup() {
      const affected = await aiCenterRepo.recoverInterruptedRequests();
      if (affected > 0) {
        console.log(`[VitaNexo IA] ${affected} solicitudes en estado 'procesando' recuperadas tras reinicio.`);
      }
      return affected;
    },

    async listConversations(user, filters = {}) {
      const userId = user?.id || user?.sub;
      const colabId = filters.todos && user?.rol === 'direccion_comercial' ? null : userId;
      return aiCenterRepo.listConversations({
        colaborador_id: colabId,
        codigo_agente: filters.codigo_agente || null,
        estado: filters.estado || null,
        limit: filters.limit || 40,
      });
    },

    async createConversation(user, { codigo_agente, titulo = null }) {
      const userId = user?.id || user?.sub;
      aiPolicyGuardService.assertAgentAccess(user, codigo_agente);
      const agentRow = await agentExecutionsRepo.getAgentByCode(codigo_agente);
      if (!agentRow || !agentRow.activo) {
        throw new AppError(`El agente '${codigo_agente}' no está disponible.`, 404, 'AGENT_NOT_FOUND');
      }

      const cleanTitle = String(titulo || `Conversación con ${agentRow.nombre}`).trim().slice(0, 180);
      const code = generateBusinessCode('CONV');

      return aiCenterRepo.createConversation({
        codigo_conversacion: code,
        colaborador_id: userId,
        agente_id: agentRow.id,
        codigo_agente,
        titulo: cleanTitle,
      });
    },

    async getConversationDetail(user, id) {
      const userId = user?.id || user?.sub;
      const conversation = await aiCenterRepo.getConversationById(id);
      if (!conversation) {
        throw new AppError(`Conversación #${id} no encontrada.`, 404, 'CONVERSATION_NOT_FOUND');
      }
      if (conversation.colaborador_id !== userId && user?.rol !== 'direccion_comercial') {
        throw new AppError('No tienes permiso para consultar esta conversación.', 403, 'FORBIDDEN_CONVERSATION_ACCESS');
      }
      const requests = await aiCenterRepo.listRequestsByConversation(id);
      return {
        ...conversation,
        solicitudes: requests,
      };
    },

    async listRequests(user, filters = {}) {
      const userId = user?.id || user?.sub;
      const colabId = filters.todos && user?.rol === 'direccion_comercial' ? null : userId;
      return aiCenterRepo.listRequests({
        colaborador_id: colabId,
        codigo_agente: filters.codigo_agente || null,
        estado: filters.estado || null,
        limit: filters.limit || 50,
      });
    },

    async getRequestStatus(user, id) {
      const userId = user?.id || user?.sub;
      const req = await aiCenterRepo.getRequestById(id);
      if (!req) {
        throw new AppError(`Solicitud de IA #${id} no encontrada.`, 404, 'AI_REQUEST_NOT_FOUND');
      }
      if (req.colaborador_id !== userId && user?.rol !== 'direccion_comercial') {
        throw new AppError('No tienes permiso para consultar el estado de esta solicitud.', 403, 'FORBIDDEN_REQUEST_ACCESS');
      }
      return req;
    },

    /**
     * Envío asíncrono y persistente de una solicitud de IA.
     * Retorna inmediatamente un objeto con estado 'pendiente' y código de solicitud único.
     * La ejecución continúa en segundo plano sin mantener bloqueada la conexión HTTP.
     */
    async submitRequest(user, {
      mensaje_usuario,
      codigo_agente,
      conversacion_id = null,
      tipo_tarea = null,
      parametros = {},
      idempotency_key = null,
      reintento_de_solicitud_id = null,
    }) {
      const userId = user?.id || user?.sub;
      aiPolicyGuardService.assertAgentAccess(user, codigo_agente);
      const cleanMessage = aiPolicyGuardService.validateMessage(mensaje_usuario);
      aiPolicyGuardService.enforceUserRate(userId);

      if (parametros.guardar_propuesta) {
        aiPolicyGuardService.assertWriteOptionAllowed(user, 'guardar_propuesta');
      }
      if (parametros.guardar_borrador) {
        aiPolicyGuardService.assertWriteOptionAllowed(user, 'guardar_borrador');
      }

      // Verificación de idempotencia para prevenir duplicados por doble clic o reconexión
      if (idempotency_key) {
        const existing = await aiCenterRepo.findRequestByIdempotencyKey(idempotency_key);
        if (existing) {
          return {
            solicitud: existing,
            idempotente_reutilizado: true,
          };
        }
      }

      // Control de concurrencia por colaborador
      const activeCount = await aiCenterRepo.countActiveRequestsForUser(userId);
      aiPolicyGuardService.assertActiveLimit(activeCount);

      // Evaluación contextual de la frontera administrativa vs clínica
      const scope = aiPolicyGuardService.evaluateScope(cleanMessage);

      // Garantizar conversación activa
      let conversation = null;
      if (conversacion_id) {
        conversation = await aiCenterRepo.getConversationById(conversacion_id);
        if (!conversation) {
          throw new AppError(`Conversación #${conversacion_id} no encontrada.`, 404, 'CONVERSATION_NOT_FOUND');
        }
        if (conversation.colaborador_id !== userId && user?.rol !== 'direccion_comercial') {
          throw new AppError('No tienes acceso a esta conversación.', 403, 'FORBIDDEN_CONVERSATION_ACCESS');
        }
      } else {
        const agentRow = await agentExecutionsRepo.getAgentByCode(codigo_agente);
        const autoTitle = cleanMessage.length > 55 ? `${cleanMessage.slice(0, 52)}...` : cleanMessage;
        conversation = await aiCenterRepo.createConversation({
          codigo_conversacion: generateBusinessCode('CONV'),
          colaborador_id: userId,
          agente_id: agentRow.id,
          codigo_agente,
          titulo: autoTitle,
        });
      }

      const agentRow = await agentExecutionsRepo.getAgentByCode(codigo_agente);
      const assignedTask = tipo_tarea || DEFAULT_TASKS_BY_AGENT[codigo_agente] || 'consulta_conversacional_ia';
      const requestCode = generateBusinessCode('SOL');

      // Si la solicitud es explícitamente clínica, se responde de inmediato con orientación administrativa
      if (!scope.permitido) {
        const directReq = await aiCenterRepo.createRequest({
          codigo_solicitud: requestCode,
          idempotency_key: idempotency_key || null,
          conversacion_id: conversation.id,
          colaborador_id: userId,
          agente_id: agentRow.id,
          codigo_agente,
          tipo_tarea_resuelta: assignedTask,
          mensaje_usuario: cleanMessage,
          parametros_entrada: parametros,
          proveedor_ia: 'politica_vitanexo',
          modelo_ia: 'filtro_contextual',
          via_n8n: 0,
          reintento_de_solicitud_id,
        });

        const respuestaPolicial =
          `${scope.mensaje}\n\n` +
          `**Alternativa administrativa sugerida:**\n${scope.alternativa_administrativa}`;

        const completed = await aiCenterRepo.markRequestCompleted(directReq.id, {
          respuesta_texto: respuestaPolicial,
          respuesta_estructurada: {
            alcance_permitido: false,
            motivo: scope.motivo,
            alternativa_administrativa: scope.alternativa_administrativa,
          },
          advertencias_politica: [scope.motivo],
          proveedor_ia: 'politica_vitanexo',
          modelo_ia: 'filtro_contextual',
          via_n8n: false,
          duracion_ms: 15,
        });

        await aiCenterRepo.updateConversationActivity(conversation.id, 1);
        return {
          solicitud: completed,
          idempotente_reutilizado: false,
        };
      }

      // Registro inicial de la solicitud en estado 'pendiente'
      const plan = await aiProvidersService.resolveExecutionPlan(codigo_agente);
      const primaryCandidate = plan.candidates[0] || {};

      const createdReq = await aiCenterRepo.createRequest({
        codigo_solicitud: requestCode,
        idempotency_key: idempotency_key || null,
        conversacion_id: conversation.id,
        colaborador_id: userId,
        agente_id: agentRow.id,
        codigo_agente,
        tipo_tarea_resuelta: assignedTask,
        mensaje_usuario: cleanMessage,
        parametros_entrada: parametros,
        proveedor_ia: primaryCandidate.proveedor_ia || 'gemini-api',
        modelo_ia: primaryCandidate.modelo || 'models/gemini-3-flash-preview',
        via_n8n: primaryCandidate.kind !== 'direct' ? 1 : 0,
        reintento_de_solicitud_id,
      });

      // Encolar procesamiento en segundo plano
      enqueue(async () => {
        await self._processRequestJob(createdReq.id, {
          user,
          conversation,
          agentRow,
          assignedTask,
          cleanMessage,
          parametros,
          plan,
          scopeWarnings: scope.advertencias,
        });
      });

      return {
        solicitud: createdReq,
        idempotente_reutilizado: false,
      };
    },

    async _processRequestJob(solicitudId, {
      user,
      conversation,
      agentRow,
      assignedTask,
      cleanMessage,
      parametros,
      plan,
      scopeWarnings,
    }) {
      const abortController = new AbortController();
      activeControllers.set(solicitudId, abortController);
      const startTime = Date.now();

      try {
        await aiCenterRepo.markRequestProcessing(solicitudId, {
          etapa_progreso: 'Iniciando conexión con el sistema de automatización',
        });

        // Recuperar turnos previos de la conversación para dar contexto conversacional a la IA
        const prevRequests = await aiCenterRepo.listRequestsByConversation(conversation.id);
        const historyTurns = [];
        for (const r of prevRequests.slice(-6)) {
          if (r.id === solicitudId) continue;
          if (r.mensaje_usuario) {
            historyTurns.push({ rol: 'user', texto: r.mensaje_usuario });
          }
          if (r.respuesta_texto && r.estado === 'completada') {
            historyTurns.push({ rol: 'assistant', texto: r.respuesta_texto });
          }
        }

        const asyncContext = {
          mensaje_usuario: cleanMessage,
          historial_conversacion: historyTurns,
          candidates: plan.candidates,
          signal: abortController.signal,
          onProgress: async (stepDesc) => {
            await aiCenterRepo.updateRequestProgress(solicitudId, stepDesc).catch(() => {});
          },
        };

        const dispatchParams = {
          ...parametros,
          _mensaje_usuario_conversacional: cleanMessage,
        };

        // Enriquecimiento de parámetros según tarea
        if (assignedTask === 'analizar_estrategia_campana_ia') {
          if (!dispatchParams.objetivo_comercial) dispatchParams.objetivo_comercial = cleanMessage;
          if (!dispatchParams.presupuesto_disponible_crc) dispatchParams.presupuesto_disponible_crc = 350000;
        } else if (assignedTask === 'revisar_texto_y_variantes_ia') {
          if (!dispatchParams.texto_borrador) dispatchParams.texto_borrador = cleanMessage;
        } else if (assignedTask === 'interpretar_metricas_ia') {
          if (!dispatchParams.enfoque_analisis) dispatchParams.enfoque_analisis = cleanMessage;
        } else if (assignedTask === 'analizar_embudo_y_priorizar_leads_ia') {
          if (!dispatchParams.objetivo_comercial) dispatchParams.objetivo_comercial = cleanMessage;
        }

        const result = await runWithAiRequestContext(asyncContext, async () => {
          return orchestrator.dispatch({
            tipo_tarea: assignedTask,
            codigo_agente: agentRow.codigo_agente,
            parametros: dispatchParams,
            idempotency_key: `SOL-${solicitudId}`,
          });
        });

        const outputData = result.resultado || {};
        const durationMs = Date.now() - startTime;

        let respuestaConversacional =
          outputData.respuesta_conversacional ||
          (typeof outputData === 'string' ? outputData : null);

        if (!respuestaConversacional) {
          if (outputData.resumen_ejecutivo) respuestaConversacional = outputData.resumen_ejecutivo;
          else if (outputData.analisis_objetivo) respuestaConversacional = outputData.analisis_objetivo;
          else if (outputData.diagnostico_embudo) respuestaConversacional = outputData.diagnostico_embudo;
          else if (outputData.pieza_principal?.cuerpo_texto) respuestaConversacional = outputData.pieza_principal.cuerpo_texto;
          else respuestaConversacional = `Tarea '${assignedTask}' completada exitosamente a partir de los datos en VitaBase.`;
        }

        const metaIa = outputData.metadatos_ia || {};

        try {
          await aiCenterRepo.markRequestCompleted(solicitudId, {
            respuesta_texto: String(respuestaConversacional),
            respuesta_estructurada: outputData,
            advertencias_politica: scopeWarnings && scopeWarnings.length ? scopeWarnings : null,
            proveedor_ia: metaIa.proveedor || plan.candidates[0]?.proveedor_ia || 'gemini-api',
            modelo_ia: metaIa.modelo || plan.candidates[0]?.modelo || 'models/gemini-3-flash-preview',
            via_n8n: metaIa.workflow_n8n !== undefined ? Boolean(metaIa.workflow_n8n) : true,
            workflow_n8n_id: metaIa.workflow_n8n || null,
            ejecucion_agente_id: result.ejecucion?.id || null,
            traza_n8n_id: outputData.references?.traza_n8n_id || null,
            duracion_ms: durationMs,
          });

          await aiCenterRepo.updateConversationActivity(conversation.id, 1);
        } catch (dbErr) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(`[aiCenterService] No se pudo guardar la finalización de la solicitud #${solicitudId}: ${dbErr.message}`);
          }
        }
      } catch (err) {
        const durationMs = Date.now() - startTime;
        try {
          if (err.errorCode === 'AI_REQUEST_CANCELLED' || abortController.signal.aborted) {
            await aiCenterRepo.markRequestCancelled(solicitudId, {
              motivo: 'Cancelada por el colaborador durante la ejecución',
            });
          } else {
            await aiCenterRepo.markRequestError(solicitudId, {
              codigo_error: err.errorCode || 'AI_EXECUTION_ERROR',
              mensaje_error: err.message,
              duracion_ms: durationMs,
            });
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(`[aiCenterService] No se pudo guardar el error de la solicitud #${solicitudId}: ${dbErr.message}`);
          }
        }
      } finally {
        activeControllers.delete(solicitudId);
      }
    },

    async cancelRequest(user, id) {
      const userId = user?.id || user?.sub;
      const req = await aiCenterRepo.getRequestById(id);
      if (!req) {
        throw new AppError(`Solicitud de IA #${id} no encontrada.`, 404, 'AI_REQUEST_NOT_FOUND');
      }
      if (req.colaborador_id !== userId && user?.rol !== 'direccion_comercial') {
        throw new AppError('No tienes permiso para cancelar esta solicitud.', 403, 'FORBIDDEN_REQUEST_ACCESS');
      }
      if (['completada', 'error', 'cancelada'].includes(req.estado)) {
        return req; // Ya está finalizada
      }

      const activeCtrl = activeControllers.get(Number(id));
      if (activeCtrl) {
        activeCtrl.abort();
      }

      return aiCenterRepo.markRequestCancelled(id, {
        motivo: `Cancelada por el colaborador (${user.nombre_completo || 'usuario'})`,
      });
    },

    async retryRequest(user, id) {
      const userId = user?.id || user?.sub;
      const original = await aiCenterRepo.getRequestById(id);
      if (!original) {
        throw new AppError(`Solicitud de IA #${id} no encontrada.`, 404, 'AI_REQUEST_NOT_FOUND');
      }
      if (original.colaborador_id !== userId && user?.rol !== 'direccion_comercial') {
        throw new AppError('No tienes permiso para reintentar esta solicitud.', 403, 'FORBIDDEN_REQUEST_ACCESS');
      }

      return self.submitRequest(user, {
        mensaje_usuario: original.mensaje_usuario,
        codigo_agente: original.codigo_agente,
        conversacion_id: original.conversacion_id,
        tipo_tarea: original.tipo_tarea_resuelta,
        parametros: original.parametros_entrada || {},
        idempotency_key: null,
        reintento_de_solicitud_id: original.id,
      });
    },

    async waitForIdle(timeoutMs = 15000) {
      const start = Date.now();
      while ((runningCount > 0 || queue.length > 0) && Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, 100));
      }
    },
  };

  return self;
}

module.exports = {
  createAiCenterService,
};
