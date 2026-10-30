const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const workflowsDir = path.resolve(__dirname, '../workflows');
fs.mkdirSync(workflowsDir, { recursive: true });

const WEBHOOK_HEADER_CREDENTIAL_REF = {
  httpHeaderAuth: {
    id: 'VitaNexoWhAuth01',
    name: 'VitaNexo Webhook Local Auth',
  },
};

const GEMINI_CREDENTIAL_REF = {
  googlePalmApi: {
    id: '2YWMf9RDxr6gim6h',
    name: 'Google Gemini(PaLM) Api account 2',
  },
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'models/gemini-3-flash-preview';

function buildAiAgentWorkflow({
  id,
  versionId,
  name,
  webhookPath,
  webhookId,
  expectedAgentCode,
  systemPrompt,
  requiredOutputKeys,
}) {
  // CERO uso de $env dentro de nodos Code para compatibilidad total con JsTaskRunnerSandbox de n8n 2.38+
  // La autenticación del webhook se aplica de forma nativa y cifrada mediante httpHeaderAuth en el nodo Webhook.
  const validationCode = `
const item = $input.first().json || {};
const body = item.body && typeof item.body === 'object' ? item.body : item;

const codigoEjecucion = String(body.codigo_ejecucion || '').trim();
const codigoAgente = String(body.codigo_agente || '').trim();
const tipoTarea = String(body.tipo_tarea || '').trim();
const mensajeUsuario = String(body.mensaje_usuario || '').trim();
const historialConversacion = Array.isArray(body.historial_conversacion) ? body.historial_conversacion : [];
const contexto = body.contexto && typeof body.contexto === 'object' ? body.contexto : {};
const parametros = body.parametros && typeof body.parametros === 'object' ? body.parametros : {};
const modeloSolicitado = String(body.modelo_ia || '${DEFAULT_MODEL}').trim();

if (!codigoEjecucion || !tipoTarea || codigoAgente !== '${expectedAgentCode}') {
  return [{
    json: {
      permitir_ejecucion: false,
      ok: false,
      httpStatus: 400,
      error_code: 'INVALID_WEBHOOK_PAYLOAD',
      error: 'Payload inválido o agente no coincidente para ${expectedAgentCode}.'
    }
  }];
}

// Evaluación contextual de frontera administrativa vs actividad clínica prohibida
const rawToCheck = JSON.stringify({ mensajeUsuario, parametros })
  .normalize('NFD')
  .replace(/[\\u0300-\\u036f]/g, '')
  .toLowerCase();

const negatedAdminContext = /\\b(sin|no\\s+incluir|no\\s+maneja|no\\s+almacena|excluir|evitar)\\s+(datos\\s+clinicos|expediente\\s+clinico|historia\\s+clinica|historial\\s+clinico|diagnostico\\s+medico)\\b/i.test(rawToCheck);

const affirmativeClinicalAction = /\\b(incluir\\s+expediente\\s+clinico|diagnosticar\\s+paciente|emitir\\s+diagnostico\\s+medico|recetar\\s+medicamento|prescribir\\s+tratamiento\\s+clinico|guardar\\s+historia\\s+clinica\\s+del\\s+paciente|expediente\\s+clinico\\s+y\\s+diagnostico\\s+medico)\\b/i.test(rawToCheck);

if (!negatedAdminContext && affirmativeClinicalAction) {
  return [{
    json: {
      permitir_ejecucion: false,
      ok: false,
      httpStatus: 422,
      error_code: 'CLINICAL_DATA_PROHIBITED',
      error: 'Fuera de alcance clínico: VitaNexo gestiona operaciones administrativas, comerciales y tecnológicas para clínicas, sin emitir diagnósticos médicos ni almacenar expedientes clínicos de pacientes.'
    }
  }];
}

const promptSections = [
  '=== SOLICITUD EMPRESARIAL ORQUESTADA DE VITANEXO (COSTA RICA) ===',
  'Código de ejecución: ' + codigoEjecucion,
  'Agente especializado: ' + codigoAgente,
  'Tarea solicitada: ' + tipoTarea,
  'Moneda oficial: CRC (colones costarricenses)',
  'Alcance permitido: Gestión administrativa, comercial, agendas, recepción, mercadeo, CRM, métricas SQL y servicios tecnológicos B2B para clínicas pequeñas, consultorios médicos y centros de fisioterapia en Costa Rica. Prohibido emitir diagnósticos médicos, indicar tratamientos clínicos o inventar datos no presentes en VitaBase.'
];

if (mensajeUsuario) {
  promptSections.push('', '=== SOLICITUD EN LENGUAJE NATURAL DEL COLABORADOR ===', mensajeUsuario);
}

if (historialConversacion.length > 0) {
  promptSections.push('', '=== CONTEXTO RECIENTE DE LA CONVERSACIÓN ===', JSON.stringify(historialConversacion.slice(-5), null, 2));
}

promptSections.push(
  '',
  '=== PARÁMETROS OPERATIVOS ===',
  JSON.stringify(parametros, null, 2),
  '',
  '=== DATOS REALES CONSULTADOS EN MYSQL VITABASE ===',
  JSON.stringify(contexto, null, 2),
  '',
  'INSTRUCCIÓN DE FORMATO OBLIGATORIA:',
  'Responde ÚNICAMENTE con un objeto JSON válido (sin texto suelto fuera del JSON).',
  'Incluye SIEMPRE la propiedad "respuesta_conversacional" (un texto claro, profesional, bien estructurado en español costarricense ejecutivo que responda directamente al colaborador explicando hallazgos, cifras reales y recomendaciones) ADEMÁS de todas las claves requeridas del dominio: ${requiredOutputKeys.join(', ')}.'
);

return [{
  json: {
    permitir_ejecucion: true,
    codigo_ejecucion: codigoEjecucion,
    codigo_agente: codigoAgente,
    tipo_tarea: tipoTarea,
    modelo_ia: modeloSolicitado.startsWith('models/') ? modeloSolicitado : 'models/' + modeloSolicitado,
    prompt_usuario: promptSections.join('\\n')
  }
}];
`.trim();

  const parseOutputCode = `
const rawItem = $input.first().json || {};
const metaNode = $('Validar y Autenticar Webhook').first().json || {};

if (rawItem.error) {
  const errDetail = typeof rawItem.error === 'string'
    ? rawItem.error
    : (rawItem.error.message || JSON.stringify(rawItem.error));
  const isRateLimit = /429|quota|rate\\s*limit|resource_exhausted|too\\s*many\\s*requests/i.test(errDetail);
  return [{
    json: {
      ok: false,
      httpStatus: isRateLimit ? 429 : 502,
      error_code: isRateLimit ? 'AI_PROVIDER_RATE_LIMIT' : 'AI_PROVIDER_EXECUTION_ERROR',
      error: 'Error del proveedor externo de IA en n8n: ' + String(errDetail).slice(0, 380)
    }
  }];
}

const rawText = String(rawItem.output || rawItem.text || (typeof rawItem === 'string' ? rawItem : JSON.stringify(rawItem))).trim();

let cleaned = rawText;
const fencedMatch = cleaned.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`/i);
if (fencedMatch) {
  cleaned = fencedMatch[1].trim();
} else {
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
}

let parsed = null;
try {
  parsed = JSON.parse(cleaned);
} catch (err) {
  return [{
    json: {
      ok: false,
      httpStatus: 502,
      error_code: 'INVALID_GEMINI_JSON_OUTPUT',
      error: 'El proveedor de IA devolvió una respuesta que no cumple el contrato JSON estructurado requerido.',
      raw_excerpt: rawText.slice(0, 350)
    }
  }];
}

const requiredKeys = ${JSON.stringify(requiredOutputKeys)};
const missing = requiredKeys.filter((k) => parsed[k] === undefined || parsed[k] === null);
if (missing.length > 0) {
  return [{
    json: {
      ok: false,
      httpStatus: 502,
      error_code: 'INCOMPLETE_GEMINI_SCHEMA',
      error: 'Faltan claves requeridas en la respuesta estructurada de IA: ' + missing.join(', ')
    }
  }];
}

if (!parsed.respuesta_conversacional || typeof parsed.respuesta_conversacional !== 'string') {
  parsed.respuesta_conversacional = String(
    parsed.resumen_ejecutivo ||
    parsed.analisis_objetivo ||
    parsed.diagnostico_embudo ||
    (parsed.pieza_principal && parsed.pieza_principal.cuerpo_texto) ||
    'Análisis completado con éxito a partir de los datos de VitaBase.'
  );
}

return [{
  json: {
    ok: true,
    httpStatus: 200,
    workflow_id: '${id}',
    workflow_nombre: '${name}',
    proveedor_ia: 'gemini-api',
    modelo_ia: metaNode.modelo_ia || '${DEFAULT_MODEL}',
    codigo_ejecucion: metaNode.codigo_ejecucion,
    codigo_agente: metaNode.codigo_agente,
    tipo_tarea: metaNode.tipo_tarea,
    timestamp: new Date().toISOString(),
    analisis_ia: parsed
  }
}];
`.trim();

  return {
    id,
    name,
    active: true,
    versionId,
    settings: {
      executionOrder: 'v1',
      callerPolicy: 'workflowsFromSameOwner',
    },
    nodes: [
      {
        parameters: {
          authentication: 'headerAuth',
          httpMethod: 'POST',
          path: webhookPath,
          responseMode: 'responseNode',
          options: {},
        },
        id: `${id}-node-webhook`,
        name: 'Webhook Orquestador VitaNexo',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 120],
        webhookId,
        credentials: WEBHOOK_HEADER_CREDENTIAL_REF,
      },
      {
        parameters: {
          jsCode: validationCode,
        },
        id: `${id}-node-validate`,
        name: 'Validar y Autenticar Webhook',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [240, 120],
      },
      {
        parameters: {
          conditions: {
            boolean: [
              {
                value1: '={{ $json.permitir_ejecucion }}',
                value2: true,
              },
            ],
          },
        },
        id: `${id}-node-if`,
        name: 'Autorizado y Válido',
        type: 'n8n-nodes-base.if',
        typeVersion: 1,
        position: [480, 120],
      },
      {
        parameters: {
          promptType: 'define',
          text: '={{ $json.prompt_usuario }}',
          options: {
            systemMessage: systemPrompt,
          },
        },
        id: `${id}-node-agent`,
        name: `Agente Gemini (${expectedAgentCode})`,
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 1.7,
        position: [740, 20],
        onError: 'continueRegularOutput',
      },
      {
        parameters: {
          options: {
            temperature: 0.2,
          },
          modelName: DEFAULT_MODEL,
        },
        id: `${id}-node-gemini`,
        name: 'Google Gemini API Model',
        type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
        typeVersion: 1,
        position: [740, 240],
        credentials: GEMINI_CREDENTIAL_REF,
      },
      {
        parameters: {
          jsCode: parseOutputCode,
        },
        id: `${id}-node-format`,
        name: 'Validar Contrato JSON Gemini',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1040, 20],
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify($json) }}',
          options: {
            responseCode: '={{ $json.httpStatus || 200 }}',
          },
        },
        id: `${id}-node-respond-ok`,
        name: 'Responder Resultado al Backend',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [1300, 20],
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify($json) }}',
          options: {
            responseCode: '={{ $json.httpStatus || 400 }}',
          },
        },
        id: `${id}-node-respond-err`,
        name: 'Responder Rechazo Seguridad',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [740, 380],
      },
    ],
    connections: {
      'Webhook Orquestador VitaNexo': {
        main: [[{ node: 'Validar y Autenticar Webhook', type: 'main', index: 0 }]],
      },
      'Validar y Autenticar Webhook': {
        main: [[{ node: 'Autorizado y Válido', type: 'main', index: 0 }]],
      },
      'Autorizado y Válido': {
        main: [
          [{ node: `Agente Gemini (${expectedAgentCode})`, type: 'main', index: 0 }],
          [{ node: 'Responder Rechazo Seguridad', type: 'main', index: 0 }],
        ],
      },
      'Google Gemini API Model': {
        ai_languageModel: [[{ node: `Agente Gemini (${expectedAgentCode})`, type: 'ai_languageModel', index: 0 }]],
      },
      [`Agente Gemini (${expectedAgentCode})`]: {
        main: [[{ node: 'Validar Contrato JSON Gemini', type: 'main', index: 0 }]],
      },
      'Validar Contrato JSON Gemini': {
        main: [[{ node: 'Responder Resultado al Backend', type: 'main', index: 0 }]],
      },
    },
  };
}

function buildHealthWorkflow() {
  const id = 'VitaNexoHealth05';
  // Cero acceso a $env: compatible con cualquier modo de inicio de n8n 2.38+
  const jsCode = `
return [{
  json: {
    ok: true,
    httpStatus: 200,
    service: 'VitaNexo n8n Local Automation Engine',
    workflow_id: '${id}',
    webhook_authenticated: true,
    auth_mode: 'n8n_encrypted_header_auth',
    gemini_model_configured: '${DEFAULT_MODEL}',
    timestamp: new Date().toISOString()
  }
}];
`.trim();

  return {
    id,
    name: 'VitaNexo 05 - Verificación Autenticada de Salud n8n',
    active: true,
    versionId: 'b5050505-5555-4555-8555-555555555505',
    settings: {
      executionOrder: 'v1',
      callerPolicy: 'workflowsFromSameOwner',
    },
    nodes: [
      {
        parameters: {
          authentication: 'headerAuth',
          httpMethod: 'POST',
          path: 'vitanexo/health',
          responseMode: 'responseNode',
          options: {},
        },
        id: `${id}-webhook`,
        name: 'Webhook Salud VitaNexo',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [0, 80],
        webhookId: 'vitanexo-webhook-health-05',
        credentials: WEBHOOK_HEADER_CREDENTIAL_REF,
      },
      {
        parameters: { jsCode },
        id: `${id}-code`,
        name: 'Verificar Firma Webhook',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [260, 80],
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify($json) }}',
          options: {
            responseCode: '={{ $json.httpStatus || 200 }}',
          },
        },
        id: `${id}-respond`,
        name: 'Responder Estado n8n',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [520, 80],
      },
    ],
    connections: {
      'Webhook Salud VitaNexo': {
        main: [[{ node: 'Verificar Firma Webhook', type: 'main', index: 0 }]],
      },
      'Verificar Firma Webhook': {
        main: [[{ node: 'Responder Estado n8n', type: 'main', index: 0 }]],
      },
    },
  };
}

const workflows = [
  {
    filename: '01_vitanexo_agente_campanas.json',
    definition: buildAiAgentWorkflow({
      id: 'VitaNexoAgCamp01',
      versionId: 'b1010101-1111-4111-8111-111111111101',
      name: 'VitaNexo 01 - Agente IA de Campañas y Presupuestos (Gemini)',
      webhookPath: 'vitanexo/agente-campanas',
      webhookId: 'vitanexo-webhook-campanas-01',
      expectedAgentCode: 'agente_campanas',
      requiredOutputKeys: [
        'respuesta_conversacional',
        'analisis_objetivo',
        'estrategia_recomendada',
        'propuesta_campana',
        'canales_recomendados',
        'distribucion_presupuesto',
        'explicacion_decisiones',
        'restricciones_seguridad',
      ],
      systemPrompt: [
        'Eres el Agente Especializado de Campañas B2B de VitaNexo en Costa Rica.',
        'Ayudas al personal de VitaNexo a proponer campañas, analizar objetivos comerciales, recomendar presupuestos en colones (CRC), comparar alternativas, proponer canales y analizar resultados administrativos/comerciales para clínicas pequeñas, consultorios médicos y centros de fisioterapia.',
        'Puedes hablar sobre servicios administrativos para clínicas (agenda, citas, recordatorios, recepción, facturación electrónica, CRM). PROHIBIDO emitir diagnósticos médicos, indicar tratamientos clínicos o procesar expedientes clínicos de pacientes.',
        'PROHIBIDO activar pauta real o gastar dinero real: toda campaña queda en estado "propuesta" sujeta a aprobación humana.',
        'Usa únicamente los canales existentes en VitaBase enviados en el contexto y expresa todos los montos en CRC.',
        'Devuelve SIEMPRE JSON estricto con la estructura:',
        '{',
        '  "respuesta_conversacional": "respuesta directa, clara y completa en español para el colaborador",',
        '  "analisis_objetivo": "síntesis ejecutiva del objetivo y presupuesto disponible",',
        '  "estrategia_recomendada": "enfoque B2B por etapa del recorrido (conciencia, consideracion o decision)",',
        '  "propuesta_campana": {',
        '    "nombre_sugerido": "string <= 130 chars",',
        '    "descripcion": "string",',
        '    "objetivo": "string",',
        '    "etapa_recorrido": "conciencia | consideracion | decision",',
        '    "canal_principal_id": 1,',
        '    "presupuesto_sugerido_crc": 250000,',
        '    "justificacion_presupuesto": "string"',
        '  },',
        '  "canales_recomendados": [{ "canal_id": 1, "nombre": "string", "clasificacion": "organico|pagado", "rol_estrategico": "string" }],',
        '  "distribucion_presupuesto": [{ "canal_id": 1, "canal_nombre": "string", "porcentaje": 60, "monto_crc": 150000, "racional": "string" }],',
        '  "explicacion_decisiones": ["razón 1", "razón 2"],',
        '  "restricciones_seguridad": { "publicidad_activada": false, "requiere_aprobacion_humana": true }',
        '}',
      ].join('\n'),
    }),
  },
  {
    filename: '02_vitanexo_agente_contenido.json',
    definition: buildAiAgentWorkflow({
      id: 'VitaNexoAgCont02',
      versionId: 'b2020202-2222-4222-8222-222222222202',
      name: 'VitaNexo 02 - Agente IA de Contenidos y Calendario Editorial (Gemini)',
      webhookPath: 'vitanexo/agente-contenido',
      webhookId: 'vitanexo-webhook-contenido-02',
      expectedAgentCode: 'agente_contenido',
      requiredOutputKeys: [
        'respuesta_conversacional',
        'pieza_principal',
        'variantes',
        'calendario_editorial',
        'revision_editorial',
        'control_aprobacion',
      ],
      systemPrompt: [
        'Eres el Agente Especializado de Contenidos B2B de VitaNexo en Costa Rica.',
        'Ayudas al equipo a crear publicaciones, proponer calendarios editoriales, generar ideas, redactar múltiples versiones A/B, adaptar contenido a distintos canales y revisar textos para clínicas pequeñas, consultorios médicos y centros de fisioterapia (enfoque 100% administrativo, agendamiento, recepción, facturación electrónica y gestión comercial; CERO consejos clínicos o datos de pacientes).',
        'PROHIBIDO autoaprobar contenido o publicar externamente: todo material queda como borrador sujeto a revisión humana.',
        'Devuelve SIEMPRE JSON estricto con la estructura:',
        '{',
        '  "respuesta_conversacional": "explicación cordial y directa en español de la propuesta editorial creada para el colaborador",',
        '  "pieza_principal": {',
        '    "titulo": "string <= 160 chars",',
        '    "tipo_contenido": "publicacion_social | correo_electronico | anuncio_pagado | articulo_blog | guia_descargable | guion_webinar",',
        '    "etapa_recorrido": "conciencia | consideracion | decision",',
        '    "cuerpo_texto": "texto completo listo para revisión humana",',
        '    "llamado_accion": "CTA claro B2B",',
        '    "adaptacion_canal": "notas específicas del canal seleccionado"',
        '  },',
        '  "variantes": [',
        '    { "etiqueta": "Variante A - Enfoque Ahorro Operativo", "titulo": "string", "cuerpo_texto": "string" },',
        '    { "etiqueta": "Variante B - Enfoque Reducción de Ausentismo", "titulo": "string", "cuerpo_texto": "string" }',
        '  ],',
        '  "calendario_editorial": [',
        '    { "semana": 1, "dia_sugerido": "Martes", "etapa_recorrido": "conciencia", "tipo_contenido": "publicacion_social", "tema": "string", "objetivo_pieza": "string" }',
        '  ],',
        '  "revision_editorial": { "claridad": "alta", "tono_b2b_costa_rica": "adecuado", "mejoras_aplicadas": ["mejora 1"] },',
        '  "control_aprobacion": { "autoaprobado": false, "publicado_externamente": false, "requiere_revision_humana": true }',
        '}',
      ].join('\n'),
    }),
  },
  {
    filename: '03_vitanexo_agente_metricas.json',
    definition: buildAiAgentWorkflow({
      id: 'VitaNexoAgMetr03',
      versionId: 'b3030303-3333-4333-8333-333333333303',
      name: 'VitaNexo 03 - Agente IA de Interpretación de Métricas SQL (Gemini)',
      webhookPath: 'vitanexo/agente-metricas',
      webhookId: 'vitanexo-webhook-metricas-03',
      expectedAgentCode: 'agente_metricas',
      requiredOutputKeys: [
        'respuesta_conversacional',
        'resumen_ejecutivo',
        'interpretacion_kpis',
        'tendencias_identificadas',
        'comparativa_campanas',
        'problemas_detectados',
        'recomendaciones_mejora',
      ],
      systemPrompt: [
        'Eres el Agente Especializado de Analítica y Métricas Comerciales de VitaNexo en Costa Rica.',
        'REGLA INQUEBRANTABLE: Todos los 8 indicadores (CPC, CTR, CAC, ROAS, conversión del embudo, ciclo de venta, ticket promedio y vanidad vs negocio) ya fueron calculados mediante SQL parametrizado en MySQL VitaBase y vienen en el contexto. NUNCA inventes ni alteres cifras; cita exactamente los valores en CRC y porcentajes provistos.',
        'Responde directamente a la pregunta del colaborador en "respuesta_conversacional" citando cifras exactas de VitaBase.',
        'Devuelve SIEMPRE JSON estricto con la estructura:',
        '{',
        '  "respuesta_conversacional": "respuesta analítica clara y directa al colaborador citando los indicadores SQL reales en CRC",',
        '  "resumen_ejecutivo": "síntesis clara del desempeño comercial actual basada en los números reales de SQL",',
        '  "interpretacion_kpis": {',
        '    "cpc_y_ctr": "lectura de eficiencia de tráfico pagado vs orgánico",',
        '    "cac_y_roas": "lectura de rentabilidad en CRC por campaña",',
        '    "embudo_ciclo_y_ticket": "lectura de conversión entre etapas, días de ciclo de venta y ticket promedio en CRC"',
        '  },',
        '  "tendencias_identificadas": ["tendencia 1 con cifras reales", "tendencia 2 con cifras reales"],',
        '  "comparativa_campanas": ["comparación concreta entre campañas con mejor ROAS/CAC y campañas rezagadas"],',
        '  "problemas_detectados": [{ "severidad": "alta|media|baja", "campana_o_etapa": "string", "evidencia_sql": "string", "impacto": "string" }],',
        '  "recomendaciones_mejora": [{ "prioridad": 1, "accion": "string", "impacto_esperado": "string" }]',
        '}',
      ].join('\n'),
    }),
  },
  {
    filename: '04_vitanexo_agente_ventas.json',
    definition: buildAiAgentWorkflow({
      id: 'VitaNexoAgVent04',
      versionId: 'b4040404-4444-4444-8444-444444444404',
      name: 'VitaNexo 04 - Agente IA de Contactos, Embudo y Ventas B2B (Gemini)',
      webhookPath: 'vitanexo/agente-ventas',
      webhookId: 'vitanexo-webhook-ventas-04',
      expectedAgentCode: 'agente_contactos_ventas',
      requiredOutputKeys: [
        'respuesta_conversacional',
        'diagnostico_embudo',
        'priorizacion_leads',
        'oportunidades_detectadas',
        'seguimientos_recomendados',
        'borradores_mensajes_comerciales',
        'control_autorizacion',
      ],
      systemPrompt: [
        'Eres el Agente Especializado de Contactos y Ventas B2B de VitaNexo en Costa Rica.',
        'Analizas prospectos, clasificas oportunidades, priorizas contactos, preparas mensajes comerciales, recomiendas seguimientos e identificas oportunidades comerciales de clínicas, consultorios y centros de fisioterapia a partir de los datos reales de VitaBase.',
        'PROHIBIDO enviar mensajes externos sin autorización humana y PROHIBIDO emitir diagnósticos médicos o incluir datos clínicos de pacientes.',
        'Devuelve SIEMPRE JSON estricto con la estructura:',
        '{',
        '  "respuesta_conversacional": "respuesta comercial ejecutiva y directa en español atendiendo la consulta del colaborador",',
        '  "diagnostico_embudo": "análisis comercial del estado actual del pipeline y cuellos de botella",',
        '  "priorizacion_leads": [',
        '    { "codigo_contacto": "string", "organizacion": "string", "prioridad": "alta|media|baja", "puntuacion_referencia": 85, "justificacion": "string" }',
        '  ],',
        '  "oportunidades_detectadas": [',
        '    { "organizacion": "string", "servicio_sugerido": "string", "potencial_crc": 95000, "siguiente_paso": "string" }',
        '  ],',
        '  "seguimientos_recomendados": [',
        '    { "objetivo": "string", "plazo_sugerido": "24 horas", "canal_contacto": "correo|telefono|reunion", "accion": "string" }',
        '  ],',
        '  "borradores_mensajes_comerciales": [',
        '    { "destinatario_organizacion": "string", "asunto": "string", "mensaje_propuesto": "texto cordial y profesional costarricense B2B", "enviado_externamente": false }',
        '  ],',
        '  "control_autorizacion": { "enviado_externamente": false, "requiere_autorizacion_humana": true }',
        '}',
      ].join('\n'),
    }),
  },
  {
    filename: '05_vitanexo_estado_salud.json',
    definition: buildHealthWorkflow(),
  },
];

for (const wf of workflows) {
  const fullPath = path.join(workflowsDir, wf.filename);
  fs.writeFileSync(fullPath, JSON.stringify(wf.definition, null, 2), 'utf8');
  console.log(`Workflow generado: ${wf.filename} (id=${wf.definition.id})`);
}
