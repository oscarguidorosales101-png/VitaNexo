import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  History,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type {
  CampaignItem,
  Channel,
  CollaboratorProfile,
  ContentDetail,
  ContentItem,
  OrchestratorDispatchResult,
} from '../types/vitanexo';
import { formatDateShort, formatDateTime } from '../utils/formatters';
import {
  ErrorAlert,
  LoadingSpinner,
  ModalDialog,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../components/UiPrimitives';

export function ContentsView({ currentUser }: { currentUser: CollaboratorProfile }) {
  const [viewMode, setViewMode] = useState<'piezas' | 'calendario'>('piezas');
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detalle, revisión humana e historial de versiones
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [reviewComment, setReviewComment] = useState(
    'Revisado por equipo humano: cumple lineamientos comerciales B2B Costa Rica y privacidad sin datos clínicos.'
  );
  const [editedBody, setEditedBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Generador IA Gemini (Publicación + Variantes + Calendario Editorial)
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<OrchestratorDispatchResult | null>(null);
  const [aiForm, setAiForm] = useState({
    campana_id: 1,
    canal_id: 1,
    tipo_contenido: 'publicacion_social',
    etapa_recorrido: 'consideracion',
    tema_central:
      'Cómo reducir el ausentismo a citas y ordenar los cobros en colones (CRC) en clínicas y centros de fisioterapia.',
    fecha_programada_publicacion: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    enviar_a_revision: true,
  });

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [cnt, cmp, ch] = await Promise.all([
        vitanexoApi.listContents(),
        vitanexoApi.listCampaigns(),
        vitanexoApi.listChannels(),
      ]);
      setContents(cnt);
      setCampaigns(cmp);
      setChannels(ch);
      if (cmp[0] && ch[0]) {
        setAiForm((prev) => ({
          ...prev,
          campana_id: prev.campana_id || cmp[0].id,
          canal_id: prev.canal_id || ch[0].id,
        }));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function openDetail(id: number) {
    setError(null);
    try {
      const d = await vitanexoApi.getContentDetail(id);
      setDetail(d);
      setEditedBody(d.cuerpo_borrador);
    } catch (err) {
      setError(err);
    }
  }

  async function handleGenerateWithGemini(e: React.FormEvent) {
    e.preventDefault();
    setAiRunning(true);
    setError(null);
    setAiResult(null);
    try {
      const res = await vitanexoApi.executeOrchestratorTask({
        tipo_tarea: 'generar_publicacion_ia',
        parametros: {
          campana_id: Number(aiForm.campana_id),
          canal_id: Number(aiForm.canal_id),
          tipo_contenido: aiForm.tipo_contenido,
          etapa_recorrido: aiForm.etapa_recorrido,
          tema_central: aiForm.tema_central,
          fecha_programada_publicacion: aiForm.fecha_programada_publicacion || null,
          guardar_borrador: true,
          enviar_a_revision: aiForm.enviar_a_revision,
          revisor_id: currentUser.id,
          autor_colaborador_id: currentUser.id,
        },
      });
      setAiResult(res);
      setSuccess(
        'Publicación, variantes A/B y calendario generados con Gemini API vía n8n y registrados para aprobación humana.'
      );
      await loadAll();
    } catch (err) {
      setError(err);
    } finally {
      setAiRunning(false);
    }
  }

  async function handleHumanDecision(
    decision: 'enviar_a_revision' | 'aprobar' | 'rechazar' | 'solicitar_cambios'
  ) {
    if (!detail) return;
    setSubmittingReview(true);
    setError(null);
    try {
      await vitanexoApi.reviewContent(detail.id, {
        revisor_id: currentUser.id,
        decision,
        comentarios: reviewComment.trim() || `Decisión editorial: ${decision}`,
        actor_tipo: 'humano',
      });
      const updated = await vitanexoApi.getContentDetail(detail.id);
      setDetail(updated);
      setSuccess(
        `Decisión humana '${decision}' registrada en VitaBase. Estado actual: ${updated.estado}.`
      );
      await loadAll();
    } catch (err) {
      setError(err);
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleSaveNewVersion() {
    if (!detail) return;
    setSubmittingReview(true);
    setError(null);
    try {
      await vitanexoApi.updateContent(detail.id, {
        cuerpo_borrador: editedBody,
      });
      const updated = await vitanexoApi.getContentDetail(detail.id);
      setDetail(updated);
      setSuccess(`Nueva versión (v${updated.version_actual}) guardada en el historial editorial.`);
      await loadAll();
    } catch (err) {
      setError(err);
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handlePublishApproved() {
    if (!detail) return;
    setSubmittingReview(true);
    setError(null);
    try {
      await vitanexoApi.publishContent(detail.id);
      const updated = await vitanexoApi.getContentDetail(detail.id);
      setDetail(updated);
      setSuccess('Contenido aprobado marcado oficialmente como publicado en el calendario editorial.');
      await loadAll();
    } catch (err) {
      setError(err);
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading && contents.length === 0) {
    return <LoadingSpinner label="Cargando piezas editoriales, calendario y cola de aprobación humana..." />;
  }

  const versionsList = detail?.versiones || detail?.historial_versiones || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contenidos, Calendario Editorial y Aprobación Humana"
        subtitle="Generación asistida por Gemini API con variantes por canal, control de versiones y bloqueo de publicación sin aprobación humana."
        actions={
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generar Publicación y Variantes IA (Gemini)</span>
          </button>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {/* Selector de vista */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setViewMode('piezas')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            viewMode === 'piezas' ? 'bg-teal-600 text-white' : 'text-slate-600'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Bandeja de Revisión y Piezas ({contents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('calendario')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            viewMode === 'calendario' ? 'bg-teal-600 text-white' : 'text-slate-600'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Calendario Editorial</span>
        </button>
      </div>

      {viewMode === 'piezas' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Pieza / Código</th>
                  <th className="px-4 py-3">Campaña y Canal</th>
                  <th className="px-4 py-3">Formato / Etapa</th>
                  <th className="px-4 py-3">Versión</th>
                  <th className="px-4 py-3">Estado Editorial</th>
                  <th className="px-4 py-3 text-right">Revisión Humana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate font-semibold text-slate-900">
                        {item.titulo}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.codigo_contenido}{' '}
                        {item.generado_por_agente_codigo ? '· Generado con Agente IA' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div className="font-medium">
                        {item.campana_nombre || `Campaña #${item.campana_id}`}
                      </div>
                      <div className="text-slate-500">
                        {item.canal_nombre || `Canal #${item.canal_id}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="capitalize">{item.tipo_contenido.replace(/_/g, ' ')}</div>
                      <div className="text-slate-500 capitalize">{item.etapa_recorrido}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      v{item.version_actual}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={item.estado} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Revisar / Aprobar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...contents]
            .sort((a, b) =>
              String(a.fecha_programada_publicacion || '9999').localeCompare(
                String(b.fecha_programada_publicacion || '9999')
              )
            )
            .map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateShort(item.fecha_programada_publicacion)}
                    </span>
                    <StatusBadge label={item.estado} />
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{item.titulo}</h3>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-600">{item.cuerpo_borrador}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{item.canal_nombre || `Canal #${item.canal_id}`}</span>
                  <button
                    type="button"
                    onClick={() => openDetail(item.id)}
                    className="font-semibold text-teal-700 hover:underline"
                  >
                    Abrir revisión →
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal Revisión Humana, Aprobación/Rechazo e Historial de Versiones */}
      <ModalDialog
        open={Boolean(detail)}
        title={
          detail
            ? `Revisión Editorial Humana — ${detail.codigo_contenido} (v${detail.version_actual})`
            : ''
        }
        onClose={() => setDetail(null)}
        maxWidth="max-w-4xl"
      >
        {detail && (
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={detail.estado} />
                <span className="font-semibold text-slate-800">{detail.titulo}</span>
              </div>
              <span className="text-slate-500">
                Revisor activo: <strong>{currentUser.nombre_completo}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Cuerpo del Contenido (editable para generar nueva versión)
              </label>
              <textarea
                rows={5}
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm leading-relaxed"
              />
              {editedBody !== detail.cuerpo_borrador && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={handleSaveNewVersion}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Guardar Nueva Versión (v{detail.version_actual + 1})
                  </button>
                </div>
              )}
            </div>

            {/* Panel de Decisión Humana */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
              <h4 className="text-xs font-bold tracking-wider text-teal-900 uppercase">
                Control de Aprobación Humana Obligatoria
              </h4>
              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Comentario o criterio editorial obligatorio..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {detail.estado === 'borrador' || detail.estado === 'rechazado' ? (
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={() => handleHumanDecision('enviar_a_revision')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar a Revisión</span>
                  </button>
                ) : null}

                {detail.estado === 'en_revision' ? (
                  <>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => handleHumanDecision('aprobar')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Aprobar Contenido (Humano)</span>
                    </button>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => handleHumanDecision('rechazar')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </>
                ) : null}

                {detail.estado === 'aprobado' ? (
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={handlePublishApproved}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Marcar como Publicado</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Historial de Revisiones y Versiones */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <History className="h-4 w-4 text-teal-600" />
                  <span>Historial de Revisiones ({detail.historial_revisiones?.length || 0})</span>
                </h4>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {(detail.historial_revisiones || []).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <StatusBadge label={r.decision} />
                        <span className="text-[11px] text-slate-500">
                          {formatDateTime(r.fecha_revision)}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700">{r.comentarios}</p>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Revisor: {r.revisor_nombre || `#${r.revisor_id}`} (v{r.numero_version_revisada})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Historial de Versiones ({versionsList.length})
                </h4>
                <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {versionsList.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>Versión v{v.numero_version}</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          {formatDateTime(v.creado_en)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-slate-600">{v.cuerpo_texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Modal Generación IA Gemini (Publicación + Variantes + Calendario) */}
      <ModalDialog
        open={aiModalOpen}
        title="Agente IA de Contenido (Orquestador → n8n → Gemini API → VitaBase)"
        onClose={() => setAiModalOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleGenerateWithGemini} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Campaña Destino</label>
              <select
                value={aiForm.campana_id}
                onChange={(e) => setAiForm({ ...aiForm, campana_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo_campana} — {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Canal</label>
              <select
                value={aiForm.canal_id}
                onChange={(e) => setAiForm({ ...aiForm, canal_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Formato</label>
              <select
                value={aiForm.tipo_contenido}
                onChange={(e) => setAiForm({ ...aiForm, tipo_contenido: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="publicacion_social">Publicación social</option>
                <option value="correo_electronico">Correo electrónico B2B</option>
                <option value="anuncio_pagado">Anuncio pagado</option>
                <option value="articulo_blog">Artículo de blog</option>
                <option value="guia_descargable">Guía descargable</option>
                <option value="guion_webinar">Guion de webinar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Fecha Programada en Calendario
              </label>
              <input
                type="date"
                value={aiForm.fecha_programada_publicacion}
                onChange={(e) =>
                  setAiForm({ ...aiForm, fecha_programada_publicacion: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Tema Administrativo / Comercial B2B (Cero datos clínicos)
            </label>
            <textarea
              rows={3}
              required
              value={aiForm.tema_central}
              onChange={(e) => setAiForm({ ...aiForm, tema_central: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={aiForm.enviar_a_revision}
              onChange={(e) => setAiForm({ ...aiForm, enviar_a_revision: e.target.checked })}
            />
            <span>Enviar automáticamente a bandeja de revisión humana (nunca autoaprobar)</span>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={aiRunning}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generando con Gemini API vía n8n...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generar Pieza, Variantes y Calendario</span>
                </>
              )}
            </button>
          </div>
        </form>

        {aiResult && (
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="font-bold text-slate-900">
                {aiResult.resultado.pieza_principal?.titulo}
              </div>
              <p className="mt-1.5 whitespace-pre-line text-slate-700">
                {aiResult.resultado.pieza_principal?.cuerpo_texto}
              </p>
            </div>

            {Array.isArray(aiResult.resultado.variantes) && (
              <div>
                <h4 className="font-bold text-slate-900">Variantes Sugeridas por Gemini</h4>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {aiResult.resultado.variantes.map((v: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 p-3">
                      <div className="font-semibold text-indigo-700">{v.etiqueta}</div>
                      <p className="mt-1 text-slate-600">{v.cuerpo_texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(aiResult.resultado.calendario_editorial) && (
              <div>
                <h4 className="font-bold text-slate-900">Planificación de Calendario Editorial Sugerida</h4>
                <div className="mt-2 space-y-1.5">
                  {aiResult.resultado.calendario_editorial.map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <span>
                        <strong>Semana {c.semana}</strong> ({c.dia_sugerido}): {c.tema}
                      </span>
                      <StatusBadge label={c.etapa_recorrido} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

