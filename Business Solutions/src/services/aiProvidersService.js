const fs = require('fs');
const path = require('path');
const { AppError } = require('../utils/AppError');

/**
 * Capa multiproveedor de IA de VitaNexo.
 *
 * - Lee la configuración de proveedores y asignaciones por agente desde VitaBase
 *   (tablas configuracion_proveedores_ia y asignaciones_proveedor_agente).
 * - Construye un "plan de ejecución" por agente: proveedor principal, modelo,
 *   modelo alternativo y proveedor alternativo.
 * - Expone adaptadores independientes por formato de API (no todos los proveedores
 *   comparten estructura): n8n_workflow, gemini_rest, openai_compatible_rest y
 *   anthropic_rest. Los agentes no cambian cuando se agrega o reasigna un proveedor.
 * - Las API keys solo se leen desde variables de entorno del backend o desde las
 *   credenciales cifradas de n8n. Nunca se devuelven en respuestas ni se registran.
 */

const AGENT_WORKFLOW_FILES = {
  agente_campanas: '01_vitanexo_agente_campanas.json',
  agente_contenido: '02_vitanexo_agente_contenido.json',
  agente_metricas: '03_vitanexo_agente_metricas.json',
  agente_contactos_ventas: '04_vitanexo_agente_ventas.json',
};

const EDITABLE_PROVIDER_FIELDS = [
  'nombre',
  'modelo_principal',
  'modelo_alternativo',
  'url_servicio',
  'temperatura',
  'max_tokens',
  'timeout_ms',
  'limite_solicitudes_minuto',
  'activo',
  'notas_configuracion',
];

function loadAgentSystemPrompt(agentCode) {
  const file = AGENT_WORKFLOW_FILES[agentCode];
  if (!file) return '';
  try {
    const wf = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'n8n', 'workflows', file), 'utf8'));
    const agentNode = (wf.nodes || []).find((n) => String(n.type).includes('langchain.agent'));
    return agentNode?.parameters?.options?.systemMessage || '';
  } catch (_) {
    return '';
  }
}

/**
 * Construye el mismo prompt de usuario que el workflow de n8n para que todos los
 * adaptadores reciban información equivalente.
 */
function buildUserPrompt(payload, requiredOutputKeys = []) {
  const sections = [
    '=== SOLICITUD EMPRESARIAL ORQUESTADA DE VITANEXO (COSTA RICA) ===',
    `Código de ejecución: ${payload.codigo_ejecucion}`,
    `Agente especializado: ${payload.codigo_agente}`,
    `Tarea solicitada: ${payload.tipo_tarea}`,
    'Moneda oficial: CRC (colones costarricenses)',
    'Alcance permitido: gestión administrativa, comercial y tecnológica B2B para clínicas, consultorios y centros de fisioterapia en Costa Rica. Prohibido emitir diagnósticos, indicar tratamientos clínicos o inventar datos no presentes en VitaBase.',
  ];
  if (payload.mensaje_usuario) {
    sections.push('', '=== SOLICITUD EN LENGUAJE NATURAL DEL COLABORADOR ===', payload.mensaje_usuario);
  }
  if (Array.isArray(payload.historial_conversacion) && payload.historial_conversacion.length > 0) {
    sections.push('', '=== CONTEXTO RECIENTE DE LA CONVERSACIÓN ===', JSON.stringify(payload.historial_conversacion.slice(-5), null, 2));
  }
  sections.push(
    '',
    '=== PARÁMETROS OPERATIVOS ===',
    JSON.stringify(payload.parametros || {}, null, 2),
    '',
    '=== DATOS REALES CONSULTADOS EN MYSQL VITABASE ===',
    JSON.stringify(payload.contexto || {}, null, 2),
    '',
    'Responde ÚNICAMENTE con un objeto JSON válido. Incluye SIEMPRE "respuesta_conversacional" y además las claves: ' +
      ['respuesta_conversacional', ...requiredOutputKeys].filter((v, i, a) => a.indexOf(v) === i).join(', ') +
      '.'
  );
  return sections.join('\n');
}

function extractJsonObject(rawText) {
  let cleaned = String(rawText || '').trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    cleaned = fenced[1].trim();
  } else {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    return parsed;
  } catch (_) {
    // Intento de reparación si la respuesta fue cortada por límite de tokens
    try {
      let inString = false;
      let escaped = false;
      const stack = [];
      for (let i = 0; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (escaped) { escaped = false; continue; }
        if (c === '\\') { escaped = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (!inString) {
          if (c === '{') stack.push('}');
          else if (c === '[') stack.push(']');
          else if (c === '}' || c === ']') stack.pop();
        }
      }
      let repaired = cleaned;
      if (inString) repaired += '"';
      while (stack.length > 0) repaired += stack.pop();
      const repairedParsed = JSON.parse(repaired);
      if (repairedParsed && typeof repairedParsed === 'object' && !Array.isArray(repairedParsed)) {
        return repairedParsed;
      }
    } catch (_) {}

    throw new AppError(
      'El proveedor de IA devolvió una respuesta que no es un objeto JSON válido.',
      502,
      'INVALID_AI_JSON_OUTPUT'
    );
  }
}

async function fetchJsonWithTimeout(url, init, { timeoutMs, signal, providerLabel }) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {
      json = null;
    }
    if (!res.ok) {
      const providerMsg = json?.error?.message || json?.message || text.slice(0, 200);
      const err = new AppError(
        `${providerLabel} respondió HTTP ${res.status}: ${String(providerMsg).slice(0, 260)}`,
        res.status === 429 ? 429 : res.status === 401 || res.status === 403 ? 502 : 502,
        res.status === 429 ? 'AI_PROVIDER_RATE_LIMIT' : res.status === 401 || res.status === 403 ? 'AI_PROVIDER_AUTH_ERROR' : 'AI_PROVIDER_HTTP_ERROR'
      );
      err.retryable = res.status === 429 || res.status >= 500;
      throw err;
    }
    if (!json) {
      throw new AppError(`${providerLabel} devolvió una respuesta vacía o no JSON.`, 502, 'INVALID_AI_PROVIDER_RESPONSE');
    }
    return json;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      if (signal?.aborted) {
        throw new AppError('Solicitud de IA cancelada por el colaborador.', 499, 'AI_REQUEST_CANCELLED');
      }
      const t = new AppError(`Tiempo de espera agotado (${timeoutMs} ms) esperando a ${providerLabel}.`, 504, 'AI_PROVIDER_TIMEOUT');
      t.retryable = true;
      throw t;
    }
    const c = new AppError(`No fue posible conectar con ${providerLabel}: ${err.message}`, 503, 'AI_PROVIDER_UNAVAILABLE');
    c.retryable = true;
    throw c;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

function createDirectAdapter(provider, apiKey) {
  const baseUrl = String(provider.url_servicio || '').replace(/\/+$/, '');
  const temperature = Number(provider.temperatura ?? 0.2);
  const maxTokens = Number(provider.max_tokens || 2500);
  const label = provider.nombre;

  const adapters = {
    async gemini_rest({ systemPrompt, userPrompt, modelo, timeoutMs, signal }) {
      const model = String(modelo).replace(/^models\//, '');
      const json = await fetchJsonWithTimeout(
        `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
          }),
        },
        { timeoutMs, signal, providerLabel: label }
      );
      return (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    },

    async openai_compatible_rest({ systemPrompt, userPrompt, modelo, timeoutMs, signal }) {
      const json = await fetchJsonWithTimeout(
        `${baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelo,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
        { timeoutMs, signal, providerLabel: label }
      );
      return json.choices?.[0]?.message?.content || '';
    },

    async anthropic_rest({ systemPrompt, userPrompt, modelo, timeoutMs, signal }) {
      const json = await fetchJsonWithTimeout(
        `${baseUrl}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: modelo,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        },
        { timeoutMs, signal, providerLabel: label }
      );
      return (json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    },
  };

  const fn = adapters[provider.tipo_adaptador];
  if (!fn) {
    throw new AppError(`Tipo de adaptador no soportado: ${provider.tipo_adaptador}`, 500, 'UNSUPPORTED_AI_ADAPTER');
  }

  return {
    codigo_proveedor: provider.codigo_proveedor,
    tipo_adaptador: provider.tipo_adaptador,
    async invoke({ payload, requiredOutputKeys = [], modelo, signal }) {
      const systemPrompt =
        loadAgentSystemPrompt(payload.codigo_agente) ||
        'Eres un agente empresarial de VitaNexo. Responde solo con JSON válido.';
      const userPrompt = buildUserPrompt(payload, requiredOutputKeys);
      const rawText = await fn({
        systemPrompt,
        userPrompt,
        modelo: modelo || provider.modelo_principal,
        timeoutMs: Number(provider.timeout_ms || 45000),
        signal,
      });
      const parsed = extractJsonObject(rawText);
      const missing = requiredOutputKeys.filter((k) => parsed[k] === undefined || parsed[k] === null);
      if (missing.length > 0) {
        throw new AppError(
          `Respuesta incompleta de ${label}: faltan las claves ${missing.join(', ')}.`,
          502,
          'INCOMPLETE_AI_RESPONSE'
        );
      }
      if (!parsed.respuesta_conversacional) {
        parsed.respuesta_conversacional = String(
          parsed.resumen_ejecutivo || parsed.analisis_objetivo || parsed.diagnostico_embudo || 'Análisis completado.'
        );
      }
      return parsed;
    },
  };
}

function maskProvider(row, envSource = process.env) {
  if (!row) return null;
  const keyName = row.variable_entorno_key || null;
  const isN8n = row.tipo_adaptador === 'n8n_workflow';
  return {
    id: row.id,
    codigo_proveedor: row.codigo_proveedor,
    nombre: row.nombre,
    tipo_adaptador: row.tipo_adaptador,
    modelo_principal: row.modelo_principal,
    modelo_alternativo: row.modelo_alternativo,
    url_servicio: row.url_servicio,
    credencial_n8n_alias: row.credencial_n8n_alias,
    variable_entorno_key: keyName,
    // Solo se informa SI existe la credencial, nunca su valor.
    credencial_configurada: isN8n ? Boolean(row.credencial_n8n_alias) : Boolean(keyName && envSource[keyName]),
    temperatura: Number(row.temperatura),
    max_tokens: row.max_tokens,
    timeout_ms: row.timeout_ms,
    limite_solicitudes_minuto: row.limite_solicitudes_minuto,
    es_predeterminado: Boolean(row.es_predeterminado),
    activo: Boolean(row.activo),
    verificado_llamada_real: Boolean(row.verificado_llamada_real),
    notas_configuracion: row.notas_configuracion,
    actualizado_en: row.actualizado_en,
  };
}

function createAiProvidersService({ db, envSource = process.env }) {
  const providerWindows = new Map();

  function enforceProviderRate(provider) {
    const now = Date.now();
    const arr = (providerWindows.get(provider.codigo_proveedor) || []).filter((t) => now - t < 60000);
    const limit = Number(provider.limite_solicitudes_minuto || 30);
    if (arr.length >= limit) {
      const err = new AppError(
        `Se alcanzó el límite de consumo configurado para ${provider.nombre} (${limit} solicitudes/minuto). ` +
          'La solicitud puede reintentarse en unos segundos.',
        429,
        'AI_PROVIDER_CONSUMPTION_LIMIT'
      );
      err.retryable = true;
      throw err;
    }
    arr.push(now);
    providerWindows.set(provider.codigo_proveedor, arr);
  }

  async function listProviderRows() {
    return db.query('SELECT * FROM configuracion_proveedores_ia ORDER BY es_predeterminado DESC, id ASC');
  }

  async function getProviderRow(code) {
    const rows = await db.query('SELECT * FROM configuracion_proveedores_ia WHERE codigo_proveedor = ? LIMIT 1', [code]);
    return rows[0] || null;
  }

  async function getProviderRowById(id) {
    if (!id) return null;
    const rows = await db.query('SELECT * FROM configuracion_proveedores_ia WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  async function listAssignments() {
    return db.query(
      `SELECT apa.*, cp.codigo_proveedor, cp.nombre AS proveedor_nombre,
              cpa.codigo_proveedor AS proveedor_alternativo_codigo
       FROM asignaciones_proveedor_agente apa
       INNER JOIN configuracion_proveedores_ia cp ON cp.id = apa.proveedor_id
       LEFT JOIN configuracion_proveedores_ia cpa ON cpa.id = apa.proveedor_alternativo_id
       ORDER BY apa.agente_id ASC`
    );
  }

  function buildCandidate(provider, modelo) {
    if (!provider || !provider.activo) return null;
    if (provider.tipo_adaptador === 'n8n_workflow') {
      return {
        kind: 'n8n',
        codigo_proveedor: provider.codigo_proveedor,
        proveedor_ia: 'gemini-api',
        modelo: modelo || provider.modelo_principal,
        enforceRate: () => enforceProviderRate(provider),
      };
    }
    const apiKey = provider.variable_entorno_key ? envSource[provider.variable_entorno_key] : '';
    if (!apiKey) return null; // Proveedor sin credencial real: no se usa ni se declara conectado.
    const adapter = createDirectAdapter(provider, apiKey);
    return {
      kind: 'direct',
      codigo_proveedor: provider.codigo_proveedor,
      proveedor_ia: provider.codigo_proveedor,
      modelo: modelo || provider.modelo_principal,
      adapter,
      enforceRate: () => enforceProviderRate(provider),
    };
  }

  return {
    maskProvider: (row) => maskProvider(row, envSource),
    buildUserPrompt,

    async listProviders() {
      const [rows, assignments] = await Promise.all([listProviderRows(), listAssignments()]);
      return {
        proveedores: rows.map((r) => maskProvider(r, envSource)),
        asignaciones: assignments.map((a) => ({
          codigo_agente: a.codigo_agente,
          proveedor_codigo: a.codigo_proveedor,
          proveedor_nombre: a.proveedor_nombre,
          proveedor_alternativo_codigo: a.proveedor_alternativo_codigo,
          modelo_override: a.modelo_override,
          temperatura_override: a.temperatura_override !== null ? Number(a.temperatura_override) : null,
          activo: Boolean(a.activo),
        })),
      };
    },

    async updateProvider(code, changes = {}) {
      const row = await getProviderRow(code);
      if (!row) throw new AppError(`Proveedor de IA '${code}' no encontrado.`, 404, 'AI_PROVIDER_NOT_FOUND');
      const sets = [];
      const params = [];
      for (const field of EDITABLE_PROVIDER_FIELDS) {
        if (changes[field] !== undefined) {
          sets.push(`\`${field}\` = ?`);
          params.push(field === 'activo' ? (changes[field] ? 1 : 0) : changes[field]);
        }
      }
      if (changes.activo === true && row.tipo_adaptador !== 'n8n_workflow') {
        const keyName = row.variable_entorno_key;
        if (!keyName || !envSource[keyName]) {
          throw new AppError(
            `No se puede activar ${row.nombre}: falta la variable de entorno ${keyName} con una API key real en el backend.`,
            409,
            'AI_PROVIDER_CREDENTIAL_MISSING'
          );
        }
      }
      if (sets.length === 0) return maskProvider(row, envSource);
      // Cualquier cambio de modelo/URL invalida la verificación previa.
      if (changes.modelo_principal !== undefined || changes.url_servicio !== undefined) {
        sets.push('`verificado_llamada_real` = 0');
      }
      params.push(row.id);
      await db.query(`UPDATE configuracion_proveedores_ia SET ${sets.join(', ')} WHERE id = ?`, params);
      return maskProvider(await getProviderRowById(row.id), envSource);
    },

    async assignProviderToAgent(agentCode, { proveedor_codigo, proveedor_alternativo_codigo = null, modelo_override = null }) {
      const primary = await getProviderRow(proveedor_codigo);
      if (!primary) throw new AppError(`Proveedor '${proveedor_codigo}' no encontrado.`, 404, 'AI_PROVIDER_NOT_FOUND');
      if (!primary.activo) {
        throw new AppError(`El proveedor '${proveedor_codigo}' está inactivo; actívelo antes de asignarlo.`, 409, 'AI_PROVIDER_INACTIVE');
      }
      const alt = proveedor_alternativo_codigo ? await getProviderRow(proveedor_alternativo_codigo) : null;
      const result = await db.query(
        `UPDATE asignaciones_proveedor_agente
         SET proveedor_id = ?, proveedor_alternativo_id = ?, modelo_override = ?
         WHERE codigo_agente = ?`,
        [primary.id, alt ? alt.id : null, modelo_override || null, agentCode]
      );
      if (!result.affectedRows) {
        throw new AppError(`No existe asignación de proveedor para el agente '${agentCode}'.`, 404, 'AI_ASSIGNMENT_NOT_FOUND');
      }
      return (await this.listProviders()).asignaciones.find((a) => a.codigo_agente === agentCode);
    },

    /**
     * Plan ordenado de candidatos (principal -> modelo alternativo -> proveedor alternativo).
     */
    async resolveExecutionPlan(agentCode) {
      const rows = await db.query('SELECT * FROM asignaciones_proveedor_agente WHERE codigo_agente = ? AND activo = 1 LIMIT 1', [agentCode]);
      const assignment = rows[0] || null;
      let primary = assignment ? await getProviderRowById(assignment.proveedor_id) : null;
      if (!primary) {
        const def = await db.query('SELECT * FROM configuracion_proveedores_ia WHERE es_predeterminado = 1 AND activo = 1 LIMIT 1');
        primary = def[0] || null;
      }
      const candidates = [];
      const pushUnique = (c) => {
        if (c && !candidates.some((x) => x.codigo_proveedor === c.codigo_proveedor && x.modelo === c.modelo)) candidates.push(c);
      };
      pushUnique(buildCandidate(primary, assignment?.modelo_override || null));
      if (primary?.modelo_alternativo) pushUnique(buildCandidate(primary, primary.modelo_alternativo));
      if (assignment?.proveedor_alternativo_id) {
        pushUnique(buildCandidate(await getProviderRowById(assignment.proveedor_alternativo_id), null));
      }
      if (candidates.length === 0) {
        throw new AppError(
          `No hay un proveedor de IA activo y con credenciales configuradas para ${agentCode}.`,
          503,
          'AI_PROVIDER_NOT_CONFIGURED'
        );
      }
      return { proveedor_principal: primary ? primary.codigo_proveedor : null, candidates };
    },

    /**
     * Verificación con llamada REAL al proveedor. Solo marca verificado si responde.
     */
    async verifyProvider(code, { n8nBridge } = {}) {
      const row = await getProviderRow(code);
      if (!row) throw new AppError(`Proveedor '${code}' no encontrado.`, 404, 'AI_PROVIDER_NOT_FOUND');
      const started = Date.now();
      let ok = false;
      let detalle = '';
      try {
        if (row.tipo_adaptador === 'n8n_workflow') {
          const health = n8nBridge ? await n8nBridge.checkN8nHealth() : null;
          if (!health?.webhook_autenticado) throw new Error(health?.mensaje || 'n8n no disponible');
          const recent = await db.query(
            `SELECT COUNT(*) AS total FROM ejecuciones_workflows_n8n
             WHERE estado = 'exitoso' AND fecha_inicio >= (NOW() - INTERVAL 1 DAY)`
          );
          ok = Number(recent[0]?.total || 0) > 0;
          detalle = ok
            ? `n8n autenticado y ${recent[0].total} respuesta(s) reales de Gemini en las últimas 24 h.`
            : 'n8n autenticado, pero sin respuestas reales de Gemini en las últimas 24 h. Ejecute una solicitud de prueba.';
        } else {
          const apiKey = row.variable_entorno_key ? envSource[row.variable_entorno_key] : '';
          if (!apiKey) throw new Error(`Falta ${row.variable_entorno_key} en el entorno del backend.`);
          const adapter = createDirectAdapter(row, apiKey);
          const result = await adapter.invoke({
            payload: {
              codigo_ejecucion: `VERIFY-${Date.now()}`,
              codigo_agente: 'verificacion',
              tipo_tarea: 'verificar_proveedor',
              mensaje_usuario: 'Responde {"respuesta_conversacional":"ok"} para verificar la conexión.',
              parametros: {},
              contexto: {},
            },
            requiredOutputKeys: [],
          });
          ok = Boolean(result.respuesta_conversacional);
          detalle = 'Llamada real completada con respuesta JSON válida.';
        }
      } catch (err) {
        ok = false;
        detalle = err.message;
      }
      await db.query('UPDATE configuracion_proveedores_ia SET verificado_llamada_real = ? WHERE id = ?', [ok ? 1 : 0, row.id]);
      return { codigo_proveedor: code, verificado: ok, detalle: String(detalle).slice(0, 400), duracion_ms: Date.now() - started };
    },
  };
}

module.exports = {
  createAiProvidersService,
  createDirectAdapter,
  buildUserPrompt,
  extractJsonObject,
};

