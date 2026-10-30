const defaultDb = require('../config/database');

function createCrmSalesRepository(db = defaultDb) {
  const baseContactSelect = `
    SELECT
      c.id,
      c.codigo_contacto,
      c.nombre_completo,
      c.cargo,
      c.nombre_organizacion,
      c.tipo_organizacion_id,
      toz.nombre AS tipo_organizacion_nombre,
      c.correo,
      c.telefono,
      c.provincia,
      c.fuente_origen,
      c.campana_origen_id,
      cp.codigo_campana AS campana_origen_codigo,
      c.canal_origen_id,
      cm.nombre AS canal_origen_nombre,
      c.etapa_actual_id,
      ef.codigo_etapa AS etapa_actual_codigo,
      ef.nombre AS etapa_actual_nombre,
      c.puntuacion_lead,
      c.necesidad_comercial,
      c.presupuesto_declarado_crc,
      c.responsable_comercial_id,
      col.nombre_completo AS responsable_comercial_nombre,
      c.fecha_captura_lead,
      c.fecha_proximo_seguimiento,
      c.activo,
      c.creado_en,
      c.actualizado_en
    FROM contactos c
    INNER JOIN tipos_organizacion toz ON toz.id = c.tipo_organizacion_id
    INNER JOIN etapas_embudo ef ON ef.id = c.etapa_actual_id
    LEFT JOIN campanas cp ON cp.id = c.campana_origen_id
    LEFT JOIN canales_mercadeo cm ON cm.id = c.canal_origen_id
    LEFT JOIN colaboradores col ON col.id = c.responsable_comercial_id
  `;

  return {
    async withTransaction(fn) {
      return db.withTransaction(fn);
    },

    // -------------------- CONTACTOS Y EMBUDO --------------------
    async listContacts(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.etapa_actual_id) {
        clauses.push('c.etapa_actual_id = ?');
        params.push(Number(filters.etapa_actual_id));
      }
      if (filters.codigo_etapa) {
        clauses.push('ef.codigo_etapa = ?');
        params.push(filters.codigo_etapa);
      }
      if (filters.campana_origen_id) {
        clauses.push('c.campana_origen_id = ?');
        params.push(Number(filters.campana_origen_id));
      }
      if (filters.responsable_comercial_id) {
        clauses.push('c.responsable_comercial_id = ?');
        params.push(Number(filters.responsable_comercial_id));
      }
      if (filters.activo !== undefined) {
        clauses.push('c.activo = ?');
        params.push(Number(filters.activo));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(`${baseContactSelect} ${whereSql} ORDER BY c.fecha_captura_lead DESC, c.id DESC`, params);
    },

    async getContactById(id, executor = db) {
      const rows = await executor.query(`${baseContactSelect} WHERE c.id = ?`, [id]);
      return rows[0] || null;
    },

    async insertContact(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO contactos (
           codigo_contacto, nombre_completo, cargo, nombre_organizacion, tipo_organizacion_id,
           correo, telefono, provincia, fuente_origen, campana_origen_id, canal_origen_id,
           etapa_actual_id, puntuacion_lead, necesidad_comercial, presupuesto_declarado_crc,
           responsable_comercial_id, fecha_captura_lead, fecha_proximo_seguimiento, activo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.codigo_contacto,
          data.nombre_completo,
          data.cargo,
          data.nombre_organizacion,
          data.tipo_organizacion_id,
          data.correo,
          data.telefono,
          data.provincia,
          data.fuente_origen,
          data.campana_origen_id || null,
          data.canal_origen_id || null,
          data.etapa_actual_id,
          data.puntuacion_lead ?? 0,
          data.necesidad_comercial,
          data.presupuesto_declarado_crc !== undefined ? data.presupuesto_declarado_crc : null,
          data.responsable_comercial_id || null,
          data.fecha_captura_lead,
          data.fecha_proximo_seguimiento || null,
        ]
      );
      return this.getContactById(result.insertId, executor);
    },

    async updateContactFields(id, fieldsMap, executor = db) {
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
        await executor.query(`UPDATE contactos SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getContactById(id, executor);
    },

    async insertStageHistory(data, executor = db) {
      await executor.query(
        `INSERT INTO historial_etapas_contacto (
           contacto_id, etapa_anterior_id, etapa_nueva_id, cambiado_por_id, fecha_transicion, motivo
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.contacto_id,
          data.etapa_anterior_id || null,
          data.etapa_nueva_id,
          data.cambiado_por_id || null,
          data.fecha_transicion,
          data.motivo || null,
        ]
      );
    },

    async listContactStageHistory(contactoId, executor = db) {
      return executor.query(
        `SELECT
           h.id,
           h.contacto_id,
           h.etapa_anterior_id,
           ea.codigo_etapa AS etapa_anterior_codigo,
           ea.nombre AS etapa_anterior_nombre,
           h.etapa_nueva_id,
           en.codigo_etapa AS etapa_nueva_codigo,
           en.nombre AS etapa_nueva_nombre,
           h.cambiado_por_id,
           col.nombre_completo AS cambiado_por_nombre,
           h.fecha_transicion,
           h.motivo
         FROM historial_etapas_contacto h
         LEFT JOIN etapas_embudo ea ON ea.id = h.etapa_anterior_id
         INNER JOIN etapas_embudo en ON en.id = h.etapa_nueva_id
         LEFT JOIN colaboradores col ON col.id = h.cambiado_por_id
         WHERE h.contacto_id = ?
         ORDER BY h.fecha_transicion ASC, h.id ASC`,
        [contactoId]
      );
    },

    async listConsumedContentByContact(contactoId, executor = db) {
      return executor.query(
        `SELECT
           cc.id,
           cc.contacto_id,
           cc.contenido_id,
           ct.codigo_contenido,
           ct.titulo AS contenido_titulo,
           cc.tipo_interaccion,
           cc.fecha_interaccion
         FROM contactos_contenidos_consumidos cc
         INNER JOIN contenidos ct ON ct.id = cc.contenido_id
         WHERE cc.contacto_id = ?
         ORDER BY cc.fecha_interaccion DESC`,
        [contactoId]
      );
    },

    async recordContentConsumption(data, executor = db) {
      await executor.query(
        `INSERT IGNORE INTO contactos_contenidos_consumidos (
           contacto_id, contenido_id, tipo_interaccion, fecha_interaccion
         ) VALUES (?, ?, ?, ?)`,
        [data.contacto_id, data.contenido_id, data.tipo_interaccion, data.fecha_interaccion]
      );
      return this.listConsumedContentByContact(data.contacto_id, executor);
    },

    // -------------------- TRASPASOS A VENTAS --------------------
    async listHandoffs(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.decision_ventas) {
        clauses.push('tv.decision_ventas = ?');
        params.push(filters.decision_ventas);
      }
      if (filters.contacto_id) {
        clauses.push('tv.contacto_id = ?');
        params.push(Number(filters.contacto_id));
      }
      if (filters.recibido_por_id) {
        clauses.push('tv.recibido_por_id = ?');
        params.push(Number(filters.recibido_por_id));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT
           tv.id,
           tv.codigo_traspaso,
           tv.contacto_id,
           ct.codigo_contacto,
           ct.nombre_completo AS contacto_nombre,
           ct.nombre_organizacion,
           tv.entregado_por_id,
           ce.nombre_completo AS entregado_por_nombre,
           tv.recibido_por_id,
           cr.nombre_completo AS recibido_por_nombre,
           tv.puntuacion_al_traspaso,
           tv.necesidad_detectada,
           tv.presupuesto_declarado_crc,
           tv.referencias_contenidos,
           tv.observaciones_seguimiento,
           tv.fecha_traspaso,
           tv.decision_ventas,
           tv.motivo_decision,
           tv.fecha_respuesta
         FROM traspasos_ventas tv
         INNER JOIN contactos ct ON ct.id = tv.contacto_id
         INNER JOIN colaboradores ce ON ce.id = tv.entregado_por_id
         INNER JOIN colaboradores cr ON cr.id = tv.recibido_por_id
         ${whereSql}
         ORDER BY tv.fecha_traspaso DESC, tv.id DESC`,
        params
      );
    },

    async getHandoffById(id, executor = db) {
      const rows = await executor.query(
        `SELECT
           tv.id,
           tv.codigo_traspaso,
           tv.contacto_id,
           ct.codigo_contacto,
           ct.nombre_completo AS contacto_nombre,
           ct.nombre_organizacion,
           tv.entregado_por_id,
           ce.nombre_completo AS entregado_por_nombre,
           tv.recibido_por_id,
           cr.nombre_completo AS recibido_por_nombre,
           tv.puntuacion_al_traspaso,
           tv.necesidad_detectada,
           tv.presupuesto_declarado_crc,
           tv.referencias_contenidos,
           tv.observaciones_seguimiento,
           tv.fecha_traspaso,
           tv.decision_ventas,
           tv.motivo_decision,
           tv.fecha_respuesta
         FROM traspasos_ventas tv
         INNER JOIN contactos ct ON ct.id = tv.contacto_id
         INNER JOIN colaboradores ce ON ce.id = tv.entregado_por_id
         INNER JOIN colaboradores cr ON cr.id = tv.recibido_por_id
         WHERE tv.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async insertHandoff(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO traspasos_ventas (
           codigo_traspaso, contacto_id, entregado_por_id, recibido_por_id,
           puntuacion_al_traspaso, necesidad_detectada, presupuesto_declarado_crc,
           referencias_contenidos, observaciones_seguimiento, fecha_traspaso, decision_ventas
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
        [
          data.codigo_traspaso,
          data.contacto_id,
          data.entregado_por_id,
          data.recibido_por_id,
          data.puntuacion_al_traspaso,
          data.necesidad_detectada,
          data.presupuesto_declarado_crc !== undefined ? data.presupuesto_declarado_crc : null,
          data.referencias_contenidos || null,
          data.observaciones_seguimiento,
          data.fecha_traspaso,
        ]
      );
      return this.getHandoffById(result.insertId, executor);
    },

    async updateHandoffDecision(id, decisionData, executor = db) {
      await executor.query(
        `UPDATE traspasos_ventas
         SET decision_ventas = ?, motivo_decision = ?, fecha_respuesta = ?
         WHERE id = ?`,
        [
          decisionData.decision_ventas,
          decisionData.motivo_decision || null,
          decisionData.fecha_respuesta,
          id,
        ]
      );
      return this.getHandoffById(id, executor);
    },

    // -------------------- OPORTUNIDADES COMERCIALES --------------------
    async listOpportunities(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.estado_oportunidad) {
        clauses.push('o.estado_oportunidad = ?');
        params.push(filters.estado_oportunidad);
      }
      if (filters.resultado_cierre) {
        clauses.push('o.resultado_cierre = ?');
        params.push(filters.resultado_cierre);
      }
      if (filters.contacto_id) {
        clauses.push('o.contacto_id = ?');
        params.push(Number(filters.contacto_id));
      }
      if (filters.responsable_ventas_id) {
        clauses.push('o.responsable_ventas_id = ?');
        params.push(Number(filters.responsable_ventas_id));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT
           o.id,
           o.codigo_oportunidad,
           o.contacto_id,
           ct.codigo_contacto,
           ct.nombre_organizacion,
           o.cliente_id,
           o.campana_atribuida_id,
           cp.codigo_campana,
           o.traspaso_id,
           o.responsable_ventas_id,
           col.nombre_completo AS responsable_ventas_nombre,
           o.titulo_propuesta,
           o.servicio_principal_id,
           sv.nombre AS servicio_principal_nombre,
           o.valor_estimado_crc,
           o.monto_cierre_crc,
           o.estado_oportunidad,
           o.resultado_cierre,
           o.motivo_cierre,
           o.fecha_apertura,
           o.fecha_proximo_seguimiento,
           o.fecha_cierre,
           o.creado_en,
           o.actualizado_en
         FROM oportunidades o
         INNER JOIN contactos ct ON ct.id = o.contacto_id
         INNER JOIN colaboradores col ON col.id = o.responsable_ventas_id
         LEFT JOIN campanas cp ON cp.id = o.campana_atribuida_id
         LEFT JOIN catalogo_servicios sv ON sv.id = o.servicio_principal_id
         ${whereSql}
         ORDER BY o.fecha_apertura DESC, o.id DESC`,
        params
      );
    },

    async getOpportunityById(id, executor = db) {
      const rows = await executor.query(
        `SELECT
           o.id,
           o.codigo_oportunidad,
           o.contacto_id,
           ct.codigo_contacto,
           ct.nombre_organizacion,
           ct.fecha_captura_lead,
           o.cliente_id,
           o.campana_atribuida_id,
           cp.codigo_campana,
           o.traspaso_id,
           o.responsable_ventas_id,
           col.nombre_completo AS responsable_ventas_nombre,
           o.titulo_propuesta,
           o.servicio_principal_id,
           sv.nombre AS servicio_principal_nombre,
           o.valor_estimado_crc,
           o.monto_cierre_crc,
           o.estado_oportunidad,
           o.resultado_cierre,
           o.motivo_cierre,
           o.fecha_apertura,
           o.fecha_proximo_seguimiento,
           o.fecha_cierre,
           o.creado_en,
           o.actualizado_en
         FROM oportunidades o
         INNER JOIN contactos ct ON ct.id = o.contacto_id
         INNER JOIN colaboradores col ON col.id = o.responsable_ventas_id
         LEFT JOIN campanas cp ON cp.id = o.campana_atribuida_id
         LEFT JOIN catalogo_servicios sv ON sv.id = o.servicio_principal_id
         WHERE o.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async insertOpportunity(data, executor = db) {
      const result = await executor.query(
        `INSERT INTO oportunidades (
           codigo_oportunidad, contacto_id, cliente_id, campana_atribuida_id, traspaso_id,
           responsable_ventas_id, titulo_propuesta, servicio_principal_id,
           valor_estimado_crc, monto_cierre_crc, estado_oportunidad, resultado_cierre,
           motivo_cierre, fecha_apertura, fecha_proximo_seguimiento, fecha_cierre
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'pendiente', NULL, ?, ?, NULL)`,
        [
          data.codigo_oportunidad,
          data.contacto_id,
          data.cliente_id || null,
          data.campana_atribuida_id || null,
          data.traspaso_id || null,
          data.responsable_ventas_id,
          data.titulo_propuesta,
          data.servicio_principal_id || null,
          data.valor_estimado_crc,
          data.estado_oportunidad || 'abierta',
          data.fecha_apertura,
          data.fecha_proximo_seguimiento || null,
        ]
      );
      return this.getOpportunityById(result.insertId, executor);
    },

    async updateOpportunityFields(id, fieldsMap, executor = db) {
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
        await executor.query(`UPDATE oportunidades SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getOpportunityById(id, executor);
    },

    // -------------------- SEGUIMIENTOS PENDIENTES --------------------
    async listPendingFollowUps(hastaFecha = null) {
      const contactParams = [];
      const oppParams = [];
      let contactDateClause = 'c.fecha_proximo_seguimiento IS NOT NULL';
      let oppDateClause = 'o.fecha_proximo_seguimiento IS NOT NULL';

      if (hastaFecha) {
        contactDateClause += ' AND c.fecha_proximo_seguimiento <= ?';
        contactParams.push(hastaFecha);
        oppDateClause += ' AND o.fecha_proximo_seguimiento <= ?';
        oppParams.push(hastaFecha);
      }

      const contactosPendientes = await db.query(
        `SELECT
           c.id,
           c.codigo_contacto,
           c.nombre_completo,
           c.nombre_organizacion,
           ef.codigo_etapa,
           c.puntuacion_lead,
           c.fecha_proximo_seguimiento,
           col.nombre_completo AS responsable_nombre
         FROM contactos c
         INNER JOIN etapas_embudo ef ON ef.id = c.etapa_actual_id
         LEFT JOIN colaboradores col ON col.id = c.responsable_comercial_id
         WHERE c.activo = 1
           AND ef.es_etapa_final = 0
           AND ${contactDateClause}
         ORDER BY c.fecha_proximo_seguimiento ASC`,
        contactParams
      );

      const oportunidadesPendientes = await db.query(
        `SELECT
           o.id,
           o.codigo_oportunidad,
           o.titulo_propuesta,
           o.estado_oportunidad,
           o.valor_estimado_crc,
           o.fecha_proximo_seguimiento,
           col.nombre_completo AS responsable_ventas_nombre
         FROM oportunidades o
         INNER JOIN colaboradores col ON col.id = o.responsable_ventas_id
         WHERE o.resultado_cierre = 'pendiente'
           AND ${oppDateClause}
         ORDER BY o.fecha_proximo_seguimiento ASC`,
        oppParams
      );

      return {
        contactos_pendientes: contactosPendientes,
        oportunidades_pendientes: oportunidadesPendientes,
      };
    },
  };
}

module.exports = {
  createCrmSalesRepository,
};

