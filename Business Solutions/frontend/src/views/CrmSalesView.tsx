import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type {
  CollaboratorProfile,
  ContactDetail,
  ContactLead,
  FunnelStage,
  OpportunityItem,
  OrchestratorDispatchResult,
  OrganizationType,
  SalesHandoff,
} from '../types/vitanexo';
import { formatCRC, formatDateShort, formatDateTime } from '../utils/formatters';
import {
  ErrorAlert,
  LoadingSpinner,
  ModalDialog,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../components/UiPrimitives';

export function CrmSalesView({ currentUser }: { currentUser: CollaboratorProfile }) {
  const [tab, setTab] = useState<'leads' | 'oportunidades' | 'traspasos' | 'seguimientos'>('leads');
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [contacts, setContacts] = useState<ContactLead[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [handoffs, setHandoffs] = useState<SalesHandoff[]>([]);
  const [followUps, setFollowUps] = useState<{
    contactos_pendientes: ContactLead[];
    oportunidades_pendientes: OpportunityItem[];
  }>({ contactos_pendientes: [], oportunidades_pendientes: [] });
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detalle de contacto e historial de acciones/etapas
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [stageChangeForm, setStageChangeForm] = useState({
    etapa_nueva_id: 2,
    motivo: 'Avance tras llamada de diagnóstico administrativo B2B.',
  });

  // Registro de nuevo lead
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    nombre_completo: '',
    cargo: 'Administrador de Clínica',
    nombre_organizacion: '',
    tipo_organizacion_id: 1,
    correo: '',
    telefono: '+506 ',
    provincia: 'San José',
    fuente_origen: 'campana_digital',
    puntuacion_lead: 75,
    necesidad_comercial: '',
    presupuesto_declarado_crc: 95000,
  });

  // Nueva oportunidad y cierre de oportunidad
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [oppForm, setOppForm] = useState({
    contacto_id: 1,
    titulo_propuesta: '',
    valor_estimado_crc: 110000,
    estado_oportunidad: 'propuesta_enviada',
  });

  const [closeModalOpp, setCloseModalOpp] = useState<OpportunityItem | null>(null);
  const [closeForm, setCloseForm] = useState({
    resultado_cierre: 'ganada' as 'ganada' | 'perdida',
    monto_cierre_crc: 110000,
    motivo_cierre: 'Propuesta aprobada por gerencia administrativa de la clínica.',
  });

  // Asistente IA Comercial Gemini
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<OrchestratorDispatchResult | null>(null);
  const [aiContactId, setAiContactId] = useState<number>(1);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [st, ct, op, hd, fu, ot] = await Promise.all([
        vitanexoApi.listFunnelStages(),
        vitanexoApi.listContacts(),
        vitanexoApi.listOpportunities(),
        vitanexoApi.listHandoffs(),
        vitanexoApi.listPendingFollowUps(),
        vitanexoApi.listOrganizationTypes(),
      ]);
      setStages(st);
      setContacts(ct);
      setOpportunities(op);
      setHandoffs(hd);
      setFollowUps(fu);
      setOrgTypes(ot);
      if (ct[0]) {
        setOppForm((prev) => ({ ...prev, contacto_id: prev.contacto_id || ct[0].id }));
        setAiContactId((prev) => prev || ct[0].id);
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

  async function openContactHistory(id: number) {
    setError(null);
    try {
      const d = await vitanexoApi.getContactDetail(id);
      setSelectedContact(d);
      const nextStage = stages.find((s) => s.id !== d.etapa_actual_id) || stages[0];
      if (nextStage) {
        setStageChangeForm((prev) => ({ ...prev, etapa_nueva_id: nextStage.id }));
      }
    } catch (err) {
      setError(err);
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await vitanexoApi.createContact({
        ...leadForm,
        tipo_organizacion_id: Number(leadForm.tipo_organizacion_id),
        puntuacion_lead: Number(leadForm.puntuacion_lead),
        presupuesto_declarado_crc: Number(leadForm.presupuesto_declarado_crc),
        responsable_comercial_id: currentUser.id,
      });
      setLeadModalOpen(false);
      setSuccess('Lead comercial registrado en el embudo de VitaBase.');
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  async function handleTransitionStage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact) return;
    setError(null);
    try {
      await vitanexoApi.changeContactStage(selectedContact.id, {
        etapa_nueva_id: Number(stageChangeForm.etapa_nueva_id),
        cambiado_por_id: currentUser.id,
        motivo: stageChangeForm.motivo,
      });
      const refreshed = await vitanexoApi.getContactDetail(selectedContact.id);
      setSelectedContact(refreshed);
      setSuccess('Transición de etapa registrada con trazabilidad completa.');
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  async function handleCreateOpportunity(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await vitanexoApi.createOpportunity({
        contacto_id: Number(oppForm.contacto_id),
        responsable_ventas_id: currentUser.id,
        titulo_propuesta: oppForm.titulo_propuesta,
        valor_estimado_crc: Number(oppForm.valor_estimado_crc),
        estado_oportunidad: oppForm.estado_oportunidad,
      });
      setOppModalOpen(false);
      setSuccess('Oportunidad comercial abierta en VitaBase.');
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  async function handleCloseOpportunity(e: React.FormEvent) {
    e.preventDefault();
    if (!closeModalOpp) return;
    setError(null);
    try {
      await vitanexoApi.closeOpportunity(closeModalOpp.id, {
        resultado_cierre: closeForm.resultado_cierre,
        monto_cierre_crc:
          closeForm.resultado_cierre === 'ganada' ? Number(closeForm.monto_cierre_crc) : undefined,
        motivo_cierre: closeForm.motivo_cierre,
      });
      setCloseModalOpp(null);
      setSuccess(`Oportunidad cerrada formalmente como '${closeForm.resultado_cierre}'.`);
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  async function handleRespondHandoff(id: number, decision: 'aceptado' | 'rechazado') {
    setError(null);
    try {
      await vitanexoApi.respondHandoff(id, {
        decision_ventas: decision,
        motivo_decision:
          decision === 'aceptado'
            ? 'Traspaso aceptado por ejecutivo comercial para apertura de propuesta.'
            : 'Requiere mayor maduración en etapa de consideración.',
      });
      setSuccess(`Traspaso marcado como '${decision}' en VitaBase.`);
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  async function handleRunSalesAi(e: React.FormEvent) {
    e.preventDefault();
    setAiRunning(true);
    setError(null);
    setAiResult(null);
    try {
      const res = await vitanexoApi.executeOrchestratorTask({
        tipo_tarea: 'analizar_embudo_y_priorizar_leads_ia',
        parametros: {
          contacto_id: Number(aiContactId),
        },
      });
      setAiResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setAiRunning(false);
    }
  }

  if (loading && contacts.length === 0) {
    return <LoadingSpinner label="Cargando embudo comercial, leads, traspasos y oportunidades..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contactos, Embudo Comercial y Ventas"
        subtitle="Gestión de leads B2B, seguimiento de etapas, traspasos mercadeo→ventas, oportunidades en CRC y priorización con Gemini API."
        actions={
          <>
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Sparkles className="h-4 w-4" />
              <span>Priorizar Leads y Borradores IA (Gemini)</span>
            </button>
            <button
              type="button"
              onClick={() => setOppModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Briefcase className="h-4 w-4 text-teal-600" />
              <span>Nueva Oportunidad</span>
            </button>
            <button
              type="button"
              onClick={() => setLeadModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Lead</span>
            </button>
          </>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {/* Resumen visual del Embudo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((st) => {
          const count = contacts.filter((c) => Number(c.etapa_actual_id) === Number(st.id)).length;
          return (
            <div key={st.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                {st.orden_embudo}. {st.nombre}
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Pestañas */}
      <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('leads')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            tab === 'leads' ? 'bg-teal-600 text-white' : 'text-slate-600'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Leads y Contactos ({contacts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('oportunidades')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            tab === 'oportunidades' ? 'bg-teal-600 text-white' : 'text-slate-600'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Oportunidades ({opportunities.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('traspasos')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            tab === 'traspasos' ? 'bg-teal-600 text-white' : 'text-slate-600'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>Traspasos a Ventas ({handoffs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('seguimientos')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
            tab === 'seguimientos' ? 'bg-teal-600 text-white' : 'text-slate-600'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>
            Seguimientos Pendientes (
            {followUps.contactos_pendientes.length + followUps.oportunidades_pendientes.length})
          </span>
        </button>
      </div>

      {/* Tabla de Leads */}
      {tab === 'leads' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Contacto / Organización</th>
                  <th className="px-4 py-3">Necesidad Comercial</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3">Etapa Embudo</th>
                  <th className="px-4 py-3 text-right">Presupuesto</th>
                  <th className="px-4 py-3 text-right">Seguimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.nombre_organizacion}</div>
                      <div className="text-xs text-slate-500">
                        {c.nombre_completo} ({c.cargo}) · {c.provincia}
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-700">
                      {c.necesidad_comercial}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs font-bold text-indigo-700">
                      {c.puntuacion_lead}/100
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={c.etapa_actual_nombre || c.etapa_actual_codigo} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-900">
                      {formatCRC(c.presupuesto_declarado_crc)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openContactHistory(c.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        Etapa / Historial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de Oportunidades */}
      {tab === 'oportunidades' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Código / Propuesta</th>
                  <th className="px-4 py-3">Organización</th>
                  <th className="px-4 py-3 text-right">Valor Estimado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Cierre Real</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunities.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{op.titulo_propuesta}</div>
                      <div className="font-mono text-xs text-slate-500">{op.codigo_oportunidad}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {op.nombre_organizacion || op.contacto_nombre || `Contacto #${op.contacto_id}`}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCRC(op.valor_estimado_crc)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={op.estado_oportunidad} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {op.resultado_cierre === 'ganada' ? formatCRC(op.monto_cierre_crc) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {op.resultado_cierre === 'pendiente' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCloseModalOpp(op);
                            setCloseForm({
                              resultado_cierre: 'ganada',
                              monto_cierre_crc: Number(op.valor_estimado_crc),
                              motivo_cierre: 'Contrato aprobado por dirección de la clínica.',
                            });
                          }}
                          className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700"
                        >
                          Cerrar Venta
                        </button>
                      ) : (
                        <StatusBadge label={op.resultado_cierre} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Traspasos a Ventas */}
      {tab === 'traspasos' && (
        <div className="space-y-3">
          {handoffs.map((h) => (
            <div
              key={h.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-700">
                    {h.codigo_traspaso}
                  </span>
                  <StatusBadge label={h.decision_ventas} />
                  <span className="text-xs text-slate-500">
                    Score al traspaso: <strong>{h.puntuacion_al_traspaso}</strong>
                  </span>
                </div>
                <h4 className="mt-1 font-bold text-slate-900">
                  {h.nombre_organizacion || h.contacto_nombre || `Contacto #${h.contacto_id}`}
                </h4>
                <p className="mt-1 text-xs text-slate-600">{h.observaciones_seguimiento}</p>
              </div>
              {h.decision_ventas === 'pendiente' && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespondHandoff(h.id, 'aceptado')}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Aceptar en Ventas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondHandoff(h.id, 'rechazado')}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Devolver a Nutrición
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Seguimientos Pendientes */}
      {tab === 'seguimientos' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Contactos con Seguimiento Programado ({followUps.contactos_pendientes.length})
            </h3>
            <div className="mt-3 divide-y divide-slate-100 text-xs">
              {followUps.contactos_pendientes.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-semibold text-slate-900">{c.nombre_organizacion}</div>
                    <div className="text-slate-500">{c.nombre_completo}</div>
                  </div>
                  <span className="font-mono text-amber-700">
                    {formatDateShort(c.fecha_proximo_seguimiento)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Oportunidades con Seguimiento Activo ({followUps.oportunidades_pendientes.length})
            </h3>
            <div className="mt-3 divide-y divide-slate-100 text-xs">
              {followUps.oportunidades_pendientes.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-semibold text-slate-900">{o.titulo_propuesta}</div>
                    <div className="text-slate-500">{formatCRC(o.valor_estimado_crc)}</div>
                  </div>
                  <span className="font-mono text-amber-700">
                    {formatDateShort(o.fecha_proximo_seguimiento)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Nuevo Lead */}
      <ModalDialog
        open={leadModalOpen}
        title="Registrar Nuevo Lead / Contacto Comercial B2B"
        onClose={() => setLeadModalOpen(false)}
      >
        <form onSubmit={handleCreateLead} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Nombre Completo</label>
            <input
              type="text"
              required
              value={leadForm.nombre_completo}
              onChange={(e) => setLeadForm({ ...leadForm, nombre_completo: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Cargo</label>
            <input
              type="text"
              required
              value={leadForm.cargo}
              onChange={(e) => setLeadForm({ ...leadForm, cargo: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Organización / Clínica</label>
            <input
              type="text"
              required
              value={leadForm.nombre_organizacion}
              onChange={(e) => setLeadForm({ ...leadForm, nombre_organizacion: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Tipo de Organización</label>
            <select
              value={leadForm.tipo_organizacion_id}
              onChange={(e) =>
                setLeadForm({ ...leadForm, tipo_organizacion_id: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {orgTypes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Correo</label>
            <input
              type="email"
              required
              value={leadForm.correo}
              onChange={(e) => setLeadForm({ ...leadForm, correo: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Teléfono</label>
            <input
              type="text"
              required
              value={leadForm.telefono}
              onChange={(e) => setLeadForm({ ...leadForm, telefono: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Fuente de Origen</label>
            <select
              value={leadForm.fuente_origen}
              onChange={(e) => setLeadForm({ ...leadForm, fuente_origen: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="campana_digital">Campaña digital</option>
              <option value="busqueda_organica">Búsqueda orgánica</option>
              <option value="referido">Referido</option>
              <option value="evento_salud">Evento administrativo salud</option>
              <option value="prospeccion_directa">Prospección directa</option>
              <option value="sitio_web">Sitio web</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Presupuesto Declarado (CRC)
            </label>
            <input
              type="number"
              min={0}
              value={leadForm.presupuesto_declarado_crc}
              onChange={(e) =>
                setLeadForm({ ...leadForm, presupuesto_declarado_crc: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              Necesidad Administrativa / Comercial (prohibido ingresar datos clínicos)
            </label>
            <textarea
              rows={2}
              required
              value={leadForm.necesidad_comercial}
              onChange={(e) => setLeadForm({ ...leadForm, necesidad_comercial: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setLeadModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Registrar Lead
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Historial y Cambio de Etapa del Contacto */}
      <ModalDialog
        open={Boolean(selectedContact)}
        title={
          selectedContact
            ? `Embudo e Historial Comercial — ${selectedContact.nombre_organizacion}`
            : ''
        }
        onClose={() => setSelectedContact(null)}
      >
        {selectedContact && (
          <div className="space-y-5 text-xs">
            <form
              onSubmit={handleTransitionStage}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="font-bold text-slate-900">Registrar Avance / Cambio de Etapa</div>
              <select
                value={stageChangeForm.etapa_nueva_id}
                onChange={(e) =>
                  setStageChangeForm({ ...stageChangeForm, etapa_nueva_id: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.orden_embudo}. {s.nombre}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={stageChangeForm.motivo}
                onChange={(e) => setStageChangeForm({ ...stageChangeForm, motivo: e.target.value })}
                placeholder="Motivo comercial de la transición..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
              >
                Aplicar Transición
              </button>
            </form>

            <div>
              <h4 className="font-bold text-slate-900">
                Historial de Acciones y Transiciones ({selectedContact.historial_etapas?.length || 0})
              </h4>
              <div className="mt-2 space-y-2">
                {(selectedContact.historial_etapas || []).map((h) => (
                  <div key={h.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>
                        {h.etapa_anterior_nombre ? `${h.etapa_anterior_nombre} → ` : 'Inicio → '}
                        {h.etapa_nueva_nombre}
                      </span>
                      <span className="font-normal text-slate-500">
                        {formatDateTime(h.fecha_transicion)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{h.motivo}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Modal Abrir Oportunidad */}
      <ModalDialog
        open={oppModalOpen}
        title="Abrir Nueva Oportunidad Comercial"
        onClose={() => setOppModalOpen(false)}
      >
        <form onSubmit={handleCreateOpportunity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Contacto / Clínica</label>
            <select
              value={oppForm.contacto_id}
              onChange={(e) => setOppForm({ ...oppForm, contacto_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_organizacion} — {c.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Título de la Propuesta</label>
            <input
              type="text"
              required
              value={oppForm.titulo_propuesta}
              onChange={(e) => setOppForm({ ...oppForm, titulo_propuesta: e.target.value })}
              placeholder="Ej. Implementación Agenda Automatizada + Facturación CRC"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Valor Estimado (CRC)</label>
            <input
              type="number"
              min={0}
              required
              value={oppForm.valor_estimado_crc}
              onChange={(e) =>
                setOppForm({ ...oppForm, valor_estimado_crc: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOppModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Crear Oportunidad
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Cerrar Oportunidad */}
      <ModalDialog
        open={Boolean(closeModalOpp)}
        title={closeModalOpp ? `Formalizar Cierre — ${closeModalOpp.codigo_oportunidad}` : ''}
        onClose={() => setCloseModalOpp(null)}
      >
        <form onSubmit={handleCloseOpportunity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Resultado del Cierre</label>
            <select
              value={closeForm.resultado_cierre}
              onChange={(e) =>
                setCloseForm({
                  ...closeForm,
                  resultado_cierre: e.target.value as 'ganada' | 'perdida',
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ganada">Ganada</option>
              <option value="perdida">Perdida</option>
            </select>
          </div>
          {closeForm.resultado_cierre === 'ganada' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Monto Real de Cierre (CRC)
              </label>
              <input
                type="number"
                min={1}
                required
                value={closeForm.monto_cierre_crc}
                onChange={(e) =>
                  setCloseForm({ ...closeForm, monto_cierre_crc: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Motivo del Cierre</label>
            <textarea
              rows={2}
              required
              value={closeForm.motivo_cierre}
              onChange={(e) => setCloseForm({ ...closeForm, motivo_cierre: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCloseModalOpp(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Confirmar Cierre
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Agente IA de Contactos y Ventas (Gemini API vía n8n) */}
      <ModalDialog
        open={aiModalOpen}
        title="Agente IA Comercial (Orquestador → n8n → Gemini API → VitaBase)"
        onClose={() => setAiModalOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleRunSalesAi} className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Control de seguridad comercial:</strong> El agente evalúa prioridad de leads y
            redacta borradores personalizados en español costarricense, pero{' '}
            <strong>nunca envía comunicaciones externas sin autorización humana</strong>.
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Contacto Foco para Borrador Comercial + Diagnóstico Completo del Embudo
            </label>
            <select
              value={aiContactId}
              onChange={(e) => setAiContactId(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo_contacto} — {c.nombre_organizacion} (Score: {c.puntuacion_lead})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={aiRunning}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analizando embudo con Gemini API...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Ejecutar Diagnóstico y Redacción</span>
                </>
              )}
            </button>
          </div>
        </form>

        {aiResult && (
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-5 text-xs">
            <div>
              <h4 className="font-bold text-slate-900">Diagnóstico del Embudo Comercial</h4>
              <p className="mt-1 leading-relaxed text-slate-700">
                {aiResult.resultado.diagnostico_embudo}
              </p>
            </div>

            {Array.isArray(aiResult.resultado.priorizacion_leads) && (
              <div>
                <h4 className="font-bold text-slate-900">Priorización de Leads Activos</h4>
                <div className="mt-2 space-y-1.5">
                  {aiResult.resultado.priorizacion_leads.map((l: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {l.organizacion} ({l.codigo_contacto})
                        </span>
                        <p className="text-slate-600">{l.justificacion}</p>
                      </div>
                      <StatusBadge label={l.prioridad} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(aiResult.resultado.borradores_mensajes_comerciales) && (
              <div>
                <h4 className="font-bold text-slate-900">
                  Borradores Comerciales Propuestos (Pendientes de Envío Humano)
                </h4>
                <div className="mt-2 space-y-2">
                  {aiResult.resultado.borradores_mensajes_comerciales.map((b: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                      <div className="font-semibold text-indigo-950">
                        Para: {b.destinatario_organizacion} · Asunto: {b.asunto}
                      </div>
                      <p className="mt-1.5 whitespace-pre-line text-slate-700">
                        {b.mensaje_propuesto}
                      </p>
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

