import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  Briefcase,
  Building2,
  Megaphone,
  RefreshCw,
  TrendingUp,
  Users,
  Workflow,
} from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type { DashboardSummary, ModuleKey } from '../types/vitanexo';
import {
  formatCRC,
  formatDateTime,
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import { ErrorAlert, LoadingSpinner, SectionHeader, StatusBadge } from '../components/UiPrimitives';

export function DashboardView({ onNavigate }: { onNavigate: (mod: ModuleKey) => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const data = await vitanexoApi.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !summary) {
    return <LoadingSpinner label="Consolidando indicadores ejecutivos desde MySQL VitaBase y n8n local..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard Ejecutivo VitaNexo"
        subtitle="Panorama comercial, clientes activos, embudo B2B, rendimiento SQL en colones (CRC) y actividad en vivo de agentes IA."
        actions={
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar en vivo</span>
          </button>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}

      {summary && (
        <>
          {/* Tarjetas KPI Principales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => onNavigate('clientes')}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-teal-500/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Clientes y Contratos
                </span>
                <div className="rounded-xl bg-teal-50 p-2 text-teal-600">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">
                {summary.clientes.clientes_activos}{' '}
                <span className="text-sm font-normal text-slate-500">
                  / {summary.clientes.total_clientes} clínicas
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Facturación activa:{' '}
                <strong className="text-slate-900">
                  {formatCRC(summary.contratos.ingresos_recurrentes_activos_crc)}
                </strong>{' '}
                ({summary.contratos.contratos_activos} contratos)
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ventas')}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-teal-500/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Ventas y Pipeline
                </span>
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <Briefcase className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">
                {formatCRC(summary.oportunidades.ventas_ganadas_crc)}
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Pipeline abierto:{' '}
                <strong className="text-slate-900">
                  {formatCRC(summary.oportunidades.pipeline_abierto_crc)}
                </strong>{' '}
                ({summary.oportunidades.oportunidades_abiertas} activas)
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('campanas')}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-teal-500/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Campañas Activas
                </span>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <Megaphone className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">
                {summary.campanas.campanas_activas}{' '}
                <span className="text-sm font-normal text-slate-500">
                  activas ({summary.campanas.campanas_propuestas} propuestas IA)
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Presupuesto planificado:{' '}
                <strong className="text-slate-900">
                  {formatCRC(summary.campanas.presupuesto_total_crc)}
                </strong>
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('automatizaciones')}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-teal-500/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Motor n8n + Gemini API
                </span>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <Workflow className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge
                  label={
                    summary.automatizaciones_n8n?.online &&
                    summary.automatizaciones_n8n?.webhook_autenticado
                      ? 'activo'
                      : 'inactivo'
                  }
                />
                <span className="text-sm font-bold text-slate-900">
                  {summary.automatizaciones_n8n?.workflows_activos ?? 0}/
                  {summary.automatizaciones_n8n?.total_workflows ?? 5} flujos activos
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-slate-600">
                Modelo: <code className="font-mono">{summary.automatizaciones_n8n?.modelo_gemini || 'Gemini'}</code>
              </p>
            </button>
          </div>

          {/* Fila Central: Embudo de Contactos + Indicadores Clave de Negocio */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Embudo Comercial */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-900">Embudo Comercial Activo</h2>
                </div>
                <span className="text-xs text-slate-500">
                  Traspasos pendientes: <strong>{summary.traspasos_ventas.traspasos_pendientes}</strong>
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {summary.embudo_contactos.map((stage) => {
                  const maxCount = Math.max(
                    1,
                    ...summary.embudo_contactos.map((s) => Number(s.total_contactos))
                  );
                  const pct = Math.round((Number(stage.total_contactos) / maxCount) * 100);
                  return (
                    <div key={stage.etapa_id}>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>
                          {stage.orden_embudo}. {stage.etapa_nombre}
                        </span>
                        <span className="font-bold text-slate-900">{stage.total_contactos}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all"
                          style={{ width: `${Math.max(pct, Number(stage.total_contactos) > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-500">Ticket Promedio Ganado</span>
                  <div className="mt-1 text-base font-bold text-slate-900">
                    {formatCRC(
                      summary.indicadores_principales.ticket_promedio?.global?.ticket_promedio_crc ??
                        summary.indicadores_principales.ticket_promedio?.[0]?.ticket_promedio_crc
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-slate-500">Ciclo Promedio de Venta</span>
                  <div className="mt-1 text-base font-bold text-slate-900">
                    {formatNumber(
                      summary.indicadores_principales.ciclo_venta_resumen?.promedio_dias_ciclo
                    )}{' '}
                    días
                  </div>
                </div>
              </div>
            </div>

            {/* Rendimiento Comercial por Campaña */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    Desempeño Comercial por Campaña (SQL VitaBase)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('metricas')}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Ver los 8 KPIs →
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead>
                    <tr className="text-left font-semibold text-slate-500">
                      <th className="pb-2.5">Campaña</th>
                      <th className="pb-2.5 text-right">Interacciones</th>
                      <th className="pb-2.5 text-right">Leads</th>
                      <th className="pb-2.5 text-right">Clientes</th>
                      <th className="pb-2.5 text-right">Ingresos (CRC)</th>
                      <th className="pb-2.5 text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(summary.indicadores_principales.campanas_rendimiento || []).slice(0, 6).map((c: any) => (
                      <tr key={c.campana_id} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold text-slate-900">{c.codigo_campana}</div>
                          <div className="max-w-[200px] truncate text-slate-500">
                            {c.campana_nombre || c.nombre_campana}
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-slate-600">
                          {formatNumber(c.vanidad_interacciones ?? c.interacciones_totales)}
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-800">
                          {formatNumber(c.negocio_leads ?? c.leads_generados)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-teal-700">
                          {formatNumber(c.negocio_clientes_convertidos ?? c.clientes_convertidos)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-slate-900">
                          {formatCRC(c.negocio_ingresos_crc ?? c.ingresos_atribuibles_crc)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-indigo-700">
                          {c.negocio_roas !== null && c.negocio_roas !== undefined
                            ? `${Number(c.negocio_roas).toFixed(2)}x`
                            : c.roas !== null && c.roas !== undefined
                            ? `${Number(c.roas).toFixed(2)}x`
                            : 'Orgánico'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Últimas Ejecuciones de Agentes Especializados */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Ejecuciones Recientes del Orquestador Central y Agentes IA
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('agentes')}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Ir al Centro de Agentes →
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="text-left font-semibold text-slate-500">
                    <th className="pb-2.5">Código</th>
                    <th className="pb-2.5">Agente</th>
                    <th className="pb-2.5">Tarea Ejecutada</th>
                    <th className="pb-2.5">Estado</th>
                    <th className="pb-2.5 text-right">Duración</th>
                    <th className="pb-2.5 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.ejecuciones_agentes_recientes.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono text-[11px] text-slate-700">
                        {ex.codigo_ejecucion}
                      </td>
                      <td className="py-2.5 font-medium text-slate-900">{ex.agente_nombre}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          {ex.tipo_tarea}
                          {ex.tipo_tarea.endsWith('_ia') ? (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-indigo-700">
                              Gemini
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <StatusBadge label={ex.estado} />
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-600">
                        {ex.duracion_ms} ms
                      </td>
                      <td className="py-2.5 text-right text-slate-500">
                        {formatDateTime(ex.fecha_inicio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-teal-600" />
                Contenidos editoriales: Borradores ({summary.contenidos_por_estado.borrador || 0}) · En
                revisión ({summary.contenidos_por_estado.en_revision || 0}) · Aprobados (
                {summary.contenidos_por_estado.aprobado || 0}) · Publicados (
                {summary.contenidos_por_estado.publicado || 0})
              </span>
              <span>Corte en tiempo real: {formatDateTime(summary.generado_en)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

