const defaultDb = require('../config/database');
const { sanitizePayload } = require('../utils/sanitize');

function parseJson(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return val;
  }
}

function formatNowMysqlMillis(date = new Date()) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

function createAiCenterRepository(db = defaultDb) {
  function normalizeConversation(row) {
    if (!row) return null;
    return {
      id: row.id,
      codigo_conversacion: row.codigo_conversacion,
      colaborador_id: row.colaborador_id,
      colaborador_nombre: row.colaborador_nombre || null,
      agente_id: row.agente_id,
      codigo_agente: row.codigo_agente,
      agente_nombre: row.agente_nombre || null,
      titulo: row.titulo,
      estado: row.estado,
      total_mensajes: Number(row.total_mensajes || 0),
      ultima_actividad_en: row.ultima_actividad_en,
      creado_en: row.creado_en,
    };
  }

  function normalizeRequest(row) {
    if (!row) return null;
    return {
      id: row.id,
      codigo_solicitud: row.codigo_solicitud,
      idempotency_key: row.idempotency_key,
      conversacion_id: row.conversacion_id,
      colaborador_id: row.colaborador_id,
      colaborador_nombre: row.colaborador_nombre || null,
      agente_id: row.agente_id,
      codigo_agente: row.codigo_agente,
      agente_nombre: row.agente_nombre || null,
      tipo_tarea_resuelta: row.tipo_tarea_resuelta,
      mensaje_usuario: row.mensaje_usuario,
      parametros_entrada: parseJson(row.parametros_entrada),
      estado: row.estado,
      etapa_progreso: row.etapa_progreso,
      proveedor_ia: row.proveedor_ia,
      modelo_ia: row.modelo_ia,
      via_n8n: Boolean(row.via_n8n),
      workflow_n8n_id: row.workflow_n8n_id,
      ejecucion_agente_id: row.ejecucion_agente_id,
      traza_n8n_id: row.traza_n8n_id,
      reintento_de_solicitud_id: row.reintento_de_solicitud_id,
      respuesta_texto: row.respuesta_texto,
      respuesta_estructurada: parseJson(row.respuesta_estructurada),
      advertencias_politica: parseJson(row.advertencias_politica),
      codigo_error: row.codigo_error,
      mensaje_error: row.mensaje_error,
      duracion_ms: row.duracion_ms !== null ? Number(row.duracion_ms) : null,
      fecha_creacion: row.fecha_creacion,
      fecha_inicio_proceso: row.fecha_inicio_proceso,
      fecha_fin: row.fecha_fin,
    };
  }

  return {
    async createConversation({ codigo_conversacion, colaborador_id, agente_id, codigo_agente, titulo }) {
      const now = formatNowMysqlMillis();
      const res = await db.query(
        `INSERT INTO conversaciones_ia (
           codigo_conversacion, colaborador_id, agente_id, codigo_agente, titulo,
           estado, total_mensajes, ultima_actividad_en, creado_en
         ) VALUES (?, ?, ?, ?, ?, 'activa', 0, ?, ?)`,
        [codigo_conversacion, colaborador_id, agente_id, codigo_agente, titulo, now, now]
      );
      return this.getConversationById(res.insertId);
    },

    async getConversationById(id) {
      const rows = await db.query(
        `SELECT c.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM conversaciones_ia c
         LEFT JOIN colaboradores col ON col.id = c.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = c.agente_id
         WHERE c.id = ? LIMIT 1`,
        [id]
      );
      return normalizeConversation(rows[0] || null);
    },

    async getConversationByCode(code) {
      const rows = await db.query(
        `SELECT c.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM conversaciones_ia c
         LEFT JOIN colaboradores col ON col.id = c.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = c.agente_id
         WHERE c.codigo_conversacion = ? LIMIT 1`,
        [code]
      );
      return normalizeConversation(rows[0] || null);
    },

    async listConversations({ colaborador_id = null, codigo_agente = null, estado = null, limit = 40 } = {}) {
      const clauses = [];
      const params = [];

      if (colaborador_id) {
        clauses.push('c.colaborador_id = ?');
        params.push(colaborador_id);
      }
      if (codigo_agente) {
        clauses.push('c.codigo_agente = ?');
        params.push(codigo_agente);
      }
      if (estado) {
        clauses.push('c.estado = ?');
        params.push(estado);
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 40, 1), 100);

      const rows = await db.query(
        `SELECT c.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM conversaciones_ia c
         LEFT JOIN colaboradores col ON col.id = c.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = c.agente_id
         ${whereSql}
         ORDER BY c.ultima_actividad_en DESC, c.id DESC
         LIMIT ${limitNum}`,
        params
      );
      return rows.map(normalizeConversation);
    },

    async updateConversationActivity(id, messageIncrement = 1) {
      const now = formatNowMysqlMillis();
      await db.query(
        `UPDATE conversaciones_ia
         SET total_mensajes = total_mensajes + ?, ultima_actividad_en = ?
         WHERE id = ?`,
        [messageIncrement, now, id]
      );
    },

    async countActiveRequestsForUser(colaborador_id) {
      const rows = await db.query(
        `SELECT COUNT(*) AS total
         FROM solicitudes_ia
         WHERE colaborador_id = ? AND estado IN ('pendiente', 'procesando')`,
        [colaborador_id]
      );
      return Number(rows[0]?.total || 0);
    },

    async findRequestByIdempotencyKey(key) {
      if (!key) return null;
      const rows = await db.query(
        `SELECT s.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM solicitudes_ia s
         LEFT JOIN colaboradores col ON col.id = s.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = s.agente_id
         WHERE s.idempotency_key = ? LIMIT 1`,
        [String(key).slice(0, 100)]
      );
      return normalizeRequest(rows[0] || null);
    },

    async getRequestById(id) {
      const rows = await db.query(
        `SELECT s.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM solicitudes_ia s
         LEFT JOIN colaboradores col ON col.id = s.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = s.agente_id
         WHERE s.id = ? LIMIT 1`,
        [id]
      );
      return normalizeRequest(rows[0] || null);
    },

    async getRequestByCode(code) {
      const rows = await db.query(
        `SELECT s.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM solicitudes_ia s
         LEFT JOIN colaboradores col ON col.id = s.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = s.agente_id
         WHERE s.codigo_solicitud = ? LIMIT 1`,
        [code]
      );
      return normalizeRequest(rows[0] || null);
    },

    async createRequest({
      codigo_solicitud,
      idempotency_key = null,
      conversacion_id,
      colaborador_id,
      agente_id,
      codigo_agente,
      tipo_tarea_resuelta,
      mensaje_usuario,
      parametros_entrada = null,
      proveedor_ia = null,
      modelo_ia = null,
      via_n8n = 1,
      workflow_n8n_id = null,
      reintento_de_solicitud_id = null,
    }) {
      const now = formatNowMysqlMillis();
      const res = await db.query(
        `INSERT INTO solicitudes_ia (
           codigo_solicitud, idempotency_key, conversacion_id, colaborador_id,
           agente_id, codigo_agente, tipo_tarea_resuelta, mensaje_usuario,
           parametros_entrada, estado, etapa_progreso, proveedor_ia, modelo_ia,
           via_n8n, workflow_n8n_id, reintento_de_solicitud_id, fecha_creacion
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 'En cola de espera', ?, ?, ?, ?, ?, ?)`,
        [
          codigo_solicitud,
          idempotency_key ? String(idempotency_key).slice(0, 100) : null,
          conversacion_id,
          colaborador_id,
          agente_id,
          codigo_agente,
          tipo_tarea_resuelta,
          mensaje_usuario,
          parametros_entrada ? JSON.stringify(sanitizePayload(parametros_entrada)) : null,
          proveedor_ia,
          modelo_ia,
          via_n8n ? 1 : 0,
          workflow_n8n_id,
          reintento_de_solicitud_id || null,
          now,
        ]
      );
      return this.getRequestById(res.insertId);
    },

    async markRequestProcessing(id, { etapa_progreso = 'Iniciando procesamiento con IA' } = {}) {
      const now = formatNowMysqlMillis();
      await db.query(
        `UPDATE solicitudes_ia
         SET estado = 'procesando', etapa_progreso = ?, fecha_inicio_proceso = COALESCE(fecha_inicio_proceso, ?)
         WHERE id = ? AND estado = 'pendiente'`,
        [etapa_progreso, now, id]
      );
      return this.getRequestById(id);
    },

    async updateRequestProgress(id, etapa_progreso) {
      await db.query(
        `UPDATE solicitudes_ia SET etapa_progreso = ? WHERE id = ? AND estado = 'procesando'`,
        [String(etapa_progreso).slice(0, 180), id]
      );
    },

    async markRequestCompleted(id, {
      respuesta_texto,
      respuesta_estructurada = null,
      advertencias_politica = null,
      proveedor_ia = null,
      modelo_ia = null,
      via_n8n = true,
      workflow_n8n_id = null,
      ejecucion_agente_id = null,
      traza_n8n_id = null,
      duracion_ms = null,
    }) {
      const now = formatNowMysqlMillis();
      await db.query(
        `UPDATE solicitudes_ia
         SET estado = 'completada',
             etapa_progreso = 'Completada exitosamente',
             respuesta_texto = ?,
             respuesta_estructurada = ?,
             advertencias_politica = ?,
             proveedor_ia = COALESCE(?, proveedor_ia),
             modelo_ia = COALESCE(?, modelo_ia),
             via_n8n = ?,
             workflow_n8n_id = COALESCE(?, workflow_n8n_id),
             ejecucion_agente_id = COALESCE(?, ejecucion_agente_id),
             traza_n8n_id = COALESCE(?, traza_n8n_id),
             duracion_ms = ?,
             fecha_fin = ?
         WHERE id = ?`,
        [
          respuesta_texto || '',
          respuesta_estructurada ? JSON.stringify(respuesta_estructurada) : null,
          advertencias_politica ? JSON.stringify(advertencias_politica) : null,
          proveedor_ia,
          modelo_ia,
          via_n8n ? 1 : 0,
          workflow_n8n_id,
          ejecucion_agente_id,
          traza_n8n_id,
          duracion_ms,
          now,
          id,
        ]
      );
      return this.getRequestById(id);
    },

    async markRequestError(id, { codigo_error, mensaje_error, duracion_ms = null }) {
      const now = formatNowMysqlMillis();
      await db.query(
        `UPDATE solicitudes_ia
         SET estado = 'error',
             etapa_progreso = 'Finalizada con error',
             codigo_error = ?,
             mensaje_error = ?,
             duracion_ms = ?,
             fecha_fin = ?
         WHERE id = ?`,
        [codigo_error || 'AI_ERROR', String(mensaje_error || '').slice(0, 600), duracion_ms, now, id]
      );
      return this.getRequestById(id);
    },

    async markRequestCancelled(id, { motivo = 'Cancelada por el colaborador' } = {}) {
      const now = formatNowMysqlMillis();
      await db.query(
        `UPDATE solicitudes_ia
         SET estado = 'cancelada',
             etapa_progreso = ?,
             codigo_error = 'AI_REQUEST_CANCELLED',
             mensaje_error = ?,
             fecha_fin = ?
         WHERE id = ? AND estado IN ('pendiente', 'procesando')`,
        [motivo, motivo, now, id]
      );
      return this.getRequestById(id);
    },

    async listRequestsByConversation(conversacion_id) {
      const rows = await db.query(
        `SELECT s.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM solicitudes_ia s
         LEFT JOIN colaboradores col ON col.id = s.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = s.agente_id
         WHERE s.conversacion_id = ?
         ORDER BY s.id ASC`,
        [conversacion_id]
      );
      return rows.map(normalizeRequest);
    },

    async listRequests({ colaborador_id = null, codigo_agente = null, estado = null, limit = 50 } = {}) {
      const clauses = [];
      const params = [];

      if (colaborador_id) {
        clauses.push('s.colaborador_id = ?');
        params.push(colaborador_id);
      }
      if (codigo_agente) {
        clauses.push('s.codigo_agente = ?');
        params.push(codigo_agente);
      }
      if (estado) {
        clauses.push('s.estado = ?');
        params.push(estado);
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);

      const rows = await db.query(
        `SELECT s.*, col.nombre_completo AS colaborador_nombre, ca.nombre AS agente_nombre
         FROM solicitudes_ia s
         LEFT JOIN colaboradores col ON col.id = s.colaborador_id
         LEFT JOIN catalogo_agentes ca ON ca.id = s.agente_id
         ${whereSql}
         ORDER BY s.id DESC
         LIMIT ${limitNum}`,
        params
      );
      return rows.map(normalizeRequest);
    },

    async recoverInterruptedRequests() {
      const now = formatNowMysqlMillis();
      const res = await db.query(
        `UPDATE solicitudes_ia
         SET estado = 'error',
             codigo_error = 'SERVER_RESTARTED',
             mensaje_error = 'El servidor se reinició mientras la solicitud estaba en proceso. Puede reintentarla.',
             etapa_progreso = 'Interrumpida por reinicio del servidor',
             fecha_fin = ?
         WHERE estado = 'procesando'`,
        [now]
      );
      return res.affectedRows || 0;
    },
  };
}

module.exports = {
  createAiCenterRepository,
};

