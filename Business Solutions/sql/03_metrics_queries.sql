-- =============================================================================
-- VITANEXO BACKEND — CONSULTAS SQL DE MÉTRICAS E INDICADORES DE NEGOCIO
-- Base de datos objetivo: VitaBase (MySQL 8.0+)
-- Todas las consultas utilizan NULLIF para evitar divisiones por cero y
-- exponen un campo estado_calculo que explica cualquier denominador cero.
-- =============================================================================

USE `VitaBase`;

-- =============================================================================
-- 1. CPC — COSTO POR CLIC
-- Fórmula: CPC = SUM(gasto_publicitario_crc) / SUM(clics)
-- Qué calcula: El costo promedio en colones por cada clic obtenido en cada
-- campaña y canal. Si no existen clics (clics = 0), devuelve NULL en cpc_crc
-- e informa explícitamente el motivo en estado_calculo.
-- =============================================================================
SELECT
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
FROM `metricas_campana_periodo` m
INNER JOIN `campanas` c ON c.id = m.campana_id
INNER JOIN `canales_mercadeo` cm ON cm.id = m.canal_id
GROUP BY c.id, c.codigo_campana, c.nombre, cm.id, cm.nombre, cm.clasificacion
ORDER BY c.codigo_campana, cm.nombre;

-- =============================================================================
-- 2. CTR — TASA DE CLICS
-- Fórmula: CTR (%) = (SUM(clics) / SUM(impresiones)) * 100
-- Qué calcula: El porcentaje de impresiones que generaron un clic por campaña
-- y canal. Controla el caso de cero impresiones evitando división por cero.
-- =============================================================================
SELECT
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
FROM `metricas_campana_periodo` m
INNER JOIN `campanas` c ON c.id = m.campana_id
INNER JOIN `canales_mercadeo` cm ON cm.id = m.canal_id
GROUP BY c.id, c.codigo_campana, c.nombre, cm.id, cm.nombre, cm.clasificacion
ORDER BY c.codigo_campana, cm.nombre;

-- =============================================================================
-- 3. CAC — COSTO DE ADQUISICIÓN DE CLIENTES
-- Fórmula: CAC = (gasto_publicitario + costo_mercadeo_operativo + costo_ventas_atribuible)
--                / cantidad_nuevos_clientes_adquiridos
-- Definición de costos incluidos:
--   1) gasto_publicitario_crc: inversión directa en pauta de anuncios.
--   2) costo_mercadeo_operativo_crc: producción creativa, redacción y herramientas.
--   3) costo_ventas_atribuible_crc: tiempo comercial de demostración, propuesta y cierre.
-- Definición de clientes incluidos:
--   Nuevos clientes adquiridos y atribuidos en el periodo (conversiones_clientes > 0).
-- =============================================================================
SELECT
  c.id AS campana_id,
  c.codigo_campana,
  c.nombre AS campana_nombre,
  cm.clasificacion AS clasificacion_canal_principal,
  SUM(m.gasto_publicitario_crc) AS gasto_publicitario_crc,
  SUM(m.costo_mercadeo_operativo_crc) AS costo_mercadeo_operativo_crc,
  SUM(m.costo_ventas_atribuible_crc) AS costo_ventas_atribuible_crc,
  SUM(
    m.gasto_publicitario_crc
    + m.costo_mercadeo_operativo_crc
    + m.costo_ventas_atribuible_crc
  ) AS costo_total_adquisicion_crc,
  SUM(m.conversiones_clientes) AS nuevos_clientes_adquiridos,
  ROUND(
    SUM(
      m.gasto_publicitario_crc
      + m.costo_mercadeo_operativo_crc
      + m.costo_ventas_atribuible_crc
    ) / NULLIF(SUM(m.conversiones_clientes), 0),
    2
  ) AS cac_crc,
  CASE
    WHEN SUM(m.conversiones_clientes) = 0 THEN 'NO_CALCULABLE_SIN_CLIENTES_ADQUIRIDOS'
    ELSE 'CALCULADO'
  END AS estado_calculo
FROM `campanas` c
INNER JOIN `canales_mercadeo` cm ON cm.id = c.canal_principal_id
LEFT JOIN `metricas_campana_periodo` m ON m.campana_id = c.id
GROUP BY c.id, c.codigo_campana, c.nombre, cm.clasificacion
ORDER BY c.codigo_campana;

-- =============================================================================
-- 4. ROAS — RETORNO DE LA INVERSIÓN PUBLICITARIA
-- Fórmula: ROAS = SUM(ingresos_atribuibles_crc) / SUM(gasto_publicitario_crc)
-- Nota conceptual: Mide ingresos brutos atribuidos por cada colón invertido en
-- pauta publicitaria; NO equivale a margen ni a beneficio neto.
-- Controla gasto_publicitario_crc = 0 (ej. campañas orgánicas).
-- =============================================================================
SELECT
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
FROM `metricas_campana_periodo` m
INNER JOIN `campanas` c ON c.id = m.campana_id
INNER JOIN `canales_mercadeo` cm ON cm.id = m.canal_id
GROUP BY c.id, c.codigo_campana, c.nombre, cm.id, cm.nombre, cm.clasificacion
ORDER BY c.codigo_campana, cm.nombre;

-- =============================================================================
-- 5. CONVERSIÓN ENTRE ETAPAS DEL EMBUDO COMERCIAL
-- Qué calcula: Tasas de conversión entre etapas consecutivas del embudo a partir
-- de historial_etapas_contacto, usando COUNT(DISTINCT contacto_id) y validando
-- que la fecha de entrada a la etapa destino sea mayor o igual a la de origen,
-- evitando contar dos veces al mismo contacto en una misma transición.
-- =============================================================================
WITH primeras_fechas_etapa AS (
  SELECT
    h.contacto_id,
    e.codigo_etapa,
    MIN(h.fecha_transicion) AS primera_fecha_etapa
  FROM `historial_etapas_contacto` h
  INNER JOIN `etapas_embudo` e ON e.id = h.etapa_nueva_id
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
FROM conteo_cohorte;

-- =============================================================================
-- 6. CICLO DE VENTA (EN DÍAS)
-- Qué calcula: Días transcurridos entre la captura del lead (fecha_captura_lead)
-- y el cierre efectivo (fecha_cierre) para oportunidades ganadas, excluyendo
-- registros sin fecha_cierre válida o con fechas incoherentes.
-- =============================================================================
-- 6A. Detalle por oportunidad ganada:
SELECT
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
FROM `oportunidades` o
INNER JOIN `contactos` ct ON ct.id = o.contacto_id
WHERE o.estado_oportunidad = 'ganada'
  AND o.resultado_cierre = 'ganada'
  AND o.fecha_cierre IS NOT NULL
  AND o.fecha_cierre >= ct.fecha_captura_lead
ORDER BY o.fecha_cierre;

-- 6B. Resumen agregado del ciclo de venta:
SELECT
  COUNT(o.id) AS total_oportunidades_ganadas_validas,
  ROUND(AVG(DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead))), 2) AS promedio_dias_ciclo_venta,
  MIN(DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead))) AS minimo_dias_ciclo_venta,
  MAX(DATEDIFF(DATE(o.fecha_cierre), DATE(ct.fecha_captura_lead))) AS maximo_dias_ciclo_venta
FROM `oportunidades` o
INNER JOIN `contactos` ct ON ct.id = o.contacto_id
WHERE o.estado_oportunidad = 'ganada'
  AND o.resultado_cierre = 'ganada'
  AND o.fecha_cierre IS NOT NULL
  AND o.fecha_cierre >= ct.fecha_captura_lead;

-- =============================================================================
-- 7. TICKET PROMEDIO
-- Fórmula: Ingresos de ventas cerradas / Número de contratos u oportunidades
--          ganadas en el periodo.
-- Se presentan ambas perspectivas auditables:
--   A) Por contratos de servicios vigentes/finalizados (contratos_servicios_cliente)
--   B) Por oportunidades comerciales cerradas como ganadas (oportunidades)
-- =============================================================================
SELECT
  'contratos_servicios_cliente' AS fuente_medicion,
  COUNT(cs.id) AS cantidad_contratos_ganados,
  COALESCE(SUM(cs.precio_acordado_crc), 0.00) AS ingresos_cerrados_crc,
  ROUND(SUM(cs.precio_acordado_crc) / NULLIF(COUNT(cs.id), 0), 2) AS ticket_promedio_crc,
  CASE
    WHEN COUNT(cs.id) = 0 THEN 'NO_CALCULABLE_SIN_CONTRATOS'
    ELSE 'CALCULADO'
  END AS estado_calculo
FROM `contratos_servicios_cliente` cs
WHERE cs.estado_contrato IN ('activo', 'pausado', 'finalizado')
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
FROM `oportunidades` o
WHERE o.estado_oportunidad = 'ganada'
  AND o.resultado_cierre = 'ganada'
  AND o.monto_cierre_crc IS NOT NULL;

-- =============================================================================
-- 8. COMPARACIÓN DE MÉTRICAS DE VANIDAD VS MÉTRICAS DE NEGOCIO
-- Qué calcula: Contrasta indicadores superficiales de exposición (impresiones,
-- alcance, visualizaciones, interacciones, seguidores) frente a resultados
-- comerciales reales (clics, leads, oportunidades, clientes ganados, CAC y ROAS).
-- Incluye un diagnóstico determinista para evitar confundir interacciones con ventas.
-- =============================================================================
WITH oportunidades_por_campana AS (
  SELECT
    campana_atribuida_id AS campana_id,
    COUNT(id) AS total_oportunidades,
    SUM(CASE WHEN estado_oportunidad = 'ganada' THEN 1 ELSE 0 END) AS oportunidades_ganadas
  FROM `oportunidades`
  WHERE campana_atribuida_id IS NOT NULL
  GROUP BY campana_atribuida_id
)
SELECT
  c.id AS campana_id,
  c.codigo_campana,
  c.nombre AS campana_nombre,
  cm.nombre AS canal_principal,
  cm.clasificacion AS clasificacion_canal,
  -- Métricas de vanidad
  COALESCE(SUM(m.impresiones), 0) AS vanidad_impresiones,
  COALESCE(SUM(m.alcance), 0) AS vanidad_alcance,
  COALESCE(SUM(m.visualizaciones), 0) AS vanidad_visualizaciones,
  COALESCE(SUM(m.interacciones), 0) AS vanidad_interacciones,
  COALESCE(SUM(m.seguidores_ganados), 0) AS vanidad_seguidores_ganados,
  ROUND((SUM(m.interacciones) / NULLIF(SUM(m.alcance), 0)) * 100, 2) AS tasa_interaccion_alcance_pct,
  -- Métricas de negocio
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
  -- Diagnóstico analítico objetivo (no asume que interacción = ventas)
  CASE
    WHEN COALESCE(SUM(m.interacciones), 0) >= 1000 AND COALESCE(SUM(m.conversiones_clientes), 0) = 0
      THEN 'ALERTA_ALTA_VANIDAD_SIN_VENTAS'
    WHEN COALESCE(SUM(m.conversiones_clientes), 0) > 0 AND COALESCE(SUM(m.ingresos_atribuibles_crc), 0) > COALESCE(SUM(m.gasto_publicitario_crc), 0)
      THEN 'TRACCION_COMERCIAL_POSITIVA'
    WHEN COALESCE(SUM(m.leads_generados), 0) > 0 AND COALESCE(SUM(m.conversiones_clientes), 0) = 0
      THEN 'GENERACION_DE_LEADS_EN_MADURACION'
    ELSE 'SIN_TRACCION_COMERCIAL_AUN'
  END AS diagnostico_comparativo
FROM `campanas` c
INNER JOIN `canales_mercadeo` cm ON cm.id = c.canal_principal_id
LEFT JOIN `metricas_campana_periodo` m ON m.campana_id = c.id
LEFT JOIN oportunidades_por_campana opc ON opc.campana_id = c.id
GROUP BY
  c.id, c.codigo_campana, c.nombre,
  cm.nombre, cm.clasificacion, opc.total_oportunidades
ORDER BY c.codigo_campana;

