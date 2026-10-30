const http = require('http');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { checkDatabaseHealth, closePool, query } = require('../../src/config/database');

function listenAsync(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
    server.on('error', reject);
  });
}

function closeServerAsync(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('Integración Real con MySQL 8.0 VitaBase y Persistencia tras Reinicio del Servidor', () => {
  let dbHealth = null;

  beforeAll(async () => {
    dbHealth = await checkDatabaseHealth();
  });

  afterAll(async () => {
    await closePool();
  });

  test('Conexión real activa a MySQL 8.0 VitaBase verificada mediante /api/health', async () => {
    expect(dbHealth).toBeDefined();
    expect(dbHealth.connected).toBe(true);
    expect(dbHealth.database.toLowerCase()).toBe('vitabase');

    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.database.connected).toBe(true);
    expect(res.body.database.database.toLowerCase()).toBe('vitabase');
    expect(JSON.stringify(res.body)).not.toMatch(/password|passwd|MYSQL_PASSWORD/i);
  });

  test('Consulta real de entidades pobladas en VitaBase a través de la API REST', async () => {
    const app = createApp();

    const [clientes, servicios, contratos, campanas, contenidos, contactos, traspasos, oportunidades, agentes] =
      await Promise.all([
        request(app).get('/api/clientes'),
        request(app).get('/api/servicios'),
        request(app).get('/api/contratos-servicios'),
        request(app).get('/api/campanas'),
        request(app).get('/api/contenidos'),
        request(app).get('/api/contactos'),
        request(app).get('/api/traspasos-ventas'),
        request(app).get('/api/oportunidades'),
        request(app).get('/api/agentes'),
      ]);

    expect(clientes.statusCode).toBe(200);
    expect(clientes.body.data.length).toBeGreaterThanOrEqual(10);

    expect(servicios.statusCode).toBe(200);
    expect(servicios.body.data.length).toBeGreaterThanOrEqual(5);

    expect(contratos.statusCode).toBe(200);
    expect(contratos.body.data.length).toBeGreaterThanOrEqual(10);

    expect(campanas.statusCode).toBe(200);
    expect(campanas.body.data.length).toBeGreaterThanOrEqual(10);

    expect(contenidos.statusCode).toBe(200);
    expect(contenidos.body.data.length).toBeGreaterThanOrEqual(10);

    expect(contactos.statusCode).toBe(200);
    expect(contactos.body.data.length).toBeGreaterThanOrEqual(10);

    expect(traspasos.statusCode).toBe(200);
    expect(traspasos.body.data.length).toBeGreaterThanOrEqual(10);

    expect(oportunidades.statusCode).toBe(200);
    expect(oportunidades.body.data.length).toBeGreaterThanOrEqual(10);

    expect(agentes.statusCode).toBe(200);
    expect(agentes.body.data.length).toBeGreaterThanOrEqual(5);
  });

  test('Las 8 consultas SQL de métricas responden correctamente sobre datos reales de VitaBase', async () => {
    const app = createApp();
    const endpoints = [
      '/api/metricas/indicadores/cpc',
      '/api/metricas/indicadores/ctr',
      '/api/metricas/indicadores/cac',
      '/api/metricas/indicadores/roas',
      '/api/metricas/indicadores/conversiones-embudo',
      '/api/metricas/indicadores/ciclo-venta',
      '/api/metricas/indicadores/ticket-promedio',
      '/api/metricas/indicadores/vanidad-vs-negocio',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toBeDefined();
    }
  });

  test('Orquestador central ejecuta tareas reales sobre MySQL y persiste auditoría en ejecuciones_agentes', async () => {
    const app = createApp();

    const execRes = await request(app)
      .post('/api/orquestador/ejecutar')
      .send({
        tipo_tarea: 'diagnosticar_indicadores_integrales',
        parametros: { campana_id: 1 },
      });

    expect(execRes.statusCode).toBe(200);
    expect(execRes.body.ok).toBe(true);
    expect(execRes.body.data.ejecucion.codigo_agente).toBe('agente_metricas');
    const executionId = execRes.body.data.ejecucion.id;
    expect(executionId).toBeGreaterThan(0);

    // Comprobar directamente en MySQL que la fila de auditoría quedó persistida en ejecuciones_agentes
    const persistedRows = await query('SELECT id, codigo_ejecucion, estado, tipo_tarea FROM ejecuciones_agentes WHERE id = ?', [
      executionId,
    ]);
    expect(persistedRows).toHaveLength(1);
    expect(persistedRows[0].estado).toBe('completada');
    expect(persistedRows[0].tipo_tarea).toBe('diagnosticar_indicadores_integrales');
  });

  test('Persistencia real tras cierre completo del servidor HTTP y del pool MySQL y posterior reinicio', async () => {
    const uniqueSuffix = Date.now();
    const codigoCanal = `CAN-LIVE-${uniqueSuffix}`.slice(0, 35);
    const nombreCanal = `Canal Persistencia Real ${uniqueSuffix}`;

    // 1. Levantar servidor HTTP #1 en puerto TCP real y crear registro
    const instance1 = await listenAsync(createApp());
    let createdId = null;
    try {
      const postRes = await fetch(`${instance1.baseUrl}/api/canales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_canal: codigoCanal,
          nombre: nombreCanal,
          clasificacion: 'organico',
          plataforma: 'Directorio Médico Empresarial CR',
          descripcion: 'Canal de verificación no destructiva de persistencia real tras reinicio.',
          activo: false,
        }),
      });
      expect(postRes.status).toBe(201);
      const postBody = await postRes.json();
      createdId = postBody.data.id;
      expect(createdId).toBeGreaterThan(0);
    } finally {
      // 2. Apagar completamente el servidor HTTP #1 y cerrar el pool MySQL (simulando parada total)
      await closeServerAsync(instance1.server);
      await closePool();
    }

    // 3. Levantar una nueva instancia independiente del servidor HTTP #2 (con nuevo pool MySQL)
    const instance2 = await listenAsync(createApp());
    try {
      const getRes = await fetch(`${instance2.baseUrl}/api/canales/${createdId}`);
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.data.id).toBe(createdId);
      expect(getBody.data.codigo_canal).toBe(codigoCanal);
      expect(getBody.data.nombre).toBe(nombreCanal);
    } finally {
      await closeServerAsync(instance2.server);
    }

    // 4. Confirmar en SQL directo que la base activa sigue siendo VitaBase
    const dbCheck = await query('SELECT DATABASE() AS db_name');
    expect(dbCheck[0].db_name.toLowerCase()).toBe('vitabase');
  });
});
