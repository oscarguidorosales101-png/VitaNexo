const defaultDb = require('../config/database');

function createCampaignsRepository(db = defaultDb) {
  const baseSelect = `
    SELECT
      c.id,
      c.codigo_campana,
      c.nombre,
      c.descripcion,
      c.objetivo,
      c.etapa_recorrido,
      c.canal_principal_id,
      cm.nombre AS canal_principal_nombre,
      cm.clasificacion AS clasificacion_canal,
      c.responsable_id,
      col.nombre_completo AS responsable_nombre,
      c.fecha_inicio,
      c.fecha_fin,
      c.presupuesto_total_crc,
      c.justificacion_presupuesto,
      c.costo_operativo_mercadeo_crc,
      c.estado,
      c.creada_por_agente,
      COALESCE(ap_sum.presupuesto_asignado_canales_crc, 0.00) AS presupuesto_asignado_canales_crc,
      COALESCE(m_sum.gasto_publicitario_ejecutado_crc, 0.00) AS gasto_publicitario_ejecutado_crc,
      COALESCE(m_sum.costos_totales_atribuibles_crc, c.costo_operativo_mercadeo_crc) AS costos_totales_atribuibles_crc,
      COALESCE(m_sum.ingresos_atribuibles_crc, 0.00) AS ingresos_atribuibles_crc,
      c.creado_en,
      c.actualizado_en
    FROM campanas c
    INNER JOIN canales_mercadeo cm ON cm.id = c.canal_principal_id
    LEFT JOIN colaboradores col ON col.id = c.responsable_id
    LEFT JOIN (
      SELECT campana_id, SUM(monto_asignado_crc) AS presupuesto_asignado_canales_crc
      FROM asignaciones_presupuesto
      WHERE estado_asignacion <> 'cancelada'
      GROUP BY campana_id
    ) ap_sum ON ap_sum.campana_id = c.id
    LEFT JOIN (
      SELECT
        campana_id,
        SUM(gasto_publicitario_crc) AS gasto_publicitario_ejecutado_crc,
        SUM(gasto_publicitario_crc + costo_mercadeo_operativo_crc + costo_ventas_atribuible_crc) AS costos_totales_atribuibles_crc,
        SUM(ingresos_atribuibles_crc) AS ingresos_atribuibles_crc
      FROM metricas_campana_periodo
      GROUP BY campana_id
    ) m_sum ON m_sum.campana_id = c.id
  `;

  return {
    async listCampaigns(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.estado) {
        clauses.push('c.estado = ?');
        params.push(filters.estado);
      }
      if (filters.etapa_recorrido) {
        clauses.push('c.etapa_recorrido = ?');
        params.push(filters.etapa_recorrido);
      }
      if (filters.canal_id) {
        clauses.push('c.canal_principal_id = ?');
        params.push(Number(filters.canal_id));
      }
      if (filters.clasificacion) {
        clauses.push('cm.clasificacion = ?');
        params.push(filters.clasificacion);
      }
      if (filters.desde) {
        clauses.push('c.fecha_fin >= ?');
        params.push(filters.desde);
      }
      if (filters.hasta) {
        clauses.push('c.fecha_inicio <= ?');
        params.push(filters.hasta);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(`${baseSelect} ${whereSql} ORDER BY c.fecha_inicio DESC, c.id DESC`, params);
    },

    async getCampaignById(id, executor = db) {
      const rows = await executor.query(`${baseSelect} WHERE c.id = ?`, [id]);
      return rows[0] || null;
    },

    async createCampaign(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO campanas (
           codigo_campana, nombre, descripcion, objetivo, etapa_recorrido,
           canal_principal_id, responsable_id, fecha_inicio, fecha_fin,
           presupuesto_total_crc, justificacion_presupuesto,
           costo_operativo_mercadeo_crc, estado, creada_por_agente
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_campana,
          data.nombre,
          data.descripcion,
          data.objetivo,
          data.etapa_recorrido,
          data.canal_principal_id,
          data.responsable_id || null,
          data.fecha_inicio,
          data.fecha_fin,
          data.presupuesto_total_crc ?? 0,
          data.justificacion_presupuesto,
          data.costo_operativo_mercadeo_crc ?? 0,
          data.estado || 'propuesta',
          data.creada_por_agente ? 1 : 0,
        ]
      );
      return this.getCampaignById(result.insertId, executor);
    },

    async updateCampaign(id, data) {
      const updatable = [
        'nombre',
        'descripcion',
        'objetivo',
        'etapa_recorrido',
        'canal_principal_id',
        'responsable_id',
        'fecha_inicio',
        'fecha_fin',
        'presupuesto_total_crc',
        'justificacion_presupuesto',
        'costo_operativo_mercadeo_crc',
        'estado',
      ];
      const fields = [];
      const params = [];
      for (const key of updatable) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          params.push(data[key]);
        }
      }
      if (fields.length > 0) {
        params.push(id);
        await db.query(`UPDATE campanas SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getCampaignById(id);
    },

    async listBudgetAllocations(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.campana_id) {
        clauses.push('ap.campana_id = ?');
        params.push(Number(filters.campana_id));
      }
      if (filters.canal_id) {
        clauses.push('ap.canal_id = ?');
        params.push(Number(filters.canal_id));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT
           ap.id,
           ap.campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           ap.canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           ap.responsable_id,
           col.nombre_completo AS responsable_nombre,
           ap.periodo_inicio,
           ap.periodo_fin,
           ap.monto_asignado_crc,
           ap.razon_decision,
           ap.estado_asignacion,
           ap.creado_en
         FROM asignaciones_presupuesto ap
         INNER JOIN campanas c ON c.id = ap.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = ap.canal_id
         INNER JOIN colaboradores col ON col.id = ap.responsable_id
         ${whereSql}
         ORDER BY ap.periodo_inicio DESC, ap.id DESC`,
        params
      );
    },

    async getBudgetAllocationById(id, executor = db) {
      const rows = await executor.query(
        `SELECT
           ap.id,
           ap.campana_id,
           c.codigo_campana,
           ap.canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           ap.responsable_id,
           col.nombre_completo AS responsable_nombre,
           ap.periodo_inicio,
           ap.periodo_fin,
           ap.monto_asignado_crc,
           ap.razon_decision,
           ap.estado_asignacion,
           ap.creado_en
         FROM asignaciones_presupuesto ap
         INNER JOIN campanas c ON c.id = ap.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = ap.canal_id
         INNER JOIN colaboradores col ON col.id = ap.responsable_id
         WHERE ap.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async createBudgetAllocation(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO asignaciones_presupuesto (
           campana_id, canal_id, responsable_id, periodo_inicio, periodo_fin,
           monto_asignado_crc, razon_decision, estado_asignacion
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.campana_id,
          data.canal_id,
          data.responsable_id,
          data.periodo_inicio,
          data.periodo_fin,
          data.monto_asignado_crc,
          data.razon_decision,
          data.estado_asignacion || 'propuesta',
        ]
      );
      return this.getBudgetAllocationById(result.insertId, executor);
    },

    async withTransaction(fn) {
      return db.withTransaction(fn);
    },
  };
}

module.exports = {
  createCampaignsRepository,
};

