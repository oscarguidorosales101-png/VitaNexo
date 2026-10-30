import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type { AutomationsOverview, N8nExecutionRecord } from '../types/vitanexo';
import { formatDateTime } from '../utils/formatters';
import {
  ErrorAlert,
  LoadingSpinner,
  ModalDialog,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../components/UiPrimitives';

export function AutomationsView() {
  const [overview, setOverview] = useState<AutomationsOverview | null>(null);
  const [executions, setExecutions] = useState<N8nExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<N8nExecutionRecord | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadAutomations() {
    setLoading(true);
    setError(null);
    try {
      const [ov, ex] = await Promise.all([
        vitanexoApi.getAutomationsStatus(),
        vitanexoApi.listAutomationExecutions('?limit=50'),
      ]);
      setOverview(ov);
      setExecutions(ex);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAutomations();
  }, []);

  async function handleRetry(id: number) {
    setRetryingId(id);
    setError(null);
    setSuccess(null);
    try {
      await vitanexoApi.retryAutomationExecution(id);
      setSuccess(`Reintento del flujo n8n #${id} ejecutado y registrado exitosamente en VitaBase.`);
      await loadAutomations();
    } catch (err) {
      setError(err);
      await loadAutomations();
    } finally {
      setRetryingId(null);
    }
  }

  if (loading && !overview) {
    return <LoadingSpinner label="Verificando estado en vivo de n8n local, webhooks autenticados y trazas..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Centro de Automatizaciones Locales (n8n + Gemini API)"
        subtitle="Supervisión en tiempo real del motor local n8n (127.0.0.1:5678), autenticación de webhooks, workflows activos, trazas y reintentos."
        actions={
          <button
            type="button"
            onClick={loadAutomations}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Verificar Estado n8n</span>
          </button>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {overview && (
        <>
          {/* Estado del Motor n8n y Estadísticas */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-teal-600" />
                  <h2 className="text-sm font-bold text-slate-900">Estado del Motor Local n8n</h2>
                </div>
                <StatusBadge
                  label={
                    overview.n8n.online && overview.n8n.webhook_autenticado ? 'activo' : 'inactivo'
                  }
                />
              </div>
              <p className="mt-2 text-xs text-slate-700">{overview.n8n.mensaje}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>
                  Endpoint: <code className="font-mono">{overview.n8n.base_url}</code>
                </span>
                <span>
                  Latencia: <strong>{overview.n8n.latencia_ms ?? '—'} ms</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {overview.n8n.webhook_autenticado
                    ? 'Firma X-VitaNexo-Webhook-Secret verificada'
                    : 'Webhook no verificado'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Workflows Activos
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {overview.workflows_activos} / {overview.total_workflows}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                IA: <code className="font-mono">{overview.n8n.modelo_gemini}</code>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Ejecuciones Registradas
              </span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {overview.estadisticas.total_ejecuciones || 0}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Exitosas: <strong className="text-emerald-700">{overview.estadisticas.exitosas || 0}</strong>{' '}
                · Fallidas: <strong className="text-rose-700">{overview.estadisticas.fallidas || 0}</strong>{' '}
                · Reintentos: <strong>{overview.estadisticas.reintentos || 0}</strong>
              </p>
            </div>
          </div>

          {/* Tabla de Workflows Disponibles e Identificación de Activos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">
              Flujos de Automatización Exportados y Publicados en n8n (<code>n8n/workflows/</code>)
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-left font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Workflow ID</th>
                    <th className="px-3 py-2.5">Nombre del Flujo</th>
                    <th className="px-3 py-2.5">Agente Vinculado</th>
                    <th className="px-3 py-2.5">Webhook Autenticado</th>
                    <th className="px-3 py-2.5 text-center">Nodos</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Ejecuciones (OK / Error)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.workflows.map((wf) => (
                    <tr key={wf.workflow_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-teal-700">
                        {wf.workflow_id}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{wf.nombre}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {wf.codigo_agente || 'sistema'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        {wf.metodo_http} {wf.webhook_path}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-800">
                        {wf.cantidad_nodos}
                      </td>
                      <td className="px-3 py-2.5">
                        {wf.operativo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activo
                          </span>
                        ) : (
                          <StatusBadge label="inactivo" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span className="font-bold text-emerald-700">
                          {wf.estadisticas_recientes.exitosas}
                        </span>{' '}
                        /{' '}
                        <span className="text-rose-600">{wf.estadisticas_recientes.fallidas}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historial de Últimas Ejecuciones, Errores y Reintentos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">
              Últimas Ejecuciones de Webhooks n8n + Gemini API (<code>ejecuciones_workflows_n8n</code>)
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-left font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Traza</th>
                    <th className="px-3 py-2.5">Workflow</th>
                    <th className="px-3 py-2.5">Agente / Tarea</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-center">Intentos</th>
                    <th className="px-3 py-2.5 text-right">Duración</th>
                    <th className="px-3 py-2.5">Error / Observación</th>
                    <th className="px-3 py-2.5 text-right">Fecha</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Aún no hay ejecuciones de workflows registradas.
                      </td>
                    </tr>
                  ) : (
                    executions.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                          {ex.codigo_traza}
                          {ex.reintento_de_id ? (
                            <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-800">
                              Reintento #{ex.reintento_de_id}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-teal-700">{ex.workflow_id}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900">{ex.codigo_agente}</div>
                          <div className="font-mono text-[11px] text-slate-500">{ex.tipo_tarea}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={ex.estado} />
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          {ex.intentos_realizados} (HTTP {ex.http_status ?? '—'})
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                          {ex.duracion_ms ?? '—'} ms
                        </td>
                        <td className="max-w-xs truncate px-3 py-2.5 text-rose-700">
                          {ex.mensaje_error || <span className="text-slate-400">OK validado</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500">
                          {formatDateTime(ex.fecha_inicio)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTrace(ex)}
                              className="rounded-lg border border-slate-200 p-1 text-slate-700 hover:bg-slate-100"
                              title="Inspeccionar carga y respuesta validada"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={retryingId === ex.id}
                              onClick={() => handleRetry(ex.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                              title="Reintentar flujo vía Orquestador"
                            >
                              {retryingId === ex.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              <span>Reintentar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Inspector de Traza n8n + Respuesta Gemini Validada */}
      <ModalDialog
        open={Boolean(selectedTrace)}
        title={selectedTrace ? `Traza n8n / Gemini — ${selectedTrace.codigo_traza}` : ''}
        onClose={() => setSelectedTrace(null)}
        maxWidth="max-w-3xl"
      >
        {selectedTrace && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
              <div>
                <span className="text-slate-500">Workflow</span>
                <div className="font-mono font-bold text-slate-900">{selectedTrace.workflow_id}</div>
              </div>
              <div>
                <span className="text-slate-500">Modelo IA</span>
                <div className="font-mono text-slate-900">{selectedTrace.modelo_ia}</div>
              </div>
              <div>
                <span className="text-slate-500">HTTP / Intentos</span>
                <div className="font-semibold text-slate-900">
                  HTTP {selectedTrace.http_status ?? '—'} ({selectedTrace.intentos_realizados} int.)
                </div>
              </div>
              <div>
                <span className="text-slate-500">Duración</span>
                <div className="font-mono font-bold text-teal-700">
                  {selectedTrace.duracion_ms ?? 0} ms
                </div>
              </div>
            </div>

            {selectedTrace.mensaje_error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
                <strong>Error registrado:</strong> {selectedTrace.mensaje_error}
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-900">Entrada Sanitizada (Sin Secretos)</h4>
              <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                {JSON.stringify(selectedTrace.entrada_sanitizada, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="font-bold text-slate-900">Respuesta JSON Validada de Gemini API</h4>
              <pre className="mt-1 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
                {JSON.stringify(selectedTrace.respuesta_validada, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

