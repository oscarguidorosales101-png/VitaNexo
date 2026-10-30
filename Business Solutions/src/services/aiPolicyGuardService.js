const { AppError } = require('../utils/AppError');

/**
 * Guardián de políticas de IA de VitaNexo.
 *
 * Evalúa el CONTEXTO de cada solicitud en lugar de bloquear por la simple
 * aparición de palabras médicas. Permite tareas administrativas, comerciales,
 * tecnológicas y operativas para clínicas, consultorios y centros de
 * fisioterapia (agendas, recepción, facturación, CRM, campañas, métricas),
 * y rechaza únicamente actividad clínica real: diagnósticos, tratamientos,
 * prescripciones o procesamiento de expedientes clínicos de pacientes.
 */

const AGENT_ROLE_ACCESS = {
  agente_campanas: ['direccion_comercial', 'mercadeo'],
  agente_contenido: ['direccion_comercial', 'mercadeo', 'contenido'],
  agente_metricas: ['direccion_comercial', 'mercadeo', 'contenido', 'ejecutivo_ventas', 'operaciones'],
  agente_contactos_ventas: ['direccion_comercial', 'ejecutivo_ventas', 'operaciones'],
};

const AGENT_LABELS = {
  agente_campanas: 'Agente de Campañas',
  agente_contenido: 'Agente de Contenido',
  agente_metricas: 'Agente de Métricas',
  agente_contactos_ventas: 'Agente de Contactos y Ventas',
};

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Acciones clínicas reales que VitaNexo no debe realizar.
const CLINICAL_ACTION_PATTERNS = [
  {
    regex: /\b(diagnostica(r|me|le|lo|la)?|diagnostico\s+(medico|clinico|de|del|para)\b|que\s+(enfermedad|patologia|lesion)\s+tiene)\b/,
    motivo: 'emitir un diagnóstico médico',
  },
  {
    regex: /\b(receta(r|me|le)?(\s+\w+){0,3}\s*(medicamento|farmaco|medicina|pastilla|dosis)|(medicamento|farmaco|medicina|pastilla|dosis)(\s+\w+){0,3}\s*receta(r|me|le)?|que\s+(medicamento|dosis|farmaco)\s+(debe|puede|le\s+doy|tomar)|prescrib(ir|e|a)\s+(un|una|el)?\s*(tratamiento|medicamento|terapia))\b/,
    motivo: 'prescribir medicamentos o tratamientos',
  },
  {
    regex: /\b(que\s+tratamiento\s+(clinico|medico|fisioterapeutico)?\s*(le\s+)?(doy|aplico|recomiendas?|necesita)|plan\s+de\s+tratamiento\s+(clinico|medico)\s+para\s+(el|la|un|una|este|esta)\s+paciente|ejercicios\s+terapeuticos\s+para\s+(su|la|el)\s+(lesion|hernia|fractura))\b/,
    motivo: 'indicar tratamientos clínicos a pacientes',
  },
  {
    regex: /\b(guarda(r)?|almacena(r)?|registra(r)?|incluir|analiza(r)?|procesa(r)?|sube|subir)\s+(el|la|los|las|este|esta)?\s*(expediente(s)?\s+clinico(s)?|historia(s)?\s+clinica(s)?|historial(es)?\s+clinico(s)?|resultados?\s+de\s+laboratorio|sintomas\s+del\s+paciente)\b/,
    motivo: 'procesar o almacenar expedientes clínicos o datos médicos de pacientes',
  },
  {
    regex: /\bexpediente\s+clinico\s+y\s+diagnostico\s+medico\b/,
    motivo: 'procesar expedientes clínicos y diagnósticos médicos',
  },
];

// Contextos que indican claramente una tarea administrativa/comercial legítima.
const NEGATED_CLINICAL_CONTEXT =
  /\b(sin|no\s+(incluir|incluye|maneja|manejar|almacena|almacenar|guarda|guardar|procesa|procesar)|excluir|excluyendo|evitar|nunca)\s+(datos\s+clinicos|datos\s+medicos|expediente(s)?\s+clinico(s)?|historia(s)?\s+clinica(s)?|historial(es)?\s+clinico(s)?|diagnosticos?)\b/;

const ADMIN_CONTEXT_TERMS =
  /\b(agenda|citas?|recepcion|recordatorio|facturacion|factura|cobro|crm|campana|marketing|mercadeo|publicacion|contenido|lead|prospecto|cliente|venta|presupuesto|software|digitaliz|automatiz|administrativ|operativ|metrica|indicador|kpi|embudo|servicio)\w*/;

function evaluateClinicalScope(message) {
  const text = normalizeText(message);
  if (!text) {
    return { permitido: true, advertencias: [] };
  }

  const negated = NEGATED_CLINICAL_CONTEXT.test(text);
  const adminContext = ADMIN_CONTEXT_TERMS.test(text);

  for (const rule of CLINICAL_ACTION_PATTERNS) {
    if (rule.regex.test(text)) {
      // Una negación explícita ("sin expediente clínico") convierte la frase en una
      // restricción administrativa legítima y no en una acción clínica.
      if (negated) {
        continue;
      }
      return {
        permitido: false,
        motivo: rule.motivo,
        mensaje:
          `Esta solicitud queda fuera del alcance de VitaNexo porque implicaría ${rule.motivo}. ` +
          'Los agentes apoyan la gestión administrativa, comercial y tecnológica de clínicas, pero no sustituyen decisiones de profesionales de salud.',
        alternativa_administrativa:
          'Puedo ayudarte con la parte administrativa relacionada: organizar agendas y recordatorios de citas, ' +
          'preparar comunicaciones comerciales para la clínica, proponer flujos de recepción o facturación electrónica, ' +
          'o analizar indicadores comerciales en VitaBase.',
      };
    }
  }

  const advertencias = [];
  if (/\b(paciente|clinic|medic|fisioterap|consultorio)\w*/.test(text) && adminContext) {
    advertencias.push(
      'Solicitud administrativa en contexto de salud permitida: el agente no emitirá diagnósticos ni procesará datos clínicos.'
    );
  }
  return { permitido: true, advertencias };
}

function createAiPolicyGuardService({ limits = {} } = {}) {
  const isTest = process.env.NODE_ENV === 'test';
  const config = {
    maxMessageChars: Number(limits.maxMessageChars || 4000),
    minMessageChars: Number(limits.minMessageChars || 3),
    maxActivePerUser: Number(limits.maxActivePerUser || (isTest ? 50 : 5)),
    userRatePerMinute: Number(limits.userRatePerMinute || (isTest ? 200 : 30)),
  };

  const userWindows = new Map();

  function enforceUserRate(userId) {
    const now = Date.now();
    const key = String(userId || 'anon');
    const windowArr = (userWindows.get(key) || []).filter((t) => now - t < 60000);
    if (windowArr.length >= config.userRatePerMinute) {
      const waitSec = Math.max(1, Math.ceil((60000 - (now - windowArr[0])) / 1000));
      throw new AppError(
        `Has enviado ${config.userRatePerMinute} solicitudes de IA en el último minuto (límite configurable AI_USER_RATE_PER_MINUTE). ` +
          `Podrás continuar en aproximadamente ${waitSec} segundos; tus solicitudes anteriores siguen procesándose.`,
        429,
        'AI_USER_RATE_LIMIT',
        { reintentar_en_segundos: waitSec, limite_por_minuto: config.userRatePerMinute }
      );
    }
    windowArr.push(now);
    userWindows.set(key, windowArr);
  }

  return {
    limits: config,
    AGENT_ROLE_ACCESS,
    AGENT_LABELS,

    listAllowedAgentsForRole(role) {
      return Object.entries(AGENT_ROLE_ACCESS)
        .filter(([, roles]) => roles.includes(role))
        .map(([code]) => code);
    },

    assertAgentAccess(user, agentCode) {
      if (!AGENT_ROLE_ACCESS[agentCode]) {
        throw new AppError(
          `El agente '${agentCode}' no existe. Agentes disponibles: ${Object.keys(AGENT_ROLE_ACCESS).join(', ')}.`,
          400,
          'UNKNOWN_AI_AGENT'
        );
      }
      if (!user) return; // modo pruebas sin autenticación obligatoria
      const perms = Array.isArray(user.permisos) ? user.permisos : [];
      if (!perms.includes('agentes:execute')) {
        throw new AppError(
          `Tu rol '${user.rol}' no tiene permiso para utilizar agentes de IA.`,
          403,
          'FORBIDDEN_ROLE_CAPABILITY'
        );
      }
      if (!AGENT_ROLE_ACCESS[agentCode].includes(user.rol)) {
        throw new AppError(
          `Tu rol '${user.rol}' no está autorizado para utilizar el ${AGENT_LABELS[agentCode]}. ` +
            `Agentes disponibles para tu rol: ${this.listAllowedAgentsForRole(user.rol)
              .map((c) => AGENT_LABELS[c])
              .join(', ') || 'ninguno'}.`,
          403,
          'FORBIDDEN_AGENT_FOR_ROLE'
        );
      }
    },

    assertWriteOptionAllowed(user, option) {
      if (!user) return;
      const perms = Array.isArray(user.permisos) ? user.permisos : [];
      const required = {
        guardar_propuesta: 'campanas:write',
        guardar_borrador: 'contenidos:write',
      }[option];
      if (required && !perms.includes(required)) {
        throw new AppError(
          `Tu rol '${user.rol}' puede consultar al agente, pero no guardar resultados (${option}) porque requiere el permiso '${required}'. ` +
            'Desactiva la opción de guardado y vuelve a enviar la solicitud.',
          403,
          'FORBIDDEN_AI_WRITE_OPTION'
        );
      }
    },

    validateMessage(message) {
      const text = String(message || '').trim();
      if (text.length < config.minMessageChars) {
        throw new AppError('Escribe una solicitud con al menos unos pocos caracteres.', 400, 'AI_MESSAGE_TOO_SHORT');
      }
      if (text.length > config.maxMessageChars) {
        throw new AppError(
          `La solicitud tiene ${text.length} caracteres y supera el máximo configurado de ${config.maxMessageChars} (AI_MAX_MESSAGE_CHARS). ` +
            'Divide la solicitud en partes o resume el texto y vuelve a enviarla.',
          413,
          'AI_MESSAGE_TOO_LONG',
          { maximo_caracteres: config.maxMessageChars, caracteres_recibidos: text.length }
        );
      }
      return text;
    },

    evaluateScope(message) {
      return evaluateClinicalScope(message);
    },

    enforceUserRate,

    assertActiveLimit(activeCount) {
      if (activeCount >= config.maxActivePerUser) {
        throw new AppError(
          `Ya tienes ${activeCount} solicitudes de IA en curso (límite AI_MAX_ACTIVE_PER_USER=${config.maxActivePerUser}). ` +
            'Puedes seguir usando VitaNexo; cuando alguna termine podrás enviar otra, o cancelar una pendiente.',
          429,
          'AI_ACTIVE_REQUESTS_LIMIT',
          { solicitudes_activas: activeCount, limite: config.maxActivePerUser }
        );
      }
    },
  };
}

module.exports = {
  createAiPolicyGuardService,
  evaluateClinicalScope,
  AGENT_ROLE_ACCESS,
  AGENT_LABELS,
};

