const defaultDb = require('../config/database');

function createContentsRepository(db = defaultDb) {
  const baseSelect = `
    SELECT
      ct.id,
      ct.codigo_contenido,
      ct.campana_id,
      cp.codigo_campana,
      cp.nombre AS campana_nombre,
      ct.canal_id,
      cm.nombre AS canal_nombre,
      cm.clasificacion AS clasificacion_canal,
      ct.autor_colaborador_id,
      col.nombre_completo AS autor_nombre,
      ct.creado_por_agente,
      ct.titulo,
      ct.etapa_recorrido,
      ct.tipo_contenido,
      ct.cuerpo_borrador,
      ct.version_actual,
      ct.estado,
      ct.fecha_programada_publicacion,
      ct.fecha_ultima_revision,
      ct.fecha_publicacion,
      ct.creado_en,
      ct.actualizado_en
    FROM contenidos ct
    INNER JOIN campanas cp ON cp.id = ct.campana_id
    INNER JOIN canales_mercadeo cm ON cm.id = ct.canal_id
    LEFT JOIN colaboradores col ON col.id = ct.autor_colaborador_id
  `;

  return {
    async listContents(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.campana_id) {
        clauses.push('ct.campana_id = ?');
        params.push(Number(filters.campana_id));
      }
      if (filters.canal_id) {
        clauses.push('ct.canal_id = ?');
        params.push(Number(filters.canal_id));
      }
      if (filters.estado) {
        clauses.push('ct.estado = ?');
        params.push(filters.estado);
      }
      if (filters.tipo_contenido) {
        clauses.push('ct.tipo_contenido = ?');
        params.push(filters.tipo_contenido);
      }
      if (filters.etapa_recorrido) {
        clauses.push('ct.etapa_recorrido = ?');
        params.push(filters.etapa_recorrido);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `${baseSelect} ${whereSql} ORDER BY COALESCE(ct.fecha_programada_publicacion, ct.creado_en) DESC, ct.id DESC`,
        params
      );
    },

    async getContentById(id, executor = db) {
      const rows = await executor.query(`${baseSelect} WHERE ct.id = ?`, [id]);
      return rows[0] || null;
    },

    async createContent(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO contenidos (
           codigo_contenido, campana_id, canal_id, autor_colaborador_id, creado_por_agente,
           titulo, etapa_recorrido, tipo_contenido, cuerpo_borrador,
           version_actual, estado, fecha_programada_publicacion
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'borrador', ?)`,
        [
          data.codigo_contenido,
          data.campana_id,
          data.canal_id,
          data.autor_colaborador_id || null,
          data.creado_por_agente || null,
          data.titulo,
          data.etapa_recorrido,
          data.tipo_contenido,
          data.cuerpo_borrador,
          data.fecha_programada_publicacion || null,
        ]
      );
      return this.getContentById(result.insertId, executor);
    },

    async updateContentFields(id, fieldsMap, executor = db) {
      const fields = [];
      const params = [];
      for (const [k, v] of Object.entries(fieldsMap)) {
        if (v !== undefined) {
          fields.push(`${k} = ?`);
          params.push(v);
        }
      }
      if (fields.length > 0) {
        params.push(id);
        await executor.query(`UPDATE contenidos SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getContentById(id, executor);
    },

    async listReviewsByContent(contenidoId, executor = db) {
      return executor.query(
        `SELECT
           rc.id,
           rc.contenido_id,
           rc.version_revisada,
           rc.revisor_id,
           col.nombre_completo AS revisor_nombre,
           col.rol AS revisor_rol,
           rc.tipo_actor_revisor,
           rc.fecha_revision,
           rc.decision,
           rc.estado_anterior,
           rc.estado_resultante,
           rc.comentarios
         FROM revisiones_contenido rc
         INNER JOIN colaboradores col ON col.id = rc.revisor_id
         WHERE rc.contenido_id = ?
         ORDER BY rc.fecha_revision ASC, rc.id ASC`,
        [contenidoId]
      );
    },

    async listAllReviews(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.contenido_id) {
        clauses.push('rc.contenido_id = ?');
        params.push(Number(filters.contenido_id));
      }
      if (filters.decision) {
        clauses.push('rc.decision = ?');
        params.push(filters.decision);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT
           rc.id,
           rc.contenido_id,
           ct.codigo_contenido,
           ct.titulo AS contenido_titulo,
           rc.version_revisada,
           rc.revisor_id,
           col.nombre_completo AS revisor_nombre,
           rc.tipo_actor_revisor,
           rc.fecha_revision,
           rc.decision,
           rc.estado_anterior,
           rc.estado_resultante,
           rc.comentarios
         FROM revisiones_contenido rc
         INNER JOIN contenidos ct ON ct.id = rc.contenido_id
         INNER JOIN colaboradores col ON col.id = rc.revisor_id
         ${whereSql}
         ORDER BY rc.fecha_revision DESC, rc.id DESC`,
        params
      );
    },

    async insertReview(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO revisiones_contenido (
           contenido_id, version_revisada, revisor_id, tipo_actor_revisor,
           fecha_revision, decision, estado_anterior, estado_resultante, comentarios
         ) VALUES (?, ?, ?, 'humano', ?, ?, ?, ?, ?)`,
        [
          data.contenido_id,
          data.version_revisada,
          data.revisor_id,
          data.fecha_revision,
          data.decision,
          data.estado_anterior,
          data.estado_resultante,
          data.comentarios,
        ]
      );
      const rows = await executor.query(
        `SELECT
           rc.id, rc.contenido_id, rc.version_revisada, rc.revisor_id,
           col.nombre_completo AS revisor_nombre, rc.tipo_actor_revisor,
           rc.fecha_revision, rc.decision, rc.estado_anterior, rc.estado_resultante, rc.comentarios
         FROM revisiones_contenido rc
         INNER JOIN colaboradores col ON col.id = rc.revisor_id
         WHERE rc.id = ?`,
        [result.insertId]
      );
      return rows[0] || null;
    },

    async withTransaction(fn) {
      return db.withTransaction(fn);
    },
  };
}

module.exports = {
  createContentsRepository,
};

