const fs = require('fs');
const path = require('path');
const { AppError } = require('../utils/AppError');

function createAutomationsService({ automationsRepo, n8nBridge, orchestrator }) {
  const workflowsDir = path.resolve(process.cwd(), 'n8n', 'workflows');

  function readExportedWorkflowFiles() {
    if (!fs.existsSync(workflowsDir)) return [];
    const files = fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    return files.map((filename) => {
      const raw = JSON.parse(fs.readFileSync(path.join(workflowsDir, filename), 'utf8'));
      const webhookNode = (raw.nodes || []).find((n) => String(n.type).includes('webhook'));
      const geminiNode = (raw.nodes || []).find((n) => String(n.type).includes('lmChatGoogleGemini'));
      return {
        archivo: filename,
        workflow_id: raw.id,
        nombre: raw.name,
        activo_en_definicion: Boolean(raw.active),
        cantidad_nodos: Array.isArray(raw.nodes) ? raw.nodes.length : 0,
        webhook_path: webhookNode?.parameters?.path ? `/webhook/${webhookNode.parameters.path}` : null,
        metodo_http: webhookNode?.parameters?.httpMethod || 'POST',
        usa_gemini: Boolean(geminiNode),
        modelo_gemini: geminiNode?.parameters?.modelName || null,
      };
    });
  }

  return {
    async getStatusOverview() {
      const [n8nHealth, stats, recentExecutions] = await Promise.all([
        n8nBridge.checkN8nHealth(),
        automationsRepo.getSummaryStats(),
        automationsRepo.listExecutions({ limit: 10 }),
      ]);

      const workflows = await this.listWorkflowsWithStats(n8nHealth);

      return {
        n8n: n8nHealth,
        estadisticas: stats,
        workflows_activos: workflows.filter((w) => w.operativo).length,
        total_workflows: workflows.length,
        workflows,
        ultimas_ejecuciones: recentExecutions,
      };
    },

    async listWorkflowsWithStats(cachedHealth = null) {
      const health = cachedHealth || (await n8nBridge.checkN8nHealth());
      const exported = readExportedWorkflowFiles();
      const recent = await automationsRepo.listExecutions({ limit: 100 });
      const configuredMap = new Map(n8nBridge.listConfiguredWorkflows().map((w) => [w.workflow_id, w]));

      return exported.map((wf) => {
        const wfExecs = recent.filter((e) => e.workflow_id === wf.workflow_id);
        const lastExec = wfExecs[0] || null;
        const mapped = configuredMap.get(wf.workflow_id);
        return {
          ...wf,
          codigo_agente: mapped?.codigo_agente || null,
          operativo: Boolean(health.online && health.webhook_autenticado && wf.activo_en_definicion),
          estadisticas_recientes: {
            total: wfExecs.length,
            exitosas: wfExecs.filter((e) => e.estado === 'exitoso').length,
            fallidas: wfExecs.filter((e) => e.estado === 'fallido').length,
            ultima_ejecucion_fecha: lastExec?.fecha_inicio || null,
            ultimo_estado: lastExec?.estado || null,
            ultima_duracion_ms: lastExec?.duracion_ms ?? null,
          },
        };
      });
    },

    async listExecutions(filters = {}) {
      return automationsRepo.listExecutions(filters);
    },

    async getExecutionById(id) {
      const row = await automationsRepo.getById(id);
      if (!row) {
        throw new AppError(`Ejecución de workflow n8n con id ${id} no encontrada.`, 404, 'N8N_EXECUTION_NOT_FOUND');
      }
      return row;
    },

    async retryExecution(id) {
      const previous = await this.getExecutionById(id);
      if (!orchestrator) {
        throw new AppError('El orquestador central no está vinculado al servicio de automatizaciones.', 500, 'ORCHESTRATOR_UNAVAILABLE');
      }

      const originalParams = previous.entrada_sanitizada?.parametros || {};
      const dispatched = await orchestrator.dispatch({
        tipo_tarea: previous.tipo_tarea,
        codigo_agente: previous.codigo_agente,
        parametros: {
          ...originalParams,
          _reintento_workflow_id: previous.id,
        },
      });

      return {
        ejecucion_original_id: previous.id,
        nueva_ejecucion_orquestador: dispatched,
      };
    },
  };
}

module.exports = {
  createAutomationsService,
};

