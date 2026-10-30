export type ModuleKey =
  | 'dashboard'
  | 'clientes'
  | 'campanas'
  | 'contenidos'
  | 'ventas'
  | 'metricas'
  | 'agentes'
  | 'automatizaciones';

export interface CollaboratorProfile {
  id: number;
  codigo_colaborador: string;
  nombre_completo: string;
  correo: string;
  rol: string;
  permisos: string[];
}

export interface SessionData {
  token: string;
  tipo_token: string;
  expira_en_horas: number;
  expira_timestamp: number;
  usuario: CollaboratorProfile;
}

export interface OrganizationType {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

export interface Channel {
  id: number;
  codigo_canal: string;
  nombre: string;
  clasificacion: 'organico' | 'pagado';
  plataforma: string;
  descripcion?: string;
  activo: number;
}

export interface ClientItem {
  id: number;
  codigo_cliente: string;
  nombre_comercial: string;
  razon_social: string;
  cedula_juridica: string;
  tipo_organizacion_id: number;
  tipo_organizacion_nombre?: string;
  provincia: string;
  canton: string;
  correo_corporativo: string;
  telefono_principal: string;
  estado_cliente: 'activo' | 'suspendido' | 'inactivo';
  fecha_alta: string;
}

export interface ClientContactPerson {
  id: number;
  cliente_id: number;
  nombre_completo: string;
  cargo: string;
  correo: string;
  telefono: string;
  es_contacto_principal: number;
  activo: number;
}

export interface ServiceItem {
  id: number;
  codigo_servicio: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  modalidad_cobro: 'mensual' | 'anual' | 'unico';
  precio_lista_crc?: number | string;
  tarifa_base_crc?: number | string;
  activo: number;
}

export interface ServiceContract {
  id: number;
  codigo_contrato: string;
  cliente_id: number;
  cliente_nombre?: string;
  servicio_id: number;
  servicio_nombre?: string;
  fecha_contratacion: string;
  fecha_inicio_servicio: string;
  fecha_fin_servicio?: string | null;
  precio_acordado_crc: number | string;
  estado_contrato: string;
  observaciones?: string | null;
}

export interface ClientDetail extends ClientItem {
  personas_contacto: ClientContactPerson[];
  contratos_servicios: ServiceContract[];
  oportunidades?: OpportunityItem[];
}

export interface CampaignItem {
  id: number;
  codigo_campana: string;
  nombre: string;
  descripcion: string;
  objetivo: string;
  etapa_recorrido: 'conciencia' | 'consideracion' | 'decision';
  canal_principal_id: number;
  canal_principal_nombre?: string;
  canal_clasificacion?: string;
  responsable_id?: number | null;
  responsable_nombre?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto_total_crc: number | string;
  justificacion_presupuesto: string;
  costo_operativo_mercadeo_crc: number | string;
  estado: 'propuesta' | 'planificada' | 'activa' | 'pausada' | 'finalizada' | 'cancelada';
}

export interface BudgetAllocation {
  id: number;
  campana_id: number;
  campana_nombre?: string;
  canal_id: number;
  canal_nombre?: string;
  responsable_id: number;
  responsable_nombre?: string;
  periodo_inicio: string;
  periodo_fin: string;
  monto_asignado_crc: number | string;
  razon_decision: string;
  estado_asignacion: string;
}

export interface ContentItem {
  id: number;
  codigo_contenido: string;
  campana_id: number;
  campana_nombre?: string;
  canal_id: number;
  canal_nombre?: string;
  autor_colaborador_id?: number | null;
  autor_nombre?: string | null;
  generado_por_agente_codigo?: string | null;
  titulo: string;
  etapa_recorrido: 'conciencia' | 'consideracion' | 'decision';
  tipo_contenido:
    | 'publicacion_social'
    | 'correo_electronico'
    | 'anuncio_pagado'
    | 'articulo_blog'
    | 'guia_descargable'
    | 'guion_webinar';
  cuerpo_borrador: string;
  version_actual: number;
  estado: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'publicado';
  fecha_programada_publicacion?: string | null;
  fecha_publicacion_real?: string | null;
}

export interface ContentVersion {
  id: number;
  numero_version: number;
  titulo: string;
  cuerpo_texto: string;
  creado_por_tipo: string;
  motivo_cambio?: string;
  creado_en: string;
}

export interface ContentReviewRecord {
  id: number;
  contenido_id: number;
  numero_version_revisada: number;
  revisor_id: number;
  revisor_nombre?: string;
  revisor_rol?: string;
  decision: string;
  estado_anterior: string;
  estado_resultante: string;
  comentarios: string;
  fecha_revision: string;
}

export interface ContentDetail extends ContentItem {
  versiones?: ContentVersion[];
  historial_versiones?: ContentVersion[];
  historial_revisiones: ContentReviewRecord[];
}

export interface FunnelStage {
  id: number;
  codigo_etapa: string;
  nombre: string;
  orden_embudo: number;
  es_etapa_final?: number;
}

export interface ContactLead {
  id: number;
  codigo_contacto: string;
  nombre_completo: string;
  cargo: string;
  nombre_organizacion: string;
  tipo_organizacion_id: number;
  tipo_organizacion_nombre?: string;
  correo: string;
  telefono: string;
  provincia: string;
  fuente_origen: string;
  campana_origen_id?: number | null;
  campana_origen_nombre?: string | null;
  canal_origen_id?: number | null;
  etapa_actual_id: number;
  etapa_actual_codigo: string;
  etapa_actual_nombre?: string;
  puntuacion_lead: number;
  necesidad_comercial: string;
  presupuesto_declarado_crc?: number | string | null;
  responsable_comercial_id?: number | null;
  responsable_nombre?: string | null;
  fecha_captura_lead: string;
  fecha_proximo_seguimiento?: string | null;
}

export interface StageHistoryItem {
  id: number;
  etapa_anterior_nombre?: string | null;
  etapa_nueva_nombre: string;
  cambiado_por_nombre?: string | null;
  fecha_transicion: string;
  motivo: string;
}

export interface ContactDetail extends ContactLead {
  historial_etapas: StageHistoryItem[];
  contenidos_consumidos: Array<{
    id: number;
    codigo_contenido: string;
    titulo: string;
    tipo_interaccion: string;
    fecha_interaccion: string;
  }>;
}

export interface SalesHandoff {
  id: number;
  codigo_traspaso: string;
  contacto_id: number;
  contacto_nombre?: string;
  nombre_organizacion?: string;
  entregado_por_id: number;
  entregado_por_nombre?: string;
  recibido_por_id: number;
  recibido_por_nombre?: string;
  puntuacion_al_traspaso: number;
  necesidad_detectada: string;
  presupuesto_declarado_crc?: number | string | null;
  observaciones_seguimiento: string;
  decision_ventas: 'pendiente' | 'aceptado' | 'rechazado';
  motivo_decision?: string | null;
  fecha_traspaso: string;
  fecha_respuesta?: string | null;
}

export interface OpportunityItem {
  id: number;
  codigo_oportunidad: string;
  contacto_id: number;
  contacto_nombre?: string;
  nombre_organizacion?: string;
  cliente_id?: number | null;
  campana_atribuida_id?: number | null;
  responsable_ventas_id: number;
  responsable_nombre?: string;
  titulo_propuesta: string;
  servicio_principal_id?: number | null;
  servicio_nombre?: string | null;
  valor_estimado_crc: number | string;
  estado_oportunidad: string;
  resultado_cierre: 'pendiente' | 'ganada' | 'perdida';
  monto_cierre_crc?: number | string | null;
  motivo_cierre?: string | null;
  fecha_apertura: string;
  fecha_cierre?: string | null;
  fecha_proximo_seguimiento?: string | null;
}

export interface AgentInfo {
  id: number;
  codigo_agente: string;
  nombre: string;
  dominio: string;
  descripcion: string;
  es_orquestador: number;
  activo: number;
  tareas_soportadas: string[];
  tareas_ia_gemini?: string[];
  tareas_deterministas?: string[];
}

export interface AgentExecutionRecord {
  id: number;
  codigo_ejecucion: string;
  agente_id: number;
  codigo_agente: string;
  agente_nombre: string;
  orquestada: number;
  tipo_tarea: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_ms: number;
  entrada_resumida: Record<string, unknown> | null;
  resultado_resumida: Record<string, unknown> | null;
  mensaje_error?: string | null;
  campana_id?: number | null;
  contenido_id?: number | null;
  contacto_id?: number | null;
  oportunidad_id?: number | null;
}

export interface OrchestratorDispatchResult {
  idempotente_reutilizado?: boolean;
  ejecucion: {
    id: number;
    codigo_ejecucion: string;
    codigo_agente: string;
    tipo_tarea: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
    duracion_ms: number;
  };
  resumen: Record<string, unknown>;
  resultado: any;
}

export interface N8nWorkflowInfo {
  archivo: string;
  workflow_id: string;
  nombre: string;
  codigo_agente: string | null;
  activo_en_definicion: boolean;
  operativo: boolean;
  cantidad_nodos: number;
  webhook_path: string | null;
  metodo_http: string;
  usa_gemini: boolean;
  modelo_gemini: string | null;
  estadisticas_recientes: {
    total: number;
    exitosas: number;
    fallidas: number;
    ultima_ejecucion_fecha: string | null;
    ultimo_estado: string | null;
    ultima_duracion_ms: number | null;
  };
}

export interface N8nExecutionRecord {
  id: number;
  codigo_traza: string;
  idempotency_key?: string | null;
  ejecucion_agente_id?: number | null;
  codigo_agente: string;
  tipo_tarea: string;
  workflow_id: string;
  workflow_nombre: string;
  webhook_path: string;
  proveedor_ia: string;
  modelo_ia: string;
  estado: 'en_curso' | 'exitoso' | 'fallido' | 'omitido_idempotencia';
  intentos_realizados: number;
  http_status?: number | null;
  duracion_ms?: number | null;
  entrada_sanitizada: Record<string, unknown> | null;
  respuesta_validada: Record<string, unknown> | null;
  mensaje_error?: string | null;
  reintento_de_id?: number | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
}

export interface AutomationsOverview {
  n8n: {
    online: boolean;
    webhook_autenticado: boolean;
    base_url: string;
    modelo_gemini: string;
    latencia_ms: number | null;
    workflow_salud_id?: string;
    mensaje: string;
  };
  estadisticas: {
    total_ejecuciones: number;
    exitosas: number;
    fallidas: number;
    reintentos: number;
    duracion_promedio_ms: number | null;
  };
  workflows_activos: number;
  total_workflows: number;
  workflows: N8nWorkflowInfo[];
  ultimas_ejecuciones: N8nExecutionRecord[];
}

export interface DashboardSummary {
  generado_en: string;
  moneda: string;
  clientes: {
    total_clientes: number;
    clientes_activos: number;
    clientes_suspendidos: number;
  };
  contratos: {
    total_contratos: number;
    contratos_activos: number;
    ingresos_recurrentes_activos_crc: number | string;
  };
  campanas: {
    total_campanas: number;
    campanas_activas: number;
    campanas_propuestas: number;
    presupuesto_total_crc: number | string;
  };
  contenidos_por_estado: Record<string, number>;
  embudo_contactos: Array<{
    etapa_id: number;
    codigo_etapa: string;
    etapa_nombre: string;
    orden_embudo: number;
    total_contactos: number;
  }>;
  oportunidades: {
    total_oportunidades: number;
    oportunidades_abiertas: number;
    oportunidades_ganadas: number;
    oportunidades_perdidas: number;
    pipeline_abierto_crc: number | string;
    ventas_ganadas_crc: number | string;
  };
  traspasos_ventas: {
    total_traspasos: number;
    traspasos_pendientes: number;
    traspasos_aceptados: number;
  };
  indicadores_principales: {
    conversiones_embudo: any[];
    ciclo_venta_resumen: any;
    ticket_promedio: any;
    campanas_rendimiento: any[];
  };
  ejecuciones_agentes_recientes: AgentExecutionRecord[];
  automatizaciones_n8n: {
    online: boolean;
    webhook_autenticado: boolean;
    workflows_activos?: number;
    total_workflows?: number;
    modelo_gemini?: string;
    estadisticas?: any;
  } | null;
}

export type AiRequestState = 'pendiente' | 'procesando' | 'completada' | 'error' | 'cancelada';

export interface AiConversation {
  id: number;
  codigo_conversacion: string;
  colaborador_id: number;
  colaborador_nombre?: string | null;
  agente_id: number;
  codigo_agente: string;
  agente_nombre?: string | null;
  titulo: string;
  estado: 'activa' | 'archivada';
  total_mensajes: number;
  ultima_actividad_en: string;
  creado_en: string;
  solicitudes?: AiRequest[];
}

export interface AiRequest {
  id: number;
  codigo_solicitud: string;
  idempotency_key?: string | null;
  conversacion_id: number;
  colaborador_id: number;
  colaborador_nombre?: string | null;
  agente_id: number;
  codigo_agente: string;
  agente_nombre?: string | null;
  tipo_tarea_resuelta: string;
  mensaje_usuario: string;
  parametros_entrada?: Record<string, unknown> | null;
  estado: AiRequestState;
  etapa_progreso?: string | null;
  proveedor_ia?: string | null;
  modelo_ia?: string | null;
  via_n8n: boolean;
  workflow_n8n_id?: string | null;
  ejecucion_agente_id?: number | null;
  traza_n8n_id?: number | null;
  reintento_de_solicitud_id?: number | null;
  respuesta_texto?: string | null;
  respuesta_estructurada?: Record<string, any> | null;
  advertencias_politica?: string[] | null;
  codigo_error?: string | null;
  mensaje_error?: string | null;
  duracion_ms?: number | null;
  fecha_creacion: string;
  fecha_inicio_proceso?: string | null;
  fecha_fin?: string | null;
}

export interface AiProviderInfo {
  id: number;
  codigo_proveedor: string;
  nombre: string;
  tipo_adaptador: 'n8n_workflow' | 'gemini_rest' | 'openai_compatible_rest' | 'anthropic_rest';
  modelo_principal: string;
  modelo_alternativo?: string | null;
  url_servicio?: string | null;
  credencial_n8n_alias?: string | null;
  variable_entorno_key?: string | null;
  credencial_configurada: boolean;
  temperatura: number;
  max_tokens: number;
  timeout_ms: number;
  limite_solicitudes_minuto: number;
  es_predeterminado: boolean;
  activo: boolean;
  verificado_llamada_real: boolean;
  notas_configuracion?: string | null;
  actualizado_en?: string;
}

export interface AiProviderAssignment {
  codigo_agente: string;
  proveedor_codigo: string;
  proveedor_nombre: string;
  proveedor_alternativo_codigo?: string | null;
  modelo_override?: string | null;
  temperatura_override?: number | null;
  activo: boolean;
}

export interface AiProvidersOverview {
  proveedores: AiProviderInfo[];
  asignaciones: AiProviderAssignment[];
}


