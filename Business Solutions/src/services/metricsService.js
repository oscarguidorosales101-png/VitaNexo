const { AppError } = require('../utils/AppError');

function createMetricsService({ catalogsRepo, campaignsRepo, metricsRepo }) {
  return {
    async listMeasurements(filters = {}) {
      return metricsRepo.listMeasurements(filters);
    },

    async getMeasurementById(id) {
      const row = await metricsRepo.getMeasurementById(id);
      if (!row) {
        throw new AppError(`Registro de métricas con id ${id} no encontrado.`, 404, 'METRIC_NOT_FOUND');
      }
      return row;
    },

    async createMeasurement(payload) {
      if (payload.periodo_fin < payload.periodo_inicio) {
        throw new AppError(
          'El periodo_fin no puede ser anterior a periodo_inicio.',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      const campaign = await campaignsRepo.getCampaignById(payload.campana_id);
      if (!campaign) {
        throw new AppError(
          `La campaña ${payload.campana_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      const channel = await catalogsRepo.getChannelById(payload.canal_id);
      if (!channel) {
        throw new AppError(`El canal ${payload.canal_id} no existe.`, 400, 'FOREIGN_KEY_VIOLATION');
      }

      if (channel.clasificacion === 'organico' && Number(payload.gasto_publicitario_crc || 0) > 0) {
        throw new AppError(
          'Un canal orgánico no debe registrar gasto_publicitario_crc mayor a cero; registre los costos en costo_mercadeo_operativo_crc.',
          400,
          'ORGANIC_CHANNEL_AD_SPEND_FORBIDDEN'
        );
      }

      if (
        Number(payload.impresiones || 0) > 0 &&
        Number(payload.clics || 0) > Number(payload.impresiones || 0)
      ) {
        throw new AppError(
          'La cantidad de clics no puede superar las impresiones registradas en el mismo periodo.',
          400,
          'CLICKS_EXCEED_IMPRESSIONS'
        );
      }

      return metricsRepo.createMeasurement(payload);
    },

    async updateMeasurement(id, payload) {
      await this.getMeasurementById(id);
      return metricsRepo.updateMeasurement(id, payload);
    },

    // -------------------- INDICADORES CALCULADOS VÍA SQL --------------------
    async calculateCPC(filters = {}) {
      const rows = await metricsRepo.queryCPC(filters);
      const zeroClickCases = rows.filter((r) => Number(r.total_clics) === 0).map((r) => r.codigo_campana);
      return {
        indicador: 'CPC',
        nombre: 'Costo por Clic',
        formula: 'CPC = SUM(gasto_publicitario_crc) / NULLIF(SUM(clics), 0)',
        moneda: 'CRC',
        filtros_aplicados: filters,
        advertencias:
          rows.length === 0
            ? ['SIN_DATOS_EN_PERIODO']
            : zeroClickCases.length > 0
              ? [`DENOMINADOR_CERO_CLICS_EN: ${zeroClickCases.join(', ')}`]
              : [],
        resultados: rows,
      };
    },

    async calculateCTR(filters = {}) {
      const rows = await metricsRepo.queryCTR(filters);
      const zeroImpCases = rows
        .filter((r) => Number(r.total_impresiones) === 0)
        .map((r) => r.codigo_campana);
      return {
        indicador: 'CTR',
        nombre: 'Tasa de Clics (%)',
        formula: 'CTR = (SUM(clics) / NULLIF(SUM(impresiones), 0)) * 100',
        unidad: 'porcentaje',
        filtros_aplicados: filters,
        advertencias:
          rows.length === 0
            ? ['SIN_DATOS_EN_PERIODO']
            : zeroImpCases.length > 0
              ? [`DENOMINADOR_CERO_IMPRESIONES_EN: ${zeroImpCases.join(', ')}`]
              : [],
        resultados: rows,
      };
    },

    async calculateCAC(filters = {}) {
      const rows = await metricsRepo.queryCAC(filters);
      const zeroClients = rows
        .filter((r) => Number(r.nuevos_clientes_adquiridos) === 0)
        .map((r) => r.codigo_campana);
      return {
        indicador: 'CAC',
        nombre: 'Costo de Adquisición de Clientes',
        formula:
          'CAC = SUM(gasto_publicitario_crc + costo_mercadeo_operativo_crc + costo_ventas_atribuible_crc) / NULLIF(SUM(conversiones_clientes), 0)',
        definicion_costos:
          'Incluye gasto publicitario en anuncios + costos operativos de mercadeo + costos comerciales atribuibles de ventas.',
        moneda: 'CRC',
        filtros_aplicados: filters,
        advertencias:
          rows.length === 0
            ? ['SIN_DATOS_EN_PERIODO']
            : zeroClients.length > 0
              ? [`DENOMINADOR_CERO_CLIENTES_EN: ${zeroClients.join(', ')}`]
              : [],
        resultados: rows,
      };
    },

    async calculateROAS(filters = {}) {
      const rows = await metricsRepo.queryROAS(filters);
      const zeroSpend = rows
        .filter((r) => Number(r.gasto_publicitario_crc) === 0)
        .map((r) => `${r.codigo_campana} (${r.canal_nombre})`);
      return {
        indicador: 'ROAS',
        nombre: 'Retorno de la Inversión Publicitaria',
        formula: 'ROAS = SUM(ingresos_atribuibles_crc) / NULLIF(SUM(gasto_publicitario_crc), 0)',
        nota_metodologica:
          'Mide ingresos brutos atribuidos por cada colón de gasto publicitario; no representa utilidad ni beneficio neto.',
        filtros_aplicados: filters,
        advertencias:
          rows.length === 0
            ? ['SIN_DATOS_EN_PERIODO']
            : zeroSpend.length > 0
              ? [`GASTO_PUBLICITARIO_CERO_EN: ${zeroSpend.join(', ')}`]
              : [],
        resultados: rows,
      };
    },

    async calculateFunnelConversions(filters = {}) {
      const rows = await metricsRepo.queryFunnelConversions(filters);
      const emptyBase = rows.some((r) => Number(r.contactos_origen) === 0);
      return {
        indicador: 'CONVERSION_ETAPAS',
        nombre: 'Tasas de Conversión entre Etapas del Embudo',
        formula:
          'Conversión (%) = (COUNT(DISTINCT contactos_en_etapa_destino_con_fecha_coherente) / NULLIF(COUNT(DISTINCT contactos_en_etapa_origen), 0)) * 100',
        filtros_aplicados: filters,
        advertencias: emptyBase ? ['ETAPAS_CON_DENOMINADOR_CERO'] : [],
        resultados: rows,
      };
    },

    async calculateSalesCycle(filters = {}) {
      const data = await metricsRepo.querySalesCycle(filters);
      const totalWon = Number(data.resumen?.total_oportunidades_ganadas_validas || 0);
      return {
        indicador: 'CICLO_VENTA',
        nombre: 'Ciclo de Venta en Días (Lead a Cierre Ganado)',
        formula: 'Promedio(DATEDIFF(DATE(oportunidades.fecha_cierre), DATE(contactos.fecha_captura_lead))) para oportunidades ganadas con fecha válida',
        unidad: 'dias',
        filtros_aplicados: filters,
        advertencias: totalWon === 0 ? ['SIN_OPORTUNIDADES_GANADAS_CON_FECHA_VALIDA'] : [],
        resultados: data,
      };
    },

    async calculateAverageTicket(filters = {}) {
      const rows = await metricsRepo.queryAverageTicket(filters);
      const zeroContracts = rows
        .filter((r) => Number(r.cantidad_contratos_ganados) === 0)
        .map((r) => r.fuente_medicion);
      return {
        indicador: 'TICKET_PROMEDIO',
        nombre: 'Ticket Promedio de Ventas Cerradas',
        formula: 'Ticket Promedio = SUM(ingresos_ventas_cerradas_crc) / NULLIF(COUNT(contratos_ganados), 0)',
        moneda: 'CRC',
        filtros_aplicados: filters,
        advertencias:
          zeroContracts.length > 0
            ? [`SIN_CONTRATOS_GANADOS_EN: ${zeroContracts.join(', ')}`]
            : [],
        resultados: rows,
      };
    },

    async compareVanityVsBusiness(filters = {}) {
      const rows = await metricsRepo.queryVanityVsBusiness(filters);
      const vanityAlerts = rows
        .filter((r) => r.diagnostico_comparativo === 'ALERTA_ALTA_VANIDAD_SIN_VENTAS')
        .map((r) => r.codigo_campana);
      return {
        indicador: 'VANIDAD_VS_NEGOCIO',
        nombre: 'Comparación de Métricas de Vanidad vs Métricas de Negocio',
        formula:
          'Contraste por campaña de exposición/interacciones frente a clics, leads, oportunidades, clientes ganados, CAC y ROAS',
        nota_metodologica:
          'Un incremento de alcance o interacciones no implica incremento de ventas ni rentabilidad.',
        filtros_aplicados: filters,
        advertencias:
          rows.length === 0
            ? ['SIN_DATOS_PARA_COMPARAR']
            : vanityAlerts.length > 0
              ? [`CAMPANAS_ALTA_VANIDAD_SIN_VENTAS: ${vanityAlerts.join(', ')}`]
              : [],
        resultados: rows,
      };
    },
  };
}

module.exports = {
  createMetricsService,
};

