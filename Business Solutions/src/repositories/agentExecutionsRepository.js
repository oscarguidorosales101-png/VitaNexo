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

function normalizeExecutionRow(row) {
  if (!row) return null;
  return {
    ...row,
    entrada_resumida: parseJsonColumn(row.entrada_resumida),
    resultado_resumida: parseJsonColumn(row.resultado_resumida),
  };
}

function createAgentExecutionsRepository(db = defaultDb) {
  return {
    async listAgents() {
      return db.query(
        `SELECT id, codigo_agente, nombre, dominio, descripcion, es_orquestador, activo, creado_en
         FROM catalogo_agentes
         ORDER BY es_orquestador DESC, id ASC`
      );
    },

    async getAgentByCode(codigoAgente) {
      const rows = await db.query(
        `SELECT id, codigo_agente, nombre, dominio, descripcion, es_orquestador, activo
         FROM catalogo_agentes
         WHERE codigo_agente = ?`,
        [codigoAgente]
      );
      return rows[0] || null;
    },

    async recordExecution(data) {
      const safeInput = JSON.stringify(sanitizePayload(data.entrada_resumida || {}));
      const safeOutput =
        data.resultado_resumida !== undefined && data.resultado_resumida !== null
          ? JSON.stringify(sanitizePayload(data.resultado_resumida))
          : null;

      const result = await db.query(
        `INSERT INTO ejecuciones_agentes (
           codigo_ejecucion, agente_id, orquestada, tipo_tarea, estado,
           fecha_inicio, fecha_fin, duracion_ms, entrada_resumida, resultado_resumida,
           mensaje_error, campana_id, contenido_id, contacto_id, oportunidad_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_ejecucion,
          data.agente_id,
          data.orquestada !== undefined ? Number(Boolean(data.orquestada)) : 1,
          data.tipo_tarea,
          data.estado,
          data.fecha_inicio,
          data.fecha_fin || null,
          data.duracion_ms ?? null,
          safeInput,
          safeOutput,
          data.mensaje_error ? String(data.mensaje_error).slice(0, 500) : null,
          data.campana_id || null,
          data.contenido_id || null,
          data.contacto_id || null,
          data.oportunidad_id || null,
        ]
      );

      return this.getExecutionById(result.insertId);
    },

    async getExecutionById(id) {
      const rows = await db.query(
        `SELECT
           ea.id,
           ea.codigo_ejecucion,
           ea.agente_id,
           ca.codigo_agente,
           ca.nombre AS agente_nombre,
           ea.orquestada,
           ea.tipo_tarea,
           ea.estado,
           ea.fecha_inicio,
           ea.fecha_fin,
           ea.duracion_ms,
           ea.entrada_resumida,
           ea.resultado_resumida,
           ea.mensaje_error,
           ea.campana_id,
           ea.contenido_id,
           ea.contacto_id,
           ea.oportunidad_id,
           ea.creado_en
         FROM ejecuciones_agentes ea
         INNER JOIN catalogo_agentes ca ON ca.id = ea.agente_id
         WHERE ea.id = ?`,
        [id]
      );
      return normalizeExecutionRow(rows[0] || null);
    },

    async findByExecutionCode(codigoEjecucion) {
      if (!codigoEjecucion) return null;
      const rows = await db.query(
        `SELECT
           ea.id,
           ea.codigo_ejecucion,
           ea.agente_id,
           ca.codigo_agente,
           ca.nombre AS agente_nombre,
           ea.orquestada,
           ea.tipo_tarea,
           ea.estado,
           ea.fecha_inicio,
           ea.fecha_fin,
           ea.duracion_ms,
           ea.entrada_resumida,
           ea.resultado_resumida,
           ea.mensaje_error,
           ea.campana_id,
           ea.contenido_id,
           ea.contacto_id,
           ea.oportunidad_id,
           ea.creado_en
         FROM ejecuciones_agentes ea
         INNER JOIN catalogo_agentes ca ON ca.id = ea.agente_id
         WHERE ea.codigo_ejecucion = ?
         LIMIT 1`,
        [String(codigoEjecucion).slice(0, 45)]
      );
      return normalizeExecutionRow(rows[0] || null);
    },

    async listExecutions(filters = {}) {
      const clauses = [];
      const params = [];

      if (filters.codigo_agente) {
        clauses.push('ca.codigo_agente = ?');
        params.push(filters.codigo_agente);
      }
      if (filters.estado) {
        clauses.push('ea.estado = ?');
        params.push(filters.estado);
      }
      if (filters.tipo_tarea) {
        clauses.push('ea.tipo_tarea = ?');
        params.push(filters.tipo_tarea);
      }

      const limit = Math.min(Math.max(Number.parseInt(filters.limit || '50', 10) || 50, 1), 200);
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const rows = await db.query(
        `SELECT
           ea.id,
           ea.codigo_ejecucion,
           ea.agente_id,
           ca.codigo_agente,
           ca.nombre AS agente_nombre,
           ea.orquestada,
           ea.tipo_tarea,
           ea.estado,
           ea.fecha_inicio,
           ea.fecha_fin,
           ea.duracion_ms,
           ea.entrada_resumida,
           ea.resultado_resumida,
           ea.mensaje_error,
           ea.campana_id,
           ea.contenido_id,
           ea.contacto_id,
           ea.oportunidad_id,
           ea.creado_en
         FROM ejecuciones_agentes ea
         INNER JOIN catalogo_agentes ca ON ca.id = ea.agente_id
         ${whereSql}
         ORDER BY ea.fecha_inicio DESC, ea.id DESC
         LIMIT ${limit}`,
        params
      );
      return rows.map(normalizeExecutionRow);
    },
  };
}

module.exports = {
  createAgentExecutionsRepository,
};
