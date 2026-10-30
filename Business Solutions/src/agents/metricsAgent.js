const { AppError } = require('../utils/AppError');

const AGENT_CODE = 'agente_metricas';

const SUPPORTED_TASKS = [
  'calcular_cpc',
  'calcular_ctr',
  'calcular_cac',
  'calcular_roas',
  'calcular_conversion_embudo',
  'calcular_ciclo_venta',
  'calcular_ticket_promedio',
  'comparar_vanidad_vs_negocio',
  'diagnosticar_indicadores_integrales',
  'interpretar_metricas_ia',
];

function extractFilters(params = {}) {
  const filters = {};
  if (params.campana_id) filters.campana_id = Number(params.campana_id);
  if (params.canal_id) filters.canal_id = Number(params.canal_id);
  if (params.desde) filters.desde = params.desde;
  if (params.hasta) filters.hasta = params.hasta;
  return filters;
}

function createMetricsAgent({ metricsService, n8nBridge = null }) {
  function requireAiBridge() {
    if (!n8nBridge) {
      throw new AppError(
        'El puente de automatización n8n/Gemini no está disponible en esta instancia.',
        503,
        'AI_BRIDGE_NOT_CONFIGURED'
      );
    }
    return n8nBridge;
  }

  async function computeAllEightIndicators(filters) {
    const [cpc, ctr, cac, roas, conversiones, cicloVenta, ticketPromedio, vanidadVsNegocio] =
      await Promise.all([
        metricsService.calculateCPC(filters),
        metricsService.calculateCTR(filters),
        metricsService.calculateCAC(filters),
        metricsService.calculateROAS(filters),
        metricsService.calculateFunnelConversions(filters),
        metricsService.calculateSalesCycle(filters),
        metricsService.calculateAverageTicket(filters),
        metricsService.compareVanityVsBusiness(filters),
      ]);

    const advertenciasConsolidadas = [
      ...cpc.advertencias,
      ...ctr.advertencias,
      ...cac.advertencias,
      ...roas.advertencias,
      ...conversiones.advertencias,
      ...cicloVenta.advertencias,
      ...ticketPromedio.advertencias,
      ...vanidadVsNegocio.advertencias,
    ];

    return {
      cpc,
      ctr,
      cac,
      roas,
      conversiones,
      cicloVenta,
      ticketPromedio,
      vanidadVsNegocio,
      advertenciasConsolidadas,
    };
  }

  return {
    agentCode: AGENT_CODE,
    supportedTasks: SUPPORTED_TASKS,

    async execute(taskType, params = {}, executionContext = {}) {
      if (!SUPPORTED_TASKS.includes(taskType)) {
        throw new AppError(
          `El agente '${AGENT_CODE}' no soporta la tarea '${taskType}'.`,
          400,
          'UNSUPPORTED_AGENT_TASK'
        );
      }

      const filters = extractFilters(params);
      const references = filters.campana_id ? { campana_id: filters.campana_id } : {};

      const singleHandlers = {
        calcular_cpc: () => metricsService.calculateCPC(filters),
        calcular_ctr: () => metricsService.calculateCTR(filters),
        calcular_cac: () => metricsService.calculateCAC(filters),
        calcular_roas: () => metricsService.calculateROAS(filters),
        calcular_conversion_embudo: () => metricsService.calculateFunnelConversions(filters),
        calcular_ciclo_venta: () => metricsService.calculateSalesCycle(filters),
        calcular_ticket_promedio: () => metricsService.calculateAverageTicket(filters),
        comparar_vanidad_vs_negocio: () => metricsService.compareVanityVsBusiness(filters),
      };

      if (singleHandlers[taskType]) {
        const report = await singleHandlers[taskType]();
        return {
          summary: {
            indicador: report.indicador,
            advertencias: report.advertencias,
            registros_evaluados: Array.isArray(report.resultados)
              ? report.resultados.length
              : report.resultados?.detalle?.length ?? 0,
          },
          references,
          result: report,
        };
      }

      if (taskType === 'diagnosticar_indicadores_integrales') {
        const bundle = await computeAllEightIndicators(filters);

        return {
          summary: {
            indicadores_calculados: 8,
            total_advertencias_datos: bundle.advertenciasConsolidadas.length,
          },
          references,
          result: {
            filtros_aplicados: filters,
            advertencias_consolidadas: bundle.advertenciasConsolidadas,
            indicadores: {
              cpc: bundle.cpc,
              ctr: bundle.ctr,
              cac: bundle.cac,
              roas: bundle.roas,
              conversion_etapas: bundle.conversiones,
              ciclo_venta: bundle.cicloVenta,
              ticket_promedio: bundle.ticketPromedio,
              vanidad_vs_negocio: bundle.vanidadVsNegocio,
            },
          },
        };
      }

      if (taskType === 'interpretar_metricas_ia') {
        const bridge = requireAiBridge();
        const bundle = await computeAllEightIndicators(filters);

        const aiResponse = await bridge.invokeAgentWorkflow({
          codigo_ejecucion: executionContext.codigo_ejecucion,
          codigo_agente: AGENT_CODE,
          tipo_tarea: taskType,
          idempotency_key: executionContext.idempotency_key || null,
          reintento_de_id: params._reintento_workflow_id || null,
          parametros: {
            filtros_aplicados: filters,
            enfoque_analisis:
              params.enfoque_analisis ||
              'Diagnóstico ejecutivo integral de CPC, CTR, CAC, ROAS, conversión del embudo, ciclo de venta, ticket promedio y vanidad vs negocio en CRC.',
          },
          contexto: {
            moneda: 'CRC',
            regla_datos: 'Cifras calculadas exclusivamente con consultas SQL parametrizadas en MySQL VitaBase.',
            indicadores_sql_vitabase: {
              cpc: bundle.cpc.resultados,
              ctr: bundle.ctr.resultados,
              cac: bundle.cac.resultados,
              roas: bundle.roas.resultados,
              conversion_etapas: bundle.conversiones.resultados,
              ciclo_venta: {
                resumen: bundle.cicloVenta.resumen,
                detalle: bundle.cicloVenta.resultados?.detalle || [],
              },
              ticket_promedio: bundle.ticketPromedio.resultados,
              vanidad_vs_negocio: bundle.vanidadVsNegocio.resultados,
            },
            advertencias_sql: bundle.advertenciasConsolidadas,
          },
          requiredOutputKeys: [
            'resumen_ejecutivo',
            'interpretacion_kpis',
            'tendencias_identificadas',
            'comparativa_campanas',
            'problemas_detectados',
            'recomendaciones_mejora',
          ],
        });

        const ia = aiResponse.analisis_ia;

        return {
          summary: {
            proveedor_ia: aiResponse.proveedor_ia,
            modelo_ia: aiResponse.modelo_ia,
            indicadores_sql_evaluados: 8,
            problemas_detectados: Array.isArray(ia.problemas_detectados) ? ia.problemas_detectados.length : 0,
            recomendaciones: Array.isArray(ia.recomendaciones_mejora) ? ia.recomendaciones_mejora.length : 0,
          },
          references: {
            ...references,
            traza_n8n_id: aiResponse.traza_n8n?.id || null,
          },
          result: {
            filtros_aplicados: filters,
            fuente_cifras: 'SQL_PARAMETRIZADO_VITABASE',
            advertencias_sql: bundle.advertenciasConsolidadas,
            indicadores_sql: {
              cpc: bundle.cpc,
              ctr: bundle.ctr,
              cac: bundle.cac,
              roas: bundle.roas,
              conversion_etapas: bundle.conversiones,
              ciclo_venta: bundle.cicloVenta,
              ticket_promedio: bundle.ticketPromedio,
              vanidad_vs_negocio: bundle.vanidadVsNegocio,
            },
            interpretacion_ia: ia,
            metadatos_ia: {
              proveedor: aiResponse.proveedor_ia,
              modelo: aiResponse.modelo_ia,
              workflow_n8n: aiResponse.workflow_id,
              duracion_n8n_ms: aiResponse.duracion_n8n_ms,
              intentos: aiResponse.intentos_realizados,
            },
          },
        };
      }

      throw new AppError(`Tarea no implementada: ${taskType}`, 400, 'UNSUPPORTED_AGENT_TASK');
    },
  };
}

module.exports = {
  createMetricsAgent,
  AGENT_CODE,
  SUPPORTED_TASKS,
};
