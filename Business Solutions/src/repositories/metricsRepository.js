const defaultDb = require('../config/database');

function buildMetricFilters(filters = {}, alias = 'm') {
  const clauses = [];
  const params = [];

  if (filters.campana_id) {
    clauses.push(`${alias}.campana_id = ?`);
    params.push(Number(filters.campana_id));
  }
  if (filters.canal_id) {
    clauses.push(`${alias}.canal_id = ?`);
    params.push(Number(filters.canal_id));
  }
  if (filters.desde) {
    clauses.push(`${alias}.periodo_fin >= ?`);
    params.push(filters.desde);
  }
  if (filters.hasta) {
    clauses.push(`${alias}.periodo_inicio <= ?`);
    params.push(filters.hasta);
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    andSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

function createMetricsRepository(db = defaultDb) {
  return {
    // -------------------- REGISTROS BASE DE MÉTRICAS --------------------
    async listMeasurements(filters = {}) {
      const { whereSql, params } = buildMetricFilters(filters, 'm');
      return db.query(
        `SELECT
           m.id,
           m.campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           m.canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           m.periodo_inicio,
           m.periodo_fin,
           m.impresiones,
           m.clics,
           m.alcance,
           m.visualizaciones,
           m.interacciones,
           m.seguidores_ganados,
           m.gasto_publicitario_crc,
           m.costo_mercadeo_operativo_crc,
           m.costo_ventas_atribuible_crc,
           m.leads_generados,
           m.conversiones_clientes,
           m.ingresos_atribuibles_crc,
           m.notas,
           m.creado_en
         FROM metricas_campana_periodo m
         INNER JOIN campanas c ON c.id = m.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = m.canal_id
         ${whereSql}
         ORDER BY m.periodo_inicio DESC, m.id DESC`,
        params
      );
    },

    async getMeasurementById(id) {
      const rows = await db.query(
        `SELECT
           m.id,
           m.campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           m.canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           m.periodo_inicio,
           m.periodo_fin,
           m.impresiones,
           m.clics,
           m.alcance,
           m.visualizaciones,
           m.interacciones,
           m.seguidores_ganados,
           m.gasto_publicitario_crc,
           m.costo_mercadeo_operativo_crc,
           m.costo_ventas_atribuible_crc,
           m.leads_generados,
           m.conversiones_clientes,
           m.ingresos_atribuibles_crc,
           m.notas,
           m.creado_en
         FROM metricas_campana_periodo m
         INNER JOIN campanas c ON c.id = m.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = m.canal_id
         WHERE m.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async createMeasurement(data) {
      const result = await db.query(
        `INSERT INTO metricas_campana_periodo (
           campana_id, canal_id, periodo_inicio, periodo_fin,
           impresiones, clics, alcance, visualizaciones, interacciones, seguidores_ganados,
           gasto_publicitario_crc, costo_mercadeo_operativo_crc, costo_ventas_atribuible_crc,
           leads_generados, conversiones_clientes, ingresos_atribuibles_crc, notas
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.campana_id,
          data.canal_id,
          data.periodo_inicio,
          data.periodo_fin,
          data.impresiones ?? 0,
          data.clics ?? 0,
          data.alcance ?? 0,
          data.visualizaciones ?? 0,
          data.interacciones ?? 0,
          data.seguidores_ganados ?? 0,
          data.gasto_publicitario_crc ?? 0,
          data.costo_mercadeo_operativo_crc ?? 0,
          data.costo_ventas_atribuible_crc ?? 0,
          data.leads_generados ?? 0,
          data.conversiones_clientes ?? 0,
          data.ingresos_atribuibles_crc ?? 0,
          data.notas || null,
        ]
      );
      return this.getMeasurementById(result.insertId);
    },

    async updateMeasurement(id, data) {
      const updatable = [
        'impresiones',
        'clics',
        'alcance',
        'visualizaciones',
        'interacciones',
        'seguidores_ganados',
        'gasto_publicitario_crc',
        'costo_mercadeo_operativo_crc',
        'costo_ventas_atribuible_crc',
        'leads_generados',
        'conversiones_clientes',
        'ingresos_atribuibles_crc',
        'notas',
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
        await db.query(`UPDATE metricas_campana_periodo SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getMeasurementById(id);
    },

    // -------------------- 1. CPC (COSTO POR CLIC) --------------------
    async queryCPC(filters = {}) {
      const { whereSql, params } = buildMetricFilters(filters, 'm');
      return db.query(
        `SELECT
           c.id AS campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           cm.id AS canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           MIN(m.periodo_inicio) AS desde,
           MAX(m.periodo_fin) AS hasta,
           SUM(m.gasto_publicitario_crc) AS gasto_publicitario_total_crc,
           SUM(m.clics) AS total_clics,
           ROUND(SUM(m.gasto_publicitario_crc) / NULLIF(SUM(m.clics), 0), 2) AS cpc_crc,
           CASE
             WHEN SUM(m.clics) = 0 THEN 'NO_CALCULABLE_CERO_CLICS'
             WHEN SUM(m.gasto_publicitario_crc) = 0 THEN 'CANAL_SIN_GASTO_PUBLICITARIO_CPC_CERO'
             ELSE 'CALCULADO'
           END AS estado_calculo
         FROM metricas_campana_periodo m
         INNER JOIN campanas c ON c.id = m.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = m.canal_id
         ${whereSql}
         GROUP BY c.id, c.codigo_campana, c.nombre, cm.id, cm.nombre, cm.clasificacion
         ORDER BY c.codigo_campana, cm.nombre`,
        params
      );
    },

    // -------------------- 2. CTR (TASA DE CLICS) --------------------
    async queryCTR(filters = {}) {
      const { whereSql, params } = buildMetricFilters(filters, 'm');
      return db.query(
        `SELECT
           c.id AS campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           cm.id AS canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           SUM(m.impresiones) AS total_impresiones,
           SUM(m.clics) AS total_clics,
           ROUND((SUM(m.clics) / NULLIF(SUM(m.impresiones), 0)) * 100, 4) AS ctr_porcentaje,
           CASE
             WHEN SUM(m.impresiones) = 0 THEN 'NO_CALCULABLE_CERO_IMPRESIONES'
             ELSE 'CALCULADO'
           END AS estado_calculo
         FROM metricas_campana_periodo m
         INNER JOIN campanas c ON c.id = m.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = m.canal_id
         ${whereSql}
         GROUP BY c.id, c.codigo_campana, c.nombre, cm.id, cm.nombre, cm.clasificacion
         ORDER BY c.codigo_campana, cm.nombre`,
        params
      );
    },

    // -------------------- 3. CAC (COSTO DE ADQUISICIÓN DE CLIENTES) --------------------
    async queryCAC(filters = {}) {
      const clauses = [];
      const joinClauses = [];
      const joinParams = [];
      const whereParams = [];

      if (filters.canal_id) {
        joinClauses.push('m.canal_id = ?');
        joinParams.push(Number(filters.canal_id));
      }
      if (filters.desde) {
        joinClauses.push('m.periodo_fin >= ?');
        joinParams.push(filters.desde);
      }
      if (filters.hasta) {
        joinClauses.push('m.periodo_inicio <= ?');
        joinParams.push(filters.hasta);
      }
      if (filters.campana_id) {
        clauses.push('c.id = ?');
        whereParams.push(Number(filters.campana_id));
      }

      const joinExtra = joinClauses.length ? `AND ${joinClauses.join(' AND ')}` : '';
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      return db.query(
        `SELECT
           c.id AS campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           cm.clasificacion AS clasificacion_canal_principal,
           COALESCE(SUM(m.gasto_publicitario_crc), 0.00) AS gasto_publicitario_crc,
           COALESCE(SUM(m.costo_mercadeo_operativo_crc), 0.00) AS costo_mercadeo_operativo_crc,
           COALESCE(SUM(m.costo_ventas_atribuible_crc), 0.00) AS costo_ventas_atribuible_crc,
           COALESCE(
             SUM(
               m.gasto_publicitario_crc
               + m.costo_mercadeo_operativo_crc
               + m.costo_ventas_atribuible_crc
             ),
             0.00
           ) AS costo_total_adquisicion_crc,
           COALESCE(SUM(m.conversiones_clientes), 0) AS nuevos_clientes_adquiridos,
           ROUND(
             SUM(
               m.gasto_publicitario_crc
               + m.costo_mercadeo_operativo_crc
               + m.costo_ventas_atribuible_crc
             ) / NULLIF(SUM(m.conversiones_clientes), 0),
             2
           ) AS cac_crc,
           CASE
             WHEN COALESCE(SUM(m.conversiones_clientes), 0) = 0
               THEN 'NO_CALCULABLE_SIN_CLIENTES_ADQUIRIDOS'
             ELSE 'CALCULADO'
           END AS estado_calculo
         FROM campanas c
         INNER JOIN canales_mercadeo cm ON cm.id = c.canal_principal_id
         LEFT JOIN metricas_campana_periodo m ON m.campana_id = c.id ${joinExtra}
         ${whereSql}
         GROUP BY c.id, c.codigo_campana, c.nombre, cm.clasificacion
         ORDER BY c.codigo_campana`,
        [...joinParams, ...whereParams]
      );
    },

    // -------------------- 4. ROAS (RETORNO DE INVERSIÓN PUBLICITARIA) --------------------
    async queryROAS(filters = {}) {
      const { whereSql, params } = buildMetricFilters(filters, 'm');
      return db.query(
        `SELECT
           c.id AS campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           cm.id AS canal_id,
           cm.nombre AS canal_nombre,
           cm.clasificacion AS clasificacion_canal,
           SUM(m.ingresos_atribuibles_crc) AS ingresos_atribuibles_crc,
           SUM(m.gasto_publicitario_crc) AS gasto_publicitario_crc,
           ROUND(
             SUM(m.ingresos_atribuibles_crc) / NULLIF(SUM(m.gasto_publicitario_crc), 0),
             4
           ) AS roas_ratio,
           CASE
             WHEN SUM(m.gasto_publicitario_crc) = 0 THEN 'NO_APLICA_GASTO_PUBLICITARIO_CERO'
             ELSE 'CALCULADO'
           END AS estado_calculo
         FROM metricas_campana_periodo m
         INNER JOIN campanas c ON c.id = m.campana_id
         INNER JOIN canales_mercadeo cm ON cm.id = m.canal_id
         ${whereSql}
         GROUP BY c.id, c.codigo_campana, c.nombre, cm.id, cm.nombre, cm.clasificacion
         ORDER BY c.codigo_campana, cm.nombre`,
        params
      );
    },

    // -------------------- 5. CONVERSIÓN ENTRE ETAPAS DEL EMBUDO --------------------
    async queryFunnelConversions(filters = {}) {
      const contactClauses = [];
      const params = [];

      if (filters.campana_id) {
        contactClauses.push('ct.campana_origen_id = ?');
        params.push(Number(filters.campana_id));
      }
      if (filters.canal_id) {
        contactClauses.push('ct.canal_origen_id = ?');
        params.push(Number(filters.canal_id));
      }
      if (filters.desde) {
        contactClauses.push('DATE(ct.fecha_captura_lead) >= ?');
        params.push(filters.desde);
      }
      if (filters.hasta) {
        contactClauses.push('DATE(ct.fecha_captura_lead) <= ?');
        params.push(filters.hasta);
      }

      const contactWhere = contactClauses.length ? `WHERE ${contactClauses.join(' AND ')}` : '';

      return db.query(
        `WITH primeras_fechas_etapa AS (
           SELECT
             h.contacto_id,
             e.codigo_etapa,
             MIN(h.fecha_transicion) AS primera_fecha_etapa
           FROM historial_etapas_contacto h
           INNER JOIN etapas_embudo e ON e.id = h.etapa_nueva_id
           INNER JOIN contactos ct ON ct.id = h.contacto_id
           ${contactWhere}
           GROUP BY h.contacto_id, e.codigo_etapa
         ),
         conteo_cohorte AS (
           SELECT
             COUNT(DISTINCT CASE WHEN l.codigo_etapa = 'lead' THEN l.contacto_id END) AS total_leads,
             COUNT(DISTINCT CASE
               WHEN p.contacto_id IS NOT NULL AND p.primera_fecha_etapa >= l.primera_fecha_etapa
               THEN p.contacto_id
             END) AS leads_a_prospecto,
             COUNT(DISTINCT CASE
               WHEN o.contacto_id IS NOT NULL AND o.primera_fecha_etapa >= p.primera_fecha_etapa
               THEN o.contacto_id
             END) AS prospecto_a_oportunidad,
             COUNT(DISTINCT CASE
               WHEN g.contacto_id IS NOT NULL AND g.primera_fecha_etapa >= o.primera_fecha_etapa
               THEN g.contacto_id
             END) AS oportunidad_a_ganado,
             COUNT(DISTINCT CASE
               WHEN x.contacto_id IS NOT NULL AND x.primera_fecha_etapa >= o.primera_fecha_etapa
               THEN x.contacto_id
             END) AS oportunidad_a_perdido
           FROM primeras_fechas_etapa l
           LEFT JOIN primeras_fechas_etapa p
             ON p.contacto_id = l.contacto_id AND p.codigo_etapa = 'prospecto_calificado'
           LEFT JOIN primeras_fechas_etapa o
             ON o.contacto_id = l.contacto_id AND o.codigo_etapa = 'oportunidad_comercial'
           LEFT JOIN primeras_fechas_etapa g
             ON g.contacto_id = l.contacto_id AND g.codigo_etapa = 'cierre_ganado'
           LEFT JOIN primeras_fechas_etapa x
             ON x.contacto_id = l.contacto_id AND x.codigo_etapa = 'cierre_perdido'
           WHERE l.codigo_etapa = 'lead'
         )
         SELECT
           'lead -> prospecto_calificado' AS transicion,
           total_leads AS contactos_origen,
           leads_a_prospecto AS contactos_convertidos,
           ROUND((leads_a_prospecto / NULLIF(total_leads, 0)) * 100, 2) AS tasa_conversion_pct
         FROM conteo_cohorte
         UNION ALL
         SELECT
           'prospecto_calificado -> oportunidad_comercial' AS transicion,
           leads_a_prospecto AS contactos_origen,
           prospecto_a_oportunidad AS contactos_convertidos,
           ROUND((prospecto_a_oportunidad / NULLIF(leads_a_prospecto, 0)) * 100, 2) AS tasa_conversion_pct
         FROM conteo_cohorte
         UNION ALL
         SELECT
           'oportunidad_comercial -> cierre_ganado' AS transicion,
           prospecto_a_oportunidad AS contactos_origen,
           oportunidad_a_ganado AS contactos_convertidos,
           ROUND((oportunidad_a_ganado / NULLIF(prospecto_a_oportunidad, 0)) * 100, 2) AS tasa_conversion_pct
         FROM conteo_cohorte
         UNION ALL
         SELECT
           'oportunidad_comercial -> cierre_perdido' AS transicion,
           prospecto_a_oportunidad AS contactos_origen,
           oportunidad_a_perdido AS contactos_convertidos,
           ROUND((oportunidad_a_perdido / NULLIF(prospecto_a_oportunidad, 0)) * 100, 2) AS tasa_conversion_pct
         FROM conteo_cohorte
         UNION ALL
         SELECT
           'lead -> cierre_ganado (conversion_global)' AS transicion,
           total_leads AS contactos_origen,
           oportunidad_a_ganado AS contactos_convertidos,
           ROUND((oportunidad_a_ganado / NULLIF(total_leads, 0)) * 100, 2) AS tasa_conversion_pct
         FROM conteo_cohorte`,
        params
      );
    },

    // -------------------- 6. CICLO DE VENTA --------------------
    async querySalesCycle(filters = {}) {
      const clauses = [
        `o.estado_oportunidad = 'ganada'`,
        `o.resultado_cierre = 'ganada'`,
        `o.fecha_cierre IS NOT NULL`,
        `o.fecha_cierre >= ct.fecha_captura_lead`,
      ];
      const params = [];

      if (filters.campana_id) {
        clauses.push('o.campana_atribuida_id = ?');
        params.push(Number(filters.campana_id));
      }
      if (filters.desde) {
        clauses.push('DATE(o.fecha_cierre) >= ?');
        params.push(filters.desde);
      }
      if (filters.hasta) {
        clauses.push('DATE(o.fecha_cierre) <= ?');
        params.push(filters.hasta);
      }

      const whereSql = `WHERE ${clauses.join(' AND ')}`;

      const detalle = await db.query(
        `SELECT
           o.id AS oportunidad_id,
           o.codigo_oportunidad,
           ct.codigo_contacto,
           ct.nombre_organizacion,
           ct.fecha_captura_lead,
           o.fecha_apertura,
           o.fecha_cierre,
           o.monto_cierre_crc,
           DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead)) AS dias_ciclo_venta,
           ROUND(TIMESTAMPDIFF(HOUR, ct.fecha_captura_lead, o.fecha_cierre) / 24.0, 2) AS dias_exactos_ciclo
         FROM oportunidades o
         INNER JOIN contactos ct ON ct.id = o.contacto_id
         ${whereSql}
         ORDER BY o.fecha_cierre ASC`,
        params
      );

      const resumenRows = await db.query(
        `SELECT
           COUNT(o.id) AS total_oportunidades_ganadas_validas,
           ROUND(AVG(DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead))), 2) AS promedio_dias_ciclo_venta,
           MIN(DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead))) AS minimo_dias_ciclo_venta,
           MAX(DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead))) AS maximo_dias_ciclo_venta
         FROM oportunidades o
         INNER JOIN contactos ct ON ct.id = o.contacto_id
         ${whereSql}`,
        params
      );

      return {
        resumen: resumenRows[0] || {
          total_oportunidades_ganadas_validas: 0,
          promedio_dias_ciclo_venta: null,
          minimo_dias_ciclo_venta: null,
          maximo_dias_ciclo_venta: null,
        },
        detalle,
      };
    },

    // -------------------- 7. TICKET PROMEDIO --------------------
    async queryAverageTicket(filters = {}) {
      const contractClauses = [`cs.estado_contrato IN ('activo', 'pausado', 'finalizado')`];
      const contractParams = [];
      const oppClauses = [
        `o.estado_oportunidad = 'ganada'`,
        `o.resultado_cierre = 'ganada'`,
        `o.monto_cierre_crc IS NOT NULL`,
      ];
      const oppParams = [];

      if (filters.desde) {
        contractClauses.push('cs.fecha_contratacion >= ?');
        contractParams.push(filters.desde);
        oppClauses.push('DATE(o.fecha_cierre) >= ?');
        oppParams.push(filters.desde);
      }
      if (filters.hasta) {
        contractClauses.push('cs.fecha_contratacion <= ?');
        contractParams.push(filters.hasta);
        oppClauses.push('DATE(o.fecha_cierre) <= ?');
        oppParams.push(filters.hasta);
      }

      return db.query(
        `SELECT
           'contratos_servicios_cliente' AS fuente_medicion,
           COUNT(cs.id) AS cantidad_contratos_ganados,
           COALESCE(SUM(cs.precio_acordado_crc), 0.00) AS ingresos_cerrados_crc,
           ROUND(SUM(cs.precio_acordado_crc) / NULLIF(COUNT(cs.id), 0), 2) AS ticket_promedio_crc,
           CASE
             WHEN COUNT(cs.id) = 0 THEN 'NO_CALCULABLE_SIN_CONTRATOS'
             ELSE 'CALCULADO'
           END AS estado_calculo
         FROM contratos_servicios_cliente cs
         WHERE ${contractClauses.join(' AND ')}
         UNION ALL
         SELECT
           'oportunidades_ganadas' AS fuente_medicion,
           COUNT(o.id) AS cantidad_contratos_ganados,
           COALESCE(SUM(o.monto_cierre_crc), 0.00) AS ingresos_cerrados_crc,
           ROUND(SUM(o.monto_cierre_crc) / NULLIF(COUNT(o.id), 0), 2) AS ticket_promedio_crc,
           CASE
             WHEN COUNT(o.id) = 0 THEN 'NO_CALCULABLE_SIN_OPORTUNIDADES_GANADAS'
             ELSE 'CALCULADO'
           END AS estado_calculo
         FROM oportunidades o
         WHERE ${oppClauses.join(' AND ')}`,
        [...contractParams, ...oppParams]
      );
    },

    // -------------------- 8. VANIDAD VS NEGOCIO --------------------
    async queryVanityVsBusiness(filters = {}) {
      const joinClauses = [];
      const joinParams = [];
      const whereClauses = [];
      const whereParams = [];

      if (filters.desde) {
        joinClauses.push('m.periodo_fin >= ?');
        joinParams.push(filters.desde);
      }
      if (filters.hasta) {
        joinClauses.push('m.periodo_inicio <= ?');
        joinParams.push(filters.hasta);
      }
      if (filters.campana_id) {
        whereClauses.push('c.id = ?');
        whereParams.push(Number(filters.campana_id));
      }
      if (filters.canal_id) {
        whereClauses.push('c.canal_principal_id = ?');
        whereParams.push(Number(filters.canal_id));
      }

      const joinExtra = joinClauses.length ? `AND ${joinClauses.join(' AND ')}` : '';
      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

      return db.query(
        `WITH oportunidades_por_campana AS (
           SELECT
             campana_atribuida_id AS campana_id,
             COUNT(id) AS total_oportunidades,
             SUM(CASE WHEN estado_oportunidad = 'ganada' THEN 1 ELSE 0 END) AS oportunidades_ganadas
           FROM oportunidades
           WHERE campana_atribuida_id IS NOT NULL
           GROUP BY campana_atribuida_id
         )
         SELECT
           c.id AS campana_id,
           c.codigo_campana,
           c.nombre AS campana_nombre,
           cm.nombre AS canal_principal,
           cm.clasificacion AS clasificacion_canal,
           COALESCE(SUM(m.impresiones), 0) AS vanidad_impresiones,
           COALESCE(SUM(m.alcance), 0) AS vanidad_alcance,
           COALESCE(SUM(m.visualizaciones), 0) AS vanidad_visualizaciones,
           COALESCE(SUM(m.interacciones), 0) AS vanidad_interacciones,
           COALESCE(SUM(m.seguidores_ganados), 0) AS vanidad_seguidores_ganados,
           ROUND((SUM(m.interacciones) / NULLIF(SUM(m.alcance), 0)) * 100, 2) AS tasa_interaccion_alcance_pct,
           COALESCE(SUM(m.clics), 0) AS negocio_clics,
           COALESCE(SUM(m.leads_generados), 0) AS negocio_leads,
           COALESCE(opc.total_oportunidades, 0) AS negocio_oportunidades,
           COALESCE(SUM(m.conversiones_clientes), 0) AS negocio_clientes_ganados,
           COALESCE(SUM(m.ingresos_atribuibles_crc), 0.00) AS negocio_ingresos_atribuibles_crc,
           ROUND(
             SUM(
               m.gasto_publicitario_crc
               + m.costo_mercadeo_operativo_crc
               + m.costo_ventas_atribuible_crc
             ) / NULLIF(SUM(m.conversiones_clientes), 0),
             2
           ) AS negocio_cac_crc,
           ROUND(
             SUM(m.ingresos_atribuibles_crc) / NULLIF(SUM(m.gasto_publicitario_crc), 0),
             4
           ) AS negocio_roas,
           CASE
             WHEN COALESCE(SUM(m.interacciones), 0) >= 1000 AND COALESCE(SUM(m.conversiones_clientes), 0) = 0
               THEN 'ALERTA_ALTA_VANIDAD_SIN_VENTAS'
             WHEN COALESCE(SUM(m.conversiones_clientes), 0) > 0
               AND COALESCE(SUM(m.ingresos_atribuibles_crc), 0) > COALESCE(SUM(m.gasto_publicitario_crc), 0)
               THEN 'TRACCION_COMERCIAL_POSITIVA'
             WHEN COALESCE(SUM(m.leads_generados), 0) > 0 AND COALESCE(SUM(m.conversiones_clientes), 0) = 0
               THEN 'GENERACION_DE_LEADS_EN_MADURACION'
             ELSE 'SIN_TRACCION_COMERCIAL_AUN'
           END AS diagnostico_comparativo
         FROM campanas c
         INNER JOIN canales_mercadeo cm ON cm.id = c.canal_principal_id
         LEFT JOIN metricas_campana_periodo m ON m.campana_id = c.id ${joinExtra}
         LEFT JOIN oportunidades_por_campana opc ON opc.campana_id = c.id
         ${whereSql}
         GROUP BY
           c.id, c.codigo_campana, c.nombre,
           cm.nombre, cm.clasificacion, opc.total_oportunidades
         ORDER BY c.codigo_campana`,
        [...joinParams, ...whereParams]
      );
    },
  };
}

module.exports = {
  createMetricsRepository,
};

