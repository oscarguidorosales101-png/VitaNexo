function createDashboardService({ db, metricsService, automationsService }) {
  return {
    async getExecutiveSummary() {
      const [
        clientesRows,
        contratosRows,
        campanasRows,
        contenidosRows,
        contactosPorEtapa,
        oportunidadesRows,
        traspasosRows,
        ejecucionesRecientes,
        conversionesEmbudo,
        cicloVenta,
        ticketPromedio,
        vanidadVsNegocio,
      ] = await Promise.all([
        db.query(
          `SELECT
             COUNT(*) AS total_clientes,
             SUM(CASE WHEN estado_cliente = 'activo' THEN 1 ELSE 0 END) AS clientes_activos,
             SUM(CASE WHEN estado_cliente = 'suspendido' THEN 1 ELSE 0 END) AS clientes_suspendidos
           FROM clientes`
        ),
        db.query(
          `SELECT
             COUNT(*) AS total_contratos,
             SUM(CASE WHEN estado_contrato = 'activo' THEN 1 ELSE 0 END) AS contratos_activos,
             COALESCE(SUM(CASE WHEN estado_contrato = 'activo' THEN precio_acordado_crc ELSE 0 END), 0) AS ingresos_recurrentes_activos_crc
           FROM contratos_servicios_cliente`
        ),
        db.query(
          `SELECT
             COUNT(*) AS total_campanas,
             SUM(CASE WHEN estado = 'activa' THEN 1 ELSE 0 END) AS campanas_activas,
             SUM(CASE WHEN estado = 'propuesta' THEN 1 ELSE 0 END) AS campanas_propuestas,
             COALESCE(SUM(presupuesto_total_crc), 0) AS presupuesto_total_crc
           FROM campanas`
        ),
        db.query(
          `SELECT
             estado,
             COUNT(*) AS cantidad
           FROM contenidos
           GROUP BY estado`
        ),
        db.query(
          `SELECT
             ef.id AS etapa_id,
             ef.codigo_etapa,
             ef.nombre AS etapa_nombre,
             ef.orden_embudo,
             COUNT(c.id) AS total_contactos
           FROM etapas_embudo ef
           LEFT JOIN contactos c ON c.etapa_actual_id = ef.id AND c.activo = 1
           GROUP BY ef.id, ef.codigo_etapa, ef.nombre, ef.orden_embudo
           ORDER BY ef.orden_embudo ASC`
        ),
        db.query(
          `SELECT
             COUNT(*) AS total_oportunidades,
             SUM(CASE WHEN estado_oportunidad IN ('abierta', 'en_negociacion') THEN 1 ELSE 0 END) AS oportunidades_abiertas,
             SUM(CASE WHEN estado_oportunidad = 'ganada' THEN 1 ELSE 0 END) AS oportunidades_ganadas,
             SUM(CASE WHEN estado_oportunidad = 'perdida' THEN 1 ELSE 0 END) AS oportunidades_perdidas,
             COALESCE(SUM(CASE WHEN estado_oportunidad IN ('abierta', 'en_negociacion') THEN valor_estimado_crc ELSE 0 END), 0) AS pipeline_abierto_crc,
             COALESCE(SUM(CASE WHEN estado_oportunidad = 'ganada' THEN monto_cierre_crc ELSE 0 END), 0) AS ventas_ganadas_crc
           FROM oportunidades`
        ),
        db.query(
          `SELECT
             COUNT(*) AS total_traspasos,
             SUM(CASE WHEN decision_ventas = 'pendiente' THEN 1 ELSE 0 END) AS traspasos_pendientes,
             SUM(CASE WHEN decision_ventas = 'aceptado' THEN 1 ELSE 0 END) AS traspasos_aceptados
           FROM traspasos_ventas`
        ),
        db.query(
          `SELECT
             ea.id,
             ea.codigo_ejecucion,
             ca.codigo_agente,
             ca.nombre AS agente_nombre,
             ea.tipo_tarea,
             ea.estado,
             ea.duracion_ms,
             ea.fecha_inicio,
             ea.mensaje_error
           FROM ejecuciones_agentes ea
           INNER JOIN catalogo_agentes ca ON ca.id = ea.agente_id
           ORDER BY ea.fecha_inicio DESC, ea.id DESC
           LIMIT 10`
        ),
        metricsService.calculateFunnelConversions(),
        metricsService.calculateSalesCycle(),
        metricsService.calculateAverageTicket(),
        metricsService.compareVanityVsBusiness(),
      ]);

      let n8nStatus = null;
      if (automationsService) {
        try {
          const ov = await automationsService.getStatusOverview();
          n8nStatus = {
            online: ov.n8n.online,
            webhook_autenticado: ov.n8n.webhook_autenticado,
            workflows_activos: ov.workflows_activos,
            total_workflows: ov.total_workflows,
            modelo_gemini: ov.n8n.modelo_gemini,
            estadisticas: ov.estadisticas,
          };
        } catch (_) {
          n8nStatus = { online: false, webhook_autenticado: false };
        }
      }

      const contenidosPorEstado = {};
      for (const r of contenidosRows) {
        contenidosPorEstado[r.estado] = Number(r.cantidad);
      }

      return {
        generado_en: new Date().toISOString(),
        moneda: 'CRC',
        clientes: clientesRows[0],
        contratos: contratosRows[0],
        campanas: campanasRows[0],
        contenidos_por_estado: contenidosPorEstado,
        embudo_contactos: contactosPorEtapa,
        oportunidades: oportunidadesRows[0],
        traspasos_ventas: traspasosRows[0],
        indicadores_principales: {
          conversiones_embudo: conversionesEmbudo.resultados,
          ciclo_venta_resumen: cicloVenta.resumen,
          ticket_promedio: ticketPromedio.resultados,
          campanas_rendimiento: vanidadVsNegocio.resultados,
        },
        ejecuciones_agentes_recientes: ejecucionesRecientes,
        automatizaciones_n8n: n8nStatus,
      };
    },
  };
}

module.exports = {
  createDashboardService,
};

