const { AppError, mapDatabaseError } = require('../utils/AppError');
const { generateBusinessCode, sanitizePayload } = require('../utils/sanitize');

function formatNowMysqlMillis(date = new Date()) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function validateAgentOutput(output, agentCode, taskType) {
  if (!output || typeof output !== 'object' || output.result === undefined) {
    throw new AppError(
      `El agente '${agentCode}' devolvió una respuesta inválida para la tarea '${taskType}'.`,
      500,
      'INVALID_AGENT_OUTPUT'
    );
  }
}

function createCentralOrchestrator({ agents, agentExecutionsRepo, automationsRepo = null }) {
  const agentsByCode = new Map();
  const taskToAgent = new Map();

  for (const agent of agents) {
    agentsByCode.set(agent.agentCode, agent);
    for (const task of agent.supportedTasks) {
      taskToAgent.set(task, agent);
    }
  }

  return {
    getCapabilities() {
      return agents.map((a) => ({
        codigo_agente: a.agentCode,
        tareas_soportadas: [...a.supportedTasks],
        tareas_ia_gemini: a.supportedTasks.filter((t) => t.endsWith('_ia')),
        tareas_deterministas: a.supportedTasks.filter((t) => !t.endsWith('_ia')),
      }));
    },

    async listRegisteredAgents() {
      const dbAgents = await agentExecutionsRepo.listAgents();
      return dbAgents.map((row) => {
        const supported = agentsByCode.get(row.codigo_agente)?.supportedTasks || [];
        return {
          ...row,
          tareas_soportadas: supported,
          tareas_ia_gemini: supported.filter((t) => t.endsWith('_ia')),
          tareas_deterministas: supported.filter((t) => !t.endsWith('_ia')),
        };
      });
    },

    async listExecutions(filters = {}) {
      return agentExecutionsRepo.listExecutions(filters);
    },

    async getExecutionById(id) {
      const execution = await agentExecutionsRepo.getExecutionById(id);
      if (!execution) {
        throw new AppError(`Ejecución de agente con id ${id} no encontrada.`, 404, 'EXECUTION_NOT_FOUND');
      }
      return execution;
    },

    /**
     * Punto único de coordinación centralizada.
     * Selecciona al agente responsable, controla idempotencia opcional,
     * ejecuta la tarea (determinista o vía n8n + Gemini API),
     * valida la estructura del resultado y persiste la auditoría (éxito o fallo).
     */
    async dispatch({ tipo_tarea, codigo_agente = null, parametros = {}, idempotency_key = null }) {
      if (!tipo_tarea || typeof tipo_tarea !== 'string') {
        throw new AppError(
          'Debe especificar un tipo_tarea válido para el orquestador central.',
          400,
          'MISSING_TASK_TYPE'
        );
      }

      if (parametros === null || typeof parametros !== 'object' || Array.isArray(parametros)) {
        throw new AppError(
          'El campo parametros debe ser un objeto JSON válido.',
          400,
          'INVALID_TASK_PARAMETERS'
        );
      }

      const selectedAgent = taskToAgent.get(tipo_tarea);
      if (!selectedAgent) {
        throw new AppError(
          `La tarea '${tipo_tarea}' no corresponde a ningún agente registrado en el orquestador.`,
          400,
          'UNKNOWN_ORCHESTRATOR_TASK',
          { tareas_disponibles: Array.from(taskToAgent.keys()) }
        );
      }

      if (codigo_agente && codigo_agente !== selectedAgent.agentCode) {
        throw new AppError(
          `Inconsistencia de enrutamiento: la tarea '${tipo_tarea}' pertenece a '${selectedAgent.agentCode}', no a '${codigo_agente}'.`,
          400,
          'AGENT_TASK_MISMATCH'
        );
      }

      // Control de idempotencia a nivel de orquestador para evitar ejecuciones duplicadas
      const normalizedIdempKey = idempotency_key ? String(idempotency_key).trim().slice(0, 40) : null;
      if (normalizedIdempKey && typeof agentExecutionsRepo.findByExecutionCode === 'function') {
        const existingExec = await agentExecutionsRepo.findByExecutionCode(`IDEMP-${normalizedIdempKey}`);
        if (existingExec && existingExec.estado === 'completada') {
          let cachedResult = existingExec.resultado_resumida;
          if (automationsRepo) {
            const n8nRow = await automationsRepo.findByIdempotencyKey(normalizedIdempKey);
            if (n8nRow?.respuesta_validada?.analisis_ia) {
              cachedResult = n8nRow.respuesta_validada.analisis_ia;
            }
          }
          return {
            idempotente_reutilizado: true,
            ejecucion: {
              id: existingExec.id,
              codigo_ejecucion: existingExec.codigo_ejecucion,
              codigo_agente: existingExec.codigo_agente,
              tipo_tarea: existingExec.tipo_tarea,
              estado: existingExec.estado,
              fecha_inicio: existingExec.fecha_inicio,
              fecha_fin: existingExec.fecha_fin,
              duracion_ms: existingExec.duracion_ms,
            },
            resumen: existingExec.resultado_resumida || {},
            resultado: cachedResult,
          };
        }
      }

      // Verificar que el agente exista y esté activo en catalogo_agentes
      const agentCatalogRow = await agentExecutionsRepo.getAgentByCode(selectedAgent.agentCode);
      if (!agentCatalogRow || !agentCatalogRow.activo) {
        throw new AppError(
          `El agente '${selectedAgent.agentCode}' no se encuentra registrado o activo en VitaBase.`,
          503,
          'AGENT_NOT_ACTIVE_IN_CATALOG'
        );
      }

      const startDate = new Date();
      const fechaInicio = formatNowMysqlMillis(startDate);
      const codigoEjecucion = normalizedIdempKey
        ? `IDEMP-${normalizedIdempKey}`
        : generateBusinessCode('EXEC');

      try {
        const agentOutput = await selectedAgent.execute(tipo_tarea, parametros, {
          codigo_ejecucion: codigoEjecucion,
          idempotency_key: normalizedIdempKey,
        });
        validateAgentOutput(agentOutput, selectedAgent.agentCode, tipo_tarea);

        const endDate = new Date();
        const duracionMs = Math.max(0, endDate.getTime() - startDate.getTime());
        const refs = agentOutput.references || {};

        const executionRecord = await agentExecutionsRepo.recordExecution({
          codigo_ejecucion: codigoEjecucion,
          agente_id: agentCatalogRow.id,
          orquestada: 1,
          tipo_tarea,
          estado: 'completada',
          fecha_inicio: fechaInicio,
          fecha_fin: formatNowMysqlMillis(endDate),
          duracion_ms: duracionMs,
          entrada_resumida: sanitizePayload(parametros),
          resultado_resumida: sanitizePayload(agentOutput.summary || { completada: true }),
          mensaje_error: null,
          campana_id: refs.campana_id || parametros.campana_id || null,
          contenido_id: refs.contenido_id || parametros.contenido_id || null,
          contacto_id: refs.contacto_id || parametros.contacto_id || null,
          oportunidad_id: refs.oportunidad_id || parametros.oportunidad_id || null,
        });

        if (refs.traza_n8n_id && automationsRepo) {
          await automationsRepo.linkAgentExecution(refs.traza_n8n_id, executionRecord.id);
        }

        return {
          ejecucion: {
            id: executionRecord.id,
            codigo_ejecucion: executionRecord.codigo_ejecucion,
            codigo_agente: selectedAgent.agentCode,
            tipo_tarea,
            estado: 'completada',
            fecha_inicio: executionRecord.fecha_inicio,
            fecha_fin: executionRecord.fecha_fin,
            duracion_ms: duracionMs,
          },
          resumen: agentOutput.summary || {},
          resultado: agentOutput.result,
        };
      } catch (rawErr) {
        const operationalErr = rawErr instanceof AppError ? rawErr : mapDatabaseError(rawErr);
        const endDate = new Date();
        const duracionMs = Math.max(0, endDate.getTime() - startDate.getTime());

        const isBusinessRuleRejection =
          operationalErr.statusCode >= 400 && operationalErr.statusCode < 500;

        try {
          await agentExecutionsRepo.recordExecution({
            codigo_ejecucion: normalizedIdempKey ? generateBusinessCode('EXECF') : codigoEjecucion,
            agente_id: agentCatalogRow.id,
            orquestada: 1,
            tipo_tarea,
            estado: isBusinessRuleRejection ? 'rechazada_regla_negocio' : 'fallida',
            fecha_inicio: fechaInicio,
            fecha_fin: formatNowMysqlMillis(endDate),
            duracion_ms: duracionMs,
            entrada_resumida: sanitizePayload(parametros),
            resultado_resumida: null,
            mensaje_error: `[${operationalErr.errorCode}] ${operationalErr.message}`,
            campana_id: parametros.campana_id || null,
            contenido_id: parametros.contenido_id || null,
            contacto_id: parametros.contacto_id || null,
            oportunidad_id: parametros.oportunidad_id || null,
          });
        } catch (_) {
          // Si la propia BD cayó durante el registro del fallo, preservar el error original
        }

        throw operationalErr;
      }
    },
  };
}

module.exports = {
  createCentralOrchestrator,
};
