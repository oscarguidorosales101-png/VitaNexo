-- =============================================================================
-- VITANEXO BACKEND — ESQUEMA RELACIONAL EN TERCERA FORMA NORMAL (3FN)
-- Base de datos objetivo: VitaBase (MySQL 8.0+)
-- Política de seguridad: NO DESTRUCTIVO.
--   * No ejecuta DROP DATABASE, DROP TABLE, TRUNCATE ni DELETE.
--   * No crea una base de datos sustituta (trabaja exclusivamente sobre VitaBase).
--   * No almacena diagnósticos, expedientes clínicos ni datos médicos sensibles.
-- =============================================================================

USE `VitaBase`;

-- -----------------------------------------------------------------------------
-- 1. CATÁLOGO: tipos_organizacion
-- Normaliza los segmentos de clientes B2B atendidos por VitaNexo en Costa Rica.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tipos_organizacion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(40) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` VARCHAR(255) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tipos_organizacion_codigo` (`codigo`),
  UNIQUE KEY `uk_tipos_organizacion_nombre` (`nombre`),
  CONSTRAINT `chk_tipos_organizacion_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. CATÁLOGO: catalogo_servicios
-- Servicios tecnológicos administrativos y comerciales ofrecidos por VitaNexo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `catalogo_servicios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_servicio` VARCHAR(35) NOT NULL,
  `nombre` VARCHAR(140) NOT NULL,
  `categoria` ENUM(
    'automatizacion',
    'gestion_administrativa',
    'facturacion',
    'crm_comercial',
    'analitica',
    'soporte'
  ) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `modalidad_cobro` ENUM('mensual', 'anual', 'unico') NOT NULL DEFAULT 'mensual',
  `precio_lista_crc` DECIMAL(14, 2) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_catalogo_servicios_codigo` (`codigo_servicio`),
  UNIQUE KEY `uk_catalogo_servicios_nombre` (`nombre`),
  KEY `idx_catalogo_servicios_categoria` (`categoria`, `activo`),
  CONSTRAINT `chk_catalogo_servicios_precio` CHECK (`precio_lista_crc` >= 0),
  CONSTRAINT `chk_catalogo_servicios_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. CATÁLOGO: colaboradores
-- Personal interno de VitaNexo (mercadeo, contenido, dirección y ventas).
-- Evita duplicar nombres/correos de responsables en campañas, revisiones y CRM.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `colaboradores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_colaborador` VARCHAR(35) NOT NULL,
  `nombre_completo` VARCHAR(150) NOT NULL,
  `correo` VARCHAR(150) NOT NULL,
  `rol` ENUM(
    'mercadeo',
    'contenido',
    'direccion_comercial',
    'ejecutivo_ventas',
    'operaciones'
  ) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_colaboradores_codigo` (`codigo_colaborador`),
  UNIQUE KEY `uk_colaboradores_correo` (`correo`),
  KEY `idx_colaboradores_rol` (`rol`, `activo`),
  CONSTRAINT `chk_colaboradores_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. CATÁLOGO: canales_mercadeo
-- Canales normalizados con clasificación estricta entre medios orgánicos y pagados.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `canales_mercadeo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_canal` VARCHAR(40) NOT NULL,
  `nombre` VARCHAR(110) NOT NULL,
  `clasificacion` ENUM('organico', 'pagado') NOT NULL,
  `plataforma` VARCHAR(80) NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_canales_mercadeo_codigo` (`codigo_canal`),
  UNIQUE KEY `uk_canales_mercadeo_nombre` (`nombre`),
  KEY `idx_canales_mercadeo_clasificacion` (`clasificacion`, `activo`),
  CONSTRAINT `chk_canales_mercadeo_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. CATÁLOGO: etapas_embudo
-- Etapas del recorrido comercial (lead -> prospecto -> oportunidad -> cierre).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `etapas_embudo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_etapa` VARCHAR(40) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `orden_embudo` INT NOT NULL,
  `es_etapa_final` TINYINT(1) NOT NULL DEFAULT 0,
  `descripcion` VARCHAR(255) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_etapas_embudo_codigo` (`codigo_etapa`),
  UNIQUE KEY `uk_etapas_embudo_nombre` (`nombre`),
  UNIQUE KEY `uk_etapas_embudo_orden` (`orden_embudo`),
  CONSTRAINT `chk_etapas_embudo_final` CHECK (`es_etapa_final` IN (0, 1)),
  CONSTRAINT `chk_etapas_embudo_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. CATÁLOGO: catalogo_agentes
-- Módulos deterministas internos registrados bajo control del orquestador.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `catalogo_agentes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_agente` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `dominio` VARCHAR(80) NOT NULL,
  `descripcion` VARCHAR(255) NOT NULL,
  `es_orquestador` TINYINT(1) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_catalogo_agentes_codigo` (`codigo_agente`),
  UNIQUE KEY `uk_catalogo_agentes_nombre` (`nombre`),
  CONSTRAINT `chk_catalogo_agentes_orquestador` CHECK (`es_orquestador` IN (0, 1)),
  CONSTRAINT `chk_catalogo_agentes_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. MOVIMIENTO: campanas
-- Campañas de mercadeo normalizadas (la clasificación orgánico/pagado proviene
-- de canales_mercadeo sin duplicar atributos transitivos, respetando 3FN).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `campanas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_campana` VARCHAR(35) NOT NULL,
  `nombre` VARCHAR(160) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `objetivo` VARCHAR(255) NOT NULL,
  `etapa_recorrido` ENUM('conciencia', 'consideracion', 'decision') NOT NULL,
  `canal_principal_id` INT NOT NULL,
  `responsable_id` INT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `presupuesto_total_crc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `justificacion_presupuesto` TEXT NOT NULL,
  `costo_operativo_mercadeo_crc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `estado` ENUM(
    'propuesta',
    'planificada',
    'activa',
    'pausada',
    'finalizada',
    'cancelada'
  ) NOT NULL DEFAULT 'propuesta',
  `creada_por_agente` TINYINT(1) NOT NULL DEFAULT 0,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_campanas_codigo` (`codigo_campana`),
  UNIQUE KEY `uk_campanas_nombre` (`nombre`),
  KEY `idx_campanas_canal` (`canal_principal_id`),
  KEY `idx_campanas_estado_fechas` (`estado`, `fecha_inicio`, `fecha_fin`),
  KEY `idx_campanas_etapa` (`etapa_recorrido`),
  CONSTRAINT `fk_campanas_canal_principal`
    FOREIGN KEY (`canal_principal_id`) REFERENCES `canales_mercadeo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_campanas_responsable`
    FOREIGN KEY (`responsable_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_campanas_fechas` CHECK (`fecha_fin` >= `fecha_inicio`),
  CONSTRAINT `chk_campanas_presupuesto` CHECK (`presupuesto_total_crc` >= 0),
  CONSTRAINT `chk_campanas_costo_op` CHECK (`costo_operativo_mercadeo_crc` >= 0),
  CONSTRAINT `chk_campanas_agente` CHECK (`creada_por_agente` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. MOVIMIENTO: asignaciones_presupuesto
-- Asignación de presupuesto por campaña, canal, periodo, responsable y razón.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `asignaciones_presupuesto` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `campana_id` INT NOT NULL,
  `canal_id` INT NOT NULL,
  `responsable_id` INT NOT NULL,
  `periodo_inicio` DATE NOT NULL,
  `periodo_fin` DATE NOT NULL,
  `monto_asignado_crc` DECIMAL(14, 2) NOT NULL,
  `razon_decision` TEXT NOT NULL,
  `estado_asignacion` ENUM(
    'propuesta',
    'aprobada',
    'ejecutada',
    'ajustada',
    'cancelada'
  ) NOT NULL DEFAULT 'propuesta',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asignaciones_campana_canal` (`campana_id`, `canal_id`),
  KEY `idx_asignaciones_periodo` (`periodo_inicio`, `periodo_fin`),
  CONSTRAINT `fk_asignaciones_campana`
    FOREIGN KEY (`campana_id`) REFERENCES `campanas` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_asignaciones_canal`
    FOREIGN KEY (`canal_id`) REFERENCES `canales_mercadeo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_asignaciones_responsable`
    FOREIGN KEY (`responsable_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_asignaciones_fechas` CHECK (`periodo_fin` >= `periodo_inicio`),
  CONSTRAINT `chk_asignaciones_monto` CHECK (`monto_asignado_crc` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. MOVIMIENTO: contenidos
-- Piezas del calendario editorial vinculadas a campañas y canales.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contenidos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_contenido` VARCHAR(35) NOT NULL,
  `campana_id` INT NOT NULL,
  `canal_id` INT NOT NULL,
  `autor_colaborador_id` INT NULL,
  `creado_por_agente` VARCHAR(50) NULL,
  `titulo` VARCHAR(180) NOT NULL,
  `etapa_recorrido` ENUM('conciencia', 'consideracion', 'decision') NOT NULL,
  `tipo_contenido` ENUM(
    'publicacion_social',
    'correo_electronico',
    'anuncio_pagado',
    'articulo_blog',
    'guia_descargable',
    'guion_webinar'
  ) NOT NULL,
  `cuerpo_borrador` TEXT NOT NULL,
  `version_actual` INT NOT NULL DEFAULT 1,
  `estado` ENUM(
    'borrador',
    'en_revision',
    'aprobado',
    'rechazado',
    'publicado'
  ) NOT NULL DEFAULT 'borrador',
  `fecha_programada_publicacion` DATETIME NULL,
  `fecha_ultima_revision` DATETIME NULL,
  `fecha_publicacion` DATETIME NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contenidos_codigo` (`codigo_contenido`),
  KEY `idx_contenidos_campana_estado` (`campana_id`, `estado`),
  KEY `idx_contenidos_canal` (`canal_id`),
  KEY `idx_contenidos_calendario` (`fecha_programada_publicacion`, `estado`),
  CONSTRAINT `fk_contenidos_campana`
    FOREIGN KEY (`campana_id`) REFERENCES `campanas` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contenidos_canal`
    FOREIGN KEY (`canal_id`) REFERENCES `canales_mercadeo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contenidos_autor`
    FOREIGN KEY (`autor_colaborador_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_contenidos_version` CHECK (`version_actual` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. AUDITORÍA: revisiones_contenido
-- Historial inmutable de revisiones y decisiones sobre piezas de contenido.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `revisiones_contenido` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contenido_id` INT NOT NULL,
  `version_revisada` INT NOT NULL,
  `revisor_id` INT NOT NULL,
  `tipo_actor_revisor` ENUM('humano') NOT NULL DEFAULT 'humano',
  `fecha_revision` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decision` ENUM(
    'enviar_a_revision',
    'aprobar',
    'rechazar',
    'solicitar_cambios'
  ) NOT NULL,
  `estado_anterior` ENUM(
    'borrador',
    'en_revision',
    'aprobado',
    'rechazado',
    'publicado'
  ) NOT NULL,
  `estado_resultante` ENUM(
    'borrador',
    'en_revision',
    'aprobado',
    'rechazado'
  ) NOT NULL,
  `comentarios` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_revisiones_contenido_fecha` (`contenido_id`, `fecha_revision`),
  KEY `idx_revisiones_revisor` (`revisor_id`),
  CONSTRAINT `fk_revisiones_contenido`
    FOREIGN KEY (`contenido_id`) REFERENCES `contenidos` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_revisiones_revisor`
    FOREIGN KEY (`revisor_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_revisiones_version` CHECK (`version_revisada` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. MOVIMIENTO: contactos
-- Leads y prospectos comerciales en el embudo (concepto distinto de oportunidad).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contactos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_contacto` VARCHAR(35) NOT NULL,
  `nombre_completo` VARCHAR(150) NOT NULL,
  `cargo` VARCHAR(100) NOT NULL,
  `nombre_organizacion` VARCHAR(160) NOT NULL,
  `tipo_organizacion_id` INT NOT NULL,
  `correo` VARCHAR(150) NOT NULL,
  `telefono` VARCHAR(30) NOT NULL,
  `provincia` VARCHAR(60) NOT NULL,
  `fuente_origen` ENUM(
    'campana_digital',
    'busqueda_organica',
    'referido',
    'evento_salud',
    'prospeccion_directa',
    'sitio_web'
  ) NOT NULL,
  `campana_origen_id` INT NULL,
  `canal_origen_id` INT NULL,
  `etapa_actual_id` INT NOT NULL,
  `puntuacion_lead` INT NOT NULL DEFAULT 0,
  `necesidad_comercial` TEXT NOT NULL,
  `presupuesto_declarado_crc` DECIMAL(14, 2) NULL,
  `responsable_comercial_id` INT NULL,
  `fecha_captura_lead` DATETIME NOT NULL,
  `fecha_proximo_seguimiento` DATETIME NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contactos_codigo` (`codigo_contacto`),
  UNIQUE KEY `uk_contactos_correo` (`correo`),
  KEY `idx_contactos_etapa` (`etapa_actual_id`),
  KEY `idx_contactos_campana` (`campana_origen_id`),
  KEY `idx_contactos_seguimiento` (`fecha_proximo_seguimiento`, `activo`),
  CONSTRAINT `fk_contactos_tipo_organizacion`
    FOREIGN KEY (`tipo_organizacion_id`) REFERENCES `tipos_organizacion` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contactos_campana_origen`
    FOREIGN KEY (`campana_origen_id`) REFERENCES `campanas` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_contactos_canal_origen`
    FOREIGN KEY (`canal_origen_id`) REFERENCES `canales_mercadeo` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_contactos_etapa_actual`
    FOREIGN KEY (`etapa_actual_id`) REFERENCES `etapas_embudo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contactos_responsable`
    FOREIGN KEY (`responsable_comercial_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_contactos_puntuacion` CHECK (`puntuacion_lead` BETWEEN 0 AND 100),
  CONSTRAINT `chk_contactos_presupuesto` CHECK (
    `presupuesto_declarado_crc` IS NULL OR `presupuesto_declarado_crc` >= 0
  ),
  CONSTRAINT `chk_contactos_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. AUDITORÍA DE EMBUDO: historial_etapas_contacto
-- Registra cada transición de etapa con marca temporal para cálculo exacto
-- de tasas de conversión sin duplicar contactos en una misma transición.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `historial_etapas_contacto` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contacto_id` INT NOT NULL,
  `etapa_anterior_id` INT NULL,
  `etapa_nueva_id` INT NOT NULL,
  `cambiado_por_id` INT NULL,
  `fecha_transicion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `motivo` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_historial_contacto_fecha` (`contacto_id`, `fecha_transicion`),
  KEY `idx_historial_transicion` (`etapa_anterior_id`, `etapa_nueva_id`),
  KEY `idx_historial_etapa_nueva` (`etapa_nueva_id`, `contacto_id`),
  CONSTRAINT `fk_historial_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_historial_etapa_anterior`
    FOREIGN KEY (`etapa_anterior_id`) REFERENCES `etapas_embudo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_historial_etapa_nueva`
    FOREIGN KEY (`etapa_nueva_id`) REFERENCES `etapas_embudo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_historial_cambiado_por`
    FOREIGN KEY (`cambiado_por_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. INTERMEDIA N:M: contactos_contenidos_consumidos
-- Vincula leads con los contenidos consumidos para enriquecer el traspaso MQL->SQL.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contactos_contenidos_consumidos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contacto_id` INT NOT NULL,
  `contenido_id` INT NOT NULL,
  `tipo_interaccion` ENUM(
    'lectura',
    'descarga',
    'clic',
    'registro_formulario',
    'asistencia_webinar'
  ) NOT NULL,
  `fecha_interaccion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contacto_contenido_interaccion` (`contacto_id`, `contenido_id`, `tipo_interaccion`),
  KEY `idx_consumo_contenido` (`contenido_id`),
  CONSTRAINT `fk_consumo_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_consumo_contenido`
    FOREIGN KEY (`contenido_id`) REFERENCES `contenidos` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. MOVIMIENTO / AUDITORÍA: traspasos_ventas
-- Registro formal de entrega de leads calificados de Mercadeo a Ventas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `traspasos_ventas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_traspaso` VARCHAR(35) NOT NULL,
  `contacto_id` INT NOT NULL,
  `entregado_por_id` INT NOT NULL,
  `recibido_por_id` INT NOT NULL,
  `puntuacion_al_traspaso` INT NOT NULL,
  `necesidad_detectada` TEXT NOT NULL,
  `presupuesto_declarado_crc` DECIMAL(14, 2) NULL,
  `referencias_contenidos` TEXT NULL,
  `observaciones_seguimiento` TEXT NOT NULL,
  `fecha_traspaso` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `decision_ventas` ENUM('pendiente', 'aceptado', 'rechazado') NOT NULL DEFAULT 'pendiente',
  `motivo_decision` TEXT NULL,
  `fecha_respuesta` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_traspasos_codigo` (`codigo_traspaso`),
  KEY `idx_traspasos_contacto` (`contacto_id`, `fecha_traspaso`),
  KEY `idx_traspasos_decision` (`decision_ventas`, `recibido_por_id`),
  CONSTRAINT `fk_traspasos_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_traspasos_entregado_por`
    FOREIGN KEY (`entregado_por_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_traspasos_recibido_por`
    FOREIGN KEY (`recibido_por_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_traspasos_puntuacion` CHECK (`puntuacion_al_traspaso` BETWEEN 0 AND 100),
  CONSTRAINT `chk_traspasos_presupuesto` CHECK (
    `presupuesto_declarado_crc` IS NULL OR `presupuesto_declarado_crc` >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. MOVIMIENTO: clientes
-- Clínicas, consultorios y centros de fisioterapia que contratan VitaNexo.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_cliente` VARCHAR(35) NOT NULL,
  `nombre_comercial` VARCHAR(150) NOT NULL,
  `razon_social` VARCHAR(180) NOT NULL,
  `cedula_juridica` VARCHAR(25) NOT NULL,
  `tipo_organizacion_id` INT NOT NULL,
  `provincia` VARCHAR(60) NOT NULL,
  `canton` VARCHAR(80) NOT NULL,
  `correo_corporativo` VARCHAR(150) NOT NULL,
  `telefono_principal` VARCHAR(30) NOT NULL,
  `estado_cliente` ENUM('activo', 'suspendido', 'inactivo') NOT NULL DEFAULT 'activo',
  `fecha_alta` DATE NOT NULL,
  `origen_contacto_id` INT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_clientes_codigo` (`codigo_cliente`),
  UNIQUE KEY `uk_clientes_cedula_juridica` (`cedula_juridica`),
  UNIQUE KEY `uk_clientes_correo` (`correo_corporativo`),
  KEY `idx_clientes_tipo_estado` (`tipo_organizacion_id`, `estado_cliente`),
  KEY `idx_clientes_fecha_alta` (`fecha_alta`),
  CONSTRAINT `fk_clientes_tipo_organizacion`
    FOREIGN KEY (`tipo_organizacion_id`) REFERENCES `tipos_organizacion` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_clientes_origen_contacto`
    FOREIGN KEY (`origen_contacto_id`) REFERENCES `contactos` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. MOVIMIENTO: contactos_cliente
-- Personas de contacto administrativas/comerciales de las organizaciones cliente.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contactos_cliente` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cliente_id` INT NOT NULL,
  `nombre_completo` VARCHAR(150) NOT NULL,
  `cargo` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(150) NOT NULL,
  `telefono` VARCHAR(30) NOT NULL,
  `es_contacto_principal` TINYINT(1) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contactos_cliente_correo` (`correo`),
  KEY `idx_contactos_cliente_org` (`cliente_id`, `es_contacto_principal`),
  CONSTRAINT `fk_contactos_cliente_cliente`
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_contactos_cliente_principal` CHECK (`es_contacto_principal` IN (0, 1)),
  CONSTRAINT `chk_contactos_cliente_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. MOVIMIENTO: oportunidades
-- Propuestas y negociaciones comerciales diferenciadas de la entidad contacto.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `oportunidades` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_oportunidad` VARCHAR(35) NOT NULL,
  `contacto_id` INT NOT NULL,
  `cliente_id` INT NULL,
  `campana_atribuida_id` INT NULL,
  `traspaso_id` INT NULL,
  `responsable_ventas_id` INT NOT NULL,
  `titulo_propuesta` VARCHAR(180) NOT NULL,
  `servicio_principal_id` INT NULL,
  `valor_estimado_crc` DECIMAL(14, 2) NOT NULL,
  `monto_cierre_crc` DECIMAL(14, 2) NULL,
  `estado_oportunidad` ENUM(
    'abierta',
    'en_negociacion',
    'propuesta_enviada',
    'ganada',
    'perdida'
  ) NOT NULL DEFAULT 'abierta',
  `resultado_cierre` ENUM('pendiente', 'ganada', 'perdida') NOT NULL DEFAULT 'pendiente',
  `motivo_cierre` VARCHAR(500) NULL,
  `fecha_apertura` DATETIME NOT NULL,
  `fecha_proximo_seguimiento` DATETIME NULL,
  `fecha_cierre` DATETIME NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oportunidades_codigo` (`codigo_oportunidad`),
  KEY `idx_oportunidades_contacto` (`contacto_id`),
  KEY `idx_oportunidades_estado_cierre` (`estado_oportunidad`, `fecha_cierre`),
  KEY `idx_oportunidades_campana` (`campana_atribuida_id`),
  CONSTRAINT `fk_oportunidades_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_oportunidades_cliente`
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_oportunidades_campana`
    FOREIGN KEY (`campana_atribuida_id`) REFERENCES `campanas` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_oportunidades_traspaso`
    FOREIGN KEY (`traspaso_id`) REFERENCES `traspasos_ventas` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_oportunidades_responsable`
    FOREIGN KEY (`responsable_ventas_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_oportunidades_servicio`
    FOREIGN KEY (`servicio_principal_id`) REFERENCES `catalogo_servicios` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_oportunidades_valor_estimado` CHECK (`valor_estimado_crc` >= 0),
  CONSTRAINT `chk_oportunidades_monto_cierre` CHECK (
    `monto_cierre_crc` IS NULL OR `monto_cierre_crc` >= 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. INTERMEDIA / MOVIMIENTO N:M: contratos_servicios_cliente
-- Servicios contratados por cada cliente con precio acordado, fechas y estado.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contratos_servicios_cliente` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_contrato` VARCHAR(35) NOT NULL,
  `cliente_id` INT NOT NULL,
  `servicio_id` INT NOT NULL,
  `oportunidad_id` INT NULL,
  `fecha_contratacion` DATE NOT NULL,
  `fecha_inicio_servicio` DATE NOT NULL,
  `fecha_fin_servicio` DATE NULL,
  `precio_acordado_crc` DECIMAL(14, 2) NOT NULL,
  `estado_contrato` ENUM(
    'pendiente_activacion',
    'activo',
    'pausado',
    'finalizado',
    'cancelado'
  ) NOT NULL DEFAULT 'activo',
  `observaciones` VARCHAR(500) NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contratos_codigo` (`codigo_contrato`),
  KEY `idx_contratos_cliente_estado` (`cliente_id`, `estado_contrato`),
  KEY `idx_contratos_servicio` (`servicio_id`),
  KEY `idx_contratos_fecha` (`fecha_contratacion`),
  CONSTRAINT `fk_contratos_cliente`
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contratos_servicio`
    FOREIGN KEY (`servicio_id`) REFERENCES `catalogo_servicios` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_contratos_oportunidad`
    FOREIGN KEY (`oportunidad_id`) REFERENCES `oportunidades` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_contratos_precio` CHECK (`precio_acordado_crc` >= 0),
  CONSTRAINT `chk_contratos_fechas` CHECK (
    `fecha_fin_servicio` IS NULL OR `fecha_fin_servicio` >= `fecha_inicio_servicio`
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 19. MOVIMIENTO: metricas_campana_periodo
-- Valores base (no solo porcentajes) de negocio y de vanidad por campaña,
-- canal y periodo para cálculo auditable de CPC, CTR, CAC y ROAS.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `metricas_campana_periodo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `campana_id` INT NOT NULL,
  `canal_id` INT NOT NULL,
  `periodo_inicio` DATE NOT NULL,
  `periodo_fin` DATE NOT NULL,
  `impresiones` INT NOT NULL DEFAULT 0,
  `clics` INT NOT NULL DEFAULT 0,
  `alcance` INT NOT NULL DEFAULT 0,
  `visualizaciones` INT NOT NULL DEFAULT 0,
  `interacciones` INT NOT NULL DEFAULT 0,
  `seguidores_ganados` INT NOT NULL DEFAULT 0,
  `gasto_publicitario_crc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `costo_mercadeo_operativo_crc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `costo_ventas_atribuible_crc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `leads_generados` INT NOT NULL DEFAULT 0,
  `conversiones_clientes` INT NOT NULL DEFAULT 0,
  `ingresos_atribuibles_crc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `notas` VARCHAR(500) NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_metricas_campana_canal_periodo` (
    `campana_id`,
    `canal_id`,
    `periodo_inicio`,
    `periodo_fin`
  ),
  KEY `idx_metricas_periodo` (`periodo_inicio`, `periodo_fin`),
  KEY `idx_metricas_canal` (`canal_id`),
  CONSTRAINT `fk_metricas_campana`
    FOREIGN KEY (`campana_id`) REFERENCES `campanas` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_metricas_canal`
    FOREIGN KEY (`canal_id`) REFERENCES `canales_mercadeo` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_metricas_fechas` CHECK (`periodo_fin` >= `periodo_inicio`),
  CONSTRAINT `chk_metricas_impresiones` CHECK (`impresiones` >= 0),
  CONSTRAINT `chk_metricas_clics` CHECK (`clics` >= 0),
  CONSTRAINT `chk_metricas_alcance` CHECK (`alcance` >= 0),
  CONSTRAINT `chk_metricas_visualizaciones` CHECK (`visualizaciones` >= 0),
  CONSTRAINT `chk_metricas_interacciones` CHECK (`interacciones` >= 0),
  CONSTRAINT `chk_metricas_seguidores` CHECK (`seguidores_ganados` >= 0),
  CONSTRAINT `chk_metricas_gasto_pub` CHECK (`gasto_publicitario_crc` >= 0),
  CONSTRAINT `chk_metricas_costo_mkt` CHECK (`costo_mercadeo_operativo_crc` >= 0),
  CONSTRAINT `chk_metricas_costo_vta` CHECK (`costo_ventas_atribuible_crc` >= 0),
  CONSTRAINT `chk_metricas_leads` CHECK (`leads_generados` >= 0),
  CONSTRAINT `chk_metricas_conversiones` CHECK (`conversiones_clientes` >= 0),
  CONSTRAINT `chk_metricas_ingresos` CHECK (`ingresos_atribuibles_crc` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20. AUDITORÍA DE AGENTES: ejecuciones_agentes
-- Trazabilidad completa de tareas coordinadas por el orquestador central.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ejecuciones_agentes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_ejecucion` VARCHAR(45) NOT NULL,
  `agente_id` INT NOT NULL,
  `orquestada` TINYINT(1) NOT NULL DEFAULT 1,
  `tipo_tarea` VARCHAR(80) NOT NULL,
  `estado` ENUM(
    'iniciada',
    'completada',
    'fallida',
    'rechazada_regla_negocio'
  ) NOT NULL,
  `fecha_inicio` DATETIME(3) NOT NULL,
  `fecha_fin` DATETIME(3) NULL,
  `duracion_ms` INT NULL,
  `entrada_resumida` JSON NOT NULL,
  `resultado_resumida` JSON NULL,
  `mensaje_error` VARCHAR(500) NULL,
  `campana_id` INT NULL,
  `contenido_id` INT NULL,
  `contacto_id` INT NULL,
  `oportunidad_id` INT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ejecuciones_codigo` (`codigo_ejecucion`),
  KEY `idx_ejecuciones_agente_estado` (`agente_id`, `estado`, `fecha_inicio`),
  KEY `idx_ejecuciones_tarea` (`tipo_tarea`),
  CONSTRAINT `fk_ejecuciones_agente`
    FOREIGN KEY (`agente_id`) REFERENCES `catalogo_agentes` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_ejecuciones_campana`
    FOREIGN KEY (`campana_id`) REFERENCES `campanas` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_ejecuciones_contenido`
    FOREIGN KEY (`contenido_id`) REFERENCES `contenidos` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_ejecuciones_contacto`
    FOREIGN KEY (`contacto_id`) REFERENCES `contactos` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_ejecuciones_oportunidad`
    FOREIGN KEY (`oportunidad_id`) REFERENCES `oportunidades` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_ejecuciones_orquestada` CHECK (`orquestada` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

