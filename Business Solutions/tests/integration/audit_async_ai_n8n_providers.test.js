const request = require('supertest');
const { createApp } = require('../../src/app');
const db = require('../../src/config/database');
const { env } = require('../../src/config/env');

jest.setTimeout(180000);

describe('Auditoría Integral de IA Asíncrona, n8n y Multiproveedor — Pruebas A a J', () => {
  let app;
  let adminToken;
  let salesToken;
  let adminUser;
  let salesUser;

  beforeAll(async () => {
    app = createApp(db, { enforceAuth: true });

    // Autenticar tokens reales contra colaboradores de VitaBase
    const collabs = await request(app).get('/api/auth/colaboradores-disponibles');
    const dir = collabs.body.data.find((c) => c.rol === 'direccion_comercial') || collabs.body.data[0];
    const dirLogin = await request(app).post('/api/auth/login').send({
      colaborador_id: dir.id,
      clave_acceso: env.auth.accessCode,
    });
    adminToken = dirLogin.body.data.token;
    adminUser = dirLogin.body.data.usuario;

    const sales = collabs.body.data.find((c) => c.rol === 'ejecutivo_ventas');
    if (sales) {
      const sLogin = await request(app).post('/api/auth/login').send({
        colaborador_id: sales.id,
        clave_acceso: env.auth.accessCode,
      });
      salesToken = sLogin.body.data.token;
      salesUser = sLogin.body.data.usuario;
    }
  });

  afterAll(async () => {
    // Esperar a que cualquier tarea encolada en segundo plano finalice limpiamente antes de cerrar el pool
    if (app && app.locals && app.locals.container && app.locals.container.services.aiCenterService) {
      await app.locals.container.services.aiCenterService.waitForIdle(12000);
    }
    await new Promise((r) => setTimeout(r, 1000));
    await db.closePool();
  });

  test('Prueba A: Comunicación y arranque de los 5 workflows de n8n', async () => {
    const res = await request(app)
      .get('/api/automatizaciones/estado')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.n8n.online).toBe(true);
    expect(res.body.data.n8n.webhook_autenticado).toBe(true);
    expect(res.body.data.workflows_activos).toBe(5);

    const wfList = await request(app)
      .get('/api/automatizaciones/workflows')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(wfList.status).toBe(200);
    expect(wfList.body.data.length).toBe(5);
    const wfIds = wfList.body.data.map((w) => w.workflow_id);
    expect(wfIds).toContain('VitaNexoAgCamp01');
    expect(wfIds).toContain('VitaNexoAgCont02');
    expect(wfIds).toContain('VitaNexoAgMetr03');
    expect(wfIds).toContain('VitaNexoAgVent04');
    expect(wfIds).toContain('VitaNexoHealth05');
  });

  test('Prueba B: Solicitud desde el endpoint de IA llega al Backend y se encola en segundo plano', async () => {
    const postRes = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_agente: 'agente_metricas',
        mensaje_usuario: 'Analiza el estado comercial actual y los indicadores en CRC de VitaNexo.',
      });

    expect([200, 202]).toContain(postRes.status);
    expect(postRes.body.ok).toBe(true);
    expect(postRes.body.data.codigo_solicitud).toMatch(/^SOL-\d{4}-[A-F0-9]+/);
    expect(postRes.body.data.codigo_agente).toBe('agente_metricas');
    expect(['pendiente', 'procesando', 'completada']).toContain(postRes.body.data.estado);
  });

  test('Prueba C: El proveedor de IA configurado (Gemini API vía n8n) responde realmente o reporta saturación de cuota', async () => {
    // Invocación a través del orquestador central que verifica respuesta real de Gemini
    const res = await request(app)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'interpretar_metricas_ia',
        parametros: {
          enfoque_analisis: 'Verificación de conectividad real con Gemini API y VitaBase.',
        },
      });

    if (res.status === 200) {
      expect(res.body.data.ejecucion.estado).toBe('completada');
      expect(res.body.data.resultado.interpretacion_ia).toBeDefined();
      expect(res.body.data.resultado.interpretacion_ia.resumen_ejecutivo).toBeTruthy();
      expect(res.body.data.resultado.metadatos_ia.modelo).toMatch(/gemini/i);
    } else {
      expect([429, 502]).toContain(res.status);
      expect(['AI_PROVIDER_RATE_LIMIT', 'AI_PROVIDER_EXECUTION_ERROR', 'N8N_WORKFLOW_ERROR']).toContain(
        res.body.error.code
      );
    }
  });

  test('Prueba D: Respuesta asíncrona: registro 202 -> procesando -> resolución mediante polling', async () => {
    const submit = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_agente: 'agente_campanas',
        mensaje_usuario: 'Recomienda una estrategia de captación para centros de fisioterapia en San José con 300000 CRC.',
        parametros: {
          presupuesto_disponible_crc: 300000,
        },
      });

    expect([200, 202]).toContain(submit.status);
    const reqId = submit.body.data.id;

    // Polling hasta completada o máximo 65 segundos
    let finalReq = null;
    const startPoll = Date.now();
    while (Date.now() - startPoll < 65000) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await request(app)
        .get(`/api/ia/solicitudes/${reqId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pollRes.status).toBe(200);
      if (['completada', 'error', 'cancelada'].includes(pollRes.body.data.estado)) {
        finalReq = pollRes.body.data;
        break;
      }
    }

    expect(finalReq).not.toBeNull();
    expect(['completada', 'error']).toContain(finalReq.estado);
    if (finalReq.estado === 'completada') {
      expect(finalReq.respuesta_texto.length).toBeGreaterThan(30);
      expect(finalReq.duracion_ms).toBeGreaterThan(0);
      expect(finalReq.respuesta_estructurada).toBeDefined();
    } else {
      expect(finalReq.codigo_error).toMatch(/AI_PROVIDER_RATE_LIMIT|AI_PROVIDER_EXECUTION_ERROR/);
    }
  });

  test('Prueba E: Persistencia en VitaBase tras simulación de recarga', async () => {
    const convs = await request(app)
      .get('/api/ia/conversaciones')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convs.status).toBe(200);
    expect(Array.isArray(convs.body.data)).toBe(true);
    expect(convs.body.data.length).toBeGreaterThanOrEqual(1);

    const firstConv = convs.body.data[0];
    const detail = await request(app)
      .get(`/api/ia/conversaciones/${firstConv.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.id).toBe(firstConv.id);
    expect(Array.isArray(detail.body.data.solicitudes)).toBe(true);
    expect(detail.body.data.solicitudes.length).toBeGreaterThanOrEqual(1);
  });

  test('Prueba F: Resiliencia ante errores y cancelación controlada', async () => {
    // 1. Envío de solicitud cancelable
    const sub = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_agente: 'agente_contenido',
        mensaje_usuario: 'Genera un artículo de blog sobre recepción digital.',
      });

    expect([200, 202]).toContain(sub.status);
    const cancelRes = await request(app)
      .post(`/api/ia/solicitudes/${sub.body.data.id}/cancelar`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cancelRes.status).toBe(200);
    expect(['cancelada', 'completada']).toContain(cancelRes.body.data.estado);

    // 2. Verificación de manejo limpio de parámetros inválidos (sin colgar el servidor)
    const badParams = await request(app)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'analizar_estrategia_campana_ia',
        parametros: null, // debe ser rechazado limpiamente con 400
      });
    expect(badParams.status).toBe(400);
  });

  test('Prueba G: Control de acceso por roles (RBAC) a los agentes de IA', async () => {
    if (!salesToken) return;

    // El ejecutivo de ventas NO tiene permitido utilizar el agente_campanas
    const forbiddenAg = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        codigo_agente: 'agente_campanas',
        mensaje_usuario: 'Planifica un presupuesto publicitario.',
      });

    expect(forbiddenAg.status).toBe(403);
    expect(forbiddenAg.body.error.code).toBe('FORBIDDEN_AGENT_FOR_ROLE');

    // Pero SÍ tiene permitido utilizar el agente_contactos_ventas
    const allowedAg = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        codigo_agente: 'agente_contactos_ventas',
        mensaje_usuario: '¿Cuáles leads tienen seguimiento prioritario hoy?',
      });

    expect([200, 202]).toContain(allowedAg.status);
  });

  test('Prueba H: Límites y guardián contextual de frontera clínica vs administrativa', async () => {
    // 1. Solicitud administrativa legítima que menciona 'paciente', 'clínica' y 'fisioterapia' -> DEBE PERMITIRSE
    const adminHealth = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_agente: 'agente_contenido',
        mensaje_usuario:
          'Redacta un mensaje para consultorios médicos explicando cómo reducir citas perdidas de pacientes de fisioterapia mediante recordatorios automáticos sin manejar datos clínicos.',
      });

    expect([200, 202]).toContain(adminHealth.status);
    expect(adminHealth.body.data.estado).not.toBe('error');

    // 2. Solicitud que pide emitir un diagnóstico médico real -> SE RECHAZA CLÍNICAMENTE Y SE OFRECE ALTERNATIVA
    const clinicalDiag = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_agente: 'agente_contenido',
        mensaje_usuario: 'Dime qué diagnóstico médico y qué medicamento recetar a un paciente con lumbalgia aguda.',
      });

    expect([200, 202]).toContain(clinicalDiag.status);
    expect(clinicalDiag.body.data.respuesta_texto).toMatch(/fuera del alcance|diagnóstico médico/i);
    expect(clinicalDiag.body.data.respuesta_texto).toMatch(/Alternativa administrativa sugerida/i);

    // 3. Límite de caracteres (mensaje excesivo) -> 413
    const tooLong = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_agente: 'agente_metricas',
        mensaje_usuario: 'A'.repeat(5000),
      });

    expect(tooLong.status).toBe(413);
    expect(tooLong.body.error.code).toBe('AI_MESSAGE_TOO_LONG');
  });

  test('Prueba I: Los 4 agentes especializados ejecutan con sus herramientas correspondientes', async () => {
    // Agente 1: Campañas (verifica canales y presupuesto en CRC)
    await new Promise((r) => setTimeout(r, 1000));
    const ag1 = await request(app)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'analizar_estrategia_campana_ia',
        parametros: {
          objetivo_comercial: 'Prueba I: Campañas B2B en Costa Rica',
          presupuesto_disponible_crc: 280000,
        },
      });
    expect([200, 429, 502]).toContain(ag1.status);
    if (ag1.status === 200) {
      expect(ag1.body.data.ejecucion.codigo_agente).toBe('agente_campanas');
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'AI_PROVIDER_EXECUTION_ERROR', 'N8N_WORKFLOW_ERROR']).toContain(
        ag1.body.error.code
      );
    }

    // Agente 2: Contenido (verifica variantes y borrador no autoaprobado)
    await new Promise((r) => setTimeout(r, 1000));
    const ag2 = await request(app)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'generar_publicacion_ia',
        parametros: {
          campana_id: 1,
          canal_id: 1,
          tipo_contenido: 'publicacion_social',
          tema_central: 'Prueba I: Contenido administrativo',
          guardar_borrador: false,
        },
      });
    expect([200, 429, 502]).toContain(ag2.status);
    if (ag2.status === 200) {
      expect(ag2.body.data.ejecucion.codigo_agente).toBe('agente_contenido');
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'AI_PROVIDER_EXECUTION_ERROR', 'N8N_WORKFLOW_ERROR']).toContain(
        ag2.body.error.code
      );
    }

    // Agente 3: Métricas (8 KPIs de VitaBase sin inventar números)
    await new Promise((r) => setTimeout(r, 1000));
    const ag3 = await request(app)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'interpretar_metricas_ia',
        parametros: {
          enfoque_analisis: 'Prueba I: Métricas reales',
        },
      });
    expect([200, 429, 502]).toContain(ag3.status);
    if (ag3.status === 200) {
      expect(ag3.body.data.ejecucion.codigo_agente).toBe('agente_metricas');
      expect(ag3.body.data.resultado.fuente_cifras).toBe('SQL_PARAMETRIZADO_VITABASE');
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'AI_PROVIDER_EXECUTION_ERROR', 'N8N_WORKFLOW_ERROR']).toContain(
        ag3.body.error.code
      );
    }

    // Agente 4: Ventas (priorización de leads y mensajes sin envío externo)
    await new Promise((r) => setTimeout(r, 1000));
    const ag4 = await request(app)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'analizar_embudo_y_priorizar_leads_ia',
        parametros: {
          objetivo_comercial: 'Prueba I: Embudo de ventas',
        },
      });
    expect([200, 429, 502]).toContain(ag4.status);
    if (ag4.status === 200) {
      expect(ag4.body.data.ejecucion.codigo_agente).toBe('agente_contactos_ventas');
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'AI_PROVIDER_EXECUTION_ERROR', 'N8N_WORKFLOW_ERROR']).toContain(
        ag4.body.error.code
      );
    }
  });

  test('Prueba J: Idempotencia y prevención de solicitudes duplicadas', async () => {
    const key = `idemp-test-${Date.now()}`;

    const first = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Idempotency-Key', key)
      .send({
        codigo_agente: 'agente_metricas',
        mensaje_usuario: 'Solicitud con clave de idempotencia.',
        idempotency_key: key,
      });

    expect([200, 202]).toContain(first.status);
    const firstId = first.body.data.id;

    // Segundo envío idéntico (simula doble clic o reconexión)
    const second = await request(app)
      .post('/api/ia/solicitudes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Idempotency-Key', key)
      .send({
        codigo_agente: 'agente_metricas',
        mensaje_usuario: 'Solicitud repetida con misma clave.',
        idempotency_key: key,
      });

    expect([200, 202]).toContain(second.status);
    expect(second.body.data.id).toBe(firstId);
    expect(second.body.idempotente_reutilizado).toBe(true);
  });
});
