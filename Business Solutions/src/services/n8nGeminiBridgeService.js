const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');
const { generateBusinessCode, sanitizePayload, containsProhibitedClinicalData } = require('../utils/sanitize');
const { getAiRequestContext } = require('./aiRequestContext');

function formatNowMysqlMillis(date = new Date()) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const AGENT_WORKFLOW_MAP = {
  agente_campanas: {
    workflow_id: 'VitaNexoAgCamp01',
    workflow_nombre: 'VitaNexo 01 - Agente IA de Campañas y Presupuestos (Gemini)',
    webhook_path: '/webhook/vitanexo/agente-campanas',
  },
  agente_contenido: {
    workflow_id: 'VitaNexoAgCont02',
    workflow_nombre: 'VitaNexo 02 - Agente IA de Contenidos y Calendario Editorial (Gemini)',
    webhook_path: '/webhook/vitanexo/agente-contenido',
  },
  agente_metricas: {
    workflow_id: 'VitaNexoAgMetr03',
    workflow_nombre: 'VitaNexo 03 - Agente IA de Interpretación de Métricas SQL (Gemini)',
    webhook_path: '/webhook/vitanexo/agente-metricas',
  },
  agente_contactos_ventas: {
    workflow_id: 'VitaNexoAgVent04',
    workflow_nombre: 'VitaNexo 04 - Agente IA de Contactos, Embudo y Ventas B2B (Gemini)',
    webhook_path: '/webhook/vitanexo/agente-ventas',
  },
};

function createN8nGeminiBridgeService({ automationsRepo, n8nConfig = env.n8n, geminiConfig = env.gemini }) {
  // Ventana deslizante en memoria para control de límite de solicitudes hacia Gemini/n8n
  const requestTimestamps = [];

  function enforceRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
      requestTimestamps.shift();
    }
    const maxPerMinute = n8nConfig.rateLimitPerMinute || 30;
    if (requestTimestamps.length >= maxPerMinute) {
      throw new AppError(
        `Límite local de solicitudes de IA alcanzado (${maxPerMinute}/min). Espere unos segundos antes de reintentar.`,
        429,
        'AI_RATE_LIMIT_EXCEEDED'
      );
    }
    requestTimestamps.push(now);
  }

  function validateGeminiWorkflowPayload(body, requiredKeys = []) {
    if (!body || typeof body !== 'object') {
      throw new AppError(
        'El workflow de n8n devolvió una respuesta vacía o no estructurada.',
        502,
        'INVALID_N8N_RESPONSE'
      );
    }

    if (body.ok === false) {
      const status = body.httpStatus && body.httpStatus >= 400 ? Number(body.httpStatus) : 502;
      throw new AppError(
        body.error || 'El flujo de automatización n8n/Gemini rechazó o no pudo completar la solicitud.',
        status,
        body.error_code || 'N8N_WORKFLOW_ERROR'
      );
    }

    const analysis = body.analisis_ia;
    if (!analysis || typeof analysis !== 'object') {
      throw new AppError(
        'La respuesta de n8n no incluye el bloque validado analisis_ia proveniente de Gemini API.',
        502,
        'MISSING_GEMINI_ANALYSIS'
      );
    }

    for (const key of requiredKeys) {
      if (analysis[key] === undefined || analysis[key] === null) {
        throw new AppError(
          `Respuesta incompleta de Gemini API: falta la propiedad requerida '${key}'.`,
          502,
          'INCOMPLETE_GEMINI_RESPONSE'
        );
      }
    }

    // Comprobar que la salida generada por IA tampoco contenga vocabulario clínico prohibido
    const clinicalMatch = containsProhibitedClinicalData(analysis);
    if (clinicalMatch) {
      throw new AppError(
        `Respuesta de IA bloqueada por política de privacidad: contiene vocabulario clínico no permitido ('${clinicalMatch}').`,
        422,
        'AI_CLINICAL_OUTPUT_BLOCKED'
      );
    }

    return analysis;
  }

  async function postAuthenticatedWebhook(webhookPath, payload, timeoutMs, externalSignal = null) {
    if (!n8nConfig.webhookSecret) {
      throw new AppError(
        'Falta configurar N8N_WEBHOOK_SECRET en el entorno local del servidor para autenticar webhooks con n8n.',
        503,
        'N8N_SECRET_NOT_CONFIGURED'
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
    const url = `${n8nConfig.baseUrl}${webhookPath}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VitaNexo-Webhook-Secret': n8nConfig.webhookSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawText = await response.text();
      let parsedBody = null;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : null;
      } catch (_) {
        parsedBody = { ok: false, error: `Respuesta no JSON desde n8n (HTTP ${response.status}): ${rawText.slice(0, 220)}` };
      }

      return {
        httpStatus: response.status,
        okHttp: response.ok,
        body: parsedBody,
      };
    } catch (err) {
      if (err.name === 'AbortError' && externalSignal && externalSignal.aborted) {
        throw new AppError('Solicitud de IA cancelada por el colaborador.', 499, 'AI_REQUEST_CANCELLED');
      }
      if (err.name === 'AbortError') {
        const timeoutErr = new AppError(
          `Tiempo de espera agotado (${timeoutMs} ms) esperando respuesta de n8n / Gemini API.`,
          504,
          'N8N_GEMINI_TIMEOUT'
        );
        timeoutErr.retryable = true;
        throw timeoutErr;
      }
      const connErr = new AppError(
        `No fue posible conectar con el motor local de n8n en ${n8nConfig.baseUrl}. Verifique que el servicio n8n esté iniciado.`,
        503,
        'N8N_UNAVAILABLE'
      );
      connErr.retryable = true;
      throw connErr;
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }

  return {
    getAgentWorkflowMetadata(agentCode) {
      return AGENT_WORKFLOW_MAP[agentCode] || null;
    },

    listConfiguredWorkflows() {
      return [
        ...Object.entries(AGENT_WORKFLOW_MAP).map(([agentCode, meta]) => ({
          codigo_agente: agentCode,
          ...meta,
          modelo_ia: geminiConfig.model,
        })),
        {
          codigo_agente: 'sistema_salud',
          workflow_id: 'VitaNexoHealth05',
          workflow_nombre: 'VitaNexo 05 - Verificación Autenticada de Salud n8n',
          webhook_path: '/webhook/vitanexo/health',
          modelo_ia: geminiConfig.model,
        },
      ];
    },

    async checkN8nHealth() {
      const start = Date.now();
      let engineReachable = false;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3500);
        const hz = await fetch(`${n8nConfig.baseUrl}/healthz`, { signal: controller.signal });
        clearTimeout(t);
        engineReachable = hz.ok;
      } catch (_) {
        engineReachable = false;
      }

      if (!engineReachable) {
        return {
          online: false,
          webhook_autenticado: false,
          base_url: n8nConfig.baseUrl,
          modelo_gemini: geminiConfig.model,
          latencia_ms: null,
          mensaje: 'El motor local n8n no está respondiendo en el puerto configurado.',
        };
      }

      try {
        const webhookCheck = await postAuthenticatedWebhook('/webhook/vitanexo/health', { ping: true }, 4500);
        const latency = Date.now() - start;
        const webhookOk = webhookCheck.okHttp && webhookCheck.body && webhookCheck.body.ok === true;
        return {
          online: true,
          webhook_autenticado: webhookOk,
          base_url: n8nConfig.baseUrl,
          modelo_gemini: geminiConfig.model,
          latencia_ms: latency,
          workflow_salud_id: webhookCheck.body?.workflow_id || 'VitaNexoHealth05',
          mensaje: webhookOk
            ? 'Motor n8n local activo y webhook autenticado verificado.'
            : `Motor n8n activo, pero el webhook de salud respondió HTTP ${webhookCheck.httpStatus}.`,
        };
      } catch (err) {
        return {
          online: true,
          webhook_autenticado: false,
          base_url: n8nConfig.baseUrl,
          modelo_gemini: geminiConfig.model,
          latencia_ms: Date.now() - start,
          mensaje: err.message,
        };
      }
    },

    /**
     * Ejecuta un workflow de n8n conectado a Gemini API con:
     * - Control de idempotencia
     * - Límite de tasa por minuto
     * - Timeout estricto
     * - Reintentos controlados con backoff exponencial ante fallos transitorios/429/5xx
     * - Validación de estructura JSON y bloqueo de datos clínicos
     * - Registro completo en ejecuciones_workflows_n8n sin almacenar secretos
     */
    async invokeAgentWorkflow({
      codigo_ejecucion,
      codigo_agente,
      tipo_tarea,
      parametros = {},
      contexto = {},
      requiredOutputKeys = [],
      idempotency_key = null,
      reintento_de_id = null,
    }) {
      const wfMeta = AGENT_WORKFLOW_MAP[codigo_agente];
      if (!wfMeta) {
        throw new AppError(
          `No existe un workflow de n8n configurado para el agente '${codigo_agente}'.`,
          500,
          'WORKFLOW_MAPPING_NOT_FOUND'
        );
      }

      if (idempotency_key && automationsRepo) {
        const existing = await automationsRepo.findByIdempotencyKey(idempotency_key);
        if (existing && existing.estado === 'exitoso' && existing.respuesta_validada) {
          return {
            traza_n8n: existing,
            analisis_ia: existing.respuesta_validada.analisis_ia || existing.respuesta_validada,
            proveedor_ia: existing.proveedor_ia,
            modelo_ia: existing.modelo_ia,
            idempotente_reutilizado: true,
          };
        }
      }

      const aiCtx = getAiRequestContext();
      const externalSignal = aiCtx?.signal || null;
      const candidates =
        Array.isArray(aiCtx?.candidates) && aiCtx.candidates.length > 0
          ? aiCtx.candidates
          : [{ kind: 'n8n', codigo_proveedor: 'gemini', proveedor_ia: 'gemini-api', modelo: geminiConfig.model }];

      enforceRateLimit();

      const sanitizedPayload = {
        codigo_ejecucion: codigo_ejecucion || generateBusinessCode('EXEC'),
        codigo_agente,
        tipo_tarea,
        parametros: sanitizePayload(parametros),
        contexto: sanitizePayload(contexto),
      };
      if (aiCtx?.mensaje_usuario) {
        // El mensaje del colaborador se envía completo (ya validado en tamaño por el guardián de políticas)
        sanitizedPayload.mensaje_usuario = String(aiCtx.mensaje_usuario).slice(0, 8000);
      }
      if (Array.isArray(aiCtx?.historial_conversacion) && aiCtx.historial_conversacion.length > 0) {
        sanitizedPayload.historial_conversacion = aiCtx.historial_conversacion.slice(-5).map((h) => ({
          rol: h.rol,
          texto: String(h.texto || '').slice(0, 900),
        }));
      }

      const startTime = new Date();
      const codigoTraza = generateBusinessCode('N8N');
      let traceRecord = null;

      if (automationsRepo) {
        traceRecord = await automationsRepo.createExecution({
          codigo_traza: codigoTraza,
          idempotency_key: idempotency_key || null,
          codigo_agente,
          tipo_tarea,
          workflow_id: wfMeta.workflow_id,
          workflow_nombre: wfMeta.workflow_nombre,
          webhook_path: wfMeta.webhook_path,
          proveedor_ia: candidates[0].proveedor_ia || 'gemini-api',
          modelo_ia: candidates[0].modelo || geminiConfig.model,
          estado: 'en_curso',
          intentos_realizados: 1,
          entrada_sanitizada: {
            codigo_ejecucion: sanitizedPayload.codigo_ejecucion,
            parametros: sanitizedPayload.parametros,
            mensaje_usuario_resumen: sanitizedPayload.mensaje_usuario
              ? sanitizedPayload.mensaje_usuario.slice(0, 300)
              : undefined,
            resumen_contexto_claves: Object.keys(sanitizedPayload.contexto || {}),
          },
          reintento_de_id,
          fecha_inicio: formatNowMysqlMillis(startTime),
        });
      }

      const maxAttempts = 1 + (n8nConfig.maxRetries ?? 2);
      let totalAttempts = 0;
      let lastError = null;
      let lastHttpStatus = null;
      const NON_FALLBACK_STATUS = [400, 401, 403, 413, 422, 499];
      let stopAll = false;

      for (let ci = 0; ci < candidates.length && !stopAll; ci += 1) {
        const candidate = candidates[ci];
        if (aiCtx && typeof aiCtx.onProgress === 'function') {
          aiCtx.onProgress(
            ci === 0
              ? `Procesando con ${candidate.proveedor_ia} (${candidate.modelo})${candidate.kind === 'n8n' ? ' vía n8n' : ''}`
              : `Proveedor principal no disponible; usando alternativa ${candidate.proveedor_ia} (${candidate.modelo})`
          );
        }

        try {
          if (typeof candidate.enforceRate === 'function') candidate.enforceRate();
        } catch (rateErr) {
          lastError = rateErr;
          continue;
        }

        // Los candidatos alternativos realizan un único intento para no prolongar la espera.
        const attemptsForCandidate = ci === 0 ? maxAttempts : 1;
        let attempt = 0;

        while (attempt < attemptsForCandidate) {
          attempt += 1;
          totalAttempts += 1;
          if (externalSignal && externalSignal.aborted) {
            lastError = new AppError('Solicitud de IA cancelada por el colaborador.', 499, 'AI_REQUEST_CANCELLED');
            stopAll = true;
            break;
          }
          try {
            let validatedAnalysis;
            let responseMeta = {};

            if (candidate.kind === 'direct') {
              validatedAnalysis = await candidate.adapter.invoke({
                payload: sanitizedPayload,
                requiredOutputKeys,
                modelo: candidate.modelo,
                signal: externalSignal,
              });
              lastHttpStatus = 200;
              responseMeta = { workflow_id: `directo:${candidate.codigo_proveedor}`, modelo_ia: candidate.modelo };
            } else {
              const response = await postAuthenticatedWebhook(
                wfMeta.webhook_path,
                { ...sanitizedPayload, modelo_ia: candidate.modelo },
                n8nConfig.timeoutMs || 45000,
                externalSignal
              );
              lastHttpStatus = response.httpStatus;

              if ([429, 502, 503, 504].includes(response.httpStatus) && attempt < attemptsForCandidate) {
                await sleep(600 * Math.pow(2, attempt - 1));
                continue;
              }

              if (!response.okHttp) {
                const authFailed = response.httpStatus === 403 || response.httpStatus === 401;
                const errMsg = authFailed && !response.body?.error_code
                  ? 'n8n rechazó la autenticación del webhook. Ejecute "node n8n/scripts/import-workflows.js" para sincronizar la credencial cifrada con N8N_WEBHOOK_SECRET.'
                  : response.body?.error ||
                    response.body?.message ||
                    `El workflow '${wfMeta.workflow_nombre}' respondió con estado HTTP ${response.httpStatus}.`;
                const errCode =
                  response.body?.error_code ||
                  (authFailed
                    ? 'N8N_WEBHOOK_AUTH_FAILED'
                    : response.httpStatus === 404
                    ? 'N8N_WEBHOOK_NOT_ACTIVE'
                    : 'N8N_HTTP_ERROR');
                throw new AppError(errMsg, response.httpStatus >= 400 ? response.httpStatus : 502, errCode);
              }

              validatedAnalysis = validateGeminiWorkflowPayload(response.body, requiredOutputKeys);
              responseMeta = {
                workflow_id: response.body.workflow_id || wfMeta.workflow_id,
                modelo_ia: response.body.modelo_ia || candidate.modelo,
                timestamp: response.body.timestamp,
                proveedor_ia: response.body.proveedor_ia,
              };
            }

            const endTime = new Date();
            const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());
            const proveedorFinal = responseMeta.proveedor_ia || candidate.proveedor_ia || 'gemini-api';
            const modeloFinal = responseMeta.modelo_ia || candidate.modelo || geminiConfig.model;

            if (traceRecord && automationsRepo) {
              traceRecord = await automationsRepo.updateExecutionOutcome(traceRecord.id, {
                estado: 'exitoso',
                intentos_realizados: totalAttempts,
                http_status: lastHttpStatus || 200,
                duracion_ms: durationMs,
                proveedor_ia: proveedorFinal,
                modelo_ia: modeloFinal,
                respuesta_validada: {
                  workflow_id: responseMeta.workflow_id,
                  modelo_ia: modeloFinal,
                  timestamp: responseMeta.timestamp || endTime.toISOString(),
                  analisis_ia: validatedAnalysis,
                },
                mensaje_error: null,
                fecha_fin: formatNowMysqlMillis(endTime),
              });
            }

            return {
              traza_n8n: traceRecord,
              workflow_id: responseMeta.workflow_id,
              workflow_nombre: wfMeta.workflow_nombre,
              proveedor_ia: proveedorFinal,
              modelo_ia: modeloFinal,
              via_n8n: candidate.kind !== 'direct',
              proveedor_alternativo_usado: ci > 0,
              intentos_realizados: totalAttempts,
              duracion_n8n_ms: durationMs,
              analisis_ia: validatedAnalysis,
            };
          } catch (err) {
            lastError = err instanceof AppError ? err : new AppError(err.message, 502, 'N8N_EXECUTION_ERROR');
            if (lastError.errorCode === 'AI_REQUEST_CANCELLED') {
              stopAll = true;
              break;
            }
            if (NON_FALLBACK_STATUS.includes(lastError.statusCode)) {
              // Rechazos de negocio/seguridad: no tiene sentido reintentar ni usar otro proveedor.
              stopAll = true;
              break;
            }
            const isRateLimit =
              lastError.statusCode === 429 ||
              lastError.errorCode === 'AI_PROVIDER_RATE_LIMIT' ||
              /too\s*many\s*requests|quota|rate\s*limit|resource_exhausted/i.test(lastError.message);
            const isRetryable = Boolean(err.retryable) || isRateLimit || [502, 503, 504].includes(lastError.statusCode);
            if (isRetryable && attempt < attemptsForCandidate) {
              const backoffMs = isRateLimit
                ? Math.max(2500, 1800 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 600)
                : 600 * Math.pow(2, attempt - 1);
              await sleep(backoffMs);
              continue;
            }
            break;
          }
        }
      }

      const endTime = new Date();
      const durationMs = Math.max(0, endTime.getTime() - startTime.getTime());
      if (!lastError) {
        lastError = new AppError('No hubo proveedores de IA disponibles para atender la solicitud.', 503, 'AI_PROVIDER_NOT_CONFIGURED');
      }
      if (traceRecord && automationsRepo) {
        await automationsRepo.updateExecutionOutcome(traceRecord.id, {
          estado: 'fallido',
          intentos_realizados: Math.max(1, totalAttempts),
          http_status: lastHttpStatus || lastError?.statusCode || 503,
          duracion_ms: durationMs,
          respuesta_validada: null,
          mensaje_error: `[${lastError.errorCode}] ${lastError.message}`,
          fecha_fin: formatNowMysqlMillis(endTime),
        });
      }

      throw lastError;
    },
  };
}

module.exports = {
  createN8nGeminiBridgeService,
  AGENT_WORKFLOW_MAP,
};

