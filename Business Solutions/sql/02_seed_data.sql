-- =============================================================================
-- VITANEXO BACKEND — DATOS FICTICIOS REPRODUCIBLES E IDEMPOTENTES
-- Base de datos objetivo: VitaBase (MySQL 8.0+)
-- Garantías:
--   * NO ejecuta DELETE, TRUNCATE ni sobrescribe datos reales existentes.
--   * Usa códigos únicos e inserciones condicionales para evitar duplicados.
--   * Cumple mínimos: >= 5 registros por catálogo y >= 10 por tabla de movimiento,
--     intermedia o de auditoría.
--   * Importes expresados en colones costarricenses (CRC).
--   * 100% datos ficticios comerciales/administrativos (0 datos clínicos/pacientes).
-- =============================================================================

USE `VitaBase`;

-- -----------------------------------------------------------------------------
-- 1. tipos_organizacion (6 registros — Catálogo)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `tipos_organizacion` (`codigo`, `nombre`, `descripcion`, `activo`) VALUES
('clinica_medica', 'Clínica Médica General', 'Clínicas privadas pequeñas con consulta externa y gestión administrativa.', 1),
('consultorio_especializado', 'Consultorio Médico Especializado', 'Consultorios independientes de especialidades con agenda programada.', 1),
('centro_fisioterapia', 'Centro de Fisioterapia', 'Centros de terapia física y movimiento con sesiones recurrentes.', 1),
('centro_rehabilitacion', 'Centro de Rehabilitación Física', 'Centros integrales de recuperación funcional y programación multisesión.', 1),
('clinica_odontologica', 'Clínica Odontológica', 'Consultorios odontológicos interesados en recordatorios y facturación.', 1),
('consultorio_integral', 'Consultorio de Bienestar Integral', 'Centros multidisciplinarios pequeños con necesidades de CRM y agenda.', 1);

-- -----------------------------------------------------------------------------
-- 2. catalogo_servicios (6 registros — Catálogo, importes en CRC)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `catalogo_servicios` (
  `codigo_servicio`, `nombre`, `categoria`, `descripcion`, `modalidad_cobro`, `precio_lista_crc`, `activo`
) VALUES
('SRV-AGENDA-01', 'VitaAgenda Pro', 'gestion_administrativa', 'Sistema de programación administrativa de citas, control de salas y turnos para consultorios.', 'mensual', 55000.00, 1),
('SRV-RECORD-02', 'VitaAviso Automatizado', 'automatizacion', 'Recordatorios automáticos de citas administrativas por WhatsApp y correo para reducir ausentismo.', 'mensual', 45000.00, 1),
('SRV-FACTUR-03', 'VitaFactura CR', 'facturacion', 'Módulo de facturación electrónica compatible con normativa tributaria de Costa Rica y control de pagos.', 'mensual', 65000.00, 1),
('SRV-CRMCLI-04', 'VitaCRM Comercial Salud', 'crm_comercial', 'Gestión de prospectos comerciales, seguimiento de convenios empresariales y retención administrativa.', 'mensual', 85000.00, 1),
('SRV-ANALIT-05', 'VitaPanel Operativo', 'analitica', 'Reportería administrativa de ocupación de agenda, ingresos facturados y desempeño comercial.', 'mensual', 75000.00, 1),
('SRV-IMPLEM-06', 'Implementación y Migración Inicial', 'soporte', 'Configuración inicial, capacitación al personal administrativo y puesta en marcha guiada.', 'unico', 185000.00, 1);

-- -----------------------------------------------------------------------------
-- 3. colaboradores (6 registros — Catálogo)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `colaboradores` (`codigo_colaborador`, `nombre_completo`, `correo`, `rol`, `activo`) VALUES
('COL-MKT-01', 'Valeria Solís Mora', 'valeria.solis@vitanexo.cr.example', 'mercadeo', 1),
('COL-MKT-02', 'Esteban Quirós Rojas', 'esteban.quiros@vitanexo.cr.example', 'mercadeo', 1),
('COL-CNT-03', 'Mariana Brenes Castro', 'mariana.brenes@vitanexo.cr.example', 'contenido', 1),
('COL-DIR-04', 'Alejandro Vargas Jiménez', 'alejandro.vargas@vitanexo.cr.example', 'direccion_comercial', 1),
('COL-VEN-05', 'Sofía Calderón Méndez', 'sofia.calderon@vitanexo.cr.example', 'ejecutivo_ventas', 1),
('COL-VEN-06', 'Daniel Araya Chaves', 'daniel.araya@vitanexo.cr.example', 'ejecutivo_ventas', 1);

-- -----------------------------------------------------------------------------
-- 4. canales_mercadeo (7 registros — Catálogo: 4 orgánicos, 3 pagados)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `canales_mercadeo` (
  `codigo_canal`, `nombre`, `clasificacion`, `plataforma`, `descripcion`, `activo`
) VALUES
('CAN-GADS-PAG', 'Google Search Ads', 'pagado', 'Google Ads', 'Anuncios de búsqueda por palabras clave administrativas para clínicas en Costa Rica.', 1),
('CAN-META-PAG', 'Meta Ads (Instagram y Facebook)', 'pagado', 'Meta Business', 'Pauta segmentada para administradores de consultorios y centros de fisioterapia.', 1),
('CAN-LIAD-PAG', 'LinkedIn Ads B2B', 'pagado', 'LinkedIn Campaign Manager', 'Campañas patrocinadas dirigidas a gerentes y directores administrativos de clínicas.', 1),
('CAN-SEOB-ORG', 'Blog Educativo SEO', 'organico', 'Sitio Web VitaNexo', 'Artículos orgánicos sobre eficiencia administrativa y reducción de ausentismo.', 1),
('CAN-LINK-ORG', 'LinkedIn Corporativo Orgánico', 'organico', 'LinkedIn', 'Publicaciones orgánicas de casos operativos y gestión comercial para consultorios.', 1),
('CAN-MAIL-ORG', 'Boletín por Correo Electrónico', 'organico', 'Email Directo', 'Secuencias informativas para contactos suscritos voluntariamente.', 1),
('CAN-WEBN-ORG', 'Webinars Administrativos Sector Salud', 'organico', 'Eventos Virtuales', 'Sesiones educativas gratuitas sobre digitalización administrativa en clínicas.', 1);

-- -----------------------------------------------------------------------------
-- 5. etapas_embudo (6 registros — Catálogo)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `etapas_embudo` (
  `codigo_etapa`, `nombre`, `orden_embudo`, `es_etapa_final`, `descripcion`, `activo`
) VALUES
('lead', 'Lead Capturado', 1, 0, 'Contacto inicial registrado desde un canal de mercadeo o prospección.', 1),
('prospecto_calificado', 'Prospecto Calificado (MQL)', 2, 0, 'Contacto con necesidad administrativa validada y perfil compatible con VitaNexo.', 1),
('oportunidad_comercial', 'Oportunidad Comercial (SQL)', 3, 0, 'Prospecto aceptado por ventas con propuesta comercial activa.', 1),
('cierre_ganado', 'Cierre Ganado', 4, 1, 'Negociación cerrada exitosamente con contratación de servicios.', 1),
('cierre_perdido', 'Cierre Perdido', 5, 1, 'Oportunidad cerrada sin contratación en el ciclo actual.', 1),
('nutricion_futura', 'Nutrición Futura', 6, 0, 'Contacto realimentado por mercadeo cuando aún no está listo para compra.', 1);

-- -----------------------------------------------------------------------------
-- 6. catalogo_agentes (5 registros — Catálogo)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `catalogo_agentes` (
  `codigo_agente`, `nombre`, `dominio`, `descripcion`, `es_orquestador`, `activo`
) VALUES
('orquestador_central', 'Orquestador Central VitaNexo', 'orquestacion', 'Coordina validaciones, enrutamiento y trazabilidad de los agentes especializados.', 1, 1),
('agente_campanas', 'Agente de Campañas y Presupuesto', 'campanas', 'Valida y propone campañas de mercadeo y asignaciones presupuestarias deterministas.', 0, 1),
('agente_contenido', 'Agente de Contenido y Calendario Editorial', 'contenido', 'Genera borradores con plantillas deterministas y gestiona estados de revisión.', 0, 1),
('agente_metricas', 'Agente de Métricas e Indicadores', 'metricas', 'Ejecuta cálculos SQL auditables de CPC, CTR, CAC, ROAS, embudo y vanidad vs negocio.', 0, 1),
('agente_contactos_ventas', 'Agente de Contactos, Embudo y Ventas', 'ventas', 'Gestiona leads, transiciones de etapa, oportunidades, traspasos y seguimientos.', 0, 1);

-- -----------------------------------------------------------------------------
-- 7. campanas (10 registros — Movimiento: 5 pagadas y 5 orgánicas)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `campanas` (
  `codigo_campana`, `nombre`, `descripcion`, `objetivo`, `etapa_recorrido`,
  `canal_principal_id`, `responsable_id`, `fecha_inicio`, `fecha_fin`,
  `presupuesto_total_crc`, `justificacion_presupuesto`, `costo_operativo_mercadeo_crc`,
  `estado`, `creada_por_agente`
) VALUES
(
  'CMP-2026-01', 'Búsqueda Activa Agenda Fisioterapia GAM',
  'Campaña en buscadores para centros de fisioterapia del Gran Área Metropolitana que buscan digitalizar su agenda.',
  'Captar 25 solicitudes de demostración de VitaAgenda Pro.', 'decision',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  '2026-01-10', '2026-03-31', 420000.00,
  'Alta intención de compra en búsquedas directas de software administrativo para fisioterapia.',
  95000.00, 'finalizada', 0
),
(
  'CMP-2026-02', 'Reducción de Ausentismo en Consultorios CR',
  'Anuncios educativos en redes sobre el impacto financiero de citas no asistidas.',
  'Generar reconocimiento y descargas de calculadora administrativa.', 'conciencia',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  '2026-02-01', '2026-04-30', 350000.00,
  'Segmentación amplia a administradores de clínicas privadas en San José, Heredia y Alajuela.',
  80000.00, 'finalizada', 0
),
(
  'CMP-2026-03', 'Facturación Electrónica sin Fricción Clínicas',
  'Campaña B2B orientada a clínicas pequeñas que desean unificar agenda y facturación electrónica.',
  'Conseguir 15 prospectos calificados interesados en VitaFactura CR.', 'consideracion',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LIAD-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  '2026-03-01', '2026-05-31', 480000.00,
  'LinkedIn permite filtrar tomadores de decisión administrativa en sector salud privado.',
  110000.00, 'activa', 0
),
(
  'CMP-2026-04', 'Guía SEO Gestión Administrativa de Consultorios',
  'Serie de artículos posicionados orgánicamente sobre orden operativo y atención telefónica.',
  'Incrementar tráfico orgánico calificado y registros al boletín.', 'conciencia',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  '2026-01-15', '2026-06-30', 0.00,
  'Canal orgánico sin compra de pauta; inversión concentrada en redacción interna.',
  120000.00, 'activa', 0
),
(
  'CMP-2026-05', 'Casos de Éxito Administrativos en LinkedIn',
  'Publicaciones semanales comparando tiempos de recepción antes y después de automatizar recordatorios.',
  'Nutrir prospectos en evaluación de proveedores locales.', 'consideracion',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LINK-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'),
  '2026-02-15', '2026-06-15', 0.00,
  'Difusión orgánica en red profesional sin presupuesto de pauta publicitaria.',
  70000.00, 'activa', 0
),
(
  'CMP-2026-06', 'Secuencia Correo Reactivación Leads Clínicas',
  'Campaña por correo para contactos que descargaron material administrativo en trimestres previos.',
  'Agendar 10 reuniones comerciales de cierre.', 'decision',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-MAIL-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  '2026-03-10', '2026-05-15', 0.00,
  'Uso de base propia con consentimiento comercial; cero gasto en pauta externa.',
  55000.00, 'activa', 0
),
(
  'CMP-2026-07', 'Webinar Orden Financiero para Centros de Terapia',
  'Evento virtual práctico sobre control de paquetes de sesiones y cobros administrativos.',
  'Registrar 40 asistentes de centros de fisioterapia y rehabilitación.', 'consideracion',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-WEBN-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  '2026-04-01', '2026-05-20', 0.00,
  'Convocatoria orgánica apoyada por alianzas gremiales y correo directo.',
  90000.00, 'activa', 0
),
(
  'CMP-2026-08', 'Impulso Regional Clínicas Occidente y Cartago',
  'Pauta de búsqueda para consultorios fuera de San José centro con crecimiento de citas.',
  'Captar 12 leads comerciales en Alajuela y Cartago.', 'decision',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  '2026-04-15', '2026-07-15', 310000.00,
  'Menor costo por clic estimado en cantones regionales con alta apertura de consultorios.',
  65000.00, 'activa', 1
),
(
  'CMP-2026-09', 'Campaña Viral Reconocimiento Marca VitaNexo',
  ' Reels y piezas visuales de alto alcance sobre retos cotidianos en recepción de clínicas.',
  'Aumentar alcance e interacciones de marca en redes sociales.', 'conciencia',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'),
  '2026-03-15', '2026-04-30', 220000.00,
  'Prueba controlada para evaluar si el alcance masivo genera leads reales o solo métricas de vanidad.',
  50000.00, 'finalizada', 0
),
(
  'CMP-2026-10', 'Propuesta Q3 Automatización Odontológica CR',
  'Propuesta de campaña para clínicas odontológicas interesadas en confirmación automática de citas.',
  'Validar interés comercial en el segmento odontológico con 15 leads.', 'consideracion',
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  '2026-07-01', '2026-09-30', 0.00,
  'Fase exploratoria orgánica antes de comprometer presupuesto publicitario pagado.',
  45000.00, 'propuesta', 1
);

-- -----------------------------------------------------------------------------
-- 8. asignaciones_presupuesto (12 registros — Movimiento)
-- -----------------------------------------------------------------------------
INSERT INTO `asignaciones_presupuesto` (
  `campana_id`, `canal_id`, `responsable_id`, `periodo_inicio`, `periodo_fin`,
  `monto_asignado_crc`, `razon_decision`, `estado_asignacion`
)
SELECT * FROM (
  SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01') AS campana_id,
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG') AS canal_id,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01') AS responsable_id,
    DATE('2026-01-10') AS periodo_inicio, DATE('2026-02-15') AS periodo_fin,
    220000.00 AS monto_asignado_crc,
    'Tramo inicial para palabras clave de agenda fisioterapia en San José y Heredia.' AS razon_decision,
    'ejecutada' AS estado_asignacion
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
    DATE('2026-02-16'), DATE('2026-03-31'), 200000.00,
    'Segundo tramo optimizado hacia anuncios con mayor conversión a demostraciones.', 'ejecutada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
    DATE('2026-02-01'), DATE('2026-03-15'), 180000.00,
    'Pauta inicial de carruseles informativos sobre reducción de ausentismo.', 'ejecutada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
    DATE('2026-03-16'), DATE('2026-04-30'), 170000.00,
    'Refuerzo de remarketing a usuarios que visitaron la página de precios.', 'ejecutada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LIAD-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
    DATE('2026-03-01'), DATE('2026-04-15'), 260000.00,
    'Segmentación por cargo administrativo en clínicas privadas costarricenses.', 'ejecutada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
    DATE('2026-04-16'), DATE('2026-05-31'), 220000.00,
    'Complemento en búsqueda pagada para capturar consultas directas de facturación electrónica.', 'aprobada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
    DATE('2026-04-15'), DATE('2026-05-31'), 160000.00,
    'Lanzamiento regional en Cartago, Grecia, San Ramón y Palmares.', 'aprobada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
    DATE('2026-06-01'), DATE('2026-07-15'), 150000.00,
    'Apoyo visual regional para reforzar recordación en consultorios locales.', 'propuesta'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-09'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'),
    DATE('2026-03-15'), DATE('2026-04-15'), 150000.00,
    'Impulso de videos cortos orientados a alcance general.', 'ejecutada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-09'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'),
    DATE('2026-04-16'), DATE('2026-04-30'), 70000.00,
    'Reducción presupuestaria al detectar alta interacción pero nula conversión comercial.', 'ajustada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-04'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
    DATE('2026-01-15'), DATE('2026-06-30'), 0.00,
    'Registro formal de asignación cero en pauta por tratarse de estrategia 100% orgánica.', 'aprobada'
  UNION ALL SELECT
    (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-07'),
    (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-WEBN-ORG'),
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
    DATE('2026-04-01'), DATE('2026-05-20'), 0.00,
    'Difusión orgánica mediante alianzas y correo electrónico sin inversión publicitaria.', 'aprobada'
) AS seed_asig
WHERE NOT EXISTS (
  SELECT 1 FROM `asignaciones_presupuesto` ap
  WHERE ap.campana_id = seed_asig.campana_id
    AND ap.canal_id = seed_asig.canal_id
    AND ap.periodo_inicio = seed_asig.periodo_inicio
    AND ap.periodo_fin = seed_asig.periodo_fin
);

-- -----------------------------------------------------------------------------
-- 9. contenidos (12 registros — Movimiento: todos los estados editoriales)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `contenidos` (
  `codigo_contenido`, `campana_id`, `canal_id`, `autor_colaborador_id`, `creado_por_agente`,
  `titulo`, `etapa_recorrido`, `tipo_contenido`, `cuerpo_borrador`,
  `version_actual`, `estado`, `fecha_programada_publicacion`, `fecha_ultima_revision`, `fecha_publicacion`
) VALUES
(
  'CNT-2026-01',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Anuncio Search: Agenda Digital para Centros de Fisioterapia',
  'decision', 'anuncio_pagado',
  'Organice turnos, cabinas y recordatorios automáticos en su centro de fisioterapia en Costa Rica. Solicite demostración administrativa hoy.',
  1, 'publicado', '2026-01-12 08:00:00', '2026-01-11 15:30:00', '2026-01-12 08:05:00'
),
(
  'CNT-2026-02',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Carrusel: ¿Cuánto cuesta una cita vacía en su consultorio?',
  'conciencia', 'publicacion_social',
  'Cada espacio no confirmado impacta los ingresos operativos del consultorio. Conozca cómo automatizar confirmaciones por WhatsApp con VitaNexo.',
  2, 'publicado', '2026-02-03 09:00:00', '2026-02-02 16:00:00', '2026-02-03 09:02:00'
),
(
  'CNT-2026-03',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LIAD-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Anuncio LinkedIn: Facturación Electrónica Integrada a la Recepción',
  'consideracion', 'anuncio_pagado',
  'Evite doble digitación entre la recepción y la contabilidad de su clínica con VitaFactura CR.',
  1, 'aprobado', '2026-05-05 10:00:00', '2026-04-25 11:20:00', NULL
),
(
  'CNT-2026-04',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-04'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Artículo SEO: 5 Indicadores Administrativos para Clínicas Pequeñas',
  'conciencia', 'articulo_blog',
  'Guía práctica para medir ocupación de agenda, tasa de confirmación, tiempos de cobro y retención administrativa sin complejidades.',
  1, 'publicado', '2026-01-25 07:30:00', '2026-01-23 14:10:00', '2026-01-25 07:30:00'
),
(
  'CNT-2026-05',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-05'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LINK-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Caso Operativo: Recepción Ágil en Centros de Rehabilitación',
  'consideracion', 'publicacion_social',
  'Cómo reducir 6 horas semanales de llamadas manuales de confirmación utilizando recordatorios programados.',
  1, 'publicado', '2026-03-04 08:30:00', '2026-03-02 17:00:00', '2026-03-04 08:31:00'
),
(
  'CNT-2026-06',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-06'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-MAIL-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'), NULL,
  'Correo Secuencia 1: Diagnóstico Operativo de Recepción en 15 Minutos',
  'decision', 'correo_electronico',
  'Hola, le compartimos una lista de verificación administrativa y acceso directo para agendar una demostración personalizada de VitaNexo.',
  1, 'publicado', '2026-03-12 08:00:00', '2026-03-11 10:45:00', '2026-03-12 08:00:00'
),
(
  'CNT-2026-07',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-07'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-WEBN-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'), NULL,
  'Guion Webinar: Control de Paquetes de Sesiones y Cobros en Fisioterapia',
  'consideracion', 'guion_webinar',
  'Estructura de 45 minutos sobre orden administrativo de paquetes prepagados, conciliación diaria y seguimiento de renovación.',
  2, 'aprobado', '2026-05-12 18:00:00', '2026-04-28 09:30:00', NULL
),
(
  'CNT-2026-08',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  NULL, 'agente_contenido',
  'Anuncio Regional: Software Administrativo para Consultorios en Cartago y Alajuela',
  'decision', 'anuncio_pagado',
  'Borrador estructurado para consultorios regionales: agenda centralizada, recordatorios y facturación en colones.',
  1, 'en_revision', '2026-05-10 08:00:00', NULL, NULL
),
(
  'CNT-2026-09',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-09'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Publicación Humor Recepción: Llamadas de Última Hora',
  'conciencia', 'publicacion_social',
  'Pieza ligera sobre cambios de turno de último minuto en recepción y cómo mantener la calma operativa.',
  1, 'publicado', '2026-03-18 12:00:00', '2026-03-17 16:20:00', '2026-03-18 12:05:00'
),
(
  'CNT-2026-10',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-MAIL-ORG'),
  NULL, 'agente_contenido',
  'Guía Descargable: Checklist de Cierre Mensual para Clínicas',
  'consideracion', 'guia_descargable',
  'Documento descargable con pasos administrativos para conciliar agenda, pagos en SINPE/tarjeta y comprobantes electrónicos.',
  1, 'rechazado', '2026-05-15 09:00:00', '2026-04-26 14:15:00', NULL
),
(
  'CNT-2026-11',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-10'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  NULL, 'agente_contenido',
  'Borrador Blog: Confirmación Automática de Citas en Clínicas Odontológicas',
  'consideracion', 'articulo_blog',
  'Borrador inicial sobre cómo organizar sillones odontológicos y recordatorios preventivos de asistencia.',
  1, 'borrador', '2026-07-05 08:00:00', NULL, NULL
),
(
  'CNT-2026-12',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-06'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-MAIL-ORG'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-CNT-03'), NULL,
  'Correo Secuencia 2: Comparativa de Planes Administrativos VitaNexo',
  'decision', 'correo_electronico',
  'Resumen transparente de tarifas mensuales en colones y tiempos de implementación para equipos pequeños.',
  1, 'en_revision', '2026-05-08 08:30:00', NULL, NULL
);

-- -----------------------------------------------------------------------------
-- 10. revisiones_contenido (14 registros — Auditoría con múltiples revisiones)
-- -----------------------------------------------------------------------------
INSERT INTO `revisiones_contenido` (
  `contenido_id`, `version_revisada`, `revisor_id`, `tipo_actor_revisor`,
  `fecha_revision`, `decision`, `estado_anterior`, `estado_resultante`, `comentarios`
)
SELECT * FROM (
  SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-01') AS contenido_id,
    1 AS version_revisada,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04') AS revisor_id,
    'humano' AS tipo_actor_revisor,
    CAST('2026-01-11 15:30:00' AS DATETIME) AS fecha_revision,
    'aprobar' AS decision, 'en_revision' AS estado_anterior, 'aprobado' AS estado_resultante,
    'Mensaje claro, propuesta comercial directa y alineada con centros de fisioterapia.' AS comentarios
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-02'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'), 'humano',
    '2026-02-01 11:00:00', 'rechazar', 'en_revision', 'rechazado',
    'La versión 1 no especificaba que la solución aplica a gestión administrativa en Costa Rica.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-02'), 2,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'), 'humano',
    '2026-02-02 10:00:00', 'enviar_a_revision', 'rechazado', 'en_revision',
    'Se ajustó el texto del carrusel incorporando ejemplos en colones y enfoque administrativo.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-02'), 2,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04'), 'humano',
    '2026-02-02 16:00:00', 'aprobar', 'en_revision', 'aprobado',
    'Versión 2 aprobada tras verificar precisión comercial.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-03'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04'), 'humano',
    '2026-04-25 11:20:00', 'aprobar', 'en_revision', 'aprobado',
    'Aprobado para pauta en LinkedIn durante mayo.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-04'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'), 'humano',
    '2026-01-23 14:10:00', 'aprobar', 'en_revision', 'aprobado',
    'Excelente estructura educativa SEO sin tecnicismos innecesarios.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-05'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'), 'humano',
    '2026-03-02 17:00:00', 'aprobar', 'en_revision', 'aprobado',
    'Caso operativo validado; cifras administrativas consistentes.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-06'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04'), 'humano',
    '2026-03-11 10:45:00', 'aprobar', 'en_revision', 'aprobado',
    'Llamado a la acción claro para agendar demostración.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-07'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04'), 'humano',
    '2026-04-20 15:00:00', 'solicitar_cambios', 'en_revision', 'rechazado',
    'Incluir bloque de 10 minutos dedicado a conciliación de paquetes prepagados.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-07'), 2,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'), 'humano',
    '2026-04-27 09:00:00', 'enviar_a_revision', 'rechazado', 'en_revision',
    'Se incorporó el bloque solicitado en la versión 2 del guion.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-07'), 2,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04'), 'humano',
    '2026-04-28 09:30:00', 'aprobar', 'en_revision', 'aprobado',
    'Guion completo aprobado para el webinar.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-08'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'), 'humano',
    '2026-04-29 10:00:00', 'enviar_a_revision', 'borrador', 'en_revision',
    'Borrador generado por agente enviado a revisión humana.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-09'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'), 'humano',
    '2026-03-17 16:20:00', 'aprobar', 'en_revision', 'aprobado',
    'Aprobado como experimento de alcance de marca.'
  UNION ALL SELECT
    (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-10'), 1,
    (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-DIR-04'), 'humano',
    '2026-04-26 14:15:00', 'rechazar', 'en_revision', 'rechazado',
    'Falta detallar los requisitos actuales de comprobantes electrónicos en Costa Rica antes de aprobar.'
) AS seed_rev
WHERE NOT EXISTS (
  SELECT 1 FROM `revisiones_contenido` rc
  WHERE rc.contenido_id = seed_rev.contenido_id
    AND rc.version_revisada = seed_rev.version_revisada
    AND rc.decision = seed_rev.decision
    AND rc.fecha_revision = seed_rev.fecha_revision
);

-- -----------------------------------------------------------------------------
-- 11. contactos (12 registros — Movimiento: leads en todas las etapas)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `contactos` (
  `codigo_contacto`, `nombre_completo`, `cargo`, `nombre_organizacion`, `tipo_organizacion_id`,
  `correo`, `telefono`, `provincia`, `fuente_origen`, `campana_origen_id`, `canal_origen_id`,
  `etapa_actual_id`, `puntuacion_lead`, `necesidad_comercial`, `presupuesto_declarado_crc`,
  `responsable_comercial_id`, `fecha_captura_lead`, `fecha_proximo_seguimiento`, `activo`
) VALUES
(
  'LEAD-2026-01', 'Laura Chinchilla Vega', 'Administradora General', 'Centro Fisioterapia Movimiento Vital',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_fisioterapia'),
  'lchinchilla@movimientovital.cr.example', '+506 2221-4101', 'San José', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
  92, 'Controlar agenda de 4 fisioterapeutas y automatizar recordatorios por WhatsApp.', 120000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  '2026-01-16 09:20:00', NULL, 1
),
(
  'LEAD-2026-02', 'Marco Tulio Fonseca Ruiz', 'Gerente Operativo', 'Clínica Médica San Rafael del Este',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_medica'),
  'mfonseca@clinicasanrafaeleste.cr.example', '+506 2234-5202', 'San José', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
  88, 'Unificar agenda de recepción con facturación electrónica mensual.', 140000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  '2026-01-24 14:10:00', NULL, 1
),
(
  'LEAD-2026-03', 'Patricia Elizondo Montero', 'Coordinadora Administrativa', 'Consultorio Especializado Monte Verde Urbano',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'consultorio_especializado'),
  'pelizondo@consultoriomvu.cr.example', '+506 2260-6303', 'Heredia', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
  85, 'Reducir ausentismo del 22% en citas programadas mediante confirmaciones automáticas.', 95000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  '2026-02-08 11:05:00', NULL, 1
),
(
  'LEAD-2026-04', 'Roberto Alvarado Picado', 'Director Administrativo', 'Rehabilitación Integral del Valle',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_rehabilitacion'),
  'ralvarado@rehabdelvalle.cr.example', '+506 2551-7404', 'Cartago', 'busqueda_organica',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-04'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
  90, 'Control administrativo de paquetes de sesiones y reportería de ocupación.', 150000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  '2026-02-14 16:40:00', NULL, 1
),
(
  'LEAD-2026-05', 'Gabriela Umaña Cordero', 'Socia Administradora', 'Clínica Odontológica Sonrisa Clara',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_odontologica'),
  'gumana@sonrisaclara.cr.example', '+506 2441-8505', 'Alajuela', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LIAD-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
  87, 'Integrar facturación electrónica y recordatorios para dos sedes pequeñas.', 165000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  '2026-03-05 10:15:00', NULL, 1
),
(
  'LEAD-2026-06', 'Fernando Madrigal Soto', 'Administrador', 'Fisioterapia Deportiva Guanacaste Activo',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_fisioterapia'),
  'fmadrigal@guanacasteactivo.cr.example', '+506 2666-9606', 'Guanacaste', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_perdido'),
  74, 'Agenda digital básica para dos cubículos de terapia.', 45000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  '2026-02-19 13:30:00', NULL, 1
),
(
  'LEAD-2026-07', 'Carolina Sancho Villalobos', 'Jefa de Recepción y Cobros', 'Consultorio Integral Paseo Colón Norte',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'consultorio_integral'),
  'csancho@integralcolon.cr.example', '+506 2258-1707', 'San José', 'sitio_web',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-06'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-MAIL-ORG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_perdido'),
  79, 'Reemplazar hojas de cálculo de recepción y seguimiento de convenios corporativos.', 110000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  '2026-03-14 09:50:00', NULL, 1
),
(
  'LEAD-2026-08', 'Javier Bolaños Herrera', 'Gerente General', 'Clínica Médica Brisas del Zurquí',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_medica'),
  'jbolanos@brisaszurqui.cr.example', '+506 2268-2808', 'Heredia', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LIAD-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
  84, 'Implementar VitaFactura CR, VitaAgenda Pro y panel operativo gerencial.', 180000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  '2026-04-04 15:20:00', '2026-05-06 10:00:00', 1
),
(
  'LEAD-2026-09', 'Natalia Alfaro Zúñiga', 'Coordinadora Operativa', 'Centro de Fisioterapia Pacífico Central',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_fisioterapia'),
  'nalfaro@fisiopacifico.cr.example', '+506 2630-3909', 'Puntarenas', 'evento_salud',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-07'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-WEBN-ORG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
  81, 'Control de paquetes prepagados de sesiones y recordatorios automáticos.', 105000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  '2026-04-12 11:45:00', '2026-05-07 14:30:00', 1
),
(
  'LEAD-2026-10', 'Andrés Salazar Murillo', 'Encargado Administrativo', 'Consultorio Médico Atlántico Sur',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'consultorio_especializado'),
  'asalazar@atlanticosur.cr.example', '+506 2758-4010', 'Limón', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
  76, 'Digitalizar agenda compartida entre tres consultorios administrativos.', 90000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  '2026-04-20 08:40:00', '2026-05-04 09:00:00', 1
),
(
  'LEAD-2026-11', 'Mónica Jiménez Portugués', 'Asistente de Dirección', 'Clínica Pequeña Santa Lucía',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_medica'),
  'mjimenez@clinicasantalucia.cr.example', '+506 2591-5111', 'Cartago', 'campana_digital',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'nutricion_futura'),
  52, 'Consulta exploratoria para el próximo semestre sin presupuesto aprobado aún.', 40000.00,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  '2026-04-22 16:00:00', '2026-06-01 09:00:00', 1
),
(
  'LEAD-2026-12', 'Diego Hernández Barrantes', 'Administrador', 'Centro Rehabilitación Poás',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_rehabilitacion'),
  'dhernandez@rehabpoas.cr.example', '+506 2448-6212', 'Alajuela', 'busqueda_organica',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-05'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LINK-ORG'),
  (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
  60, 'Solicitó información general sobre tarifas de VitaAgenda Pro.', NULL,
  NULL,
  '2026-04-27 17:15:00', '2026-05-03 11:00:00', 1
);

-- -----------------------------------------------------------------------------
-- 12. historial_etapas_contacto (26 registros — Auditoría completa de embudo)
-- -----------------------------------------------------------------------------
INSERT INTO `historial_etapas_contacto` (
  `contacto_id`, `etapa_anterior_id`, `etapa_nueva_id`, `cambiado_por_id`, `fecha_transicion`, `motivo`
)
SELECT * FROM (
  -- LEAD-01: lead -> prospecto -> oportunidad -> cierre_ganado
  SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01') AS contacto_id,
         CAST(NULL AS SIGNED) AS etapa_anterior_id,
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead') AS etapa_nueva_id,
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01') AS cambiado_por_id,
         CAST('2026-01-16 09:20:00' AS DATETIME) AS fecha_transicion, 'Captura inicial desde formulario Google Search Ads.' AS motivo
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-01-18 11:00:00', 'Perfil B2B confirmado y presupuesto mensual disponible.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-01-20 14:30:00', 'Traspaso aceptado por ventas y demostración realizada.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-02-04 16:00:00', 'Contrato firmado para VitaAgenda Pro y VitaAviso.'

  -- LEAD-02: lead -> prospecto -> oportunidad -> cierre_ganado
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-01-24 14:10:00', 'Registro vía anuncio de búsqueda pagada.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-01-27 09:40:00', 'Calificación telefónica completada.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-01-29 15:00:00', 'Propuesta formal enviada.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-02-18 11:30:00', 'Aprobación de gerencia y contratación anual.'

  -- LEAD-03: lead -> prospecto -> oportunidad -> cierre_ganado
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-02-08 11:05:00', 'Descarga de guía desde campaña Meta Ads.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-02-11 10:20:00', 'Confirmó necesidad prioritaria de reducir ausentismo.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-02-13 13:00:00', 'Aceptado por ejecutivo comercial.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-03-02 17:00:00', 'Cierre ganado tras prueba guiada.'

  -- LEAD-04: lead -> prospecto -> oportunidad -> cierre_ganado
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-02-14 16:40:00', 'Contacto entrante desde artículo SEO.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-02-17 09:00:00', 'Centro con 6 terapeutas y necesidad inmediata.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-02-19 10:30:00', 'Oportunidad abierta tras sesión de descubrimiento.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-03-15 15:45:00', 'Contratación de paquete administrativo + analítica.'

  -- LEAD-05: lead -> prospecto -> oportunidad -> cierre_ganado
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-03-05 10:15:00', 'Formulario LinkedIn Ads.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-03-08 11:30:00', 'Validada necesidad multi-sede.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-03-10 14:00:00', 'Propuesta multi-servicio presentada.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_ganado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-03-28 12:15:00', 'Contrato cerrado exitosamente.'

  -- LEAD-06 y LEAD-07 -> cierre_perdido; LEAD-08 y LEAD-09 -> oportunidad; LEAD-10 -> prospecto; LEAD-11 -> nutricion; LEAD-12 -> lead
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-02-19 13:30:00', 'Lead captado en Meta Ads.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-02-21 10:00:00', 'Calificado inicialmente.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-02-23 15:00:00', 'Cotización básica enviada.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_perdido'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-03-10 09:30:00', 'Pospuso inversión por remodelación física del local.'

  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-03-14 09:50:00', 'Respuesta a secuencia de correo.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-03-16 11:00:00', 'Interés comercial validado.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-03-18 16:00:00', 'Demostración de CRM comercial.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'cierre_perdido'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-04-06 17:10:00', 'Eligió mantener proceso manual durante este trimestre.'

  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-04-04 15:20:00', 'Lead captado en LinkedIn Ads.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-04-07 10:15:00', 'MQL aprobado.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
         '2026-04-09 11:00:00', 'En negociación de contrato integral.'

  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-09'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-04-12 11:45:00', 'Asistente registrado al webinar.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-09'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-04-15 09:30:00', 'Solicitó cotización al finalizar sesión.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-09'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'oportunidad_comercial'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-04-17 15:00:00', 'Propuesta comercial enviada.'

  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-10'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-04-20 08:40:00', 'Lead regional Google Ads.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-10'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'prospecto_calificado'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-04-23 14:00:00', 'Listo para revisión de traspaso a ventas.'

  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-11'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
         '2026-04-22 16:00:00', 'Consulta web regional.'
  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-11'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'nutricion_futura'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
         '2026-04-25 11:30:00', 'Devuelto a nutrición tras rechazo de traspaso por falta de presupuesto.'

  UNION ALL SELECT (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-12'),
         NULL, (SELECT id FROM etapas_embudo WHERE codigo_etapa = 'lead'),
         (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
         '2026-04-27 17:15:00', 'Lead reciente pendiente de calificación inicial.'
) AS seed_hist
WHERE NOT EXISTS (
  SELECT 1 FROM `historial_etapas_contacto` h
  WHERE h.contacto_id = seed_hist.contacto_id
    AND h.etapa_nueva_id = seed_hist.etapa_nueva_id
    AND h.fecha_transicion = seed_hist.fecha_transicion
);

-- -----------------------------------------------------------------------------
-- 13. contactos_contenidos_consumidos (12 registros — Intermedia N:M)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `contactos_contenidos_consumidos` (
  `contacto_id`, `contenido_id`, `tipo_interaccion`, `fecha_interaccion`
) VALUES
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-01'), 'clic', '2026-01-16 09:15:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-04'), 'lectura', '2026-01-26 19:10:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-01'), 'registro_formulario', '2026-01-24 14:08:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-02'), 'clic', '2026-02-08 11:00:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-04'), 'lectura', '2026-02-14 16:25:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-05'), 'lectura', '2026-03-05 08:50:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-05'), 'clic', '2026-03-05 10:05:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-02'), 'registro_formulario', '2026-02-19 13:25:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-06'), 'clic', '2026-03-14 09:42:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-04'), 'lectura', '2026-04-04 15:00:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-09'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-05'), 'lectura', '2026-04-12 11:30:00'),
((SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-11'), (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-09'), 'clic', '2026-04-22 15:50:00');

-- -----------------------------------------------------------------------------
-- 14. traspasos_ventas (10 registros — Movimiento: aceptados, rechazados, pendiente)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `traspasos_ventas` (
  `codigo_traspaso`, `contacto_id`, `entregado_por_id`, `recibido_por_id`,
  `puntuacion_al_traspaso`, `necesidad_detectada`, `presupuesto_declarado_crc`,
  `referencias_contenidos`, `observaciones_seguimiento`, `fecha_traspaso`,
  `decision_ventas`, `motivo_decision`, `fecha_respuesta`
) VALUES
(
  'TRP-2026-01', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  92, 'Agenda multi-terapeuta y recordatorios WhatsApp.', 120000.00,
  'Clic en CNT-2026-01 y lectura de artículo CNT-2026-04.',
  'Administradora con decisión directa; agendar demo antes del viernes.',
  '2026-01-19 10:00:00', 'aceptado', 'Cumple criterios B2B, presupuesto y autoridad.', '2026-01-20 09:15:00'
),
(
  'TRP-2026-02', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  88, 'Agenda integrada con facturación electrónica.', 140000.00,
  'Formulario directo desde anuncio CNT-2026-01.',
  'Solicitó validar emisión de comprobantes electrónicos en colones.',
  '2026-01-28 11:20:00', 'aceptado', 'Oportunidad clara para paquete Agenda + Factura.', '2026-01-29 08:45:00'
),
(
  'TRP-2026-03', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  85, 'Automatización de confirmaciones para reducir citas perdidas.', 95000.00,
  'Interacción con carrusel CNT-2026-02.',
  'Mostrar cálculo de ahorro administrativo mensual.',
  '2026-02-12 09:30:00', 'aceptado', 'Necesidad cuantificada y urgencia alta.', '2026-02-13 10:10:00'
),
(
  'TRP-2026-04', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  90, 'Control administrativo de paquetes prepagados de rehabilitación.', 150000.00,
  'Lectura completa de CNT-2026-04 y caso operativo CNT-2026-05.',
  'Director interesado también en VitaPanel Operativo.',
  '2026-02-18 14:00:00', 'aceptado', 'Excelente ajuste con nuestro catálogo.', '2026-02-19 09:20:00'
),
(
  'TRP-2026-05', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  87, 'Gestión administrativa para dos sedes odontológicas.', 165000.00,
  'Interacción en LinkedIn con CNT-2026-05.',
  'Requiere propuesta consolidada para ambas recepciones.',
  '2026-03-09 10:30:00', 'aceptado', 'Lead calificado con presupuesto validado.', '2026-03-10 09:00:00'
),
(
  'TRP-2026-06', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  74, 'Agenda básica para centro deportivo.', 45000.00,
  'Formulario desde CNT-2026-02.',
  'Presupuesto ajustado al plan de entrada.',
  '2026-02-22 11:00:00', 'aceptado', 'Se acepta para ofrecer módulo individual VitaAviso.', '2026-02-23 11:30:00'
),
(
  'TRP-2026-07', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  79, 'Ordenar recepción y seguimiento de convenios.', 110000.00,
  'Clic en correo CNT-2026-06.',
  'Coordinar llamada con socia financiera también.',
  '2026-03-17 15:00:00', 'aceptado', 'Aceptado para demostración comercial.', '2026-03-18 10:00:00'
),
(
  'TRP-2026-08', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-02'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  84, 'Suite administrativa completa para clínica en Heredia.', 180000.00,
  'Lectura de CNT-2026-04 y formulario LinkedIn.',
  'Interés prioritario en facturación y reportería.',
  '2026-04-08 09:00:00', 'aceptado', 'Aceptado; pasa a propuesta formal.', '2026-04-09 09:40:00'
),
(
  'TRP-2026-09', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-11'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  52, 'Consulta exploratoria sin fecha definida.', 40000.00,
  'Clic en publicación CNT-2026-09.',
  'Preguntó precios generales sin compromiso.',
  '2026-04-24 13:00:00', 'rechazado',
  'Puntuación insuficiente, sin autoridad de compra ni presupuesto aprobado para este semestre.',
  '2026-04-25 10:45:00'
),
(
  'TRP-2026-10', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-10'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-MKT-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  76, 'Agenda compartida para tres consultorios en Limón.', 90000.00,
  'Búsqueda regional Google Ads.',
  'Pendiente confirmar disponibilidad horaria para llamada de calificación comercial.',
  '2026-04-24 16:30:00', 'pendiente', NULL, NULL
);

-- -----------------------------------------------------------------------------
-- 15. clientes (10 registros — Movimiento: organizaciones cliente en CR)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `clientes` (
  `codigo_cliente`, `nombre_comercial`, `razon_social`, `cedula_juridica`,
  `tipo_organizacion_id`, `provincia`, `canton`, `correo_corporativo`,
  `telefono_principal`, `estado_cliente`, `fecha_alta`, `origen_contacto_id`
) VALUES
(
  'CLI-2025-01', 'Centro Fisioterapia Cumbre Salud', 'Cumbre Salud Terapia Física S.A.', '3-101-710101',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_fisioterapia'),
  'San José', 'Montes de Oca', 'administracion@cumbresalud.cr.example', '+506 2253-1001',
  'activo', '2025-10-15', NULL
),
(
  'CLI-2025-02', 'Consultorio Médico Sabana Norte', 'Servicios Administrativos Sabana Norte S.R.L.', '3-102-710102',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'consultorio_especializado'),
  'San José', 'San José', 'gerencia@sabananortemed.cr.example', '+506 2290-1002',
  'activo', '2025-11-03', NULL
),
(
  'CLI-2025-03', 'Clínica Familiar Belén Centro', 'Clínica Belén Gestión Integral S.A.', '3-101-710103',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_medica'),
  'Heredia', 'Belén', 'contacto@clinicabelencentro.cr.example', '+506 2239-1003',
  'activo', '2025-11-20', NULL
),
(
  'CLI-2025-04', 'Rehabilitación Activa Escazú', 'Rehabilitación Funcional Escazú S.R.L.', '3-102-710104',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_rehabilitacion'),
  'San José', 'Escazú', 'operaciones@rehabescazu.cr.example', '+506 2289-1004',
  'activo', '2025-12-05', NULL
),
(
  'CLI-2025-05', 'Consultorio Integral Río Segundo', 'Bienestar Administrativo Río Segundo S.A.', '3-101-710105',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'consultorio_integral'),
  'Alajuela', 'Alajuela', 'info@integralriosegundo.cr.example', '+506 2440-1005',
  'suspendido', '2025-12-18', NULL
),
(
  'CLI-2026-06', 'Centro Fisioterapia Movimiento Vital', 'Movimiento Vital Fisioterapia S.A.', '3-101-820201',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_fisioterapia'),
  'San José', 'Curridabat', 'lchinchilla@movimientovital.cr.example', '+506 2221-4101',
  'activo', '2026-02-05', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01')
),
(
  'CLI-2026-07', 'Clínica Médica San Rafael del Este', 'Inversiones Médicas San Rafael Este S.A.', '3-101-820202',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_medica'),
  'San José', 'Desamparados', 'mfonseca@clinicasanrafaeleste.cr.example', '+506 2234-5202',
  'activo', '2026-02-19', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02')
),
(
  'CLI-2026-08', 'Consultorio Especializado Monte Verde Urbano', 'Consultorios MVU Heredia S.R.L.', '3-102-820203',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'consultorio_especializado'),
  'Heredia', 'Heredia', 'pelizondo@consultoriomvu.cr.example', '+506 2260-6303',
  'activo', '2026-03-03', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03')
),
(
  'CLI-2026-09', 'Rehabilitación Integral del Valle', 'Rehabilitación del Valle Cartago S.A.', '3-101-820204',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'centro_rehabilitacion'),
  'Cartago', 'Cartago', 'ralvarado@rehabdelvalle.cr.example', '+506 2551-7404',
  'activo', '2026-03-16', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04')
),
(
  'CLI-2026-10', 'Clínica Odontológica Sonrisa Clara', 'Odontología Administrativa Sonrisa Clara S.A.', '3-101-820205',
  (SELECT id FROM tipos_organizacion WHERE codigo = 'clinica_odontologica'),
  'Alajuela', 'Grecia', 'gumana@sonrisaclara.cr.example', '+506 2441-8505',
  'activo', '2026-03-30', (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05')
);

-- -----------------------------------------------------------------------------
-- 16. contactos_cliente (10 registros — Movimiento)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `contactos_cliente` (
  `cliente_id`, `nombre_completo`, `cargo`, `correo`, `telefono`, `es_contacto_principal`, `activo`
) VALUES
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-01'), 'Adriana Coto Morales', 'Administradora General', 'acoto@cumbresalud.cr.example', '+506 8811-1001', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-02'), 'Mauricio Trejos Solano', 'Gerente Administrativo', 'mtrejos@sabananortemed.cr.example', '+506 8811-1002', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-03'), 'Silvia Rojas Paniagua', 'Directora de Operaciones', 'srojas@clinicabelencentro.cr.example', '+506 8811-1003', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-04'), 'Esteban Pacheco León', 'Coordinador de Sede', 'epacheco@rehabescazu.cr.example', '+506 8811-1004', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-05'), 'Paola Núñez Bermúdez', 'Encargada de Cobros', 'pnunez@integralriosegundo.cr.example', '+506 8811-1005', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-06'), 'Laura Chinchilla Vega', 'Administradora General', 'lchinchilla.cli@movimientovital.cr.example', '+506 8811-1006', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-07'), 'Marco Tulio Fonseca Ruiz', 'Gerente Operativo', 'mfonseca.cli@clinicasanrafaeleste.cr.example', '+506 8811-1007', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-08'), 'Patricia Elizondo Montero', 'Coordinadora Administrativa', 'pelizondo.cli@consultoriomvu.cr.example', '+506 8811-1008', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-09'), 'Roberto Alvarado Picado', 'Director Administrativo', 'ralvarado.cli@rehabdelvalle.cr.example', '+506 8811-1009', 1, 1),
((SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-10'), 'Gabriela Umaña Cordero', 'Socia Administradora', 'gumana.cli@sonrisaclara.cr.example', '+506 8811-1010', 1, 1);

-- -----------------------------------------------------------------------------
-- 17. oportunidades (10 registros — Movimiento: 5 ganadas, 3 perdidas, 2 activas)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `oportunidades` (
  `codigo_oportunidad`, `contacto_id`, `cliente_id`, `campana_atribuida_id`, `traspaso_id`,
  `responsable_ventas_id`, `titulo_propuesta`, `servicio_principal_id`,
  `valor_estimado_crc`, `monto_cierre_crc`, `estado_oportunidad`, `resultado_cierre`,
  `motivo_cierre`, `fecha_apertura`, `fecha_proximo_seguimiento`, `fecha_cierre`
) VALUES
(
  'OPP-2026-01',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'),
  (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-06'),
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-01'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  'Suscripción VitaAgenda Pro + VitaAviso - Movimiento Vital',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-AGENDA-01'),
  100000.00, 95000.00, 'ganada', 'ganada',
  'Descuento del 5% por contratación conjunta de dos módulos.',
  '2026-01-20 14:30:00', NULL, '2026-02-04 16:00:00'
),
(
  'OPP-2026-02',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-02'),
  (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-07'),
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-02'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  'Suite Agenda + Facturación Electrónica - San Rafael del Este',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-FACTUR-03'),
  120000.00, 120000.00, 'ganada', 'ganada',
  'Aceptación completa a precio de lista más implementación.',
  '2026-01-29 15:00:00', NULL, '2026-02-18 11:30:00'
),
(
  'OPP-2026-03',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-03'),
  (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-08'),
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-03'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  'Automatización de Recordatorios - Monte Verde Urbano',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-RECORD-02'),
  90000.00, 90000.00, 'ganada', 'ganada',
  'Contrató VitaAviso y VitaAgenda tras validar ahorro en recepción.',
  '2026-02-13 13:00:00', NULL, '2026-03-02 17:00:00'
),
(
  'OPP-2026-04',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-04'),
  (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-09'),
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-04'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-04'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  'Gestión de Agenda y Analítica Operativa - Rehab del Valle',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-ANALIT-05'),
  135000.00, 130000.00, 'ganada', 'ganada',
  'Cerrada con plan mensual combinado de agenda y panel operativo.',
  '2026-02-19 10:30:00', NULL, '2026-03-15 15:45:00'
),
(
  'OPP-2026-05',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-05'),
  (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-10'),
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-05'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  'Facturación y Recordatorios Multi-Sede - Sonrisa Clara',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-FACTUR-03'),
  165000.00, 160000.00, 'ganada', 'ganada',
  'Cierre aprobado para dos sedes odontológicas en Alajuela.',
  '2026-03-10 14:00:00', NULL, '2026-03-28 12:15:00'
),
(
  'OPP-2026-06',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-06'),
  NULL,
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-06'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  'Módulo Recordatorios - Guanacaste Activo',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-RECORD-02'),
  45000.00, NULL, 'perdida', 'perdida',
  'Presupuesto congelado por ampliación de infraestructura física.',
  '2026-02-23 15:00:00', NULL, '2026-03-10 09:30:00'
),
(
  'OPP-2026-07',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-07'),
  NULL,
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-06'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-07'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  'CRM Comercial y Convenios - Paseo Colón Norte',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-CRMCLI-04'),
  110000.00, NULL, 'perdida', 'perdida',
  'Decidieron postergar adopción tecnológica hasta cierre fiscal.',
  '2026-03-18 16:00:00', NULL, '2026-04-06 17:10:00'
),
(
  'OPP-2026-08',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-01'),
  (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-06'),
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-06'),
  NULL,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  'Expansión a Módulo CRM Comercial - Movimiento Vital',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-CRMCLI-04'),
  85000.00, NULL, 'perdida', 'perdida',
  'Cliente actual prefirió estabilizar primero agenda antes de sumar CRM.',
  '2026-03-20 10:00:00', NULL, '2026-04-02 15:00:00'
),
(
  'OPP-2026-09',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'),
  NULL,
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM traspasos_ventas WHERE codigo_traspaso = 'TRP-2026-08'),
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-05'),
  'Suite Administrativa Completa - Brisas del Zurquí',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-FACTUR-03'),
  180000.00, NULL, 'en_negociacion', 'pendiente',
  NULL,
  '2026-04-09 11:00:00', '2026-05-06 10:00:00', NULL
),
(
  'OPP-2026-10',
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-09'),
  NULL,
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-07'),
  NULL,
  (SELECT id FROM colaboradores WHERE codigo_colaborador = 'COL-VEN-06'),
  'Agenda y Control de Paquetes - Pacífico Central',
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-AGENDA-01'),
  100000.00, NULL, 'propuesta_enviada', 'pendiente',
  NULL,
  '2026-04-17 15:00:00', '2026-05-07 14:30:00', NULL
);

-- -----------------------------------------------------------------------------
-- 18. contratos_servicios_cliente (12 registros — Movimiento / Intermedia N:M)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `contratos_servicios_cliente` (
  `codigo_contrato`, `cliente_id`, `servicio_id`, `oportunidad_id`,
  `fecha_contratacion`, `fecha_inicio_servicio`, `fecha_fin_servicio`,
  `precio_acordado_crc`, `estado_contrato`, `observaciones`
) VALUES
(
  'CTR-2025-01', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-01'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-AGENDA-01'), NULL,
  '2025-10-15', '2025-10-20', NULL, 55000.00, 'activo', 'Contrato base agenda administrativa.'
),
(
  'CTR-2025-02', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-02'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-FACTUR-03'), NULL,
  '2025-11-03', '2025-11-10', NULL, 65000.00, 'activo', 'Facturación electrónica mensual.'
),
(
  'CTR-2025-03', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-03'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-CRMCLI-04'), NULL,
  '2025-11-20', '2025-11-25', NULL, 82000.00, 'activo', 'Tarifa preferencial convenios empresariales.'
),
(
  'CTR-2025-04', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-04'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-AGENDA-01'), NULL,
  '2025-12-05', '2025-12-10', NULL, 55000.00, 'activo', 'Control administrativo de salas de rehabilitación.'
),
(
  'CTR-2025-05', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2025-05'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-RECORD-02'), NULL,
  '2025-12-18', '2025-12-20', '2026-03-20', 45000.00, 'pausado', 'Pausa temporal solicitada por reorganización.'
),
(
  'CTR-2026-06', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-06'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-AGENDA-01'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-01'),
  '2026-02-04', '2026-02-06', NULL, 52000.00, 'activo', 'Módulo principal contratado bajo OPP-2026-01.'
),
(
  'CTR-2026-07', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-06'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-RECORD-02'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-01'),
  '2026-02-04', '2026-02-06', NULL, 43000.00, 'activo', 'Segundo módulo contratado bajo OPP-2026-01.'
),
(
  'CTR-2026-08', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-07'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-FACTUR-03'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-02'),
  '2026-02-18', '2026-02-20', NULL, 65000.00, 'activo', 'Módulo facturación bajo OPP-2026-02.'
),
(
  'CTR-2026-09', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-07'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-AGENDA-01'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-02'),
  '2026-02-18', '2026-02-20', NULL, 55000.00, 'activo', 'Módulo agenda bajo OPP-2026-02.'
),
(
  'CTR-2026-10', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-08'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-RECORD-02'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-03'),
  '2026-03-02', '2026-03-05', NULL, 90000.00, 'activo', 'Paquete recordatorios + agenda inicial.'
),
(
  'CTR-2026-11', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-09'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-ANALIT-05'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-04'),
  '2026-03-15', '2026-03-18', NULL, 130000.00, 'activo', 'Panel operativo + agenda multi-terapeuta.'
),
(
  'CTR-2026-12', (SELECT id FROM clientes WHERE codigo_cliente = 'CLI-2026-10'),
  (SELECT id FROM catalogo_servicios WHERE codigo_servicio = 'SRV-FACTUR-03'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-05'),
  '2026-03-28', '2026-04-01', NULL, 160000.00, 'activo', 'Cobertura administrativa dos sedes en Alajuela.'
);

-- -----------------------------------------------------------------------------
-- 19. metricas_campana_periodo (14 registros — Movimiento: positivos y casos límite)
-- Incluye:
--   * Campañas pagadas con ROAS, CPC, CTR y CAC positivos.
--   * Campañas orgánicas con gasto_publicitario_crc = 0 (caso límite ROAS).
--   * Periodo con 0 clics (caso límite CPC).
--   * Periodo recién planificado con 0 impresiones y 0 clics (caso límite CTR/CPC).
--   * Campaña CMP-2026-09 con alta vanidad (alcance/interacciones) y 0 ventas.
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `metricas_campana_periodo` (
  `campana_id`, `canal_id`, `periodo_inicio`, `periodo_fin`,
  `impresiones`, `clics`, `alcance`, `visualizaciones`, `interacciones`, `seguidores_ganados`,
  `gasto_publicitario_crc`, `costo_mercadeo_operativo_crc`, `costo_ventas_atribuible_crc`,
  `leads_generados`, `conversiones_clientes`, `ingresos_atribuibles_crc`, `notas`
) VALUES
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  '2026-01-10', '2026-02-15',
  14200, 610, 11800, 14200, 195, 12,
  215000.00, 48000.00, 72000.00,
  9, 1, 570000.00, 'Primer corte Google Ads con cliente ganado CLI-2026-06 (valor semestral atribuido).'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  '2026-02-16', '2026-03-31',
  15800, 740, 12900, 15800, 230, 15,
  198000.00, 47000.00, 78000.00,
  11, 1, 720000.00, 'Segundo corte Google Ads con cierre ganado CLI-2026-07.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  '2026-02-01', '2026-03-15',
  38500, 920, 29400, 44100, 1480, 96,
  176000.00, 40000.00, 64000.00,
  8, 1, 540000.00, 'Meta Ads corte 1 con cierre CLI-2026-08.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-02'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  '2026-03-16', '2026-04-30',
  34200, 810, 26100, 39800, 1290, 74,
  168000.00, 40000.00, 52000.00,
  6, 0, 0.00, 'Meta Ads corte 2: generó leads en seguimiento sin cierres en el periodo.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LIAD-PAG'),
  '2026-03-01', '2026-04-15',
  11400, 380, 8900, 11400, 310, 45,
  252000.00, 60000.00, 85000.00,
  7, 1, 960000.00, 'LinkedIn Ads corte 1 con cierre multi-sede CLI-2026-10.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  '2026-04-16', '2026-05-31',
  6900, 275, 5600, 6900, 92, 8,
  115000.00, 50000.00, 48000.00,
  4, 0, 0.00, 'Apoyo búsqueda para facturación electrónica; oportunidades en negociación.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-04'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  '2026-01-15', '2026-03-31',
  22600, 1340, 18700, 22600, 410, 28,
  0.00, 65000.00, 70000.00,
  6, 1, 780000.00, 'Orgánico SEO: gasto publicitario = 0 (prueba división por cero en ROAS) con cliente ganado CLI-2026-09.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-05'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-LINK-ORG'),
  '2026-02-15', '2026-04-30',
  9800, 420, 7400, 10500, 680, 112,
  0.00, 70000.00, 30000.00,
  3, 0, 0.00, 'Orgánico LinkedIn: posicionamiento profesional y generación de leads iniciales.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-06'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-MAIL-ORG'),
  '2026-03-10', '2026-04-30',
  3200, 290, 2950, 3200, 145, 0,
  0.00, 55000.00, 45000.00,
  4, 0, 0.00, 'Secuencia de correo orgánico sobre base propia.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-07'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-WEBN-ORG'),
  '2026-04-01', '2026-04-30',
  4100, 360, 3500, 2800, 520, 34,
  0.00, 90000.00, 50000.00,
  5, 0, 0.00, 'Convocatoria webinar orgánico con oportunidades activas.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-GADS-PAG'),
  '2026-04-15', '2026-04-30',
  5400, 210, 4300, 5400, 64, 5,
  92000.00, 35000.00, 28000.00,
  3, 0, 0.00, 'Arranque regional Cartago y Occidente.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  '2026-05-01', '2026-05-15',
  1200, 0, 1050, 1300, 18, 2,
  18000.00, 15000.00, 0.00,
  0, 0, 0.00, 'Caso límite CPC: impresiones > 0 pero 0 clics registrados.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-09'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-META-PAG'),
  '2026-03-15', '2026-04-30',
  96000, 480, 78500, 118000, 6420, 540,
  210000.00, 50000.00, 25000.00,
  1, 0, 0.00, 'Caso comparativo vanidad vs negocio: altísimas visualizaciones/interacciones pero 0 clientes y ROAS 0.'
),
(
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-10'),
  (SELECT id FROM canales_mercadeo WHERE codigo_canal = 'CAN-SEOB-ORG'),
  '2026-07-01', '2026-07-31',
  0, 0, 0, 0, 0, 0,
  0.00, 15000.00, 0.00,
  0, 0, 0.00, 'Caso límite CTR/CPC/ROAS/CAC: periodo futuro aún con 0 impresiones y 0 clics.'
);

-- -----------------------------------------------------------------------------
-- 20. ejecuciones_agentes (10 registros — Auditoría del orquestador y agentes)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `ejecuciones_agentes` (
  `codigo_ejecucion`, `agente_id`, `orquestada`, `tipo_tarea`, `estado`,
  `fecha_inicio`, `fecha_fin`, `duracion_ms`, `entrada_resumida`, `resultado_resumida`,
  `mensaje_error`, `campana_id`, `contenido_id`, `contacto_id`, `oportunidad_id`
) VALUES
(
  'EXEC-SEED-001',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_campanas'), 1,
  'proponer_campana', 'completada',
  '2026-04-14 09:00:00.000', '2026-04-14 09:00:00.042', 42,
  JSON_OBJECT('nombre', 'Impulso Regional Clínicas Occidente y Cartago', 'etapa_recorrido', 'decision'),
  JSON_OBJECT('codigo_campana', 'CMP-2026-08', 'estado', 'propuesta'),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'), NULL, NULL, NULL
),
(
  'EXEC-SEED-002',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_campanas'), 1,
  'registrar_asignacion_presupuesto', 'completada',
  '2026-04-14 09:15:00.000', '2026-04-14 09:15:00.035', 35,
  JSON_OBJECT('codigo_campana', 'CMP-2026-08', 'monto_asignado_crc', 160000),
  JSON_OBJECT('estado_asignacion', 'propuesta'),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'), NULL, NULL, NULL
),
(
  'EXEC-SEED-003',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_contenido'), 1,
  'generar_borrador_contenido', 'completada',
  '2026-04-28 11:00:00.000', '2026-04-28 11:00:00.028', 28,
  JSON_OBJECT('codigo_campana', 'CMP-2026-08', 'tipo_contenido', 'anuncio_pagado'),
  JSON_OBJECT('codigo_contenido', 'CNT-2026-08', 'estado', 'borrador'),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-08'), NULL, NULL
),
(
  'EXEC-SEED-004',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_contenido'), 1,
  'registrar_decision_revision', 'rechazada_regla_negocio',
  '2026-04-28 11:05:00.000', '2026-04-28 11:05:00.011', 11,
  JSON_OBJECT('codigo_contenido', 'CNT-2026-08', 'decision', 'aprobar', 'actor', 'agente_contenido'),
  NULL,
  'Regla de seguridad: un agente automatizado no tiene autorización para aprobar borradores de contenido.',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'),
  (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-08'), NULL, NULL
),
(
  'EXEC-SEED-005',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_contenido'), 1,
  'generar_borrador_contenido', 'completada',
  '2026-04-29 08:30:00.000', '2026-04-29 08:30:00.031', 31,
  JSON_OBJECT('codigo_campana', 'CMP-2026-10', 'tipo_contenido', 'articulo_blog'),
  JSON_OBJECT('codigo_contenido', 'CNT-2026-11', 'estado', 'borrador'),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-10'),
  (SELECT id FROM contenidos WHERE codigo_contenido = 'CNT-2026-11'), NULL, NULL
),
(
  'EXEC-SEED-006',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_metricas'), 1,
  'calcular_indicadores_campana', 'completada',
  '2026-04-29 10:00:00.000', '2026-04-29 10:00:00.054', 54,
  JSON_OBJECT('codigo_campana', 'CMP-2026-01'),
  JSON_OBJECT('cpc_crc', 305.93, 'ctr_pct', 4.5, 'roas', 3.12),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-01'), NULL, NULL, NULL
),
(
  'EXEC-SEED-007',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_metricas'), 1,
  'comparar_vanidad_vs_negocio', 'completada',
  '2026-04-29 10:15:00.000', '2026-04-29 10:15:00.063', 63,
  JSON_OBJECT('codigo_campana', 'CMP-2026-09'),
  JSON_OBJECT('diagnostico', 'ALERTA_VANIDAD_ALTA_SIN_CONVERSION', 'clientes_ganados', 0),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-09'), NULL, NULL, NULL
),
(
  'EXEC-SEED-008',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_contactos_ventas'), 1,
  'registrar_traspaso_ventas', 'completada',
  '2026-04-24 16:30:00.000', '2026-04-24 16:30:00.047', 47,
  JSON_OBJECT('codigo_contacto', 'LEAD-2026-10', 'puntuacion', 76),
  JSON_OBJECT('codigo_traspaso', 'TRP-2026-10', 'decision_ventas', 'pendiente'),
  NULL, (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-08'), NULL,
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-10'), NULL
),
(
  'EXEC-SEED-009',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_contactos_ventas'), 1,
  'cerrar_oportunidad', 'rechazada_regla_negocio',
  '2026-04-26 14:20:00.000', '2026-04-26 14:20:00.014', 14,
  JSON_OBJECT('codigo_oportunidad', 'OPP-2026-09', 'resultado_cierre', 'ganada', 'monto_cierre_crc', NULL),
  NULL,
  'No se puede declarar ganada una oportunidad sin monto_cierre_crc y fecha_cierre válidos.',
  (SELECT id FROM campanas WHERE codigo_campana = 'CMP-2026-03'), NULL,
  (SELECT id FROM contactos WHERE codigo_contacto = 'LEAD-2026-08'),
  (SELECT id FROM oportunidades WHERE codigo_oportunidad = 'OPP-2026-09')
),
(
  'EXEC-SEED-010',
  (SELECT id FROM catalogo_agentes WHERE codigo_agente = 'agente_contactos_ventas'), 1,
  'consultar_seguimientos_pendientes', 'completada',
  '2026-04-29 11:00:00.000', '2026-04-29 11:00:00.025', 25,
  JSON_OBJECT('fecha_corte', '2026-05-15'),
  JSON_OBJECT('contactos_pendientes', 4, 'oportunidades_pendientes', 2),
  NULL, NULL, NULL, NULL, NULL
);
