const { validationResult } = require('express-validator');
const { AppError, mapDatabaseError } = require('../utils/AppError');
const { containsProhibitedClinicalData } = require('../utils/sanitize');

function validateRequest(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return next(
      new AppError(
        'Error de validación en los parámetros o cuerpo de la solicitud.',
        400,
        'VALIDATION_ERROR',
        formatted
      )
    );
  }

  // Verificar que ningún campo de texto contenga información médica/clínica prohibida
  if (req.body && typeof req.body === 'object') {
    for (const [field, val] of Object.entries(req.body)) {
      if (typeof val === 'string' && containsProhibitedClinicalData(val)) {
        return next(
          new AppError(
            `El campo '${field}' contiene vocabulario clínico o médico prohibido. VitaNexo solo procesa información administrativa y comercial.`,
            400,
            'PROHIBITED_CLINICAL_DATA'
          )
        );
      }
    }
  }

  return next();
}

/**
 * Limita los campos aceptados en req.body a una lista blanca explícita.
 */
function allowOnlyFields(allowedFields) {
  const allowedSet = new Set(allowedFields);
  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      const unknown = Object.keys(req.body).filter((k) => !allowedSet.has(k));
      if (unknown.length > 0) {
        return next(
          new AppError(
            `Campos no permitidos en la solicitud: ${unknown.join(', ')}.`,
            400,
            'UNEXPECTED_FIELDS',
            { unexpected_fields: unknown, allowed_fields: allowedFields }
          )
        );
      }
    }
    return next();
  };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(mapDatabaseError(err)));
  };
}

module.exports = {
  validateRequest,
  allowOnlyFields,
  asyncHandler,
};

