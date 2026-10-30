const http = require('http');
const { sanitizePayload, containsProhibitedClinicalData } = require('../../src/utils/sanitize');
const { mapDatabaseError } = require('../../src/utils/AppError');
const { createApp } = require('../../src/app');
const { createTestDbDouble } = require('../helpers/createTestDbDouble');

describe('Seguridad de Negocio, Sanitización, Mapeo de Errores MySQL y Rollback Transaccional', () => {
  test('sanitizePayload enmascara cualquier clave sensible antes de guardar auditoría', () => {
    const dirty = {
      campana_id: 1,
      mysql_password: 'mi_secreto_no_mostrar',
      apiKey: '123456',
      nested: {
        auth_token: 'abc',
        comentario: 'Dato comercial limpio',
      },
    };
    const clean = sanitizePayload(dirty);
    expect(clean.mysql_password).toBe('[REDACTED]');
    expect(clean.apiKey).toBe('[REDACTED]');
    expect(clean.nested.auth_token).toBe('[REDACTED]');
    expect(clean.nested.comentario).toBe('Dato comercial limpio');
  });

  test('containsProhibitedClinicalData detecta expedientes/diagnósticos clínicos con o sin tildes', () => {
    expect(containsProhibitedClinicalData('Adjunto diagnóstico clínico del paciente')).toBe(true);
    expect(containsProhibitedClinicalData('Expediente medico completo')).toBe(true);
    expect(
      containsProhibitedClinicalData('Necesitamos reducir ausentismo en la agenda administrativa')
    ).toBe(false);
  });

  test('mapDatabaseError traduce códigos reales de MySQL a códigos HTTP seguros sin filtrar trazas', () => {
    expect(mapDatabaseError({ code: 'ER_DUP_ENTRY' }).statusCode).toBe(409);
    expect(mapDatabaseError({ code: 'ER_NO_REFERENCED_ROW_2' }).statusCode).toBe(400);
    expect(mapDatabaseError({ code: 'ER_ROW_IS_REFERENCED_2' }).statusCode).toBe(409);
    expect(mapDatabaseError({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' }).statusCode).toBe(400);
    expect(mapDatabaseError({ code: 'ER_ACCESS_DENIED_ERROR' }).statusCode).toBe(503);
    expect(mapDatabaseError({ code: 'ECONNREFUSED' }).statusCode).toBe(503);
  });

  test('withTransaction revierte todos los cambios previos si ocurre un error intermedio', async () => {
    const db = createTestDbDouble();
    const before = await db.query('SELECT * FROM canales_mercadeo');

    await expect(
      db.withTransaction(async (tx) => {
        await tx.query(
          'INSERT INTO canales_mercadeo (codigo_canal, nombre, clasificacion, plataforma, descripcion, activo) VALUES (?, ?, ?, ?, ?, ?)',
          ['CAN-TMP-TX', 'Canal Transaccional Temporal', 'organico', 'Test', null, 1]
        );
        throw new Error('Fallo simulado a mitad de transacción');
      })
    ).rejects.toThrow(/Fallo simulado/);

    const after = await db.query('SELECT * FROM canales_mercadeo');
    expect(after.length).toBe(before.length);
  });

  test('Arranque real en puerto TCP efímero y respuesta HTTP completa', async () => {
    const app = createApp();
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.service).toBe('VitaNexo Backend API');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

