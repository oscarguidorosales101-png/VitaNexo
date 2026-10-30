import type {
  AgentExecutionRecord,
  AgentInfo,
  AiConversation,
  AiProviderInfo,
  AiProvidersOverview,
  AiRequest,
  AutomationsOverview,
  BudgetAllocation,
  CampaignItem,
  Channel,
  ClientDetail,
  ClientItem,
  CollaboratorProfile,
  ContactDetail,
  ContactLead,
  ContentDetail,
  ContentItem,
  DashboardSummary,
  FunnelStage,
  N8nExecutionRecord,
  N8nWorkflowInfo,
  OpportunityItem,
  OrchestratorDispatchResult,
  OrganizationType,
  SalesHandoff,
  ServiceContract,
  ServiceItem,
  SessionData,
} from '../types/vitanexo';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const SESSION_STORAGE_KEY = 'vitanexo_session_v2';

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function loadStoredSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed.token || !parsed.expira_timestamp || Date.now() >= parsed.expira_timestamp) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: SessionData): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  body?: unknown;
  idempotencyKey?: string;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = loadStoredSession();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  if (options.idempotencyKey) {
    headers['X-Idempotency-Key'] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError(
      'No fue posible conectar con el servidor Backend de VitaNexo (http://127.0.0.1:3000). Verifique que el servicio esté activo.',
      503,
      'NETWORK_UNAVAILABLE'
    );
  }

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiClientError(
      `Respuesta inesperada del servidor (HTTP ${response.status}).`,
      response.status,
      'INVALID_SERVER_JSON'
    );
  }

  if (!response.ok || json?.ok === false) {
    const errMsg =
      json?.error?.message ||
      json?.message ||
      `Error operativo HTTP ${response.status} al procesar la solicitud.`;
    const errCode = json?.error?.code || `HTTP_${response.status}`;
    if (response.status === 401 && path !== '/auth/login') {
      clearStoredSession();
    }
    throw new ApiClientError(errMsg, response.status, errCode, json?.error?.details);
  }

  return (json?.data ?? json) as T;
}

export const vitanexoApi = {
  // Salud y Autenticación
  getHealth: () => apiRequest<any>('/health'),
  listLoginCollaborators: () => apiRequest<CollaboratorProfile[]>('/auth/colaboradores-disponibles'),
  login: (payload: { colaborador_id?: number; correo?: string; clave_acceso: string }) =>
    apiRequest<SessionData>('/auth/login', { method: 'POST', body: payload }),
  getProfile: () => apiRequest<CollaboratorProfile>('/auth/perfil'),

  // Dashboard
  getDashboardSummary: () => apiRequest<DashboardSummary>('/dashboard/resumen'),

  // Catálogos, Clientes y Servicios
  listOrganizationTypes: () => apiRequest<OrganizationType[]>('/catalogos/tipos-organizacion'),
  listCollaborators: () => apiRequest<CollaboratorProfile[]>('/catalogos/colaboradores'),
  listChannels: () => apiRequest<Channel[]>('/canales'),
  createChannel: (payload: Record<string, unknown>) =>
    apiRequest<Channel>('/canales', { method: 'POST', body: payload }),

  listClients: () => apiRequest<ClientItem[]>('/clientes'),
  getClientDetail: (id: number) => apiRequest<ClientDetail>(`/clientes/${id}`),
  createClient: (payload: Record<string, unknown>) =>
    apiRequest<ClientItem>('/clientes', { method: 'POST', body: payload }),
  updateClient: (id: number, payload: Record<string, unknown>) =>
    apiRequest<ClientItem>(`/clientes/${id}`, { method: 'PATCH', body: payload }),
  addClientContact: (clientId: number, payload: Record<string, unknown>) =>
    apiRequest<any>(`/clientes/${clientId}/contactos`, { method: 'POST', body: payload }),

  listServices: () => apiRequest<ServiceItem[]>('/servicios'),
  createService: (payload: Record<string, unknown>) =>
    apiRequest<ServiceItem>('/servicios', { method: 'POST', body: payload }),
  listContracts: () => apiRequest<ServiceContract[]>('/contratos-servicios'),
  createContract: (payload: Record<string, unknown>) =>
    apiRequest<ServiceContract>('/contratos-servicios', { method: 'POST', body: payload }),

  // Campañas y Presupuestos
  listCampaigns: () => apiRequest<CampaignItem[]>('/campanas'),
  getCampaignDetail: (id: number) => apiRequest<any>(`/campanas/${id}`),
  createCampaign: (payload: Record<string, unknown>) =>
    apiRequest<CampaignItem>('/campanas', { method: 'POST', body: payload }),
  updateCampaign: (id: number, payload: Record<string, unknown>) =>
    apiRequest<CampaignItem>(`/campanas/${id}`, { method: 'PATCH', body: payload }),
  listBudgetAllocations: (campanaId?: number) =>
    apiRequest<BudgetAllocation[]>(
      campanaId ? `/asignaciones-presupuesto?campana_id=${campanaId}` : '/asignaciones-presupuesto'
    ),
  createBudgetAllocation: (payload: Record<string, unknown>) =>
    apiRequest<BudgetAllocation>('/asignaciones-presupuesto', { method: 'POST', body: payload }),

  // Contenidos y Revisiones Humanas
  listContents: () => apiRequest<ContentItem[]>('/contenidos'),
  getContentDetail: (id: number) => apiRequest<ContentDetail>(`/contenidos/${id}`),
  createContent: (payload: Record<string, unknown>) =>
    apiRequest<ContentItem>('/contenidos', { method: 'POST', body: payload }),
  updateContent: (id: number, payload: Record<string, unknown>) =>
    apiRequest<ContentItem>(`/contenidos/${id}`, { method: 'PATCH', body: payload }),
  reviewContent: (
    id: number,
    payload: {
      revisor_id: number;
      decision: 'enviar_a_revision' | 'aprobar' | 'rechazar' | 'solicitar_cambios';
      comentarios: string;
      actor_tipo?: 'humano' | 'agente';
    }
  ) => apiRequest<{ contenido: ContentItem }>(`/contenidos/${id}/revisiones`, { method: 'POST', body: payload }),
  publishContent: (id: number) =>
    apiRequest<ContentItem>(`/contenidos/${id}/publicar`, {
      method: 'POST',
      body: { actor_tipo: 'humano' },
    }),

  // Contactos, Embudo y Ventas
  listFunnelStages: () => apiRequest<FunnelStage[]>('/embudo/etapas'),
  listContacts: () => apiRequest<ContactLead[]>('/contactos'),
  getContactDetail: (id: number) => apiRequest<ContactDetail>(`/contactos/${id}`),
  createContact: (payload: Record<string, unknown>) =>
    apiRequest<ContactLead>('/contactos', { method: 'POST', body: payload }),
  changeContactStage: (
    id: number,
    payload: {
      etapa_nueva_id?: number;
      codigo_etapa_nueva?: string;
      cambiado_por_id?: number;
      motivo: string;
      fecha_proximo_seguimiento?: string;
    }
  ) => apiRequest<ContactLead>(`/contactos/${id}/etapa`, { method: 'POST', body: payload }),
  listPendingFollowUps: () =>
    apiRequest<{ contactos_pendientes: ContactLead[]; oportunidades_pendientes: OpportunityItem[] }>(
      '/contactos/seguimientos-pendientes'
    ),

  listHandoffs: () => apiRequest<SalesHandoff[]>('/traspasos-ventas'),
  createHandoff: (payload: Record<string, unknown>) =>
    apiRequest<SalesHandoff>('/traspasos-ventas', { method: 'POST', body: payload }),
  respondHandoff: (
    id: number,
    payload: { decision_ventas: 'aceptado' | 'rechazado'; motivo_decision?: string }
  ) => apiRequest<SalesHandoff>(`/traspasos-ventas/${id}/decision`, { method: 'POST', body: payload }),

  listOpportunities: () => apiRequest<OpportunityItem[]>('/oportunidades'),
  createOpportunity: (payload: Record<string, unknown>) =>
    apiRequest<OpportunityItem>('/oportunidades', { method: 'POST', body: payload }),
  closeOpportunity: (
    id: number,
    payload: {
      resultado_cierre: 'ganada' | 'perdida';
      monto_cierre_crc?: number;
      motivo_cierre: string;
      cliente_id?: number;
    }
  ) => apiRequest<OpportunityItem>(`/oportunidades/${id}/cerrar`, { method: 'POST', body: payload }),

  // Métricas SQL Reales (8 KPIs)
  getMetricCPC: (query = '') => apiRequest<any>(`/metricas/indicadores/cpc${query}`),
  getMetricCTR: (query = '') => apiRequest<any>(`/metricas/indicadores/ctr${query}`),
  getMetricCAC: (query = '') => apiRequest<any>(`/metricas/indicadores/cac${query}`),
  getMetricROAS: (query = '') => apiRequest<any>(`/metricas/indicadores/roas${query}`),
  getMetricFunnel: (query = '') => apiRequest<any>(`/metricas/indicadores/conversiones-embudo${query}`),
  getMetricSalesCycle: (query = '') => apiRequest<any>(`/metricas/indicadores/ciclo-venta${query}`),
  getMetricAvgTicket: (query = '') => apiRequest<any>(`/metricas/indicadores/ticket-promedio${query}`),
  getMetricVanityVsBusiness: (query = '') =>
    apiRequest<any>(`/metricas/indicadores/vanidad-vs-negocio${query}`),

  // Centro de Agentes y Orquestador Central
  listAgents: () => apiRequest<AgentInfo[]>('/agentes'),
  listAgentExecutions: (query = '') => apiRequest<AgentExecutionRecord[]>(`/agentes/ejecuciones${query}`),
  getAgentExecution: (id: number) => apiRequest<AgentExecutionRecord>(`/agentes/ejecuciones/${id}`),
  executeOrchestratorTask: (
    payload: { tipo_tarea: string; codigo_agente?: string; parametros?: Record<string, unknown> },
    idempotencyKey?: string
  ) =>
    apiRequest<OrchestratorDispatchResult>('/orquestador/ejecutar', {
      method: 'POST',
      body: payload,
      idempotencyKey,
    }),

  // Automatizaciones n8n + Gemini
  getAutomationsStatus: () => apiRequest<AutomationsOverview>('/automatizaciones/estado'),
  listWorkflows: () => apiRequest<N8nWorkflowInfo[]>('/automatizaciones/workflows'),
  listAutomationExecutions: (query = '') =>
    apiRequest<N8nExecutionRecord[]>(`/automatizaciones/ejecuciones${query}`),
  retryAutomationExecution: (id: number) =>
    apiRequest<any>(`/automatizaciones/ejecuciones/${id}/reintentar`, { method: 'POST' }),

  // Centro de IA Conversacional, Asíncrono y Multiproveedor
  listAiConversations: (query = '') => apiRequest<AiConversation[]>(`/ia/conversaciones${query}`),
  createAiConversation: (payload: { codigo_agente: string; titulo?: string }) =>
    apiRequest<AiConversation>('/ia/conversaciones', { method: 'POST', body: payload }),
  getAiConversation: (id: number) => apiRequest<AiConversation & { solicitudes?: AiRequest[] }>(`/ia/conversaciones/${id}`),

  listAiRequests: (query = '') => apiRequest<AiRequest[]>(`/ia/solicitudes${query}`),
  getAiRequest: (id: number) => apiRequest<AiRequest>(`/ia/solicitudes/${id}`),
  submitAiRequest: (
    payload: {
      mensaje_usuario: string;
      codigo_agente: string;
      conversacion_id?: number | null;
      tipo_tarea?: string | null;
      parametros?: Record<string, unknown>;
      idempotency_key?: string;
    },
    idempotencyKey?: string
  ) =>
    apiRequest<{ data: AiRequest; ok: boolean; idempotente_reutilizado?: boolean; mensaje?: string }>('/ia/solicitudes', {
      method: 'POST',
      body: payload,
      idempotencyKey: idempotencyKey || payload.idempotency_key,
    }),
  cancelAiRequest: (id: number) => apiRequest<AiRequest>(`/ia/solicitudes/${id}/cancelar`, { method: 'POST' }),
  retryAiRequest: (id: number) => apiRequest<AiRequest>(`/ia/solicitudes/${id}/reintentar`, { method: 'POST' }),

  listAiProviders: () => apiRequest<AiProvidersOverview>('/ia/proveedores'),
  updateAiProvider: (codigo: string, payload: Partial<AiProviderInfo>) =>
    apiRequest<AiProviderInfo>(`/ia/proveedores/${codigo}`, { method: 'PATCH', body: payload }),
  verifyAiProvider: (codigo: string) =>
    apiRequest<{ ok: boolean; latencia_ms?: number; mensaje?: string }>(
      `/ia/proveedores/${codigo}/verificar`,
      { method: 'POST' }
    ),
  assignAiProviderToAgent: (
    codigoAgente: string,
    payload: { proveedor_codigo: string; proveedor_alternativo_codigo?: string | null; modelo_override?: string | null }
  ) =>
    apiRequest<any>(`/ia/agentes/${codigoAgente}/asignar-proveedor`, {
      method: 'POST',
      body: payload,
    }),

  iaApi: {
    listConversations: (query = '') => apiRequest<AiConversation[]>(`/ia/conversaciones${query}`),
    createConversation: (payload: { codigo_agente: string; titulo?: string }) =>
      apiRequest<AiConversation>('/ia/conversaciones', { method: 'POST', body: payload }),
    getConversation: (id: number) =>
      apiRequest<AiConversation & { solicitudes?: AiRequest[] }>(`/ia/conversaciones/${id}`),
    listRequests: (query = '') => apiRequest<AiRequest[]>(`/ia/solicitudes${query}`),
    getRequest: (id: number) => apiRequest<AiRequest>(`/ia/solicitudes/${id}`),
    submitRequest: (
      payload: {
        mensaje_usuario: string;
        codigo_agente: string;
        conversacion_id?: number | null;
        tipo_tarea?: string | null;
        parametros?: Record<string, unknown>;
        idempotency_key?: string;
      },
      idempotencyKey?: string
    ) =>
      apiRequest<{ data: AiRequest; ok: boolean; idempotente_reutilizado?: boolean; mensaje?: string }>('/ia/solicitudes', {
        method: 'POST',
        body: payload,
        idempotencyKey: idempotencyKey || payload.idempotency_key,
      }),
    cancelRequest: (id: number) => apiRequest<AiRequest>(`/ia/solicitudes/${id}/cancelar`, { method: 'POST' }),
    retryRequest: (id: number) => apiRequest<AiRequest>(`/ia/solicitudes/${id}/reintentar`, { method: 'POST' }),
    listProviders: () => apiRequest<AiProvidersOverview>('/ia/proveedores'),
    updateProvider: (codigo: string, payload: Partial<AiProviderInfo>) =>
      apiRequest<AiProviderInfo>(`/ia/proveedores/${codigo}`, { method: 'PATCH', body: payload }),
    verifyProvider: (codigo: string) =>
      apiRequest<{ ok: boolean; latencia_ms?: number; mensaje?: string }>(
        `/ia/proveedores/${codigo}/verificar`,
        { method: 'POST' }
      ),
    assignProviderToAgent: (
      codigoAgente: string,
      payload: { proveedor_codigo: string; proveedor_alternativo_codigo?: string | null; modelo_override?: string | null }
    ) =>
      apiRequest<any>(`/ia/agentes/${codigoAgente}/asignar-proveedor`, {
        method: 'POST',
        body: payload,
      }),
  },
};

