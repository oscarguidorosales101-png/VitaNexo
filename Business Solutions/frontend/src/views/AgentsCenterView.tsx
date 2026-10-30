import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  ShieldAlert,
  Sparkles,
  Terminal,
  XCircle,
  Zap,
} from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type {
  AgentExecutionRecord,
  AgentInfo,
  AiConversation,
  AiProviderAssignment,
  AiProviderInfo,
  AiProvidersOverview,
  AiRequest,
  OrchestratorDispatchResult,
} from '../types/vitanexo';
import { formatCRC, formatDateTime } from '../utils/formatters';
import {
  ErrorAlert,
  LoadingSpinner,
  ModalDialog,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../components/UiPrimitives';

const TASK_PRESETS: Record<string, Record<string, unknown>> = {
  analizar_estrategia_campana_ia: {
    objetivo_comercial:
      'Captar clínicas pequeñas y centros de fisioterapia en San José y Heredia interesados en automatizar recordatorios de citas y cobros en CRC.',
    presupuesto_disponible_crc: 340000,
    etapa_recorrido: 'consideracion',
    guardar_propuesta: false,
  },
  recomendar_distribucion_presupuesto_ia: {
    objetivo_comercial:
      'Optimizar distribución entre búsqueda pagada, redes B2B y contenido orgánico para consultorios médicos en Costa Rica.',
    presupuesto_disponible_crc: 420000,
    etapa_recorrido: 'decision',
  },
  generar_publicacion_ia: {
    campana_id: 1,
    canal_id: 2,
    tipo_contenido: 'publicacion_social',
    etapa_recorrido: 'consideracion',
    tema_central:
      'Reducción del 40% en tiempo administrativo de recepción en centros de fisioterapia costarricenses.',
    guardar_borrador: true,
  },
  generar_calendario_editorial_ia: {
    campana_id: 1,
    canal_id: 1,
    semanas_calendario: 4,
    tema_central: 'Eficiencia operativa, agendamiento digital y control financiero en CRC para clínicas.',
  },
  revisar_texto_y_variantes_ia: {
    texto_borrador:
      'En VitaNexo ayudamos a su consultorio en Costa Rica a ordenar su agenda semanal y evitar citas perdidas con recordatorios automáticos.',
    tipo_contenido: 'anuncio_pagado',
    etapa_recorrido: 'decision',
  },
  interpretar_metricas_ia: {
    enfoque_analisis:
      'Evaluar CPC, CTR, CAC, ROAS, ciclo de venta y ticket promedio reales en CRC e identificar campañas con métricas de vanidad vs retorno real.',
  },
  analizar_embudo_y_priorizar_leads_ia: {
    contacto_id: 1,
    objetivo_comercial:
      'Priorizar leads activos en el embudo comercial y recomendar próximos pasos en 24-48 horas.',
  },
  redactar_mensaje_comercial_ia: {
    contacto_id: 1,
    tono_mensaje: 'Ejecutivo, respetuoso y directo para dirección administrativa de clínica en Costa Rica',
  },
  diagnosticar_indicadores_integrales: {},
  consultar_campanas: {},
  consultar_leads: {},
  identificar_seguimientos_pendientes: {},
};

export function AgentsCenterView() {
  const [activeTab, setActiveTab] = useState<'conversational' | 'orchestrator' | 'providers'>(
    'conversational'
  );

  // Catálogos e historial global
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [executions, setExecutions] = useState<AgentExecutionRecord[]>([]);
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab 1: Asistente Conversacional Persistente
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<
    (AiConversation & { solicitudes?: AiRequest[] }) | null
  >(null);
  const [chatAgentCode, setChatAgentCode] = useState<string>('agente_metricas');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [submittingChat, setSubmittingChat] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Tab 2: Consola Orquestador
  const [selectedAgentCode, setSelectedAgentCode] = useState<string>('agente_metricas');
  const [selectedTask, setSelectedTask] = useState<string>('interpretar_metricas_ia');
  const [paramsJson, setParamsJson] = useState<string>(
    JSON.stringify(TASK_PRESETS.interpretar_metricas_ia, null, 2)
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [runningTask, setRunningTask] = useState(false);
  const [liveOutput, setLiveOutput] = useState<OrchestratorDispatchResult | null>(null);
  const [inspectedExec, setInspectedExec] = useState<AgentExecutionRecord | null>(null);

  // Tab 3: Proveedores y Modelos IA
  const [providersOverview, setProvidersOverview] = useState<AiProvidersOverview | null>(null);
  const [verifyingProviderCode, setVerifyingProviderCode] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, { ok: boolean; latencia_ms?: number; mensaje?: string }>>({});
  const [savingAssignmentAgent, setSavingAssignmentAgent] = useState<string | null>(null);

  // Carga inicial y datos
  async function loadCenter(agentFilter = filterAgent) {
    setLoading(true);
    setError(null);
    try {
      const q = agentFilter ? `?codigo_agente=${agentFilter}&limit=50` : '?limit=50';
      const [ag, ex, convList, provs] = await Promise.all([
        vitanexoApi.listAgents(),
        vitanexoApi.listAgentExecutions(q),
        vitanexoApi.iaApi.listConversations(),
        vitanexoApi.iaApi.listProviders().catch(() => null),
      ]);
      setAgents(ag);
      setExecutions(ex);
      setConversations(convList);
      if (provs) setProvidersOverview(provs);

      // Si no hay conversación activa y existen previas, abrir la primera
      if (!activeConvId && convList.length > 0) {
        setActiveConvId(convList[0].id);
        const detail = await vitanexoApi.iaApi.getConversation(convList[0].id);
        setActiveConversation(detail);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCenter('');
  }, []);

  // Carga de detalle al cambiar de conversación
  async function selectConversation(id: number) {
    setActiveConvId(id);
    try {
      const detail = await vitanexoApi.iaApi.getConversation(id);
      setActiveConversation(detail);
      if (detail.codigo_agente) setChatAgentCode(detail.codigo_agente);
    } catch (err) {
      setError(err);
    }
  }

  // Polling automático cuando hay solicitudes activas ('pendiente' o 'procesando')
  useEffect(() => {
    if (!activeConvId) return;
    const hasActiveRequests = activeConversation?.solicitudes?.some(
      (s) => s.estado === 'pendiente' || s.estado === 'procesando'
    );
    if (!hasActiveRequests) return;

    const interval = setInterval(async () => {
      try {
        const detail = await vitanexoApi.iaApi.getConversation(activeConvId);
        setActiveConversation(detail);
        // Actualizar lista de hilos si se completó
        const stillActive = detail.solicitudes?.some(
          (s: AiRequest) => s.estado === 'pendiente' || s.estado === 'procesando'
        );
        if (!stillActive) {
          const updatedConvs = await vitanexoApi.iaApi.listConversations();
          setConversations(updatedConvs);
        }
      } catch (_) {
        // Silencioso en polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeConvId, activeConversation?.solicitudes]);

  // Autoscroll del chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeConversation?.solicitudes]);

  const specialistAgents = agents.filter((a) => !a.es_orquestador);
  const activeAgentObj =
    specialistAgents.find((a) => a.codigo_agente === selectedAgentCode) || specialistAgents[0];

  function handleSelectAgentCard(code: string) {
    setSelectedAgentCode(code);
    const ag = specialistAgents.find((a) => a.codigo_agente === code);
    const preferredTask =
      ag?.tareas_soportadas.find((t) => t.endsWith('_ia')) || ag?.tareas_soportadas[0] || '';
    setSelectedTask(preferredTask);
    setParamsJson(JSON.stringify(TASK_PRESETS[preferredTask] || {}, null, 2));
  }

  function handleChangeTask(task: string) {
    setSelectedTask(task);
    setParamsJson(JSON.stringify(TASK_PRESETS[task] || {}, null, 2));
  }

  async function handleExecuteTask(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = paramsJson.trim() ? JSON.parse(paramsJson) : {};
    } catch {
      setError(new Error('El bloque de parámetros no es un objeto JSON válido.'));
      return;
    }

    setRunningTask(true);
    try {
      const res = await vitanexoApi.executeOrchestratorTask(
        {
          codigo_agente: selectedAgentCode,
          tipo_tarea: selectedTask,
          parametros: parsedParams,
        },
        idempotencyKey.trim() || undefined
      );
      setLiveOutput(res);
      setSuccess(
        `Tarea '${selectedTask}' completada en ${res.ejecucion.duracion_ms} ms y auditada en VitaBase (${res.ejecucion.codigo_ejecucion}).`
      );
      await loadCenter(filterAgent);
    } catch (err) {
      setError(err);
      await loadCenter(filterAgent);
    } finally {
      setRunningTask(false);
    }
  }

  // Enviar mensaje en chat conversacional
  async function handleSendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim() || submittingChat) return;

    setError(null);
    setSubmittingChat(true);
    const key = `idemp-chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await vitanexoApi.iaApi.submitRequest({
        mensaje_usuario: chatMessage.trim(),
        codigo_agente: chatAgentCode,
        conversacion_id: activeConvId || undefined,
        idempotency_key: key,
      });

      setChatMessage('');

      // Si fue una nueva conversación o ya existía, refrescar
      const convId = res.data.conversacion_id || activeConvId;
      if (convId) {
        setActiveConvId(convId);
        const detail = await vitanexoApi.iaApi.getConversation(convId);
        setActiveConversation(detail);
      }
      const updatedList = await vitanexoApi.iaApi.listConversations();
      setConversations(updatedList);
    } catch (err) {
      setError(err);
    } finally {
      setSubmittingChat(false);
    }
  }

  // Cancelar solicitud en proceso
  async function handleCancelRequest(id: number) {
    setCancellingId(id);
    try {
      await vitanexoApi.iaApi.cancelRequest(id);
      if (activeConvId) {
        const detail = await vitanexoApi.iaApi.getConversation(activeConvId);
        setActiveConversation(detail);
      }
    } catch (err) {
      setError(err);
    } finally {
      setCancellingId(null);
    }
  }

  // Reintentar solicitud con error
  async function handleRetryRequest(id: number) {
    setRetryingId(id);
    try {
      await vitanexoApi.iaApi.retryRequest(id);
      if (activeConvId) {
        const detail = await vitanexoApi.iaApi.getConversation(activeConvId);
        setActiveConversation(detail);
      }
    } catch (err) {
      setError(err);
    } finally {
      setRetryingId(null);
    }
  }

  // Crear nueva conversación vacía
  async function handleNewConversation() {
    setError(null);
    try {
      const created = await vitanexoApi.iaApi.createConversation({
        codigo_agente: chatAgentCode,
        titulo: `Nueva sesión con ${specialistAgents.find((a) => a.codigo_agente === chatAgentCode)?.nombre || 'Agente'}`,
      });
      setActiveConvId(created.id);
      setActiveConversation({ ...created, solicitudes: [] });
      const updatedList = await vitanexoApi.iaApi.listConversations();
      setConversations(updatedList);
    } catch (err) {
      setError(err);
    }
  }

  // Probar conexión de un proveedor
  async function handleVerifyProvider(codigo: string) {
    setVerifyingProviderCode(codigo);
    try {
      const res = await vitanexoApi.iaApi.verifyProvider(codigo);
      setVerifyResult((prev) => ({
        ...prev,
        [codigo]: {
          ok: res.ok,
          latencia_ms: res.latencia_ms,
          mensaje: res.mensaje,
        },
      }));
    } catch (err: any) {
      setVerifyResult((prev) => ({
        ...prev,
        [codigo]: {
          ok: false,
          mensaje: err?.message || 'Fallo de verificación',
        },
      }));
    } finally {
      setVerifyingProviderCode(null);
    }
  }

  // Asignar proveedor a agente
  async function handleSaveAssignment(agentCode: string, providerCode: string) {
    setSavingAssignmentAgent(agentCode);
    setError(null);
    try {
      const prov = providersOverview?.proveedores.find((p) => p.codigo_proveedor === providerCode);
      if (!prov) return;
      await vitanexoApi.iaApi.assignProviderToAgent(agentCode, {
        proveedor_codigo: providerCode,
      });
      setSuccess(`Proveedor '${prov.nombre}' asignado al agente '${agentCode}'.`);
      const updated = await vitanexoApi.iaApi.listProviders();
      setProvidersOverview(updated);
    } catch (err) {
      setError(err);
    } finally {
      setSavingAssignmentAgent(null);
    }
  }

  if (loading && agents.length === 0) {
    return <LoadingSpinner label="Cargando catálogo de agentes e integraciones de IA..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Centro de Inteligencia Artificial y Agentes Especializados"
        subtitle="Conversación asíncrona persistente, consola técnica y orquestación multiproveedor (Gemini API vía n8n local, DeepSeek, OpenAI y MySQL VitaBase)."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadCenter(filterAgent)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {/* Selector de Pestañas */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('conversational')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'conversational'
              ? 'border-teal-600 text-teal-700 bg-teal-50/30'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Asistente Conversacional IA</span>
          {conversations.length > 0 && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800 font-bold">
              {conversations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orchestrator')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'orchestrator'
              ? 'border-teal-600 text-teal-700 bg-teal-50/30'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>Consola Técnica / Orquestador</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'providers'
              ? 'border-teal-600 text-teal-700 bg-teal-50/30'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Proveedores y Modelos IA</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
            Multiproveedor
          </span>
        </button>
      </div>

      {/* PESTAÑA 1: ASISTENTE CONVERSACIONAL ASÍNCRONO */}
      {activeTab === 'conversational' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[640px]">
          {/* Sidebar de Hilos de Conversación */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Conversaciones Previas</h3>
              <button
                type="button"
                onClick={handleNewConversation}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nueva</span>
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[560px]">
              {conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  No hay conversaciones guardadas en VitaBase. Haga clic en "+ Nueva" para iniciar.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => selectConversation(conv.id)}
                      className={`w-full rounded-xl p-3 text-left transition border ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/60 shadow-xs'
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-teal-700">
                          {conv.codigo_conversacion}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(conv.ultima_actividad_en)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-900 line-clamp-1">
                        {conv.titulo || 'Conversación'}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="capitalize">{conv.agente_nombre || conv.codigo_agente}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200 font-mono text-[10px]">
                          {conv.total_mensajes} {conv.total_mensajes === 1 ? 'mensaje' : 'mensajes'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel Central del Chat */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs lg:col-span-8 overflow-hidden">
            {/* Header del Chat */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-teal-600 p-2 text-white shadow-xs">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeConversation?.titulo || 'Asistente de Inteligencia Artificial'}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Agente: <strong>{activeConversation?.agente_nombre || chatAgentCode}</strong></span>
                    <span>·</span>
                    <span className="text-emerald-700 font-medium">Conexión activa con MySQL VitaBase y n8n</span>
                  </div>
                </div>
              </div>

              {/* Selector de Agente para este hilo */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Agente:</span>
                <select
                  value={chatAgentCode}
                  onChange={(e) => setChatAgentCode(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs"
                >
                  {specialistAgents.map((ag) => (
                    <option key={ag.codigo_agente} value={ag.codigo_agente}>
                      {ag.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mensajes del Hilo */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px] min-h-[380px] bg-slate-50/20"
            >
              {!activeConversation?.solicitudes || activeConversation.solicitudes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                  <Sparkles className="h-10 w-10 text-teal-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Conversación lista para consultar</p>
                  <p className="max-w-md text-xs text-slate-500 mt-1">
                    Escriba su consulta o instrucción para el agente seleccionado. El sistema procesará
                    la solicitud de forma asíncrona contra los datos reales de VitaBase y el motor de IA.
                  </p>
                </div>
              ) : (
                activeConversation.solicitudes.map((sol) => (
                  <div key={sol.id} className="space-y-3">
                    {/* Mensaje del Usuario */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-slate-900 px-4 py-3 text-xs text-white shadow-xs">
                        <div className="font-semibold text-teal-300 text-[10px] uppercase mb-1">
                          Tú ({formatDateTime(sol.fecha_creacion)})
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{sol.mensaje_usuario}</p>
                      </div>
                    </div>

                    {/* Respuesta del Asistente */}
                    <div className="flex justify-start">
                      <div className="max-w-[92%] rounded-2xl rounded-tl-xs border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-xs space-y-3">
                        {/* Cabecera del turno */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {sol.agente_nombre || sol.codigo_agente}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {sol.codigo_solicitud}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Píldora de estado reactivo */}
                            {sol.estado === 'pendiente' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                                <Clock className="h-3 w-3 animate-spin text-amber-600" />
                                Pendiente en cola
                              </span>
                            )}
                            {sol.estado === 'procesando' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                                <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                                {sol.etapa_progreso || 'Procesando con IA...'}
                              </span>
                            )}
                            {sol.estado === 'completada' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Completada ({sol.duracion_ms} ms)
                              </span>
                            )}
                            {sol.estado === 'error' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-800 border border-rose-200">
                                <XCircle className="h-3 w-3 text-rose-600" />
                                Error operativo
                              </span>
                            )}
                            {sol.estado === 'cancelada' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                Cancelada
                              </span>
                            )}

                            {/* Botón de Cancelar en vivo */}
                            {(sol.estado === 'pendiente' || sol.estado === 'procesando') && (
                              <button
                                type="button"
                                disabled={cancellingId === sol.id}
                                onClick={() => handleCancelRequest(sol.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                {cancellingId === sol.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span>Cancelar</span>
                                )}
                              </button>
                            )}

                            {/* Botón de Reintentar */}
                            {sol.estado === 'error' && (
                              <button
                                type="button"
                                disabled={retryingId === sol.id}
                                onClick={() => handleRetryRequest(sol.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 hover:bg-teal-100"
                              >
                                {retryingId === sol.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-3 w-3" />
                                    <span>Reintentar</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Contenido del turno */}
                        {sol.estado === 'error' && sol.mensaje_error && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                            <strong>Detalle del error:</strong> {sol.mensaje_error}
                          </div>
                        )}

                        {sol.respuesta_texto && (
                          <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                            {sol.respuesta_texto}
                          </div>
                        )}

                        {/* Tarjetas Estructuradas Enriquecidas */}
                        {sol.respuesta_estructurada && (
                          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                            {/* Alerta de Desvío Clínico Contextual */}
                            {sol.respuesta_estructurada.alcance_permitido === false && (
                              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
                                <div className="flex items-center gap-2 font-bold text-xs">
                                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                                  <span>Orientación de Alcance VitaNexo (Frontera Clínica vs Administrativa)</span>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed">
                                  {sol.respuesta_estructurada.alternativa_administrativa}
                                </p>
                              </div>
                            )}

                            {/* Tarjeta de Propuesta de Campaña */}
                            {sol.respuesta_estructurada.propuesta_campana && (
                              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                                  <span>Propuesta de Campaña Generada</span>
                                  <span>{formatCRC(sol.respuesta_estructurada.propuesta_campana.presupuesto_total_crc || 0)}</span>
                                </div>
                                <div className="mt-2 text-xs text-slate-700">
                                  <strong>Objetivo:</strong> {sol.respuesta_estructurada.propuesta_campana.objetivo_estrategico}
                                </div>
                              </div>
                            )}

                            {/* Tarjeta de Métricas e Indicadores (8 KPIs) */}
                            {sol.respuesta_estructurada.cifras_kpi_crc && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="font-bold text-xs text-slate-900 mb-2">
                                  Indicadores Financieros Consultados en VitaBase
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                                  {Object.entries(sol.respuesta_estructurada.cifras_kpi_crc).map(([k, v]) => (
                                    <div key={k} className="rounded-lg bg-white p-2 border border-slate-200">
                                      <div className="text-slate-500 truncate capitalize">{k.replace(/_/g, ' ')}</div>
                                      <div className="font-mono font-bold text-slate-900">{String(v)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadatos de IA */}
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                              <span>Proveedor: {sol.proveedor_ia || 'gemini-api'}</span>
                              <span>·</span>
                              <span>Modelo: {sol.modelo_ia || 'models/gemini-3-flash-preview'}</span>
                              <span>·</span>
                              <span>Vía: {sol.via_n8n ? 'Workflow n8n Local' : 'REST Directo'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Composer Inferior con Clave de Idempotencia Automática */}
            <form onSubmit={handleSendChatMessage} className="border-t border-slate-200 bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Escriba su consulta o instrucción (ej. 'Analizar el ROAS y CAC de las clínicas en San José', 'Proponer estrategia de captación para centros de fisioterapia')..."
                  className="flex-1 rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage(e);
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={submittingChat || !chatMessage.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs hover:bg-teal-700 disabled:opacity-40"
                  title="Enviar solicitud (asíncrona con persistencia)"
                >
                  {submittingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Presione <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para nueva línea.</span>
                <span className="font-mono text-[10px]">Prevención de duplicados activa (Idempotencia)</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CONSOLA TÉCNICA Y ORQUESTADOR DIRECTO */}
      {activeTab === 'orchestrator' && (
        <div className="space-y-6">
          {/* Tarjetas de los 4 Agentes Especializados */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {specialistAgents.map((ag) => {
              const isSelected = ag.codigo_agente === selectedAgentCode;
              const aiCount = (ag.tareas_soportadas || []).filter((t) => t.endsWith('_ia')).length;
              return (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => handleSelectAgentCard(ag.codigo_agente)}
                  className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl bg-slate-900 p-2 text-teal-400">
                        <Bot className="h-5 w-5" />
                      </div>
                      <StatusBadge label={ag.activo ? 'activo' : 'inactivo'} />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-900">{ag.nombre}</h3>
                    <div className="font-mono text-[11px] text-teal-700">{ag.codigo_agente}</div>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                      {ag.descripcion}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
                      <Sparkles className="h-3 w-3" />
                      {aiCount} tareas Gemini
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      {ag.tareas_soportadas.length} capacidades totales
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Consola de Ejecución Directa vía Orquestador + Visor de Resultados */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleExecuteTask}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5"
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Ejecutar Tarea Orquestada</h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Agente Especializado</label>
                <select
                  value={selectedAgentCode}
                  onChange={(e) => handleSelectAgentCard(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {specialistAgents.map((a) => (
                    <option key={a.codigo_agente} value={a.codigo_agente}>
                      {a.nombre} ({a.codigo_agente})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Capacidad / Tarea Soportada
                </label>
                <select
                  value={selectedTask}
                  onChange={(e) => handleChangeTask(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                >
                  {(activeAgentObj?.tareas_soportadas || []).map((t) => (
                    <option key={t} value={t}>
                      {t} {t.endsWith('_ia') ? '★ [n8n + Gemini API]' : '[Determinista SQL]'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Parámetros JSON de Entrada
                </label>
                <textarea
                  rows={7}
                  value={paramsJson}
                  onChange={(e) => setParamsJson(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Clave de Idempotencia (opcional — evita ejecuciones duplicadas)
                </label>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  placeholder="Ej. lote-campana-nov-01"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={runningTask}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
              >
                {runningTask ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {selectedTask.endsWith('_ia')
                        ? 'Ejecutando Orquestador → n8n → Gemini API...'
                        : 'Ejecutando en Orquestador...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Despachar Tarea en Vivo</span>
                  </>
                )}
              </button>
            </form>

            {/* Resultado Estructurado en Vivo */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Resultado de la Ejecución</h2>
                {liveOutput && (
                  <div className="flex items-center gap-2 text-xs">
                    <StatusBadge label={liveOutput.ejecucion.estado} />
                    <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-teal-600" />
                      {liveOutput.ejecucion.duracion_ms} ms
                    </span>
                  </div>
                )}
              </div>

              {!liveOutput ? (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-center text-xs text-slate-500">
                  <Bot className="h-9 w-9 text-slate-300" />
                  <p className="mt-3 max-w-sm">
                    Seleccione uno de los 4 agentes especializados y despache una tarea para inspeccionar
                    la respuesta real de Gemini API / VitaBase y su registro de auditoría.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
                    <div>
                      <span className="text-slate-500">Código</span>
                      <div className="font-mono font-bold text-slate-900">
                        {liveOutput.ejecucion.codigo_ejecucion}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Agente</span>
                      <div className="font-semibold text-slate-900">
                        {liveOutput.ejecucion.codigo_agente}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Tarea</span>
                      <div className="truncate font-mono text-slate-800">
                        {liveOutput.ejecucion.tipo_tarea}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Idempotencia</span>
                      <div className="font-semibold text-teal-700">
                        {liveOutput.idempotente_reutilizado ? 'Reutilizada (caché)' : 'Ejecución nueva'}
                      </div>
                    </div>
                  </div>

                  <pre className="max-h-[380px] overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-100">
                    {JSON.stringify(liveOutput.resultado, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Historial Completo de Ejecuciones Auditadas en VitaBase */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Historial Auditado en VitaBase (<code>ejecuciones_agentes</code>)
                </h2>
                <p className="text-xs text-slate-500">
                  Incluye ejecuciones completadas, rechazos por reglas de negocio y errores operativos con
                  su duración exacta en milisegundos.
                </p>
              </div>
              <select
                value={filterAgent}
                onChange={(e) => {
                  setFilterAgent(e.target.value);
                  loadCenter(e.target.value);
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
              >
                <option value="">Todos los agentes</option>
                {specialistAgents.map((a) => (
                  <option key={a.codigo_agente} value={a.codigo_agente}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-left font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Código</th>
                    <th className="px-3 py-2.5">Agente</th>
                    <th className="px-3 py-2.5">Tarea</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Duración</th>
                    <th className="px-3 py-2.5">Detalle / Error</th>
                    <th className="px-3 py-2.5 text-right">Fecha</th>
                    <th className="px-3 py-2.5 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                        {ex.codigo_ejecucion}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{ex.agente_nombre}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{ex.tipo_tarea}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge label={ex.estado} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                        {ex.duracion_ms} ms
                      </td>
                      <td className="max-w-xs truncate px-3 py-2.5 text-rose-700">
                        {ex.mensaje_error || <span className="text-slate-400">Sin errores</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500">
                        {formatDateTime(ex.fecha_inicio)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectedExec(ex)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PROVEEDORES Y MODELOS IA */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Proveedores de Inteligencia Artificial</h3>
                <p className="text-xs text-slate-500">
                  Arquitectura multiproveedor de VitaNexo. Permite configurar y alternar entre Google Gemini, DeepSeek,
                  OpenAI y Anthropic sin modificar la lógica interna de los agentes.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(providersOverview?.proveedores || []).map((prov) => {
                const isVerifying = verifyingProviderCode === prov.codigo_proveedor;
                const vRes = verifyResult[prov.codigo_proveedor];
                return (
                  <div
                    key={prov.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-slate-900 p-2 text-teal-400">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {prov.es_predeterminado ? (
                            <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                              Predeterminado
                            </span>
                          ) : null}
                          <StatusBadge label={prov.activo ? 'activo' : 'inactivo'} />
                        </div>
                      </div>

                      <h4 className="mt-3 text-sm font-bold text-slate-900">{prov.nombre}</h4>
                      <div className="font-mono text-[11px] text-teal-700">{prov.codigo_proveedor}</div>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <div>
                          <strong>Adaptador:</strong>{' '}
                          <code className="text-slate-800">{prov.tipo_adaptador}</code>
                        </div>
                        <div>
                          <strong>Modelo Principal:</strong>{' '}
                          <code className="text-indigo-800 font-semibold">{prov.modelo_principal}</code>
                        </div>
                        {prov.modelo_alternativo && (
                          <div>
                            <strong>Modelo Alternativo:</strong>{' '}
                            <code className="text-slate-700">{prov.modelo_alternativo}</code>
                          </div>
                        )}
                        <div>
                          <strong>Límite:</strong> {prov.limite_solicitudes_minuto} req/min · Timeout: {prov.timeout_ms} ms
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-200 pt-3 space-y-2">
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => handleVerifyProvider(prov.codigo_proveedor)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Verificando conectividad...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            <span>Probar Conexión</span>
                          </>
                        )}
                      </button>

                      {vRes && (
                        <div
                          className={`rounded-xl p-2.5 text-[11px] border ${
                            vRes.ok
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-800'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1">
                            {vRes.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                            <span>{vRes.ok ? 'Verificación exitosa' : 'Fallo en la prueba'}</span>
                            {vRes.latencia_ms ? <span className="font-mono">({vRes.latencia_ms} ms)</span> : null}
                          </div>
                          <div className="mt-0.5 line-clamp-2">{vRes.mensaje}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matriz de Asignaciones de Proveedor por Agente Especializado */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">
              Asignación de Proveedor por Agente Especializado
            </h3>
            <p className="text-xs text-slate-500">
              Cada uno de los 4 agentes puede tener asignado un proveedor primario independiente según sus requerimientos.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-left font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Agente Especializado</th>
                    <th className="px-4 py-2.5">Proveedor Primario Asignado</th>
                    <th className="px-4 py-2.5">Modelo Activo</th>
                    <th className="px-4 py-2.5">Proveedor Alternativo</th>
                    <th className="px-4 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(providersOverview?.asignaciones || []).map((asig) => {
                    const isSaving = savingAssignmentAgent === asig.codigo_agente;
                    const agObj = specialistAgents.find((a) => a.codigo_agente === asig.codigo_agente);
                    return (
                      <tr key={asig.codigo_agente} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {agObj?.nombre || asig.codigo_agente}
                          <div className="font-mono text-[11px] text-teal-700">{asig.codigo_agente}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            defaultValue={asig.proveedor_codigo}
                            id={`sel-${asig.codigo_agente}`}
                            className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                          >
                            {(providersOverview?.proveedores || []).map((p) => (
                              <option key={p.codigo_proveedor} value={p.codigo_proveedor}>
                                {p.nombre} ({p.codigo_proveedor})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {asig.modelo_override || 'Predeterminado'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {asig.proveedor_alternativo_codigo || 'Ninguno (conmutación automática)'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => {
                              const el = document.getElementById(
                                `sel-${asig.codigo_agente}`
                              ) as HTMLSelectElement | null;
                              if (el) handleSaveAssignment(asig.codigo_agente, el.value);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <span>Actualizar</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inspector de Ejecución */}
      <ModalDialog
        open={Boolean(inspectedExec)}
        title={
          inspectedExec
            ? `Auditoría de Ejecución — ${inspectedExec.codigo_ejecucion}`
            : ''
        }
        onClose={() => setInspectedExec(null)}
      >
        {inspectedExec && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>
                <strong>{inspectedExec.agente_nombre}</strong> · {inspectedExec.tipo_tarea}
              </span>
              <StatusBadge label={inspectedExec.estado} />
            </div>
            {inspectedExec.mensaje_error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
                <strong>Error registrado:</strong> {inspectedExec.mensaje_error}
              </div>
            )}
            <div>
              <h4 className="font-bold text-slate-900">Entrada Sanitizada</h4>
              <pre className="mt-1 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                {JSON.stringify(inspectedExec.entrada_resumida, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Resumen del Resultado</h4>
              <pre className="mt-1 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-emerald-300">
                {JSON.stringify(inspectedExec.resultado_resumida, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
