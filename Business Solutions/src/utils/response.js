function sendSuccess(res, data, message = 'Operación exitosa.', statusCode = 200, meta = undefined) {
  const payload = {
    ok: true,
    message,
    data,
  };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

function sendCreated(res, data, message = 'Registro creado exitosamente.') {
  return sendSuccess(res, data, message, 201);
}

module.exports = {
  sendSuccess,
  sendCreated,
};

