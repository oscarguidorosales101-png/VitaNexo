const request = require('supertest');
const { createApp } = require('../../src/app');
const { assertValidDatabaseConfig, closePool } = require('../../src/config/database');

describe('Inicio del Servidor HTTP, Seguridad de Configuración y Endpoint de Salud Real', () => {
  afterAll(async () => {
    await closePool();
  });
  test('assertValidDatabaseConfig rechaza cualquier nombre de base distinto de VitaBase', () => {
    expect(() =>
      assertValidDatabaseConfig({
        host: '127.0.0.1',
        port: 3306,
        user: 'usuario',
        password: 'x',
        database: 'vitanexo',
      })
    ).toThrow(/VitaBase/i);
  });

  test('GET / inicia correctamente y responde JSON sin interfaz HTML', async () => {
    const app = createApp();
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('VitaNexo Backend API');
  });

  test('GET /api/health reporta con honestidad el estado real de conexión a MySQL VitaBase sin exponer secretos', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');

    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.api_status).toBe('online');
    expect(res.body.database).toBeDefined();
    expect(res.body.database.database.toLowerCase()).toBe('vitabase');

    // Nunca debe filtrar contraseñas ni cadenas de conexión
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/password|passwd|MYSQL_PASSWORD/i);

    if (res.statusCode === 503) {
      expect(res.body.ok).toBe(false);
      expect(res.body.database.connected).toBe(false);
    } else {
      expect(res.body.ok).toBe(true);
      expect(res.body.database.connected).toBe(true);
    }
  });

  test('Rutas inexistentes devuelven 404 ROUTE_NOT_FOUND y JSON malformado devuelve 400 INVALID_JSON', async () => {
    const app = createApp();

    const notFoundRes = await request(app).get('/api/ruta-que-no-existe');
    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.body.error.code).toBe('ROUTE_NOT_FOUND');

    const badJsonRes = await request(app)
      .post('/api/campanas')
      .set('Content-Type', 'application/json')
      .send('{"nombre": "json_incompleto"');
    expect(badJsonRes.statusCode).toBe(400);
    expect(badJsonRes.body.error.code).toBe('INVALID_JSON');
  });
});

