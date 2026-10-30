class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Traduce errores de MySQL (mysql2) a errores de dominio seguros sin exponer
 * credenciales, hosts internos ni consultas SQL crudas.
 */
function mapDatabaseError(err) {
  if (!err) {
    return new AppError('Error desconocido de base de datos.', 500, 'DATABASE_ERROR');
  }
  if (err instanceof AppError) {
    return err;
  }

  const code = err.code || '';

  if (code === 'ER_DUP_ENTRY') {
    return new AppError(
      'Ya existe un registro con uno de los valores únicos proporcionados.',
      409,
      'DUPLICATE_ENTRY'
    );
  }

  if (code === 'ER_NO_REFERENCED_ROW' || code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError(
      'Referencia inválida: uno de los identificadores relacionados no existe en el catálogo o tabla padre.',
      400,
      'FOREIGN_KEY_VIOLATION'
    );
  }

  if (code === 'ER_ROW_IS_REFERENCED' || code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError(
      'No se puede modificar o eliminar el registro porque está referenciado por otros movimientos.',
      409,
      'REFERENTIAL_INTEGRITY_CONFLICT'
    );
  }

  if (code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return new AppError(
      'Los datos incumplen una restricción de integridad (CHECK) del esquema.',
      400,
      'CHECK_CONSTRAINT_VIOLATION'
    );
  }

  if (code === 'ER_BAD_NULL_ERROR' || code === 'ER_NO_DEFAULT_FOR_FIELD') {
    return new AppError(
      'Falta un campo obligatorio requerido por la base de datos.',
      400,
      'MISSING_REQUIRED_FIELD'
    );
  }

  if (code === 'ER_DATA_TOO_LONG' || code === 'WARN_DATA_TRUNCATED' || code === 'ER_TRUNCATED_WRONG_VALUE') {
    return new AppError(
      'Uno de los campos tiene un formato, longitud o valor enumerado inválido.',
      400,
      'INVALID_DATA_FORMAT'
    );
  }

  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ER_ACCESS_DENIED_ERROR' ||
    code === 'ER_DBACCESS_DENIED_ERROR' ||
    code === 'ER_BAD_DB_ERROR'
  ) {
    return new AppError(
      'La conexión a la base de datos MySQL (VitaBase) no está disponible o requiere configuración de credenciales válidas.',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }

  return new AppError(
    'Ocurrió un error al procesar la operación en la base de datos.',
    500,
    'DATABASE_OPERATION_ERROR'
  );
}

module.exports = {
  AppError,
  mapDatabaseError,
};

