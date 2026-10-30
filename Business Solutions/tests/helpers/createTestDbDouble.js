/**
 * Doble relacional controlado EXCLUSIVO para pruebas unitarias/HTTP de contrato
 * cuando el servidor MySQL real (VitaBase) aún no tiene credenciales en .env.
 * NUNCA se importa ni utiliza en src/ (el código de producción solo usa mysql2).
 */
function createTestDbDouble() {
  const createInitialState = () => ({
    nextIds: {
      canales_mercadeo: 3,
      clientes: 2,
      contactos_cliente: 2,
      catalogo_servicios: 2,
      contratos_servicios_cliente: 2,
      campanas: 3,
      asignaciones_presupuesto: 2,
      contenidos: 2,
      revisiones_contenido: 1,
      contactos: 2,
      historial_etapas_contacto: 2,
      contactos_contenidos_consumidos: 1,
      traspasos_ventas: 1,
      oportunidades: 2,
      metricas_campana_periodo: 4,
      ejecuciones_agentes: 1,
    },
    tipos_organizacion: [
      { id: 1, codigo: 'centro_fisioterapia', nombre: 'Centro de Fisioterapia', descripcion: 'Terapia física', activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 2, codigo: 'clinica_medica', nombre: 'Clínica Médica General', descripcion: 'Consulta externa', activo: 1, creado_en: '2026-01-01 00:00:00' },
    ],
    colaboradores: [
      { id: 1, codigo_colaborador: 'COL-MKT-01', nombre_completo: 'Valeria Solís Mora', correo: 'valeria@vitanexo.cr.example', rol: 'mercadeo', activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 2, codigo_colaborador: 'COL-DIR-02', nombre_completo: 'Alejandro Vargas Jiménez', correo: 'alejandro@vitanexo.cr.example', rol: 'direccion_comercial', activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 3, codigo_colaborador: 'COL-VEN-03', nombre_completo: 'Sofía Calderón Méndez', correo: 'sofia@vitanexo.cr.example', rol: 'ejecutivo_ventas', activo: 1, creado_en: '2026-01-01 00:00:00' },
    ],
    canales_mercadeo: [
      { id: 1, codigo_canal: 'CAN-GADS-PAG', nombre: 'Google Search Ads', clasificacion: 'pagado', plataforma: 'Google Ads', descripcion: 'Búsqueda pagada', activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 2, codigo_canal: 'CAN-SEOB-ORG', nombre: 'Blog Educativo SEO', clasificacion: 'organico', plataforma: 'Web VitaNexo', descripcion: 'Artículos SEO', activo: 1, creado_en: '2026-01-01 00:00:00' },
    ],
    etapas_embudo: [
      { id: 1, codigo_etapa: 'lead', nombre: 'Lead Capturado', orden_embudo: 1, es_etapa_final: 0, descripcion: 'Inicio', activo: 1 },
      { id: 2, codigo_etapa: 'prospecto_calificado', nombre: 'Prospecto Calificado', orden_embudo: 2, es_etapa_final: 0, descripcion: 'MQL', activo: 1 },
      { id: 3, codigo_etapa: 'oportunidad_comercial', nombre: 'Oportunidad Comercial', orden_embudo: 3, es_etapa_final: 0, descripcion: 'SQL', activo: 1 },
      { id: 4, codigo_etapa: 'cierre_ganado', nombre: 'Cierre Ganado', orden_embudo: 4, es_etapa_final: 1, descripcion: 'Ganado', activo: 1 },
      { id: 5, codigo_etapa: 'cierre_perdido', nombre: 'Cierre Perdido', orden_embudo: 5, es_etapa_final: 1, descripcion: 'Perdido', activo: 1 },
      { id: 6, codigo_etapa: 'nutricion_futura', nombre: 'Nutrición Futura', orden_embudo: 6, es_etapa_final: 0, descripcion: 'Nutrición', activo: 1 },
    ],
    catalogo_agentes: [
      { id: 1, codigo_agente: 'orquestador_central', nombre: 'Orquestador Central', dominio: 'orquestacion', descripcion: 'Coordina', es_orquestador: 1, activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 2, codigo_agente: 'agente_campanas', nombre: 'Agente Campañas', dominio: 'campanas', descripcion: 'Campañas', es_orquestador: 0, activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 3, codigo_agente: 'agente_contenido', nombre: 'Agente Contenido', dominio: 'contenido', descripcion: 'Contenido', es_orquestador: 0, activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 4, codigo_agente: 'agente_metricas', nombre: 'Agente Métricas', dominio: 'metricas', descripcion: 'Métricas', es_orquestador: 0, activo: 1, creado_en: '2026-01-01 00:00:00' },
      { id: 5, codigo_agente: 'agente_contactos_ventas', nombre: 'Agente Ventas', dominio: 'ventas', descripcion: 'Ventas', es_orquestador: 0, activo: 1, creado_en: '2026-01-01 00:00:00' },
    ],
    catalogo_servicios: [
      { id: 1, codigo_servicio: 'SRV-AGENDA-01', nombre: 'VitaAgenda Pro', categoria: 'gestion_administrativa', descripcion: 'Agenda administrativa', modalidad_cobro: 'mensual', precio_lista_crc: 55000, activo: 1, creado_en: '2026-01-01 00:00:00' },
    ],
    clientes: [
      { id: 1, codigo_cliente: 'CLI-2026-01', nombre_comercial: 'Fisioterapia Cumbre', razon_social: 'Cumbre S.A.', cedula_juridica: '3-101-111111', tipo_organizacion_id: 1, provincia: 'San José', canton: 'Montes de Oca', correo_corporativo: 'admin@cumbre.cr.example', telefono_principal: '+506 2222-1111', estado_cliente: 'activo', fecha_alta: '2026-02-05', origen_contacto_id: 1, creado_en: '2026-02-05 10:00:00', actualizado_en: '2026-02-05 10:00:00' },
    ],
    contactos_cliente: [
      { id: 1, cliente_id: 1, nombre_completo: 'Adriana Coto', cargo: 'Administradora', correo: 'acoto@cumbre.cr.example', telefono: '+506 8888-1111', es_contacto_principal: 1, activo: 1, creado_en: '2026-02-05 10:00:00' },
    ],
    contratos_servicios_cliente: [
      { id: 1, codigo_contrato: 'CTR-2026-01', cliente_id: 1, servicio_id: 1, oportunidad_id: 1, fecha_contratacion: '2026-02-05', fecha_inicio_servicio: '2026-02-06', fecha_fin_servicio: null, precio_acordado_crc: 95000, estado_contrato: 'activo', observaciones: 'Contrato inicial', creado_en: '2026-02-05 10:00:00' },
    ],
    campanas: [
      { id: 1, codigo_campana: 'CMP-2026-01', nombre: 'Campaña Pagada Fisioterapia', descripcion: 'Search Ads', objetivo: 'Captar demos', etapa_recorrido: 'decision', canal_principal_id: 1, responsable_id: 1, fecha_inicio: '2026-01-10', fecha_fin: '2026-03-31', presupuesto_total_crc: 400000, justificacion_presupuesto: 'Alta intención', costo_operativo_mercadeo_crc: 50000, estado: 'activa', creada_por_agente: 0, creado_en: '2026-01-10 08:00:00', actualizado_en: '2026-01-10 08:00:00' },
      { id: 2, codigo_campana: 'CMP-2026-02', nombre: 'Campaña Orgánica SEO', descripcion: 'Blog SEO', objetivo: 'Educar clínicas', etapa_recorrido: 'conciencia', canal_principal_id: 2, responsable_id: 1, fecha_inicio: '2026-01-15', fecha_fin: '2026-06-30', presupuesto_total_crc: 0, justificacion_presupuesto: 'Orgánico', costo_operativo_mercadeo_crc: 60000, estado: 'activa', creada_por_agente: 0, creado_en: '2026-01-15 08:00:00', actualizado_en: '2026-01-15 08:00:00' },
    ],
    asignaciones_presupuesto: [
      { id: 1, campana_id: 1, canal_id: 1, responsable_id: 1, periodo_inicio: '2026-01-10', periodo_fin: '2026-02-15', monto_asignado_crc: 200000, razon_decision: 'Tramo 1', estado_asignacion: 'ejecutada', creado_en: '2026-01-10 09:00:00' },
    ],
    contenidos: [
      { id: 1, codigo_contenido: 'CNT-2026-01', campana_id: 1, canal_id: 1, autor_colaborador_id: 1, creado_por_agente: null, titulo: 'Anuncio Agenda Fisioterapia', etapa_recorrido: 'decision', tipo_contenido: 'anuncio_pagado', cuerpo_borrador: 'Digitalice su agenda hoy.', version_actual: 1, estado: 'borrador', fecha_programada_publicacion: '2026-05-10 08:00:00', fecha_ultima_revision: null, fecha_publicacion: null, creado_en: '2026-01-12 08:00:00', actualizado_en: '2026-01-12 08:00:00' },
    ],
    revisiones_contenido: [],
    contactos: [
      { id: 1, codigo_contacto: 'LEAD-2026-01', nombre_completo: 'Laura Chinchilla', cargo: 'Administradora', nombre_organizacion: 'Fisioterapia Cumbre', tipo_organizacion_id: 1, correo: 'laura@cumbre.cr.example', telefono: '+506 2221-4101', provincia: 'San José', fuente_origen: 'campana_digital', campana_origen_id: 1, canal_origen_id: 1, etapa_actual_id: 4, puntuacion_lead: 90, necesidad_comercial: 'Controlar agenda administrativa y recordatorios.', presupuesto_declarado_crc: 110000, responsable_comercial_id: 3, fecha_captura_lead: '2026-01-15 09:00:00', fecha_proximo_seguimiento: null, activo: 1, creado_en: '2026-01-15 09:00:00', actualizado_en: '2026-02-04 16:00:00' },
    ],
    historial_etapas_contacto: [
      { id: 1, contacto_id: 1, etapa_anterior_id: null, etapa_nueva_id: 1, cambiado_por_id: 1, fecha_transicion: '2026-01-15 09:00:00', motivo: 'Captura' },
      { id: 2, contacto_id: 1, etapa_anterior_id: 1, etapa_nueva_id: 2, cambiado_por_id: 1, fecha_transicion: '2026-01-17 10:00:00', motivo: 'MQL' },
      { id: 3, contacto_id: 1, etapa_anterior_id: 2, etapa_nueva_id: 3, cambiado_por_id: 3, fecha_transicion: '2026-01-20 11:00:00', motivo: 'SQL' },
      { id: 4, contacto_id: 1, etapa_anterior_id: 3, etapa_nueva_id: 4, cambiado_por_id: 3, fecha_transicion: '2026-02-04 16:00:00', motivo: 'Ganado' },
    ],
    contactos_contenidos_consumidos: [],
    traspasos_ventas: [],
    oportunidades: [
      { id: 1, codigo_oportunidad: 'OPP-2026-01', contacto_id: 1, cliente_id: 1, campana_atribuida_id: 1, traspaso_id: null, responsable_ventas_id: 3, titulo_propuesta: 'Plan Agenda Cumbre', servicio_principal_id: 1, valor_estimado_crc: 100000, monto_cierre_crc: 95000, estado_oportunidad: 'ganada', resultado_cierre: 'ganada', motivo_cierre: 'Aprobado', fecha_apertura: '2026-01-20 11:00:00', fecha_proximo_seguimiento: null, fecha_cierre: '2026-02-04 16:00:00', creado_en: '2026-01-20 11:00:00', actualizado_en: '2026-02-04 16:00:00' },
    ],
    metricas_campana_periodo: [
      // Caso positivo pagado
      { id: 1, campana_id: 1, canal_id: 1, periodo_inicio: '2026-01-10', periodo_fin: '2026-02-15', impresiones: 10000, clics: 500, alcance: 8000, visualizaciones: 10000, interacciones: 200, seguidores_ganados: 10, gasto_publicitario_crc: 200000, costo_mercadeo_operativo_crc: 50000, costo_ventas_atribuible_crc: 50000, leads_generados: 10, conversiones_clientes: 2, ingresos_atribuibles_crc: 600000, notas: 'Corte normal', creado_en: '2026-02-16 08:00:00' },
      // Caso orgánico gasto publicitario = 0 (ROAS división por cero controlada) + alta vanidad sin ventas
      { id: 2, campana_id: 2, canal_id: 2, periodo_inicio: '2026-01-15', periodo_fin: '2026-02-28', impresiones: 0, clics: 0, alcance: 15000, visualizaciones: 20000, interacciones: 1500, seguidores_ganados: 120, gasto_publicitario_crc: 0, costo_mercadeo_operativo_crc: 60000, costo_ventas_atribuible_crc: 0, leads_generados: 0, conversiones_clientes: 0, ingresos_atribuibles_crc: 0, notas: 'Caso límite 0 impresiones, 0 clics, 0 gasto pub, 0 clientes, alta vanidad', creado_en: '2026-03-01 08:00:00' },
    ],
    ejecuciones_agentes: [],
  });

  let state = createInitialState();

  function makeDupError(msg = 'Duplicate entry') {
    const err = new Error(msg);
    err.code = 'ER_DUP_ENTRY';
    return err;
  }

  function executeQueryOnState(s, rawSql, params = []) {
    const sql = rawSql.replace(/\s+/g, ' ').trim();

    // --- CATÁLOGOS ---
    if (/FROM tipos_organizacion WHERE id = \?/i.test(sql)) {
      return s.tipos_organizacion.filter((r) => r.id === Number(params[0]));
    }
    if (/FROM tipos_organizacion/i.test(sql)) {
      return [...s.tipos_organizacion];
    }
    if (/FROM colaboradores WHERE id = \?/i.test(sql)) {
      return s.colaboradores.filter((r) => r.id === Number(params[0]));
    }
    if (/FROM colaboradores/i.test(sql)) {
      return [...s.colaboradores];
    }
    if (/INSERT INTO canales_mercadeo/i.test(sql)) {
      const [codigo_canal, nombre, clasificacion, plataforma, descripcion, activo] = params;
      if (s.canales_mercadeo.some((c) => c.codigo_canal === codigo_canal || c.nombre === nombre)) {
        throw makeDupError();
      }
      const id = s.nextIds.canales_mercadeo++;
      s.canales_mercadeo.push({ id, codigo_canal, nombre, clasificacion, plataforma, descripcion, activo, creado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/FROM canales_mercadeo WHERE id = \?/i.test(sql)) {
      return s.canales_mercadeo.filter((r) => r.id === Number(params[0]));
    }
    if (/FROM canales_mercadeo/i.test(sql)) {
      return [...s.canales_mercadeo];
    }
    if (/FROM etapas_embudo WHERE id = \?/i.test(sql)) {
      return s.etapas_embudo.filter((r) => r.id === Number(params[0]));
    }
    if (/FROM etapas_embudo WHERE codigo_etapa = \?/i.test(sql)) {
      return s.etapas_embudo.filter((r) => r.codigo_etapa === params[0]);
    }
    if (/FROM etapas_embudo/i.test(sql)) {
      return [...s.etapas_embudo];
    }

    // --- CLIENTES Y SERVICIOS ---
    if (/INSERT INTO clientes /i.test(sql)) {
      const [codigo_cliente, nombre_comercial, razon_social, cedula_juridica, tipo_organizacion_id, provincia, canton, correo_corporativo, telefono_principal, estado_cliente, fecha_alta, origen_contacto_id] = params;
      if (s.clientes.some((c) => c.cedula_juridica === cedula_juridica || c.correo_corporativo === correo_corporativo || c.codigo_cliente === codigo_cliente)) {
        throw makeDupError();
      }
      const id = s.nextIds.clientes++;
      s.clientes.push({ id, codigo_cliente, nombre_comercial, razon_social, cedula_juridica, tipo_organizacion_id: Number(tipo_organizacion_id), provincia, canton, correo_corporativo, telefono_principal, estado_cliente, fecha_alta, origen_contacto_id, creado_en: '2026-04-01 00:00:00', actualizado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/UPDATE clientes SET/i.test(sql)) {
      const id = Number(params[params.length - 1]);
      const client = s.clientes.find((c) => c.id === id);
      if (client) {
        const setPart = sql.match(/UPDATE clientes SET (.+) WHERE id = \?/i)[1];
        const cols = setPart.split(',').map((p) => p.trim().split('=')[0].trim());
        cols.forEach((col, idx) => { client[col] = params[idx]; });
      }
      return { affectedRows: client ? 1 : 0 };
    }
    if (/FROM clientes c INNER JOIN tipos_organizacion t/i.test(sql)) {
      const enrich = (c) => ({
        ...c,
        tipo_organizacion_nombre: s.tipos_organizacion.find((t) => t.id === c.tipo_organizacion_id)?.nombre || '',
      });
      if (/WHERE c\.id = \?/i.test(sql)) {
        return s.clientes.filter((c) => c.id === Number(params[0])).map(enrich);
      }
      return s.clientes.map(enrich);
    }
    if (/INSERT INTO contactos_cliente/i.test(sql)) {
      const [cliente_id, nombre_completo, cargo, correo, telefono, es_contacto_principal, activo] = params;
      if (s.contactos_cliente.some((cc) => cc.correo === correo)) throw makeDupError();
      const id = s.nextIds.contactos_cliente++;
      s.contactos_cliente.push({ id, cliente_id: Number(cliente_id), nombre_completo, cargo, correo, telefono, es_contacto_principal, activo, creado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/FROM contactos_cliente WHERE id = \?/i.test(sql)) {
      return s.contactos_cliente.filter((r) => r.id === Number(params[0]));
    }
    if (/FROM contactos_cliente WHERE cliente_id = \?/i.test(sql)) {
      return s.contactos_cliente.filter((r) => r.cliente_id === Number(params[0]));
    }
    if (/INSERT INTO catalogo_servicios/i.test(sql)) {
      const [codigo_servicio, nombre, categoria, descripcion, modalidad_cobro, precio_lista_crc, activo] = params;
      if (s.catalogo_servicios.some((sv) => sv.nombre === nombre || sv.codigo_servicio === codigo_servicio)) throw makeDupError();
      const id = s.nextIds.catalogo_servicios++;
      s.catalogo_servicios.push({ id, codigo_servicio, nombre, categoria, descripcion, modalidad_cobro, precio_lista_crc: Number(precio_lista_crc), activo, creado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/FROM catalogo_servicios WHERE id = \?/i.test(sql)) {
      return s.catalogo_servicios.filter((r) => r.id === Number(params[0]));
    }
    if (/FROM catalogo_servicios/i.test(sql)) {
      return [...s.catalogo_servicios];
    }
    if (/INSERT INTO contratos_servicios_cliente/i.test(sql)) {
      const [codigo_contrato, cliente_id, servicio_id, oportunidad_id, fecha_contratacion, fecha_inicio_servicio, fecha_fin_servicio, precio_acordado_crc, estado_contrato, observaciones] = params;
      const id = s.nextIds.contratos_servicios_cliente++;
      s.contratos_servicios_cliente.push({ id, codigo_contrato, cliente_id: Number(cliente_id), servicio_id: Number(servicio_id), oportunidad_id, fecha_contratacion, fecha_inicio_servicio, fecha_fin_servicio, precio_acordado_crc: Number(precio_acordado_crc), estado_contrato, observaciones, creado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/FROM contratos_servicios_cliente cs INNER JOIN clientes cl/i.test(sql)) {
      const enrich = (cs) => ({
        ...cs,
        cliente_nombre: s.clientes.find((c) => c.id === cs.cliente_id)?.nombre_comercial || '',
        servicio_nombre: s.catalogo_servicios.find((sv) => sv.id === cs.servicio_id)?.nombre || '',
        modalidad_cobro: s.catalogo_servicios.find((sv) => sv.id === cs.servicio_id)?.modalidad_cobro || 'mensual',
      });
      if (/WHERE cs\.id = \?/i.test(sql)) {
        return s.contratos_servicios_cliente.filter((r) => r.id === Number(params[0])).map(enrich);
      }
      if (/WHERE cs\.cliente_id = \?/i.test(sql)) {
        return s.contratos_servicios_cliente.filter((r) => r.cliente_id === Number(params[0])).map(enrich);
      }
      return s.contratos_servicios_cliente.map(enrich);
    }

    // --- CAMPAÑAS Y ASIGNACIONES ---
    if (/INSERT INTO campanas /i.test(sql)) {
      const [codigo_campana, nombre, descripcion, objetivo, etapa_recorrido, canal_principal_id, responsable_id, fecha_inicio, fecha_fin, presupuesto_total_crc, justificacion_presupuesto, costo_operativo_mercadeo_crc, estado, creada_por_agente] = params;
      if (s.campanas.some((c) => c.nombre === nombre || c.codigo_campana === codigo_campana)) throw makeDupError();
      const id = s.nextIds.campanas++;
      s.campanas.push({ id, codigo_campana, nombre, descripcion, objetivo, etapa_recorrido, canal_principal_id: Number(canal_principal_id), responsable_id: responsable_id ? Number(responsable_id) : null, fecha_inicio, fecha_fin, presupuesto_total_crc: Number(presupuesto_total_crc), justificacion_presupuesto, costo_operativo_mercadeo_crc: Number(costo_operativo_mercadeo_crc), estado, creada_por_agente, creado_en: '2026-04-01 00:00:00', actualizado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/UPDATE campanas SET/i.test(sql)) {
      const id = Number(params[params.length - 1]);
      const camp = s.campanas.find((c) => c.id === id);
      if (camp) {
        const setPart = sql.match(/UPDATE campanas SET (.+) WHERE id = \?/i)[1];
        const cols = setPart.split(',').map((p) => p.trim().split('=')[0].trim());
        cols.forEach((col, idx) => { camp[col] = params[idx]; });
      }
      return { affectedRows: camp ? 1 : 0 };
    }
    if (/FROM campanas c INNER JOIN canales_mercadeo cm/i.test(sql) && /presupuesto_asignado_canales_crc/i.test(sql)) {
      const enrich = (c) => {
        const ch = s.canales_mercadeo.find((x) => x.id === c.canal_principal_id) || {};
        const asigSum = s.asignaciones_presupuesto
          .filter((a) => a.campana_id === c.id && a.estado_asignacion !== 'cancelada')
          .reduce((acc, a) => acc + Number(a.monto_asignado_crc), 0);
        const mets = s.metricas_campana_periodo.filter((m) => m.campana_id === c.id);
        const adSpend = mets.reduce((acc, m) => acc + Number(m.gasto_publicitario_crc), 0);
        const rev = mets.reduce((acc, m) => acc + Number(m.ingresos_atribuibles_crc), 0);
        const totalCost = mets.length
          ? mets.reduce((acc, m) => acc + Number(m.gasto_publicitario_crc) + Number(m.costo_mercadeo_operativo_crc) + Number(m.costo_ventas_atribuible_crc), 0)
          : c.costo_operativo_mercadeo_crc;
        return {
          ...c,
          canal_principal_nombre: ch.nombre,
          clasificacion_canal: ch.clasificacion,
          presupuesto_asignado_canales_crc: asigSum,
          gasto_publicitario_ejecutado_crc: adSpend,
          costos_totales_atribuibles_crc: totalCost,
          ingresos_atribuibles_crc: rev,
        };
      };
      if (/WHERE c\.id = \?/i.test(sql)) {
        return s.campanas.filter((c) => c.id === Number(params[0])).map(enrich);
      }
      return s.campanas.map(enrich);
    }
    if (/INSERT INTO asignaciones_presupuesto/i.test(sql)) {
      const [campana_id, canal_id, responsable_id, periodo_inicio, periodo_fin, monto_asignado_crc, razon_decision, estado_asignacion] = params;
      const id = s.nextIds.asignaciones_presupuesto++;
      s.asignaciones_presupuesto.push({ id, campana_id: Number(campana_id), canal_id: Number(canal_id), responsable_id: Number(responsable_id), periodo_inicio, periodo_fin, monto_asignado_crc: Number(monto_asignado_crc), razon_decision, estado_asignacion, creado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/FROM asignaciones_presupuesto ap/i.test(sql)) {
      const enrich = (ap) => ({
        ...ap,
        codigo_campana: s.campanas.find((c) => c.id === ap.campana_id)?.codigo_campana || '',
        canal_nombre: s.canales_mercadeo.find((cm) => cm.id === ap.canal_id)?.nombre || '',
        clasificacion_canal: s.canales_mercadeo.find((cm) => cm.id === ap.canal_id)?.clasificacion || '',
        responsable_nombre: s.colaboradores.find((col) => col.id === ap.responsable_id)?.nombre_completo || '',
      });
      if (/WHERE ap\.id = \?/i.test(sql)) {
        return s.asignaciones_presupuesto.filter((a) => a.id === Number(params[0])).map(enrich);
      }
      if (/WHERE ap\.campana_id = \?/i.test(sql)) {
        return s.asignaciones_presupuesto.filter((a) => a.campana_id === Number(params[0])).map(enrich);
      }
      return s.asignaciones_presupuesto.map(enrich);
    }

    // --- CONTENIDOS Y REVISIONES ---
    if (/INSERT INTO contenidos /i.test(sql)) {
      const [codigo_contenido, campana_id, canal_id, autor_colaborador_id, creado_por_agente, titulo, etapa_recorrido, tipo_contenido, cuerpo_borrador, fecha_programada_publicacion] = params;
      const id = s.nextIds.contenidos++;
      s.contenidos.push({ id, codigo_contenido, campana_id: Number(campana_id), canal_id: Number(canal_id), autor_colaborador_id: autor_colaborador_id ? Number(autor_colaborador_id) : null, creado_por_agente, titulo, etapa_recorrido, tipo_contenido, cuerpo_borrador, version_actual: 1, estado: 'borrador', fecha_programada_publicacion, fecha_ultima_revision: null, fecha_publicacion: null, creado_en: '2026-04-01 00:00:00', actualizado_en: '2026-04-01 00:00:00' });
      return { insertId: id };
    }
    if (/UPDATE contenidos SET/i.test(sql)) {
      const id = Number(params[params.length - 1]);
      const item = s.contenidos.find((c) => c.id === id);
      if (item) {
        const setPart = sql.match(/UPDATE contenidos SET (.+) WHERE id = \?/i)[1];
        const cols = setPart.split(',').map((p) => p.trim().split('=')[0].trim());
        cols.forEach((col, idx) => { item[col] = params[idx]; });
      }
      return { affectedRows: item ? 1 : 0 };
    }
    if (/FROM contenidos ct INNER JOIN campanas cp/i.test(sql)) {
      const enrich = (ct) => ({
        ...ct,
        codigo_campana: s.campanas.find((c) => c.id === ct.campana_id)?.codigo_campana || '',
        canal_nombre: s.canales_mercadeo.find((cm) => cm.id === ct.canal_id)?.nombre || '',
      });
      if (/WHERE ct\.id = \?/i.test(sql)) {
        return s.contenidos.filter((c) => c.id === Number(params[0])).map(enrich);
      }
      return s.contenidos.map(enrich);
    }
    if (/INSERT INTO revisiones_contenido/i.test(sql)) {
      const [contenido_id, version_revisada, revisor_id, fecha_revision, decision, estado_anterior, estado_resultante, comentarios] = params;
      const id = s.nextIds.revisiones_contenido++;
      s.revisiones_contenido.push({ id, contenido_id: Number(contenido_id), version_revisada: Number(version_revisada), revisor_id: Number(revisor_id), tipo_actor_revisor: 'humano', fecha_revision, decision, estado_anterior, estado_resultante, comentarios });
      return { insertId: id };
    }
    if (/FROM revisiones_contenido rc/i.test(sql)) {
      const enrich = (rc) => ({
        ...rc,
        revisor_nombre: s.colaboradores.find((col) => col.id === rc.revisor_id)?.nombre_completo || '',
      });
      if (/WHERE rc\.id = \?/i.test(sql)) {
        return s.revisiones_contenido.filter((r) => r.id === Number(params[0])).map(enrich);
      }
      if (/WHERE rc\.contenido_id = \?/i.test(sql)) {
        return s.revisiones_contenido.filter((r) => r.contenido_id === Number(params[0])).map(enrich);
      }
      return s.revisiones_contenido.map(enrich);
    }

    // --- CONTACTOS, EMBUDO, TRASPASOS Y OPORTUNIDADES ---
    if (/INSERT INTO contactos /i.test(sql)) {
      const [codigo_contacto, nombre_completo, cargo, nombre_organizacion, tipo_organizacion_id, correo, telefono, provincia, fuente_origen, campana_origen_id, canal_origen_id, etapa_actual_id, puntuacion_lead, necesidad_comercial, presupuesto_declarado_crc, responsable_comercial_id, fecha_captura_lead, fecha_proximo_seguimiento] = params;
      if (s.contactos.some((c) => c.correo === correo || c.codigo_contacto === codigo_contacto)) throw makeDupError();
      const id = s.nextIds.contactos++;
      s.contactos.push({ id, codigo_contacto, nombre_completo, cargo, nombre_organizacion, tipo_organizacion_id: Number(tipo_organizacion_id), correo, telefono, provincia, fuente_origen, campana_origen_id: campana_origen_id ? Number(campana_origen_id) : null, canal_origen_id: canal_origen_id ? Number(canal_origen_id) : null, etapa_actual_id: Number(etapa_actual_id), puntuacion_lead: Number(puntuacion_lead), necesidad_comercial, presupuesto_declarado_crc, responsable_comercial_id: responsable_comercial_id ? Number(responsable_comercial_id) : null, fecha_captura_lead, fecha_proximo_seguimiento, activo: 1, creado_en: fecha_captura_lead, actualizado_en: fecha_captura_lead });
      return { insertId: id };
    }
    if (/UPDATE contactos SET/i.test(sql)) {
      const id = Number(params[params.length - 1]);
      const ct = s.contactos.find((c) => c.id === id);
      if (ct) {
        const setPart = sql.match(/UPDATE contactos SET (.+) WHERE id = \?/i)[1];
        const cols = setPart.split(',').map((p) => p.trim().split('=')[0].trim());
        cols.forEach((col, idx) => { ct[col] = params[idx]; });
      }
      return { affectedRows: ct ? 1 : 0 };
    }
    if (/FROM contactos c INNER JOIN etapas_embudo ef/i.test(sql) && /es_etapa_final = 0/i.test(sql)) {
      return s.contactos
        .filter((c) => {
          const st = s.etapas_embudo.find((e) => e.id === c.etapa_actual_id);
          return c.activo === 1 && st && st.es_etapa_final === 0 && c.fecha_proximo_seguimiento;
        })
        .map((c) => ({
          ...c,
          codigo_etapa: s.etapas_embudo.find((e) => e.id === c.etapa_actual_id)?.codigo_etapa,
        }));
    }
    if (/FROM contactos c INNER JOIN tipos_organizacion toz/i.test(sql)) {
      const enrich = (c) => {
        const st = s.etapas_embudo.find((e) => e.id === c.etapa_actual_id) || {};
        return {
          ...c,
          tipo_organizacion_nombre: s.tipos_organizacion.find((t) => t.id === c.tipo_organizacion_id)?.nombre || '',
          etapa_actual_codigo: st.codigo_etapa,
          etapa_actual_nombre: st.nombre,
        };
      };
      if (/WHERE c\.id = \?/i.test(sql)) {
        return s.contactos.filter((c) => c.id === Number(params[0])).map(enrich);
      }
      return s.contactos.map(enrich);
    }
    if (/INSERT INTO historial_etapas_contacto/i.test(sql)) {
      const [contacto_id, etapa_anterior_id, etapa_nueva_id, cambiado_por_id, fecha_transicion, motivo] = params;
      const id = s.nextIds.historial_etapas_contacto++;
      s.historial_etapas_contacto.push({ id, contacto_id: Number(contacto_id), etapa_anterior_id, etapa_nueva_id: Number(etapa_nueva_id), cambiado_por_id, fecha_transicion, motivo });
      return { insertId: id };
    }
    if (/FROM historial_etapas_contacto h/i.test(sql) && /WHERE h\.contacto_id = \?/i.test(sql)) {
      return s.historial_etapas_contacto
        .filter((h) => h.contacto_id === Number(params[0]))
        .map((h) => ({
          ...h,
          etapa_anterior_codigo: s.etapas_embudo.find((e) => e.id === h.etapa_anterior_id)?.codigo_etapa || null,
          etapa_nueva_codigo: s.etapas_embudo.find((e) => e.id === h.etapa_nueva_id)?.codigo_etapa || null,
        }));
    }
    if (/INSERT IGNORE INTO contactos_contenidos_consumidos/i.test(sql)) {
      const [contacto_id, contenido_id, tipo_interaccion, fecha_interaccion] = params;
      if (!s.contactos_contenidos_consumidos.some((x) => x.contacto_id === Number(contacto_id) && x.contenido_id === Number(contenido_id) && x.tipo_interaccion === tipo_interaccion)) {
        s.contactos_contenidos_consumidos.push({ id: s.nextIds.contactos_contenidos_consumidos++, contacto_id: Number(contacto_id), contenido_id: Number(contenido_id), tipo_interaccion, fecha_interaccion });
      }
      return { affectedRows: 1 };
    }
    if (/FROM contactos_contenidos_consumidos cc/i.test(sql)) {
      return s.contactos_contenidos_consumidos
        .filter((cc) => cc.contacto_id === Number(params[0]))
        .map((cc) => ({
          ...cc,
          codigo_contenido: s.contenidos.find((ct) => ct.id === cc.contenido_id)?.codigo_contenido || '',
          contenido_titulo: s.contenidos.find((ct) => ct.id === cc.contenido_id)?.titulo || '',
        }));
    }

    if (/INSERT INTO traspasos_ventas/i.test(sql)) {
      const [codigo_traspaso, contacto_id, entregado_por_id, recibido_por_id, puntuacion_al_traspaso, necesidad_detectada, presupuesto_declarado_crc, referencias_contenidos, observaciones_seguimiento, fecha_traspaso] = params;
      const id = s.nextIds.traspasos_ventas++;
      s.traspasos_ventas.push({ id, codigo_traspaso, contacto_id: Number(contacto_id), entregado_por_id: Number(entregado_por_id), recibido_por_id: Number(recibido_por_id), puntuacion_al_traspaso: Number(puntuacion_al_traspaso), necesidad_detectada, presupuesto_declarado_crc, referencias_contenidos, observaciones_seguimiento, fecha_traspaso, decision_ventas: 'pendiente', motivo_decision: null, fecha_respuesta: null });
      return { insertId: id };
    }
    if (/UPDATE traspasos_ventas SET decision_ventas/i.test(sql)) {
      const [decision_ventas, motivo_decision, fecha_respuesta, id] = params;
      const tr = s.traspasos_ventas.find((t) => t.id === Number(id));
      if (tr) {
        tr.decision_ventas = decision_ventas;
        tr.motivo_decision = motivo_decision;
        tr.fecha_respuesta = fecha_respuesta;
      }
      return { affectedRows: tr ? 1 : 0 };
    }
    if (/FROM traspasos_ventas tv/i.test(sql)) {
      const enrich = (tv) => ({
        ...tv,
        codigo_contacto: s.contactos.find((c) => c.id === tv.contacto_id)?.codigo_contacto || '',
      });
      if (/WHERE tv\.id = \?/i.test(sql)) {
        return s.traspasos_ventas.filter((t) => t.id === Number(params[0])).map(enrich);
      }
      return s.traspasos_ventas.map(enrich);
    }

    if (/INSERT INTO oportunidades /i.test(sql)) {
      const [codigo_oportunidad, contacto_id, cliente_id, campana_atribuida_id, traspaso_id, responsable_ventas_id, titulo_propuesta, servicio_principal_id, valor_estimado_crc, estado_oportunidad, fecha_apertura, fecha_proximo_seguimiento] = params;
      const id = s.nextIds.oportunidades++;
      s.oportunidades.push({ id, codigo_oportunidad, contacto_id: Number(contacto_id), cliente_id, campana_atribuida_id: campana_atribuida_id ? Number(campana_atribuida_id) : null, traspaso_id, responsable_ventas_id: Number(responsable_ventas_id), titulo_propuesta, servicio_principal_id, valor_estimado_crc: Number(valor_estimado_crc), monto_cierre_crc: null, estado_oportunidad, resultado_cierre: 'pendiente', motivo_cierre: null, fecha_apertura, fecha_proximo_seguimiento, fecha_cierre: null });
      return { insertId: id };
    }
    if (/UPDATE oportunidades SET/i.test(sql)) {
      const id = Number(params[params.length - 1]);
      const opp = s.oportunidades.find((o) => o.id === id);
      if (opp) {
        const setPart = sql.match(/UPDATE oportunidades SET (.+) WHERE id = \?/i)[1];
        const cols = setPart.split(',').map((p) => p.trim().split('=')[0].trim());
        cols.forEach((col, idx) => { opp[col] = params[idx]; });
      }
      return { affectedRows: opp ? 1 : 0 };
    }
    if (/FROM oportunidades o INNER JOIN colaboradores col/i.test(sql) && /resultado_cierre = 'pendiente'/i.test(sql)) {
      return s.oportunidades.filter((o) => o.resultado_cierre === 'pendiente' && o.fecha_proximo_seguimiento);
    }
    if (/FROM oportunidades o INNER JOIN contactos ct/i.test(sql) && !/DATEDIFF/i.test(sql)) {
      const enrich = (o) => {
        const ct = s.contactos.find((c) => c.id === o.contacto_id) || {};
        return {
          ...o,
          codigo_contacto: ct.codigo_contacto,
          nombre_organizacion: ct.nombre_organizacion,
          fecha_captura_lead: ct.fecha_captura_lead,
        };
      };
      if (/WHERE o\.id = \?/i.test(sql)) {
        return s.oportunidades.filter((o) => o.id === Number(params[0])).map(enrich);
      }
      return s.oportunidades.map(enrich);
    }

    // --- MÉTRICAS E INDICADORES ---
    if (/INSERT INTO metricas_campana_periodo/i.test(sql)) {
      const [campana_id, canal_id, periodo_inicio, periodo_fin, impresiones, clics, alcance, visualizaciones, interacciones, seguidores_ganados, gasto_publicitario_crc, costo_mercadeo_operativo_crc, costo_ventas_atribuible_crc, leads_generados, conversiones_clientes, ingresos_atribuibles_crc, notas] = params;
      if (s.metricas_campana_periodo.some((m) => m.campana_id === Number(campana_id) && m.canal_id === Number(canal_id) && m.periodo_inicio === periodo_inicio && m.periodo_fin === periodo_fin)) {
        throw makeDupError();
      }
      const id = s.nextIds.metricas_campana_periodo++;
      s.metricas_campana_periodo.push({ id, campana_id: Number(campana_id), canal_id: Number(canal_id), periodo_inicio, periodo_fin, impresiones, clics, alcance, visualizaciones, interacciones, seguidores_ganados, gasto_publicitario_crc: Number(gasto_publicitario_crc), costo_mercadeo_operativo_crc: Number(costo_mercadeo_operativo_crc), costo_ventas_atribuible_crc: Number(costo_ventas_atribuible_crc), leads_generados, conversiones_clientes, ingresos_atribuibles_crc: Number(ingresos_atribuibles_crc), notas });
      return { insertId: id };
    }
    if (/FROM metricas_campana_periodo m/i.test(sql) && /AS cpc_crc/i.test(sql)) {
      const rows = filtersByCampana(s.metricas_campana_periodo, sql, params);
      return groupByCampanaCanal(rows, s).map((g) => ({
        ...g,
        gasto_publicitario_total_crc: g.gasto,
        total_clics: g.clics,
        cpc_crc: g.clics === 0 ? null : Number((g.gasto / g.clics).toFixed(2)),
        estado_calculo: g.clics === 0 ? 'NO_CALCULABLE_CERO_CLICS' : g.gasto === 0 ? 'CANAL_SIN_GASTO_PUBLICITARIO_CPC_CERO' : 'CALCULADO',
      }));
    }
    if (/FROM metricas_campana_periodo m/i.test(sql) && /AS ctr_porcentaje/i.test(sql)) {
      const rows = filtersByCampana(s.metricas_campana_periodo, sql, params);
      return groupByCampanaCanal(rows, s).map((g) => ({
        ...g,
        total_impresiones: g.impresiones,
        total_clics: g.clics,
        ctr_porcentaje: g.impresiones === 0 ? null : Number(((g.clics / g.impresiones) * 100).toFixed(4)),
        estado_calculo: g.impresiones === 0 ? 'NO_CALCULABLE_CERO_IMPRESIONES' : 'CALCULADO',
      }));
    }
    if (/AS cac_crc/i.test(sql)) {
      const campList = /WHERE c\.id = \?/i.test(sql)
        ? s.campanas.filter((c) => c.id === Number(params[params.length - 1]))
        : s.campanas;
      return campList.map((c) => {
        const ch = s.canales_mercadeo.find((cm) => cm.id === c.canal_principal_id) || {};
        const mets = s.metricas_campana_periodo.filter((m) => m.campana_id === c.id);
        const ad = mets.reduce((a, m) => a + Number(m.gasto_publicitario_crc), 0);
        const mkt = mets.reduce((a, m) => a + Number(m.costo_mercadeo_operativo_crc), 0);
        const vta = mets.reduce((a, m) => a + Number(m.costo_ventas_atribuible_crc), 0);
        const total = ad + mkt + vta;
        const conv = mets.reduce((a, m) => a + Number(m.conversiones_clientes), 0);
        return {
          campana_id: c.id,
          codigo_campana: c.codigo_campana,
          campana_nombre: c.nombre,
          clasificacion_canal_principal: ch.clasificacion,
          gasto_publicitario_crc: ad,
          costo_mercadeo_operativo_crc: mkt,
          costo_ventas_atribuible_crc: vta,
          costo_total_adquisicion_crc: total,
          nuevos_clientes_adquiridos: conv,
          cac_crc: conv === 0 ? null : Number((total / conv).toFixed(2)),
          estado_calculo: conv === 0 ? 'NO_CALCULABLE_SIN_CLIENTES_ADQUIRIDOS' : 'CALCULADO',
        };
      });
    }
    if (/AS roas_ratio/i.test(sql)) {
      const rows = filtersByCampana(s.metricas_campana_periodo, sql, params);
      return groupByCampanaCanal(rows, s).map((g) => ({
        ...g,
        ingresos_atribuibles_crc: g.ingresos,
        gasto_publicitario_crc: g.gasto,
        roas_ratio: g.gasto === 0 ? null : Number((g.ingresos / g.gasto).toFixed(4)),
        estado_calculo: g.gasto === 0 ? 'NO_APLICA_GASTO_PUBLICITARIO_CERO' : 'CALCULADO',
      }));
    }
    if (/WITH primeras_fechas_etapa/i.test(sql)) {
      const byContact = new Map();
      for (const h of s.historial_etapas_contacto) {
        const st = s.etapas_embudo.find((e) => e.id === h.etapa_nueva_id);
        if (!st) continue;
        if (!byContact.has(h.contacto_id)) byContact.set(h.contacto_id, new Map());
        const m = byContact.get(h.contacto_id);
        if (!m.has(st.codigo_etapa) || h.fecha_transicion < m.get(st.codigo_etapa)) {
          m.set(st.codigo_etapa, h.fecha_transicion);
        }
      }
      let leads = 0;
      let toPros = 0;
      let toOpp = 0;
      let toWon = 0;
      let toLost = 0;
      for (const m of byContact.values()) {
        if (!m.has('lead')) continue;
        leads++;
        if (m.has('prospecto_calificado') && m.get('prospecto_calificado') >= m.get('lead')) {
          toPros++;
          if (m.has('oportunidad_comercial') && m.get('oportunidad_comercial') >= m.get('prospecto_calificado')) {
            toOpp++;
            if (m.has('cierre_ganado') && m.get('cierre_ganado') >= m.get('oportunidad_comercial')) toWon++;
            if (m.has('cierre_perdido') && m.get('cierre_perdido') >= m.get('oportunidad_comercial')) toLost++;
          }
        }
      }
      const pct = (n, d) => (d === 0 ? null : Number(((n / d) * 100).toFixed(2)));
      return [
        { transicion: 'lead -> prospecto_calificado', contactos_origen: leads, contactos_convertidos: toPros, tasa_conversion_pct: pct(toPros, leads) },
        { transicion: 'prospecto_calificado -> oportunidad_comercial', contactos_origen: toPros, contactos_convertidos: toOpp, tasa_conversion_pct: pct(toOpp, toPros) },
        { transicion: 'oportunidad_comercial -> cierre_ganado', contactos_origen: toOpp, contactos_convertidos: toWon, tasa_conversion_pct: pct(toWon, toOpp) },
        { transicion: 'oportunidad_comercial -> cierre_perdido', contactos_origen: toOpp, contactos_convertidos: toLost, tasa_conversion_pct: pct(toLost, toOpp) },
        { transicion: 'lead -> cierre_ganado (conversion_global)', contactos_origen: leads, contactos_convertidos: toWon, tasa_conversion_pct: pct(toWon, leads) },
      ];
    }
    if (/AS dias_ciclo_venta/i.test(sql)) {
      return s.oportunidades
        .filter((o) => o.estado_oportunidad === 'ganada' && o.resultado_cierre === 'ganada' && o.fecha_cierre)
        .map((o) => {
          const ct = s.contactos.find((c) => c.id === o.contacto_id);
          const days = Math.round((Date.parse(o.fecha_cierre.slice(0, 10)) - Date.parse(ct.fecha_captura_lead.slice(0, 10))) / 86400000);
          return {
            oportunidad_id: o.id,
            codigo_oportunidad: o.codigo_oportunidad,
            codigo_contacto: ct.codigo_contacto,
            nombre_organizacion: ct.nombre_organizacion,
            fecha_captura_lead: ct.fecha_captura_lead,
            fecha_apertura: o.fecha_apertura,
            fecha_cierre: o.fecha_cierre,
            monto_cierre_crc: o.monto_cierre_crc,
            dias_ciclo_venta: days,
            dias_exactos_ciclo: days,
          };
        });
    }
    if (/AS promedio_dias_ciclo_venta/i.test(sql)) {
      const won = s.oportunidades
        .filter((o) => o.estado_oportunidad === 'ganada' && o.resultado_cierre === 'ganada' && o.fecha_cierre)
        .map((o) => {
          const ct = s.contactos.find((c) => c.id === o.contacto_id);
          return Math.round((Date.parse(o.fecha_cierre.slice(0, 10)) - Date.parse(ct.fecha_captura_lead.slice(0, 10))) / 86400000);
        });
      if (won.length === 0) {
        return [{ total_oportunidades_ganadas_validas: 0, promedio_dias_ciclo_venta: null, minimo_dias_ciclo_venta: null, maximo_dias_ciclo_venta: null }];
      }
      const avg = Number((won.reduce((a, b) => a + b, 0) / won.length).toFixed(2));
      return [{ total_oportunidades_ganadas_validas: won.length, promedio_dias_ciclo_venta: avg, minimo_dias_ciclo_venta: Math.min(...won), maximo_dias_ciclo_venta: Math.max(...won) }];
    }
    if (/AS ticket_promedio_crc/i.test(sql)) {
      const validContracts = s.contratos_servicios_cliente.filter((c) => ['activo', 'pausado', 'finalizado'].includes(c.estado_contrato));
      const sumCtr = validContracts.reduce((a, c) => a + Number(c.precio_acordado_crc), 0);
      const validOpps = s.oportunidades.filter((o) => o.estado_oportunidad === 'ganada' && o.resultado_cierre === 'ganada' && o.monto_cierre_crc !== null);
      const sumOpp = validOpps.reduce((a, o) => a + Number(o.monto_cierre_crc), 0);
      return [
        { fuente_medicion: 'contratos_servicios_cliente', cantidad_contratos_ganados: validContracts.length, ingresos_cerrados_crc: sumCtr, ticket_promedio_crc: validContracts.length ? Number((sumCtr / validContracts.length).toFixed(2)) : null, estado_calculo: validContracts.length ? 'CALCULADO' : 'NO_CALCULABLE_SIN_CONTRATOS' },
        { fuente_medicion: 'oportunidades_ganadas', cantidad_contratos_ganados: validOpps.length, ingresos_cerrados_crc: sumOpp, ticket_promedio_crc: validOpps.length ? Number((sumOpp / validOpps.length).toFixed(2)) : null, estado_calculo: validOpps.length ? 'CALCULADO' : 'NO_CALCULABLE_SIN_OPORTUNIDADES_GANADAS' },
      ];
    }
    if (/WITH oportunidades_por_campana/i.test(sql)) {
      return s.campanas.map((c) => {
        const ch = s.canales_mercadeo.find((cm) => cm.id === c.canal_principal_id) || {};
        const mets = s.metricas_campana_periodo.filter((m) => m.campana_id === c.id);
        const opps = s.oportunidades.filter((o) => o.campana_atribuida_id === c.id);
        const interacciones = mets.reduce((a, m) => a + Number(m.interacciones), 0);
        const alcance = mets.reduce((a, m) => a + Number(m.alcance), 0);
        const conv = mets.reduce((a, m) => a + Number(m.conversiones_clientes), 0);
        const gasto = mets.reduce((a, m) => a + Number(m.gasto_publicitario_crc), 0);
        const totalCost = mets.reduce((a, m) => a + Number(m.gasto_publicitario_crc) + Number(m.costo_mercadeo_operativo_crc) + Number(m.costo_ventas_atribuible_crc), 0);
        const ingresos = mets.reduce((a, m) => a + Number(m.ingresos_atribuibles_crc), 0);
        const leads = mets.reduce((a, m) => a + Number(m.leads_generados), 0);
        let diag = 'SIN_TRACCION_COMERCIAL_AUN';
        if (interacciones >= 1000 && conv === 0) diag = 'ALERTA_ALTA_VANIDAD_SIN_VENTAS';
        else if (conv > 0 && ingresos > gasto) diag = 'TRACCION_COMERCIAL_POSITIVA';
        else if (leads > 0 && conv === 0) diag = 'GENERACION_DE_LEADS_EN_MADURACION';
        return {
          campana_id: c.id,
          codigo_campana: c.codigo_campana,
          campana_nombre: c.nombre,
          canal_principal: ch.nombre,
          clasificacion_canal: ch.clasificacion,
          vanidad_impresiones: mets.reduce((a, m) => a + Number(m.impresiones), 0),
          vanidad_alcance: alcance,
          vanidad_visualizaciones: mets.reduce((a, m) => a + Number(m.visualizaciones), 0),
          vanidad_interacciones: interacciones,
          vanidad_seguidores_ganados: mets.reduce((a, m) => a + Number(m.seguidores_ganados), 0),
          tasa_interaccion_alcance_pct: alcance === 0 ? null : Number(((interacciones / alcance) * 100).toFixed(2)),
          negocio_clics: mets.reduce((a, m) => a + Number(m.clics), 0),
          negocio_leads: leads,
          negocio_oportunidades: opps.length,
          negocio_clientes_ganados: conv,
          negocio_ingresos_atribuibles_crc: ingresos,
          negocio_cac_crc: conv === 0 ? null : Number((totalCost / conv).toFixed(2)),
          negocio_roas: gasto === 0 ? null : Number((ingresos / gasto).toFixed(4)),
          diagnostico_comparativo: diag,
        };
      });
    }
    if (/FROM metricas_campana_periodo m/i.test(sql)) {
      if (/WHERE m\.id = \?/i.test(sql)) {
        return s.metricas_campana_periodo.filter((m) => m.id === Number(params[0]));
      }
      return [...s.metricas_campana_periodo];
    }

    // --- AGENTES Y EJECUCIONES ---
    if (/FROM catalogo_agentes WHERE codigo_agente = \?/i.test(sql)) {
      return s.catalogo_agentes.filter((a) => a.codigo_agente === params[0]);
    }
    if (/FROM catalogo_agentes/i.test(sql)) {
      return [...s.catalogo_agentes];
    }
    if (/INSERT INTO ejecuciones_agentes/i.test(sql)) {
      const [codigo_ejecucion, agente_id, orquestada, tipo_tarea, estado, fecha_inicio, fecha_fin, duracion_ms, entrada_resumida, resultado_resumida, mensaje_error, campana_id, contenido_id, contacto_id, oportunidad_id] = params;
      const id = s.nextIds.ejecuciones_agentes++;
      s.ejecuciones_agentes.push({
        id,
        codigo_ejecucion,
        agente_id: Number(agente_id),
        orquestada,
        tipo_tarea,
        estado,
        fecha_inicio,
        fecha_fin,
        duracion_ms,
        entrada_resumida: JSON.parse(entrada_resumida),
        resultado_resumida: resultado_resumida ? JSON.parse(resultado_resumida) : null,
        mensaje_error,
        campana_id,
        contenido_id,
        contacto_id,
        oportunidad_id,
        creado_en: fecha_inicio,
      });
      return { insertId: id };
    }
    if (/FROM ejecuciones_agentes ea/i.test(sql)) {
      const enrich = (ea) => ({
        ...ea,
        codigo_agente: s.catalogo_agentes.find((a) => a.id === ea.agente_id)?.codigo_agente || '',
        agente_nombre: s.catalogo_agentes.find((a) => a.id === ea.agente_id)?.nombre || '',
      });
      if (/WHERE ea\.id = \?/i.test(sql)) {
        return s.ejecuciones_agentes.filter((e) => e.id === Number(params[0])).map(enrich);
      }
      return [...s.ejecuciones_agentes].reverse().map(enrich);
    }

    throw new Error(`Consulta SQL no mapeada en doble de prueba: ${sql}`);
  }

  function filtersByCampana(rows, sql, params) {
    if (/WHERE m\.campana_id = \?/i.test(sql)) {
      return rows.filter((r) => r.campana_id === Number(params[0]));
    }
    return rows;
  }

  function groupByCampanaCanal(rows, s) {
    const map = new Map();
    for (const r of rows) {
      const key = `${r.campana_id}:${r.canal_id}`;
      if (!map.has(key)) {
        const c = s.campanas.find((x) => x.id === r.campana_id) || {};
        const cm = s.canales_mercadeo.find((x) => x.id === r.canal_id) || {};
        map.set(key, {
          campana_id: r.campana_id,
          codigo_campana: c.codigo_campana,
          campana_nombre: c.nombre,
          canal_id: r.canal_id,
          canal_nombre: cm.nombre,
          clasificacion_canal: cm.clasificacion,
          impresiones: 0,
          clics: 0,
          gasto: 0,
          ingresos: 0,
        });
      }
      const g = map.get(key);
      g.impresiones += Number(r.impresiones);
      g.clics += Number(r.clics);
      g.gasto += Number(r.gasto_publicitario_crc);
      g.ingresos += Number(r.ingresos_atribuibles_crc);
    }
    return Array.from(map.values());
  }

  return {
    reset() {
      state = createInitialState();
    },
    async checkDatabaseHealth() {
      return {
        connected: true,
        database: 'VitaBase',
        latency_ms: 1,
        status: 'connected',
        message: 'Test double conectado.',
      };
    },
    async query(sql, params = []) {
      return executeQueryOnState(state, sql, params);
    },
    async withTransaction(work) {
      const snapshot = JSON.parse(JSON.stringify(state));
      try {
        const tx = {
          async query(sql, params = []) {
            return executeQueryOnState(state, sql, params);
          },
        };
        return await work(tx);
      } catch (err) {
        state = snapshot;
        throw err;
      }
    },
  };
}

module.exports = {
  createTestDbDouble,
};

