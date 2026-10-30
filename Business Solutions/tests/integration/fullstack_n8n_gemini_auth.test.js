const request = require('supertest');
const { createApp } = require('../../src/app');
const db = require('../../src/config/database');
const { env } = require('../../src/config/env');

jest.setTimeout(180000);

describe('Integración Real Full-Stack: Auth/RBAC, Dashboard, n8n Local, 4 Agentes Gemini API y VitaBase', () => {
  let appEnforced;
  let adminToken;
  let salesToken;
  let adminUser;

  beforeAll(async () => {
    appEnforced = createApp(db, { enforceAuth: true });
  });

  afterAll(async () => {
    await db.closePool();
  });

  test('1. Autenticación corporativa y RBAC: rechaza peticiones sin token (401), valida login real contra colaboradores de VitaBase y aplica permisos por rol (403)', async () => {
    // Endpoint público de colaboradores disponibles para inicio de sesión
    const collabRes = await request(appEnforced).get('/api/auth/colaboradores-disponibles');
    expect(collabRes.status).toBe(200);
    expect(Array.isArray(collabRes.body.data)).toBe(true);
    expect(collabRes.body.data.length).toBeGreaterThanOrEqual(4);

    // Petición protegida sin Bearer token -> 401
    const unauthRes = await request(appEnforced).get('/api/dashboard/resumen');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error.code).toBe('UNAUTHENTICATED');

    // Login con clave incorrecta -> 401
    const badLogin = await request(appEnforced).post('/api/auth/login').send({
      colaborador_id: collabRes.body.data[0].id,
      clave_acceso: 'ClaveIncorrecta999',
    });
    expect(badLogin.status).toBe(401);

    // Login como dirección comercial (tiene todos los permisos)
    const dirCollab =
      collabRes.body.data.find((c) => c.rol === 'direccion_comercial') || collabRes.body.data[0];
    const dirLogin = await request(appEnforced).post('/api/auth/login').send({
      colaborador_id: dirCollab.id,
      clave_acceso: env.auth.accessCode,
    });
    expect(dirLogin.status).toBe(200);
    expect(dirLogin.body.data.token).toBeTruthy();
    adminToken = dirLogin.body.data.token;
    adminUser = dirLogin.body.data.usuario;

    // Login como ejecutivo de ventas (NO tiene campanas:write ni contenidos:approve)
    const salesCollab = collabRes.body.data.find((c) => c.rol === 'ejecutivo_ventas');
    expect(salesCollab).toBeDefined();
    const salesLogin = await request(appEnforced).post('/api/auth/login').send({
      colaborador_id: salesCollab.id,
      clave_acceso: env.auth.accessCode,
    });
    expect(salesLogin.status).toBe(200);
    salesToken = salesLogin.body.data.token;

    // Ejecutivo de ventas intenta crear campaña -> 403 FORBIDDEN_ROLE_CAPABILITY
    const forbiddenCampaign = await request(appEnforced)
      .post('/api/campanas')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        nombre: 'Campaña No Autorizada',
        descripcion: 'Prueba RBAC',
        objetivo: 'Prueba RBAC',
        etapa_recorrido: 'conciencia',
        canal_principal_id: 1,
        fecha_inicio: '2026-11-01',
        fecha_fin: '2026-11-30',
        presupuesto_total_crc: 100000,
        justificacion_presupuesto: 'Prueba RBAC',
      });
    expect(forbiddenCampaign.status).toBe(403);
    expect(forbiddenCampaign.body.error.code).toBe('FORBIDDEN_ROLE_CAPABILITY');
  });

  test('2. Dashboard ejecutivo y Automatizaciones n8n devuelven datos reales de VitaBase y estado activo de webhooks autenticados', async () => {
    const dashRes = await request(appEnforced)
      .get('/api/dashboard/resumen')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.moneda).toBe('CRC');
    expect(Number(dashRes.body.data.clientes.total_clientes)).toBeGreaterThanOrEqual(4);
    expect(dashRes.body.data.automatizaciones_n8n.online).toBe(true);
    expect(dashRes.body.data.automatizaciones_n8n.webhook_autenticado).toBe(true);

    const autoRes = await request(appEnforced)
      .get('/api/automatizaciones/estado')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(autoRes.status).toBe(200);
    expect(autoRes.body.data.n8n.online).toBe(true);
    expect(autoRes.body.data.n8n.webhook_autenticado).toBe(true);
    expect(autoRes.body.data.workflows_activos).toBe(5);
  });

  test('3. Agente 1 (agente_campanas) ejecuta estrategia real vía n8n + Gemini API y guarda propuesta en VitaBase sin activar pauta', async () => {
    const idempKey = `jest-camp-${Date.now()}`;
    const res = await request(appEnforced)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Idempotency-Key', idempKey)
      .send({
        tipo_tarea: 'analizar_estrategia_campana_ia',
        parametros: {
          objetivo_comercial:
            'Captar centros de fisioterapia y consultorios médicos en la GAM interesados en automatizar recordatorios de citas y facturación en CRC.',
          presupuesto_disponible_crc: 320000,
          etapa_recorrido: 'consideracion',
          guardar_propuesta: true,
          responsable_id: adminUser.id,
        },
      });

    expect([200, 429]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.ejecucion.codigo_agente).toBe('agente_campanas');
      expect(res.body.data.ejecucion.estado).toBe('completada');
      expect(res.body.data.resumen.proveedor_ia).toBe('gemini-api');
      expect(res.body.data.resultado.restricciones_seguridad.publicidad_activada).toBe(false);
      expect(res.body.data.resultado.campana_persistida_vitabase).toBeTruthy();
      expect(res.body.data.resultado.campana_persistida_vitabase.estado).toBe('propuesta');
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'N8N_WORKFLOW_ERROR']).toContain(res.body.error?.code);
    }

    // Comprobar idempotencia: reenviar misma clave NO vuelve a cobrar Gemini ni duplica campaña
    const idempRepeat = await request(appEnforced)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Idempotency-Key', idempKey)
      .send({
        tipo_tarea: 'analizar_estrategia_campana_ia',
        parametros: {
          objetivo_comercial: 'Mismo envío idempotente',
          presupuesto_disponible_crc: 320000,
        },
      });
    expect([200, 409, 429]).toContain(idempRepeat.status);
    if (res.status === 200 && idempRepeat.status === 200) {
      expect(idempRepeat.body.data.idempotente_reutilizado).toBe(true);
      expect(idempRepeat.body.data.ejecucion.id).toBe(res.body.data.ejecucion.id);
    }
  });

  test('4. Agente 2 (agente_contenido) genera publicación, variantes y calendario vía n8n + Gemini API, persiste en revisión y cumple aprobación humana', async () => {
    const genRes = await request(appEnforced)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'generar_publicacion_ia',
        parametros: {
          campana_id: 1,
          canal_id: 2,
          tipo_contenido: 'publicacion_social',
          etapa_recorrido: 'consideracion',
          tema_central:
            'Reducción de ausentismo administrativo y orden financiero en clínicas de fisioterapia de Costa Rica',
          guardar_borrador: true,
          enviar_a_revision: true,
          revisor_id: adminUser.id,
        },
      });

    expect([200, 429]).toContain(genRes.status);
    if (genRes.status === 200) {
      expect(genRes.body.data.resumen.autoaprobado).toBe(false);
      expect(genRes.body.data.resumen.publicado_externamente).toBe(false);
      const draft = genRes.body.data.resultado.borrador_persistido_vitabase;
      expect(draft).toBeTruthy();
      expect(draft.estado).toBe('en_revision');
      expect(Array.isArray(genRes.body.data.resultado.variantes)).toBe(true);
      expect(genRes.body.data.resultado.variantes.length).toBeGreaterThanOrEqual(1);

      // Aprobación humana formal mediante endpoint de revisiones
      const approveRes = await request(appEnforced)
        .post(`/api/contenidos/${draft.id}/revisiones`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'aprobar',
          actor_tipo: 'humano',
          revisor_id: adminUser.id,
          comentarios: 'Aprobado por dirección comercial tras validar tono B2B Costa Rica.',
        });
      expect(approveRes.status).toBe(201);
      expect(approveRes.body.data.contenido.estado).toBe('aprobado');
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'N8N_WORKFLOW_ERROR']).toContain(genRes.body.error?.code);
    }
  });

  test('5. Agente 3 (agente_metricas) consulta los 8 KPIs SQL reales de VitaBase y los interpreta con Gemini API', async () => {
    const metRes = await request(appEnforced)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'interpretar_metricas_ia',
        parametros: {
          enfoque_analisis: 'Comparar ROAS, CAC y ciclo de venta entre campañas activas en CRC.',
        },
      });

    expect([200, 429]).toContain(metRes.status);
    if (metRes.status === 200) {
      expect(metRes.body.data.resultado.fuente_cifras).toBe('SQL_PARAMETRIZADO_VITABASE');
      expect(metRes.body.data.resultado.indicadores_sql.roas).toBeDefined();
      expect(metRes.body.data.resultado.interpretacion_ia.resumen_ejecutivo.length).toBeGreaterThan(40);
      expect(Array.isArray(metRes.body.data.resultado.interpretacion_ia.recomendaciones_mejora)).toBe(
        true
      );
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'N8N_WORKFLOW_ERROR']).toContain(metRes.body.error?.code);
    }
  });

  test('6. Agente 4 (agente_contactos_ventas) prioriza leads reales del embudo y redacta borradores comerciales sujetos a autorización humana, bloqueando datos clínicos', async () => {
    const salesRes = await request(appEnforced)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'analizar_embudo_y_priorizar_leads_ia',
        parametros: {
          contacto_id: 1,
          objetivo_comercial:
            'Priorizar contactos con mayor potencial en CRC y proponer borrador de seguimiento comercial.',
        },
      });

    expect([200, 429]).toContain(salesRes.status);
    if (salesRes.status === 200) {
      expect(salesRes.body.data.resultado.control_autorizacion.enviado_externamente).toBe(false);
      expect(salesRes.body.data.resultado.control_autorizacion.requiere_autorizacion_humana).toBe(true);
      expect(Array.isArray(salesRes.body.data.resultado.priorizacion_leads)).toBe(true);
      expect(Array.isArray(salesRes.body.data.resultado.borradores_mensajes_comerciales)).toBe(true);
    } else {
      expect(['AI_PROVIDER_RATE_LIMIT', 'N8N_WORKFLOW_ERROR']).toContain(salesRes.body.error?.code);
    }

    // Verificar rechazo de vocabulario clínico prohibido hacia n8n/Gemini
    const clinicalBlocked = await request(appEnforced)
      .post('/api/orquestador/ejecutar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_tarea: 'redactar_mensaje_comercial_ia',
        parametros: {
          organizacion_objetivo: 'Clínica Prueba',
          objetivo_comercial: 'Incluir expediente clínico y diagnóstico médico de pacientes',
        },
      });
    expect(clinicalBlocked.status).toBe(422);
  });
});

