const { AppError, mapDatabaseError } = require('../utils/AppError');

function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      404,
      'ROUTE_NOT_FOUND'
    )
  );
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_JSON',
        message: 'El cuerpo de la petición contiene JSON malformado.',
      },
    });
  }

  const operationalError = err instanceof AppError ? err : mapDatabaseError(err);
  const statusCode = operationalError.statusCode || 500;

  const responsePayload = {
    ok: false,
    error: {
      code: operationalError.errorCode || 'INTERNAL_ERROR',
      message:
        statusCode >= 500 && operationalError.errorCode === 'DATABASE_OPERATION_ERROR'
          ? 'Error interno al procesar la operación. Consulte los registros del servidor.'
          : operationalError.message,
    },
  };

  if (operationalError.details) {
    responsePayload.error.details = operationalError.details;
  }

  return res.status(statusCode).json(responsePayload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

