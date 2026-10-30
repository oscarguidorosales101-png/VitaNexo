import React, { useEffect, useState } from 'react';
import { Edit3, Loader2, Megaphone, Plus, Sparkles, Wallet } from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type {
  BudgetAllocation,
  CampaignItem,
  Channel,
  CollaboratorProfile,
  OrchestratorDispatchResult,
} from '../types/vitanexo';
import { formatCRC, formatDateShort } from '../utils/formatters';
import {
  ErrorAlert,
  LoadingSpinner,
  ModalDialog,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../components/UiPrimitives';

export function CampaignsView({ currentUser }: { currentUser: CollaboratorProfile }) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [stateFilter, setStateFilter] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Crear / editar campaña
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignItem | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    objetivo: '',
    etapa_recorrido: 'consideracion',
    canal_principal_id: 1,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    presupuesto_total_crc: 250000,
    justificacion_presupuesto: '',
    costo_operativo_mercadeo_crc: 45000,
    estado: 'planificada',
  });

  // Estudio IA Gemini de Estrategia y Presupuesto
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiForm, setAiForm] = useState({
    objetivo_comercial:
      'Captar clínicas pequeñas y centros de fisioterapia en Costa Rica interesados en reducir ausentismo de citas y ordenar su facturación administrativa.',
    presupuesto_disponible_crc: 380000,
    etapa_recorrido: 'consideracion',
    guardar_propuesta: true,
  });
  const [aiResult, setAiResult] = useState<OrchestratorDispatchResult | null>(null);

  // Asignación de presupuesto por canal
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({
    campana_id: 0,
    canal_id: 0,
    periodo_inicio: new Date().toISOString().slice(0, 10),
    periodo_fin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    monto_asignado_crc: 95000,
    razon_decision: 'Refuerzo de pauta segmentada B2B en Costa Rica.',
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [cmp, ch, al] = await Promise.all([
        vitanexoApi.listCampaigns(),
        vitanexoApi.listChannels(),
        vitanexoApi.listBudgetAllocations(),
      ]);
      setCampaigns(cmp);
      setChannels(ch);
      setAllocations(al);
      if (ch[0]) {
        setForm((prev) => ({ ...prev, canal_principal_id: prev.canal_principal_id || ch[0].id }));
      }
      if (cmp[0] && ch[0]) {
        setAllocForm((prev) => ({
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
    loadData();
  }, []);

  function openNewModal() {
    setEditing(null);
    setForm({
      nombre: '',
      descripcion: '',
      objetivo: '',
      etapa_recorrido: 'consideracion',
      canal_principal_id: channels[0]?.id || 1,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      presupuesto_total_crc: 250000,
      justificacion_presupuesto: '',
      costo_operativo_mercadeo_crc: 40000,
      estado: 'planificada',
    });
    setModalOpen(true);
  }

  function openEditModal(c: CampaignItem) {
    setEditing(c);
    setForm({
      nombre: c.nombre,
      descripcion: c.descripcion,
      objetivo: c.objetivo,
      etapa_recorrido: c.etapa_recorrido,
      canal_principal_id: c.canal_principal_id,
      fecha_inicio: String(c.fecha_inicio).slice(0, 10),
      fecha_fin: String(c.fecha_fin).slice(0, 10),
      presupuesto_total_crc: Number(c.presupuesto_total_crc),
      justificacion_presupuesto: c.justificacion_presupuesto,
      costo_operativo_mercadeo_crc: Number(c.costo_operativo_mercadeo_crc || 0),
      estado: c.estado,
    });
    setModalOpen(true);
  }

  async function handleSaveCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        ...form,
        canal_principal_id: Number(form.canal_principal_id),
        presupuesto_total_crc: Number(form.presupuesto_total_crc),
        costo_operativo_mercadeo_crc: Number(form.costo_operativo_mercadeo_crc),
        responsable_id: currentUser.id,
      };
      if (editing) {
        await vitanexoApi.updateCampaign(editing.id, payload);
        setSuccess(`Campaña '${form.nombre}' actualizada en VitaBase.`);
      } else {
        await vitanexoApi.createCampaign(payload);
        setSuccess(`Campaña '${form.nombre}' creada en VitaBase.`);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err);
    }
  }

  async function handleRunAiStrategy(e: React.FormEvent) {
    e.preventDefault();
    setAiRunning(true);
    setError(null);
    setAiResult(null);
    try {
      const res = await vitanexoApi.executeOrchestratorTask({
        tipo_tarea: 'analizar_estrategia_campana_ia',
        parametros: {
          ...aiForm,
          presupuesto_disponible_crc: Number(aiForm.presupuesto_disponible_crc),
          responsable_id: currentUser.id,
        },
      });
      setAiResult(res);
      if (aiForm.guardar_propuesta) {
        setSuccess(
          'Propuesta generada con Gemini API vía n8n y registrada en estado "propuesta" en VitaBase (sujeta a aprobación humana).'
        );
        await loadData();
      }
    } catch (err) {
      setError(err);
    } finally {
      setAiRunning(false);
    }
  }

  async function handleCreateAllocation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await vitanexoApi.createBudgetAllocation({
        campana_id: Number(allocForm.campana_id),
        canal_id: Number(allocForm.canal_id),
        responsable_id: currentUser.id,
        periodo_inicio: allocForm.periodo_inicio,
        periodo_fin: allocForm.periodo_fin,
        monto_asignado_crc: Number(allocForm.monto_asignado_crc),
        razon_decision: allocForm.razon_decision,
      });
      setAllocModalOpen(false);
      setSuccess('Asignación presupuestaria por canal registrada en VitaBase.');
      await loadData();
    } catch (err) {
      setError(err);
    }
  }

  const visibleCampaigns =
    stateFilter === 'todos' ? campaigns : campaigns.filter((c) => c.estado === stateFilter);

  if (loading && campaigns.length === 0) {
    return <LoadingSpinner label="Cargando campañas, canales y asignaciones de presupuesto..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Campañas, Presupuestos y Canales"
        subtitle="Planificación comercial B2B en colones (CRC), control de límites presupuestarios y propuestas asistidas por Gemini API."
        actions={
          <>
            <button
              type="button"
              onClick={() => setAllocModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Wallet className="h-4 w-4 text-teal-600" />
              <span>Asignar Presupuesto</span>
            </button>
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>Proponer Estrategia IA (Gemini)</span>
            </button>
            <button
              type="button"
              onClick={openNewModal}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Campaña</span>
            </button>
          </>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {/* Filtro por Estado */}
      <div className="flex flex-wrap items-center gap-2">
        {['todos', 'propuesta', 'planificada', 'activa', 'pausada', 'finalizada'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStateFilter(st)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
              stateFilter === st
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st} (
            {st === 'todos' ? campaigns.length : campaigns.filter((c) => c.estado === st).length})
          </button>
        ))}
      </div>

      {/* Tarjetas de Campañas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleCampaigns.map((c) => {
          const campAllocations = allocations.filter((a) => a.campana_id === c.id);
          const totalAllocated = campAllocations.reduce(
            (acc, a) => acc + Number(a.monto_asignado_crc || 0),
            0
          );
          return (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700">
                        {c.codigo_campana}
                      </span>
                      <StatusBadge label={c.estado} />
                      <StatusBadge label={c.etapa_recorrido} />
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-900">{c.nombre}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Editar / Estado</span>
                  </button>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-600">{c.objetivo}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <span className="text-slate-500">Canal Principal</span>
                    <div className="mt-0.5 font-semibold text-slate-900">
                      {c.canal_principal_nombre || `Canal #${c.canal_principal_id}`}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Presupuesto Total</span>
                    <div className="mt-0.5 font-bold text-slate-900">
                      {formatCRC(c.presupuesto_total_crc)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Asignado a Canales</span>
                    <div className="mt-0.5 font-semibold text-teal-700">
                      {formatCRC(totalAllocated)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>
                  Vigencia: {formatDateShort(c.fecha_inicio)} al {formatDateShort(c.fecha_fin)}
                </span>
                <span>{campAllocations.length} asignaciones</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canales Disponibles */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Canales de Mercadeo Registrados en VitaBase ({channels.length})
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
            >
              <span className="font-semibold text-slate-800">{ch.nombre}</span>
              <StatusBadge label={ch.clasificacion} />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Crear/Editar Campaña */}
      <ModalDialog
        open={modalOpen}
        title={editing ? `Editar Campaña — ${editing.codigo_campana}` : 'Crear Nueva Campaña Comercial'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSaveCampaign} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Nombre de Campaña</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Objetivo Comercial</label>
            <textarea
              rows={2}
              required
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Descripción</label>
            <textarea
              rows={2}
              required
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Etapa del Recorrido</label>
            <select
              value={form.etapa_recorrido}
              onChange={(e) => setForm({ ...form, etapa_recorrido: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="conciencia">Conciencia</option>
              <option value="consideracion">Consideración</option>
              <option value="decision">Decisión</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Canal Principal</label>
            <select
              value={form.canal_principal_id}
              onChange={(e) => setForm({ ...form, canal_principal_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.nombre} ({ch.clasificacion})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Fecha Inicio</label>
            <input
              type="date"
              required
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Fecha Fin</label>
            <input
              type="date"
              required
              value={form.fecha_fin}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Presupuesto Total Pauta (CRC)
            </label>
            <input
              type="number"
              min={0}
              required
              value={form.presupuesto_total_crc}
              onChange={(e) => setForm({ ...form, presupuesto_total_crc: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Estado (Decisión Humana)</label>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="propuesta">Propuesta</option>
              <option value="planificada">Planificada</option>
              <option value="activa">Activa</option>
              <option value="pausada">Pausada</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              Justificación del Presupuesto
            </label>
            <input
              type="text"
              required
              value={form.justificacion_presupuesto}
              onChange={(e) => setForm({ ...form, justificacion_presupuesto: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Guardar Campaña
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Asignación Presupuestaria */}
      <ModalDialog
        open={allocModalOpen}
        title="Registrar Asignación de Presupuesto por Canal"
        onClose={() => setAllocModalOpen(false)}
      >
        <form onSubmit={handleCreateAllocation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Campaña</label>
            <select
              value={allocForm.campana_id}
              onChange={(e) => setAllocForm({ ...allocForm, campana_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo_campana} — {c.nombre} (Tope: {formatCRC(c.presupuesto_total_crc)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Canal</label>
            <select
              value={allocForm.canal_id}
              onChange={(e) => setAllocForm({ ...allocForm, canal_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.nombre} ({ch.clasificacion})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Periodo Inicio</label>
              <input
                type="date"
                required
                value={allocForm.periodo_inicio}
                onChange={(e) => setAllocForm({ ...allocForm, periodo_inicio: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Periodo Fin</label>
              <input
                type="date"
                required
                value={allocForm.periodo_fin}
                onChange={(e) => setAllocForm({ ...allocForm, periodo_fin: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Monto Asignado (CRC)</label>
            <input
              type="number"
              min={0}
              required
              value={allocForm.monto_asignado_crc}
              onChange={(e) => setAllocForm({ ...allocForm, monto_asignado_crc: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Razón de la Decisión</label>
            <input
              type="text"
              required
              value={allocForm.razon_decision}
              onChange={(e) => setAllocForm({ ...allocForm, razon_decision: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAllocModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Registrar Asignación
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Agente IA de Campañas (n8n + Gemini API) */}
      <ModalDialog
        open={aiModalOpen}
        title="Agente IA de Campañas (Orquestador → n8n → Gemini API → VitaBase)"
        onClose={() => setAiModalOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleRunAiStrategy} className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-900">
            <strong>Restricción operativa activa:</strong> El agente analiza objetivos y presupuestos
            reales en CRC, pero tiene prohibido activar pauta o gastar dinero. Toda campaña generada se
            guarda estrictamente en estado <code>propuesta</code> para revisión humana.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Objetivo Comercial a Analizar con Gemini
            </label>
            <textarea
              rows={3}
              required
              value={aiForm.objetivo_comercial}
              onChange={(e) => setAiForm({ ...aiForm, objetivo_comercial: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Presupuesto Referencia (CRC)
              </label>
              <input
                type="number"
                min={0}
                required
                value={aiForm.presupuesto_disponible_crc}
                onChange={(e) =>
                  setAiForm({ ...aiForm, presupuesto_disponible_crc: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Etapa Preferida</label>
              <select
                value={aiForm.etapa_recorrido}
                onChange={(e) => setAiForm({ ...aiForm, etapa_recorrido: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="conciencia">Conciencia</option>
                <option value="consideracion">Consideración</option>
                <option value="decision">Decisión</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={aiForm.guardar_propuesta}
              onChange={(e) => setAiForm({ ...aiForm, guardar_propuesta: e.target.checked })}
            />
            <span>Persistir automáticamente la propuesta en VitaBase (estado: propuesta)</span>
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
                  <span>Consultando n8n + Gemini API...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generar Estrategia y Distribución</span>
                </>
              )}
            </button>
          </div>
        </form>

        {aiResult && (
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-emerald-900">
              <span>
                Ejecución <strong>{aiResult.ejecucion.codigo_ejecucion}</strong> completada en{' '}
                {aiResult.ejecucion.duracion_ms} ms ({aiResult.resultado?.metadatos_ia?.modelo})
              </span>
              <StatusBadge label="propuesta" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900">Análisis del Objetivo</h4>
              <p className="mt-1 leading-relaxed text-slate-700">
                {aiResult.resultado.analisis_objetivo}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900">Estrategia Recomendada</h4>
              <p className="mt-1 leading-relaxed text-slate-700">
                {aiResult.resultado.estrategia_recomendada}
              </p>
            </div>

            {Array.isArray(aiResult.resultado.distribucion_presupuesto) && (
              <div>
                <h4 className="font-bold text-slate-900">Distribución Presupuestaria Sugerida</h4>
                <div className="mt-2 space-y-1.5">
                  {aiResult.resultado.distribucion_presupuesto.map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{d.canal_nombre}</span>
                        <p className="text-slate-500">{d.racional}</p>
                      </div>
                      <div className="text-right font-bold text-indigo-700">
                        {formatCRC(d.monto_crc)} ({d.porcentaje}%)
                      </div>
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

