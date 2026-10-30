import React, { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type { CampaignItem, OrchestratorDispatchResult } from '../types/vitanexo';
import { formatCRC, formatNumber, formatPercent } from '../utils/formatters';
import { ErrorAlert, LoadingSpinner, SectionHeader, StatusBadge } from '../components/UiPrimitives';

export function MetricsView() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [kpis, setKpis] = useState<{
    cpc: any;
    ctr: any;
    cac: any;
    roas: any;
    funnel: any;
    cycle: any;
    ticket: any;
    vanity: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Interpretación ejecutiva Gemini sobre datos SQL reales
  const [aiRunning, setAiRunning] = useState(false);
  const [aiReport, setAiReport] = useState<OrchestratorDispatchResult | null>(null);

  async function loadMetrics(campId = selectedCampaignId) {
    setLoading(true);
    setError(null);
    const q = campId ? `?campana_id=${campId}` : '';
    try {
      const [cmp, cpc, ctr, cac, roas, funnel, cycle, ticket, vanity] = await Promise.all([
        vitanexoApi.listCampaigns(),
        vitanexoApi.getMetricCPC(q),
        vitanexoApi.getMetricCTR(q),
        vitanexoApi.getMetricCAC(q),
        vitanexoApi.getMetricROAS(q),
        vitanexoApi.getMetricFunnel(q),
        vitanexoApi.getMetricSalesCycle(q),
        vitanexoApi.getMetricAvgTicket(q),
        vitanexoApi.getMetricVanityVsBusiness(q),
      ]);
      setCampaigns(cmp);
      setKpis({ cpc, ctr, cac, roas, funnel, cycle, ticket, vanity });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics('');
  }, []);

  async function handleInterpretWithGemini() {
    setAiRunning(true);
    setError(null);
    try {
      const res = await vitanexoApi.executeOrchestratorTask({
        tipo_tarea: 'interpretar_metricas_ia',
        parametros: selectedCampaignId
          ? { campana_id: Number(selectedCampaignId) }
          : {
              enfoque_analisis:
                'Interpretar los 8 indicadores SQL reales de VitaBase (CPC, CTR, CAC, ROAS, embudo, ciclo de venta, ticket promedio y vanidad vs negocio) en CRC.',
            },
      });
      setAiReport(res);
    } catch (err) {
      setError(err);
    } finally {
      setAiRunning(false);
    }
  }

  if (loading && !kpis) {
    return <LoadingSpinner label="Ejecutando las 8 consultas SQL parametrizadas sobre MySQL VitaBase..." />;
  }

  const allWarnings: string[] = kpis
    ? [
        ...(kpis.cpc?.advertencias || []),
        ...(kpis.ctr?.advertencias || []),
        ...(kpis.cac?.advertencias || []),
        ...(kpis.roas?.advertencias || []),
      ]
    : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Métricas Comerciales y Analítica SQL (VitaBase)"
        subtitle="Todos los cálculos (CPC, CTR, CAC, ROAS, conversión, ciclo de venta, ticket promedio y vanidad vs negocio) provienen de SQL real en MySQL."
        actions={
          <>
            <select
              value={selectedCampaignId}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                loadMetrics(e.target.value);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">Todas las campañas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.codigo_campana} — {c.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadMetrics(selectedCampaignId)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Recalcular SQL</span>
            </button>
            <button
              type="button"
              disabled={aiRunning}
              onClick={handleInterpretWithGemini}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Interpretando con Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Interpretar KPIs con Gemini IA</span>
                </>
              )}
            </button>
          </>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}

      {/* Panel de Interpretación Ejecutiva Gemini (Basada estrictamente en SQL) */}
      {aiReport && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/40 p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Interpretación Ejecutiva de Gemini API sobre Cifras SQL Reales
              </h2>
            </div>
            <span className="font-mono text-xs text-slate-500">
              {aiReport.ejecucion.codigo_ejecucion} · {aiReport.ejecucion.duracion_ms} ms
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-800">
            {aiReport.resultado?.interpretacion_ia?.resumen_ejecutivo}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <h4 className="font-bold text-rose-700">Problemas y Cuellos de Botella Detectados</h4>
              <ul className="mt-2 space-y-2">
                {(aiReport.resultado?.interpretacion_ia?.problemas_detectados || []).map(
                  (p: any, i: number) => (
                    <li key={i} className="border-b border-slate-100 pb-1.5 last:border-none">
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{p.campana_o_etapa}</span>
                        <StatusBadge label={p.severidad} />
                      </div>
                      <p className="mt-0.5 text-slate-600">{p.evidencia_sql}</p>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <h4 className="font-bold text-teal-800">Recomendaciones Accionables de Mejora</h4>
              <ul className="mt-2 space-y-2">
                {(aiReport.resultado?.interpretacion_ia?.recomendaciones_mejora || []).map(
                  (r: any, i: number) => (
                    <li key={i} className="border-b border-slate-100 pb-1.5 last:border-none">
                      <div className="font-semibold text-slate-900">
                        #{r.prioridad} — {r.accion}
                      </div>
                      <p className="mt-0.5 text-slate-600">Impacto esperado: {r.impacto_esperado}</p>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {kpis && (
        <>
          {/* Resumen Ticket Promedio y Ciclo de Venta */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                7. Ticket Promedio Ganado
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatCRC(
                  kpis.ticket?.resultados?.global?.ticket_promedio_crc ??
                    kpis.ticket?.resultados?.[0]?.ticket_promedio_crc
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Ventas cerradas ganadas:{' '}
                <strong>
                  {kpis.ticket?.resultados?.global?.total_ventas_ganadas ??
                    kpis.ticket?.resultados?.[0]?.ventas_ganadas ??
                    0}
                </strong>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                6. Ciclo Promedio de Venta
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatNumber(kpis.cycle?.resumen?.promedio_dias_ciclo)} días
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Rango observado: {kpis.cycle?.resumen?.minimo_dias_ciclo ?? '—'} a{' '}
                {kpis.cycle?.resumen?.maximo_dias_ciclo ?? '—'} días
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Advertencias de División / Datos SQL
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-600">{allWarnings.length}</div>
              <p className="mt-1 text-xs text-slate-500">
                Protección <code>NULLIF</code> activa contra divisiones entre cero
              </p>
            </div>
          </div>

          {/* 1, 2, 3, 4: CPC, CTR, CAC y ROAS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* CPC & CTR */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">1 y 2. Eficiencia de Tráfico: CPC y CTR</h3>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead>
                    <tr className="text-left font-semibold text-slate-500">
                      <th className="pb-2">Campaña / Canal</th>
                      <th className="pb-2 text-right">Impresiones</th>
                      <th className="pb-2 text-right">Clics</th>
                      <th className="pb-2 text-right">CTR (%)</th>
                      <th className="pb-2 text-right">CPC (CRC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(kpis.cpc?.resultados || []).map((row: any, idx: number) => {
                      const ctrMatch = (kpis.ctr?.resultados || []).find(
                        (r: any) =>
                          r.campana_id === row.campana_id && r.canal_id === row.canal_id
                      );
                      return (
                        <tr key={idx}>
                          <td className="py-2 pr-2">
                            <div className="font-semibold text-slate-900">{row.codigo_campana}</div>
                            <div className="text-slate-500">{row.canal_nombre}</div>
                          </td>
                          <td className="py-2 text-right text-slate-600">
                            {formatNumber(ctrMatch?.impresiones_totales ?? row.impresiones_totales)}
                          </td>
                          <td className="py-2 text-right text-slate-800">
                            {formatNumber(row.clics_totales)}
                          </td>
                          <td className="py-2 text-right font-semibold text-indigo-700">
                            {formatPercent(ctrMatch?.ctr_porcentaje)}
                          </td>
                          <td className="py-2 text-right font-semibold text-slate-900">
                            {row.cpc_crc !== null ? formatCRC(row.cpc_crc) : 'Orgánico / 0'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CAC & ROAS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  3 y 4. Rentabilidad Comercial: CAC y ROAS
                </h3>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead>
                    <tr className="text-left font-semibold text-slate-500">
                      <th className="pb-2">Campaña</th>
                      <th className="pb-2 text-right">Clientes</th>
                      <th className="pb-2 text-right">CAC (CRC)</th>
                      <th className="pb-2 text-right">Ingresos (CRC)</th>
                      <th className="pb-2 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(kpis.cac?.resultados || []).map((row: any) => {
                      const roasMatch = (kpis.roas?.resultados || []).find(
                        (r: any) => r.campana_id === row.campana_id
                      );
                      return (
                        <tr key={row.campana_id}>
                          <td className="py-2 pr-2">
                            <div className="font-semibold text-slate-900">{row.codigo_campana}</div>
                            <div className="max-w-[170px] truncate text-slate-500">
                              {row.campana_nombre || row.nombre_campana}
                            </div>
                          </td>
                          <td className="py-2 text-right font-semibold text-teal-700">
                            {row.clientes_adquiridos ?? row.clientes_convertidos}
                          </td>
                          <td className="py-2 text-right font-semibold text-slate-900">
                            {row.cac_crc !== null ? formatCRC(row.cac_crc) : 'Sin cierres'}
                          </td>
                          <td className="py-2 text-right text-slate-800">
                            {formatCRC(roasMatch?.ingresos_atribuibles_crc)}
                          </td>
                          <td className="py-2 text-right font-bold text-indigo-700">
                            {roasMatch?.roas !== null && roasMatch?.roas !== undefined
                              ? `${Number(roasMatch.roas).toFixed(2)}x`
                              : 'Sin pauta'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 5. Conversión entre Etapas del Embudo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              5. Tasa de Conversión entre Etapas del Embudo Comercial
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="text-left font-semibold text-slate-500">
                    <th className="pb-2">Etapa del Embudo</th>
                    <th className="pb-2 text-right">Contactos que Alcanzaron Etapa</th>
                    <th className="pb-2 text-right">Conversión desde Etapa Previa</th>
                    <th className="pb-2 text-right">Conversión Acumulada desde Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(kpis.funnel?.resultados || []).map((st: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold text-slate-900">
                        {st.orden_embudo}. {st.etapa_nombre || st.nombre_etapa}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900">
                        {st.contactos_alcanzaron ?? st.total_contactos}
                      </td>
                      <td className="py-2 text-right font-semibold text-teal-700">
                        {formatPercent(
                          st.tasa_conversion_etapa_previa_pct ?? st.tasa_conversion_previa_pct
                        )}
                      </td>
                      <td className="py-2 text-right text-indigo-700">
                        {formatPercent(
                          st.tasa_conversion_desde_inicio_pct ?? st.tasa_conversion_acumulada_pct
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 8. Comparativa Métricas de Vanidad vs Métricas de Negocio */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              8. Comparativa Directa: Métricas de Vanidad vs Métricas Reales de Negocio
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="text-left font-semibold text-slate-500">
                    <th className="pb-2">Campaña</th>
                    <th className="pb-2 text-right">Alcance / Vistas (Vanidad)</th>
                    <th className="pb-2 text-right">Interacciones (Vanidad)</th>
                    <th className="pb-2 text-right">Seguidores (Vanidad)</th>
                    <th className="pb-2 text-right">Leads Reales</th>
                    <th className="pb-2 text-right">Clientes</th>
                    <th className="pb-2 text-right">Ingresos (CRC)</th>
                    <th className="pb-2">Diagnóstico SQL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(kpis.vanity?.resultados || []).map((v: any) => (
                    <tr key={v.campana_id}>
                      <td className="py-2.5 pr-2 font-semibold text-slate-900">
                        {v.codigo_campana}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">
                        {formatNumber(v.vanidad_alcance ?? v.alcance_total)} /{' '}
                        {formatNumber(v.vanidad_visualizaciones ?? v.visualizaciones_totales)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">
                        {formatNumber(v.vanidad_interacciones ?? v.interacciones_totales)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">
                        +{formatNumber(v.vanidad_seguidores_ganados ?? v.seguidores_ganados)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        {formatNumber(v.negocio_leads ?? v.leads_generados)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-teal-700">
                        {formatNumber(v.negocio_clientes_convertidos ?? v.clientes_convertidos)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        {formatCRC(v.negocio_ingresos_crc ?? v.ingresos_atribuibles_crc)}
                      </td>
                      <td className="py-2.5 pl-3">
                        <StatusBadge
                          label={v.clasificacion_desempeno || v.diagnostico_vanidad || 'evaluado'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {allWarnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Advertencias Transparentes de Calidad de Datos SQL</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {allWarnings.slice(0, 6).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

