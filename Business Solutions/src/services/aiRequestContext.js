const { AsyncLocalStorage } = require('async_hooks');

/**
 * Contexto asíncrono por solicitud de IA.
 *
 * Permite que el Centro de IA transmita al puente n8n (sin modificar la lógica
 * de los 4 agentes) el mensaje en lenguaje natural del colaborador, el historial
 * reciente de la conversación, el plan de proveedores/modelos asignado al agente
 * y la señal de cancelación (AbortSignal) de la solicitud en curso.
 */
const aiRequestStorage = new AsyncLocalStorage();

function runWithAiRequestContext(context, fn) {
  return aiRequestStorage.run(context, fn);
}

function getAiRequestContext() {
  return aiRequestStorage.getStore() || null;
}

module.exports = {
  runWithAiRequestContext,
  getAiRequestContext,
};

