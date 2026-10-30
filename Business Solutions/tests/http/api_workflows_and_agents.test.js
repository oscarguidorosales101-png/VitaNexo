const request = require('supertest');
const { createApp } = require('../../src/app');
const { createTestDbDouble } = require('../helpers/createTestDbDouble');

describe('Flujos Completos REST, Reglas de Negocio, Métricas, Agentes y Orquestador Central', () => {
  const testDb = createTestDbDouble();
  let app;

  beforeEach(() => {
    testDb.reset();
    app = createApp(testDb);
  });

  // ---------------------------------------------------------------------------
  // 1. CLIENTES, SERVICIOS, VALIDACIONES, CLAVES FORÁNEAS Y UNICIDAD
  // ---------------------------------------------------------------------------
  test('Lectura y escritura de clientes, contactos y contratos de servicios', async () => {
    const createClientRes = await request(app).post('/api/clientes').send({
      nombre_comercial: 'Centro Fisioterapia Valle Azul',
      razon_social: 'Valle Azul Terapia S.A.',
      cedula_juridica: '3-101-998877',
      tipo_organizacion_id: 1,
      provincia: 'Cartago',
      canton: 'Cartago',
      correo_corporativo: 'administracion@valleazul.cr.example',
      telefono_principal: '+506 2551-9988',
      fecha_alta: '2026-04-10',
    });
    expect(createClientRes.statusCode).toBe(201);
    expect(createClientRes.body.data.codigo_cliente).toMatch(/^CLI-/);
    const clienteId = createClientRes.body.data.id;

    // Agregar contacto comercial del cliente
    const contactRes = await request(app).post(`/api/clientes/${clienteId}/contactos`).send({
      nombre_completo: 'Paula Méndez Mora',
      cargo: 'Coordinadora Administrativa',
      correo: 'pmendez@valleazul.cr.example',
      telefono: '+506 8877-6655',
      es_contacto_principal: true,
    });
    expect(contactRes.statusCode).toBe(201);

    // Contratar un servicio del catálogo
    const contractRes = await request(app).post('/api/contratos-servicios').send({
      cliente_id: clienteId,
      servicio_id: 1,
      fecha_contratacion: '2026-04-10',
      fecha_inicio_servicio: '2026-04-12',
      precio_acordado_crc: 52000,
      estado_contrato: 'activo',
    });
    expect(contractRes.statusCode).toBe(201);

    // Consultar detalle consolidado del cliente
    const detailRes = await request(app).get(`/api/clientes/${clienteId}`);
    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.data.contactos_comerciales.length).toBe(1);
    expect(detailRes.body.data.servicios_contratados.length).toBe(1);
  });

  test('Validaciones de campos obligatorios, campos inesperados, claves foráneas inválidas y unicidad', async () => {
    // Campos obligatorios faltantes
    const missingFields = await request(app).post('/api/clientes').send({
      nombre_comercial: 'Incompleto',
    });
    expect(missingFields.statusCode).toBe(400);
    expect(missingFields.body.error.code).toBe('VALIDATION_ERROR');

    // Campos no permitidos (whitelist)
    const unexpectedField = await request(app).post('/api/canales').send({
      nombre: 'Canal X',
      clasificacion: 'organico',
      plataforma: 'Web',
      campo_intruso_sql: 'DROP TABLE clientes',
    });
    expect(unexpectedField.statusCode).toBe(400);
    expect(unexpectedField.body.error.code).toBe('UNEXPECTED_FIELDS');

    // Clave foránea inválida (tipo_organizacion_id inexistente)
    const invalidFk = await request(app).post('/api/clientes').send({
      nombre_comercial: 'Clínica FK Inválida',
      razon_social: 'Clínica FK S.A.',
      cedula_juridica: '3-101-554433',
      tipo_organizacion_id: 9999,
      provincia: 'Heredia',
      canton: 'Belén',
      correo_corporativo: 'fk@clinica.cr.example',
      telefono_principal: '+506 2239-0000',
    });
    expect(invalidFk.statusCode).toBe(400);
    expect(invalidFk.body.error.code).toBe('FOREIGN_KEY_VIOLATION');

    // Violación de restricción de unicidad (cédula jurídica duplicada con cliente semilla)
    const duplicateUnique = await request(app).post('/api/clientes').send({
      nombre_comercial: 'Clínica Duplicada',
      razon_social: 'Duplicada S.A.',
      cedula_juridica: '3-101-111111',
      tipo_organizacion_id: 1,
      provincia: 'San José',
      canton: 'San José',
      correo_corporativo: 'otro@cumbre.cr.example',
      telefono_principal: '+506 2222-3333',
    });
    expect(duplicateUnique.statusCode).toBe(409);
    expect(duplicateUnique.body.error.code).toBe('DUPLICATE_ENTRY');

    // Bloqueo de datos clínicos/médicos prohibidos
    const clinicalData = await request(app).post('/api/contactos').send({
      nombre_completo: 'Pedro Mora',
      cargo: 'Administrador',
      nombre_organizacion: 'Consultorio Norte',
      tipo_organizacion_id: 2,
      correo: 'pmora@norte.cr.example',
      telefono: '+506 2211-0000',
      provincia: 'Alajuela',
      fuente_origen: 'sitio_web',
      necesidad_comercial: 'Adjunto diagnostico clinico y expediente medico de pacientes.',
    });
    expect(clinicalData.statusCode).toBe(400);
    expect(clinicalData.body.error.code).toBe('PROHIBITED_CLINICAL_DATA');
  });

  // ---------------------------------------------------------------------------
  // 2. CAMPAÑAS Y PRESUPUESTO
  // ---------------------------------------------------------------------------
  test('Creación y consulta de campañas y validación de límites de presupuesto por canal', async () => {
    const campRes = await request(app).post('/api/campanas').send({
      nombre: 'Campaña Búsqueda Consultorios Heredia',
      descripcion: 'Anuncios para consultorios médicos en Heredia.',
      objetivo: 'Lograr 15 demostraciones agendadas.',
      etapa_recorrido: 'decision',
      canal_principal_id: 1,
      responsable_id: 1,
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-06-30',
      presupuesto_total_crc: 250000,
      justificacion_presupuesto: 'Demanda creciente en Heredia centro.',
      costo_operativo_mercadeo_crc: 40000,
      estado: 'planificada',
    });
    expect(campRes.statusCode).toBe(201);
    const campanaId = campRes.body.data.id;

    // Asignación válida dentro del presupuesto
    const allocOk = await request(app).post('/api/asignaciones-presupuesto').send({
      campana_id: campanaId,
      canal_id: 1,
      responsable_id: 1,
      periodo_inicio: '2026-05-01',
      periodo_fin: '2026-05-31',
      monto_asignado_crc: 150000,
      razon_decision: 'Primer mes de pauta.',
    });
    expect(allocOk.statusCode).toBe(201);

    // Asignación que excede el presupuesto total debe rechazarse (150k + 120k > 250k)
    const allocExceed = await request(app).post('/api/asignaciones-presupuesto').send({
      campana_id: campanaId,
      canal_id: 1,
      responsable_id: 1,
      periodo_inicio: '2026-06-01',
      periodo_fin: '2026-06-30',
      monto_asignado_crc: 120000,
      razon_decision: 'Exceso de presupuesto.',
    });
    expect(allocExceed.statusCode).toBe(409);
    expect(allocExceed.body.error.code).toBe('BUDGET_ALLOCATION_EXCEEDS_CAMPAIGN_TOTAL');

    // Gasto publicitario en canal orgánico debe rechazarse
    const organicSpend = await request(app).post('/api/asignaciones-presupuesto').send({
      campana_id: campanaId,
      canal_id: 2,
      responsable_id: 1,
      periodo_inicio: '2026-06-01',
      periodo_fin: '2026-06-30',
      monto_asignado_crc: 50000,
      razon_decision: 'Intento inválido en canal orgánico.',
    });
    expect(organicSpend.statusCode).toBe(400);
    expect(organicSpend.body.error.code).toBe('ORGANIC_CHANNEL_AD_SPEND_FORBIDDEN');
  });

  // ---------------------------------------------------------------------------
  // 3. CONTENIDO, APROBACIONES Y PROHIBICIÓN DE PUBLICAR SIN APROBACIÓN
  // ---------------------------------------------------------------------------
  test('Flujo completo de contenido: borrador -> revisión -> rechazo -> edición -> aprobación -> publicación y bloqueo sin aprobación', async () => {
    // 1. Crear borrador (autor colaborador 1)
    const draftRes = await request(app).post('/api/contenidos').send({
      campana_id: 1,
      canal_id: 1,
      autor_colaborador_id: 1,
      titulo: 'Guía de Confirmación de Citas',
      etapa_recorrido: 'consideracion',
      tipo_contenido: 'guia_descargable',
      cuerpo_borrador: 'Texto versión 1.',
    });
    expect(draftRes.statusCode).toBe(201);
    const contenidoId = draftRes.body.data.id;
    expect(draftRes.body.data.estado).toBe('borrador');

    // 2. Intentar publicar en estado borrador -> PROHIBIDO (409)
    const pubUnapproved = await request(app).post(`/api/contenidos/${contenidoId}/publicar`).send({});
    expect(pubUnapproved.statusCode).toBe(409);
    expect(pubUnapproved.body.error.code).toBe('CONTENT_NOT_APPROVED_FOR_PUBLICATION');

    // 3. Enviar a revisión
    const sendRev = await request(app).post(`/api/contenidos/${contenidoId}/revisiones`).send({
      revisor_id: 1,
      decision: 'enviar_a_revision',
      comentarios: 'Listo para revisión de dirección comercial.',
    });
    expect(sendRev.statusCode).toBe(201);
    expect(sendRev.body.data.contenido.estado).toBe('en_revision');

    // 4. Autor intenta aprobar su propio borrador -> PROHIBIDO (403)
    const selfApprove = await request(app).post(`/api/contenidos/${contenidoId}/revisiones`).send({
      revisor_id: 1,
      decision: 'aprobar',
      comentarios: 'Intento auto-aprobarme.',
    });
    expect(selfApprove.statusCode).toBe(403);
    expect(selfApprove.body.error.code).toBe('AUTHOR_SELF_APPROVAL_FORBIDDEN');

    // 5. Agente intenta aprobar -> PROHIBIDO (403)
    const agentApprove = await request(app).post(`/api/contenidos/${contenidoId}/revisiones`).send({
      revisor_id: 2,
      decision: 'aprobar',
      comentarios: 'Aprobación automática prohibida.',
      actor_tipo: 'agente',
    });
    expect(agentApprove.statusCode).toBe(403);
    expect(agentApprove.body.error.code).toBe('AGENT_SELF_APPROVAL_FORBIDDEN');

    // 6. Revisor distinto (colaborador 2) rechaza solicitando ajustes
    const rejectRes = await request(app).post(`/api/contenidos/${contenidoId}/revisiones`).send({
      revisor_id: 2,
      decision: 'rechazar',
      comentarios: 'Agregar mención a tarifas en colones.',
    });
    expect(rejectRes.statusCode).toBe(201);
    expect(rejectRes.body.data.contenido.estado).toBe('rechazado');

    // 7. Editar el contenido rechazado -> incrementa versión a 2 y regresa automáticamente a 'en_revision'
    const editRes = await request(app).patch(`/api/contenidos/${contenidoId}`).send({
      cuerpo_borrador: 'Texto versión 2 con ejemplos en colones costarricenses.',
    });
    expect(editRes.statusCode).toBe(200);
    expect(editRes.body.data.version_actual).toBe(2);
    expect(editRes.body.data.estado).toBe('en_revision');

    // 8. Revisor 2 aprueba la versión 2
    const approveRes = await request(app).post(`/api/contenidos/${contenidoId}/revisiones`).send({
      revisor_id: 2,
      decision: 'aprobar',
      comentarios: 'Versión 2 aprobada.',
    });
    expect(approveRes.statusCode).toBe(201);
    expect(approveRes.body.data.contenido.estado).toBe('aprobado');

    // 9. Publicar contenido aprobado -> ÉXITO (200)
    const pubApproved = await request(app).post(`/api/contenidos/${contenidoId}/publicar`).send({});
    expect(pubApproved.statusCode).toBe(200);
    expect(pubApproved.body.data.estado).toBe('publicado');
    expect(pubApproved.body.data.fecha_publicacion).toBeTruthy();

    // 10. Verificar que el historial completo conserva las 3 revisiones sin sobrescribir ninguna
    const detail = await request(app).get(`/api/contenidos/${contenidoId}`);
    expect(detail.body.data.historial_revisiones.length).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // 4. CONTACTOS, EMBUDO, TRASPASOS A VENTAS Y OPORTUNIDADES GANADAS/PERDIDAS
  // ---------------------------------------------------------------------------
  test('Recorrido comercial: creación de lead, cambio de etapa, traspaso rechazado/aceptado y cierre de oportunidades', async () => {
    // 1. Crear lead
    const leadRes = await request(app).post('/api/contactos').send({
      nombre_completo: 'Carlos Brenes Solano',
      cargo: 'Administrador',
      nombre_organizacion: 'Fisioterapia Activa Cartago',
      tipo_organizacion_id: 1,
      correo: 'cbrenes@activacartago.cr.example',
      telefono: '+506 2552-3344',
      provincia: 'Cartago',
      fuente_origen: 'campana_digital',
      campana_origen_id: 1,
      canal_origen_id: 1,
      puntuacion_lead: 82,
      necesidad_comercial: 'Automatizar agenda y recordatorios de sesiones.',
      presupuesto_declarado_crc: 100000,
      fecha_captura_lead: '2026-04-01 09:00:00',
    });
    expect(leadRes.statusCode).toBe(201);
    const contactoId = leadRes.body.data.id;
    expect(leadRes.body.data.etapa_actual_codigo).toBe('lead');

    // 2. Transición a prospecto_calificado
    const stageRes = await request(app).post(`/api/contactos/${contactoId}/etapa`).send({
      codigo_etapa_nueva: 'prospecto_calificado',
      cambiado_por_id: 1,
      fecha_transicion: '2026-04-03 10:00:00',
      motivo: 'Validación telefónica exitosa.',
    });
    expect(stageRes.statusCode).toBe(200);
    expect(stageRes.body.data.etapa_actual_codigo).toBe('prospecto_calificado');

    // 3. Crear primer traspaso y probar rechazo SIN motivo (debe fallar 400) y CON motivo (mueve a nutricion_futura)
    const handoff1 = await request(app).post('/api/traspasos-ventas').send({
      contacto_id: contactoId,
      entregado_por_id: 1,
      recibido_por_id: 3,
      observaciones_seguimiento: 'Solicita llamada por la tarde.',
    });
    expect(handoff1.statusCode).toBe(201);

    const rejectNoReason = await request(app)
      .post(`/api/traspasos-ventas/${handoff1.body.data.id}/decision`)
      .send({ decision_ventas: 'rechazado' });
    expect(rejectNoReason.statusCode).toBe(400);
    expect(rejectNoReason.body.error.code).toBe('REJECTION_REASON_REQUIRED');

    const rejectWithReason = await request(app)
      .post(`/api/traspasos-ventas/${handoff1.body.data.id}/decision`)
      .send({
        decision_ventas: 'rechazado',
        motivo_decision: 'Faltaba confirmar socio financiero.',
      });
    expect(rejectWithReason.statusCode).toBe(200);
    expect(rejectWithReason.body.data.decision_ventas).toBe('rechazado');

    // 4. Nuevo traspaso tras maduración -> aceptado por ventas
    const handoff2 = await request(app).post('/api/traspasos-ventas').send({
      contacto_id: contactoId,
      entregado_por_id: 1,
      recibido_por_id: 3,
      observaciones_seguimiento: 'Socio financiero confirmado.',
    });
    const acceptHandoff = await request(app)
      .post(`/api/traspasos-ventas/${handoff2.body.data.id}/decision`)
      .send({
        decision_ventas: 'aceptado',
        motivo_decision: 'Cumple criterios SQL.',
      });
    expect(acceptHandoff.statusCode).toBe(200);
    expect(acceptHandoff.body.data.decision_ventas).toBe('aceptado');

    // 5. Crear oportunidad comercial y validar prohibición de ganarla sin monto_cierre_crc
    const oppRes = await request(app).post('/api/oportunidades').send({
      contacto_id: contactoId,
      responsable_ventas_id: 3,
      titulo_propuesta: 'VitaAgenda Pro - Fisioterapia Activa',
      servicio_principal_id: 1,
      valor_estimado_crc: 105000,
      fecha_apertura: '2026-04-06 11:00:00',
    });
    expect(oppRes.statusCode).toBe(201);
    const oppId = oppRes.body.data.id;

    const invalidWin = await request(app).post(`/api/oportunidades/${oppId}/cerrar`).send({
      resultado_cierre: 'ganada',
      motivo_cierre: 'Intentando ganar sin monto.',
    });
    expect(invalidWin.statusCode).toBe(400);
    expect(invalidWin.body.error.code).toBe('WIN_AMOUNT_REQUIRED');

    // Cierre ganado válido
    const validWin = await request(app).post(`/api/oportunidades/${oppId}/cerrar`).send({
      resultado_cierre: 'ganada',
      monto_cierre_crc: 100000,
      motivo_cierre: 'Contrato firmado por 12 meses.',
      fecha_cierre: '2026-04-20 15:00:00',
    });
    expect(validWin.statusCode).toBe(200);
    expect(validWin.body.data.estado_oportunidad).toBe('ganada');

    // Crear segunda oportunidad y cerrarla como perdida
    const oppLostCreate = await request(app).post('/api/oportunidades').send({
      contacto_id: 1,
      responsable_ventas_id: 3,
      titulo_propuesta: 'Expansión Analítica',
      valor_estimado_crc: 75000,
      fecha_apertura: '2026-04-10 09:00:00',
    });
    const validLoss = await request(app)
      .post(`/api/oportunidades/${oppLostCreate.body.data.id}/cerrar`)
      .send({
        resultado_cierre: 'perdida',
        motivo_cierre: 'Pospuesto para el próximo año.',
        fecha_cierre: '2026-04-22 10:00:00',
      });
    expect(validLoss.statusCode).toBe(200);
    expect(validLoss.body.data.estado_oportunidad).toBe('perdida');
  });

  // ---------------------------------------------------------------------------
  // 5. CÁLCULO DE MÉTRICAS Y MANEJO DE DIVISIONES POR CERO
  // ---------------------------------------------------------------------------
  test('Cálculo exacto de CPC, CTR, CAC, ROAS, conversiones, ciclo de venta, ticket promedio y divisiones por cero', async () => {
    const cpc = await request(app).get('/api/metricas/indicadores/cpc');
    expect(cpc.statusCode).toBe(200);
    const paidCpc = cpc.body.data.resultados.find((r) => r.campana_id === 1);
    const zeroClickCpc = cpc.body.data.resultados.find((r) => r.campana_id === 2);
    expect(paidCpc.cpc_crc).toBe(400); // 200000 / 500
    expect(zeroClickCpc.cpc_crc).toBeNull();
    expect(zeroClickCpc.estado_calculo).toBe('NO_CALCULABLE_CERO_CLICS');

    const ctr = await request(app).get('/api/metricas/indicadores/ctr');
    expect(ctr.statusCode).toBe(200);
    expect(ctr.body.data.resultados.find((r) => r.campana_id === 1).ctr_porcentaje).toBe(5); // 500 / 10000 * 100
    expect(ctr.body.data.resultados.find((r) => r.campana_id === 2).ctr_porcentaje).toBeNull();

    const cac = await request(app).get('/api/metricas/indicadores/cac');
    expect(cac.statusCode).toBe(200);
    // (200000 ad + 50000 mkt + 50000 ventas) / 2 clientes = 150000
    expect(cac.body.data.resultados.find((r) => r.campana_id === 1).cac_crc).toBe(150000);
    expect(cac.body.data.resultados.find((r) => r.campana_id === 2).cac_crc).toBeNull();

    const roas = await request(app).get('/api/metricas/indicadores/roas');
    expect(roas.statusCode).toBe(200);
    expect(roas.body.data.resultados.find((r) => r.campana_id === 1).roas_ratio).toBe(3); // 600000 / 200000
    expect(roas.body.data.resultados.find((r) => r.campana_id === 2).roas_ratio).toBeNull();

    const conv = await request(app).get('/api/metricas/indicadores/conversiones-embudo');
    expect(conv.statusCode).toBe(200);
    expect(conv.body.data.resultados.length).toBe(5);

    const cycle = await request(app).get('/api/metricas/indicadores/ciclo-venta');
    expect(cycle.statusCode).toBe(200);
    expect(cycle.body.data.resultados.resumen.promedio_dias_ciclo_venta).toBe(20); // 2026-01-15 -> 2026-02-04

    const ticket = await request(app).get('/api/metricas/indicadores/ticket-promedio');
    expect(ticket.statusCode).toBe(200);
    expect(ticket.body.data.resultados[0].ticket_promedio_crc).toBe(95000);

    const vanity = await request(app).get('/api/metricas/indicadores/vanidad-vs-negocio');
    expect(vanity.statusCode).toBe(200);
    expect(
      vanity.body.data.resultados.find((r) => r.campana_id === 2).diagnostico_comparativo
    ).toBe('ALERTA_ALTA_VANIDAD_SIN_VENTAS');
  });

  // ---------------------------------------------------------------------------
  // 6. ORQUESTADOR CENTRAL, 4 AGENTES Y AUDITORÍA DE ERRORES
  // ---------------------------------------------------------------------------
  test('Orquestador ejecuta tareas en los 4 agentes y audita tanto ejecuciones exitosas como errores de negocio', async () => {
    // Agente 1: proponer campaña
    const agCamp = await request(app).post('/api/orquestador/ejecutar').send({
      tipo_tarea: 'proponer_campana',
      parametros: {
        nombre: 'Propuesta Automatizada Consultorios Alajuela',
        descripcion: 'Campaña regional propuesta por agente.',
        objetivo: 'Captar 10 leads calificados.',
        etapa_recorrido: 'consideracion',
        canal_principal_id: 1,
        fecha_inicio: '2026-06-01',
        fecha_fin: '2026-06-30',
        presupuesto_total_crc: 180000,
        justificacion_presupuesto: 'Crecimiento de consultorios en Alajuela.',
      },
    });
    expect(agCamp.statusCode).toBe(200);
    expect(agCamp.body.data.ejecucion.codigo_agente).toBe('agente_campanas');
    expect(agCamp.body.data.resultado.propuesta_campana.estado).toBe('propuesta');
    expect(agCamp.body.data.resultado.evaluacion_determinista.publicidad_activada).toBe(false);

    // Agente 2: generar borrador determinista
    const agCont = await request(app).post('/api/orquestador/ejecutar').send({
      tipo_tarea: 'generar_borrador_contenido',
      parametros: {
        campana_id: 1,
        canal_id: 1,
        etapa_recorrido: 'decision',
        tipo_contenido: 'correo_electronico',
        segmento_objetivo: 'centros de fisioterapia en Cartago',
      },
    });
    expect(agCont.statusCode).toBe(200);
    expect(agCont.body.data.ejecucion.codigo_agente).toBe('agente_contenido');
    const generatedId = agCont.body.data.resultado.borrador.id;

    // Intento prohibido: el agente intenta aprobar su propio borrador -> falla 403 y queda registrado en ejecuciones_agentes
    const agForbiddenApprove = await request(app).post('/api/orquestador/ejecutar').send({
      tipo_tarea: 'registrar_decision_revision',
      parametros: {
        contenido_id: generatedId,
        decision: 'aprobar',
      },
    });
    expect(agForbiddenApprove.statusCode).toBe(403);
    expect(agForbiddenApprove.body.error.code).toBe('AGENT_SELF_APPROVAL_FORBIDDEN');

    // Agente 3: diagnóstico integral de métricas
    const agMet = await request(app).post('/api/orquestador/ejecutar').send({
      tipo_tarea: 'diagnosticar_indicadores_integrales',
      parametros: {},
    });
    expect(agMet.statusCode).toBe(200);
    expect(agMet.body.data.ejecucion.codigo_agente).toBe('agente_metricas');
    expect(agMet.body.data.resumen.indicadores_calculados).toBe(8);

    // Agente 4: registrar lead con puntuación determinista automática
    const agSales = await request(app).post('/api/orquestador/ejecutar').send({
      tipo_tarea: 'registrar_lead',
      parametros: {
        nombre_completo: 'Irene Solórzano',
        cargo: 'Directora Administrativa',
        nombre_organizacion: 'Clínica Sol del Este',
        tipo_organizacion_id: 2,
        correo: 'isolorzano@soldeleste.cr.example',
        telefono: '+506 2272-8899',
        provincia: 'San José',
        fuente_origen: 'campana_digital',
        campana_origen_id: 1,
        presupuesto_declarado_crc: 130000,
        necesidad_comercial: 'Unificar agenda administrativa de 5 consultorios con recordatorios.',
      },
    });
    expect(agSales.statusCode).toBe(200);
    expect(agSales.body.data.ejecucion.codigo_agente).toBe('agente_contactos_ventas');
    expect(agSales.body.data.resultado.puntuacion_lead).toBeGreaterThanOrEqual(85);

    // Verificar registro de ejecuciones exitosas y rechazadas en ejecuciones_agentes
    const execList = await request(app).get('/api/agentes/ejecuciones');
    expect(execList.statusCode).toBe(200);
    expect(execList.body.data.length).toBe(5);
    const rejectedExec = execList.body.data.find((e) => e.estado === 'rechazada_regla_negocio');
    expect(rejectedExec).toBeDefined();
    expect(rejectedExec.mensaje_error).toMatch(/AGENT_SELF_APPROVAL_FORBIDDEN/);
  });
});

