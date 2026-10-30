const crypto = require('crypto');

const SENSITIVE_KEY_PATTERN = /(password|passwd|pwd|secret|token|api[_-]?key|authorization|credential)/i;

/**
 * Elimina o enmascara cualquier clave potencialmente sensible antes de
 * guardar resúmenes de entrada/salida en ejecuciones_agentes o registros.
 */
function sanitizePayload(value, depth = 0) {
  if (depth > 5) {
    return '[TRUNCATED]';
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > 400 ? `${value.slice(0, 400)}...` : value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizePayload(item, depth + 1));
  }

  const clean = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      clean[k] = '[REDACTED]';
    } else {
      clean[k] = sanitizePayload(v, depth + 1);
    }
  }
  return clean;
}

/**
 * Genera códigos de negocio legibles y únicos (ej. CMP-2026-A1B2C3).
 */
function generateBusinessCode(prefix) {
  const year = new Date().getUTCFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${suffix}`;
}

/**
 * Detecta términos clínicos prohibidos para impedir el almacenamiento
 * accidental de diagnósticos, expedientes o datos médicos sensibles.
 */
const CLINICAL_DATA_PATTERN = /\b(diagnostico\s+clinico|expediente\s+medico|historial\s+clinico|receta\s+medica|patologia\s+del\s+paciente|sintomas\s+del\s+paciente)\b/i;

function containsProhibitedClinicalData(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CLINICAL_DATA_PATTERN.test(normalized);
}

module.exports = {
  sanitizePayload,
  generateBusinessCode,
  containsProhibitedClinicalData,
};

