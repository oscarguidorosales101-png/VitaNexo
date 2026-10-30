const defaultDb = require('../config/database');

function createCatalogsRepository(db = defaultDb) {
  return {
    async listOrganizationTypes() {
      return db.query(
        `SELECT id, codigo, nombre, descripcion, activo, creado_en
         FROM tipos_organizacion
         ORDER BY nombre ASC`
      );
    },

    async getOrganizationTypeById(id, executor = db) {
      const rows = await executor.query(
        `SELECT id, codigo, nombre, descripcion, activo FROM tipos_organizacion WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async listCollaborators(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.rol) {
        clauses.push('rol = ?');
        params.push(filters.rol);
      }
      if (filters.activo !== undefined) {
        clauses.push('activo = ?');
        params.push(Number(filters.activo));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT id, codigo_colaborador, nombre_completo, correo, rol, activo, creado_en
         FROM colaboradores
         ${whereSql}
         ORDER BY nombre_completo ASC`,
        params
      );
    },

    async getCollaboratorById(id, executor = db) {
      const rows = await executor.query(
        `SELECT id, codigo_colaborador, nombre_completo, correo, rol, activo
         FROM colaboradores
         WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async listChannels(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.clasificacion) {
        clauses.push('clasificacion = ?');
        params.push(filters.clasificacion);
      }
      if (filters.activo !== undefined) {
        clauses.push('activo = ?');
        params.push(Number(filters.activo));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT id, codigo_canal, nombre, clasificacion, plataforma, descripcion, activo, creado_en
         FROM canales_mercadeo
         ${whereSql}
         ORDER BY clasificacion ASC, nombre ASC`,
        params
      );
    },

    async getChannelById(id, executor = db) {
      const rows = await executor.query(
        `SELECT id, codigo_canal, nombre, clasificacion, plataforma, descripcion, activo, creado_en
         FROM canales_mercadeo
         WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async createChannel(data) {
      const result = await db.query(
        `INSERT INTO canales_mercadeo (codigo_canal, nombre, clasificacion, plataforma, descripcion, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_canal,
          data.nombre,
          data.clasificacion,
          data.plataforma,
          data.descripcion || null,
          data.activo !== undefined ? Number(Boolean(data.activo)) : 1,
        ]
      );
      return this.getChannelById(result.insertId);
    },

    async updateChannel(id, data) {
      const fields = [];
      const params = [];
      const updatable = ['nombre', 'clasificacion', 'plataforma', 'descripcion', 'activo'];
      for (const key of updatable) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          params.push(key === 'activo' ? Number(Boolean(data[key])) : data[key]);
        }
      }
      if (fields.length > 0) {
        params.push(id);
        await db.query(`UPDATE canales_mercadeo SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getChannelById(id);
    },

    async listFunnelStages() {
      return db.query(
        `SELECT id, codigo_etapa, nombre, orden_embudo, es_etapa_final, descripcion, activo
         FROM etapas_embudo
         ORDER BY orden_embudo ASC`
      );
    },

    async getFunnelStageById(id, executor = db) {
      const rows = await executor.query(
        `SELECT id, codigo_etapa, nombre, orden_embudo, es_etapa_final, activo
         FROM etapas_embudo
         WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async getFunnelStageByCode(codigoEtapa, executor = db) {
      const rows = await executor.query(
        `SELECT id, codigo_etapa, nombre, orden_embudo, es_etapa_final, activo
         FROM etapas_embudo
         WHERE codigo_etapa = ?`,
        [codigoEtapa]
      );
      return rows[0] || null;
    },
  };
}

module.exports = {
  createCatalogsRepository,
};

