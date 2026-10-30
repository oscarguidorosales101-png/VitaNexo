const defaultDb = require('../config/database');
const { sanitizePayload } = require('../utils/sanitize');

function parseJsonColumn(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return val;
  }
}

function createAutomationsRepository(db = defaultDb) {
  function normalizeRow(row) {
    if (!row) return null;
    return {
      ...row,
      entrada_sanitizada: parseJsonColumn(row.entrada_sanitizada),
      respuesta_validada: parseJsonColumn(row.respuesta_validada),
    };
  }

  return {
    async findByIdempotencyKey(idempotencyKey) {
      if (!idempotencyKey) return null;
      const rows = await db.query(
        `SELECT * FROM ejecuciones_workflows_n8n WHERE idempotency_key = ? LIMIT 1`,
        [String(idempotencyKey).slice(0, 90)]
      );
      return normalizeRow(rows[0] || null);
    },

    async getById(id) {
      const rows = await db.query(
        `SELECT * FROM ejecuciones_workflows_n8n WHERE id = ?`,
        [id]
      );
      return normalizeRow(rows[0] || null);
    },

    async createExecution(data) {
      const safeInput = JSON.stringify(sanitizePayload(data.entrada_sanitizada || {}));
      const result = await db.query(
        `INSERT INTO ejecuciones_workflows_n8n (
           codigo_traza, idempotency_key, ejecucion_agente_id, codigo_agente, tipo_tarea,
           workflow_id, workflow_nombre, webhook_path, proveedor_ia, modelo_ia,
           estado, intentos_realizados, http_status, duracion_ms,
           entrada_sanitizada, respuesta_validada, mensaje_error, reintento_de_id,
           fecha_inicio, fecha_fin
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_traza,
          data.idempotency_key ? String(data.idempotency_key).slice(0, 90) : null,
          data.ejecucion_agente_id || null,
          data.codigo_agente,
          data.tipo_tarea,
          data.workflow_id,
          data.workflow_nombre,
          data.webhook_path,
          data.proveedor_ia || 'gemini-api',
          data.modelo_ia,
          data.estado || 'en_curso',
          data.intentos_realizados || 1,
          data.http_status ?? null,
          data.duracion_ms ?? null,
          safeInput,
          data.respuesta_validada ? JSON.stringify(sanitizePayload(data.respuesta_validada)) : null,
          data.mensaje_error ? String(data.mensaje_error).slice(0, 500) : null,
          data.reintento_de_id || null,
          data.fecha_inicio,
          data.fecha_fin || null,
        ]
      );
      return this.getById(result.insertId);
    },

    async updateExecutionOutcome(id, outcome) {
      await db.query(
        `UPDATE ejecuciones_workflows_n8n
         SET estado = ?,
             intentos_realizados = ?,
             http_status = ?,
             duracion_ms = ?,
             respuesta_validada = ?,
             mensaje_error = ?,
             ejecucion_agente_id = COALESCE(?, ejecucion_agente_id),
             fecha_fin = ?
         WHERE id = ?`,
        [
          outcome.estado,
          outcome.intentos_realizados || 1,
          outcome.http_status ?? null,
          outcome.duracion_ms ?? null,
          outcome.respuesta_validada ? JSON.stringify(sanitizePayload(outcome.respuesta_validada)) : null,
          outcome.mensaje_error ? String(outcome.mensaje_error).slice(0, 500) : null,
          outcome.ejecucion_agente_id || null,
          outcome.fecha_fin || null,
          id,
        ]
      );
      return this.getById(id);
    },

    async linkAgentExecution(id, ejecucionAgenteId) {
      if (!id || !ejecucionAgenteId) return;
      await db.query(
        `UPDATE ejecuciones_workflows_n8n SET ejecucion_agente_id = ? WHERE id = ?`,
        [ejecucionAgenteId, id]
      );
    },

    async listExecutions(filters = {}) {
      const clauses = [];
      const params = [];

      if (filters.estado) {
        clauses.push('estado = ?');
        params.push(filters.estado);
      }
      if (filters.workflow_id) {
        clauses.push('workflow_id = ?');
        params.push(filters.workflow_id);
      }
      if (filters.codigo_agente) {
        clauses.push('codigo_agente = ?');
        params.push(filters.codigo_agente);
      }

      const limit = Math.min(Math.max(Number.parseInt(filters.limit || '40', 10) || 40, 1), 150);
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const rows = await db.query(
        `SELECT *
         FROM ejecuciones_workflows_n8n
         ${whereSql}
         ORDER BY fecha_inicio DESC, id DESC
         LIMIT ${limit}`,
        params
      );
      return rows.map(normalizeRow);
    },

    async getSummaryStats() {
      const rows = await db.query(
        `SELECT
           COUNT(*) AS total_ejecuciones,
           SUM(CASE WHEN estado = 'exitoso' THEN 1 ELSE 0 END) AS exitosas,
           SUM(CASE WHEN estado = 'fallido' THEN 1 ELSE 0 END) AS fallidas,
           SUM(CASE WHEN reintento_de_id IS NOT NULL THEN 1 ELSE 0 END) AS reintentos,
           ROUND(AVG(duracion_ms), 0) AS duracion_promedio_ms
         FROM ejecuciones_workflows_n8n`
      );
      return (
        rows[0] || {
          total_ejecuciones: 0,
          exitosas: 0,
          fallidas: 0,
          reintentos: 0,
          duracion_promedio_ms: null,
        }
      );
    },
  };
}

module.exports = {
  createAutomationsRepository,
};

