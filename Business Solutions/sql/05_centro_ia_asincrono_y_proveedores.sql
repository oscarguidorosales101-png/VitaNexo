-- =============================================================================
-- VITANEXO — EXTENSIÓN ADITIVA NO DESTRUCTIVA: CENTRO CONVERSACIONAL ASÍNCRONO
-- Y ARQUITECTURA MULTIPROVEEDOR DE INTELIGENCIA ARTIFICIAL
-- Base de datos objetivo: VitaBase (MySQL 8.0.40)
-- Conserva intactas las 21 tablas existentes, sus relaciones y todos sus datos.
-- =============================================================================

USE `VitaBase`;

-- -----------------------------------------------------------------------------
-- 22. CATÁLOGO DE CONFIGURACIÓN: configuracion_proveedores_ia
-- Almacena la configuración de proveedores externos de IA (modelos, adaptador,
-- URLs, parámetros de generación, límites de consumo y modelo alternativo).
-- NUNCA almacena API keys ni secretos en texto plano; referencia únicamente el
-- nombre de la variable de entorno (.env) o el alias de credencial cifrada en n8n.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `configuracion_proveedores_ia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_proveedor` VARCHAR(45) NOT NULL,
  `nombre` VARCHAR(130) NOT NULL,
  `tipo_adaptador` ENUM(
    'n8n_workflow',
    'gemini_rest',
    'openai_compatible_rest',
    'anthropic_rest'
  ) NOT NULL,
  `modelo_principal` VARCHAR(120) NOT NULL,
  `modelo_alternativo` VARCHAR(120) NULL,
  `url_servicio` VARCHAR(255) NULL,
  `credencial_n8n_alias` VARCHAR(140) NULL,
  `variable_entorno_key` VARCHAR(80) NULL,
  `temperatura` DECIMAL(3, 2) NOT NULL DEFAULT 0.20,
  `max_tokens` INT NOT NULL DEFAULT 2500,
  `timeout_ms` INT NOT NULL DEFAULT 45000,
  `limite_solicitudes_minuto` INT NOT NULL DEFAULT 30,
  `es_predeterminado` TINYINT(1) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `verificado_llamada_real` TINYINT(1) NOT NULL DEFAULT 0,
  `notas_configuracion` VARCHAR(450) NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_prov_ia_codigo` (`codigo_proveedor`),
  KEY `idx_config_prov_ia_activo` (`activo`, `es_predeterminado`),
  CONSTRAINT `chk_config_prov_ia_temp` CHECK (`temperatura` BETWEEN 0.00 AND 2.00),
  CONSTRAINT `chk_config_prov_ia_tokens` CHECK (`max_tokens` BETWEEN 128 AND 32768),
  CONSTRAINT `chk_config_prov_ia_timeout` CHECK (`timeout_ms` BETWEEN 1000 AND 180000),
  CONSTRAINT `chk_config_prov_ia_rate` CHECK (`limite_solicitudes_minuto` BETWEEN 1 AND 600),
  CONSTRAINT `chk_config_prov_ia_flags` CHECK (
    `es_predeterminado` IN (0, 1) AND `activo` IN (0, 1) AND `verificado_llamada_real` IN (0, 1)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 23. ASIGNACIÓN POR AGENTE: asignaciones_proveedor_agente
-- Permite asignar qué proveedor y modelo atiende a cada uno de los 4 agentes
-- especializados sin modificar código de los agentes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `asignaciones_proveedor_agente` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agente_id` INT NOT NULL,
  `codigo_agente` VARCHAR(45) NOT NULL,
  `proveedor_id` INT NOT NULL,
  `proveedor_alternativo_id` INT NULL,
  `modelo_override` VARCHAR(120) NULL,
  `temperatura_override` DECIMAL(3, 2) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asig_prov_agente_id` (`agente_id`),
  UNIQUE KEY `uk_asig_prov_codigo_agente` (`codigo_agente`),
  CONSTRAINT `fk_asig_prov_agente`
    FOREIGN KEY (`agente_id`) REFERENCES `catalogo_agentes` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_asig_prov_principal`
    FOREIGN KEY (`proveedor_id`) REFERENCES `configuracion_proveedores_ia` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_asig_prov_alternativo`
    FOREIGN KEY (`proveedor_alternativo_id`) REFERENCES `configuracion_proveedores_ia` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_asig_prov_activo` CHECK (`activo` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 24. HILOS CONVERSACIONALES: conversaciones_ia
-- Persiste las conversaciones iniciadas por cada colaborador con cada agente
-- para recuperar historial tras navegar o recargar el frontend.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversaciones_ia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_conversacion` VARCHAR(50) NOT NULL,
  `colaborador_id` INT NOT NULL,
  `agente_id` INT NOT NULL,
  `codigo_agente` VARCHAR(45) NOT NULL,
  `titulo` VARCHAR(180) NOT NULL,
  `estado` ENUM('activa', 'archivada') NOT NULL DEFAULT 'activa',
  `total_mensajes` INT NOT NULL DEFAULT 0,
  `ultima_actividad_en` DATETIME(3) NOT NULL,
  `creado_en` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conversaciones_ia_codigo` (`codigo_conversacion`),
  KEY `idx_conversaciones_ia_colab_fecha` (`colaborador_id`, `estado`, `ultima_actividad_en`),
  KEY `idx_conversaciones_ia_agente` (`codigo_agente`, `ultima_actividad_en`),
  CONSTRAINT `fk_conversaciones_ia_colaborador`
    FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_conversaciones_ia_agente`
    FOREIGN KEY (`agente_id`) REFERENCES `catalogo_agentes` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_conversaciones_ia_mensajes` CHECK (`total_mensajes` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 25. SOLICITUDES ASÍNCRONAS PERSISTENTES: solicitudes_ia
-- Gestiona cada solicitud enviada desde el frontend con estados claros:
-- pendiente -> procesando -> completada | error | cancelada.
-- Incluye idempotency_key único para evitar ejecuciones duplicadas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `solicitudes_ia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_solicitud` VARCHAR(50) NOT NULL,
  `idempotency_key` VARCHAR(100) NULL,
  `conversacion_id` INT NOT NULL,
  `colaborador_id` INT NOT NULL,
  `agente_id` INT NOT NULL,
  `codigo_agente` VARCHAR(45) NOT NULL,
  `tipo_tarea_resuelta` VARCHAR(80) NOT NULL,
  `mensaje_usuario` TEXT NOT NULL,
  `parametros_entrada` JSON NULL,
  `estado` ENUM('pendiente', 'procesando', 'completada', 'error', 'cancelada') NOT NULL DEFAULT 'pendiente',
  `etapa_progreso` VARCHAR(180) NULL,
  `proveedor_ia` VARCHAR(60) NULL,
  `modelo_ia` VARCHAR(120) NULL,
  `via_n8n` TINYINT(1) NOT NULL DEFAULT 1,
  `workflow_n8n_id` VARCHAR(80) NULL,
  `ejecucion_agente_id` INT NULL,
  `traza_n8n_id` INT NULL,
  `reintento_de_solicitud_id` INT NULL,
  `respuesta_texto` LONGTEXT NULL,
  `respuesta_estructurada` JSON NULL,
  `advertencias_politica` JSON NULL,
  `codigo_error` VARCHAR(80) NULL,
  `mensaje_error` VARCHAR(600) NULL,
  `duracion_ms` INT NULL,
  `fecha_creacion` DATETIME(3) NOT NULL,
  `fecha_inicio_proceso` DATETIME(3) NULL,
  `fecha_fin` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_solicitudes_ia_codigo` (`codigo_solicitud`),
  UNIQUE KEY `uk_solicitudes_ia_idempotency` (`idempotency_key`),
  KEY `idx_solicitudes_ia_conv_orden` (`conversacion_id`, `id`),
  KEY `idx_solicitudes_ia_colab_estado` (`colaborador_id`, `estado`, `fecha_creacion`),
  KEY `idx_solicitudes_ia_estado_fecha` (`estado`, `fecha_creacion`),
  CONSTRAINT `fk_solicitudes_ia_conversacion`
    FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones_ia` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_solicitudes_ia_colaborador`
    FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_solicitudes_ia_agente`
    FOREIGN KEY (`agente_id`) REFERENCES `catalogo_agentes` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_solicitudes_ia_ejecucion_agente`
    FOREIGN KEY (`ejecucion_agente_id`) REFERENCES `ejecuciones_agentes` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_solicitudes_ia_traza_n8n`
    FOREIGN KEY (`traza_n8n_id`) REFERENCES `ejecuciones_workflows_n8n` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_solicitudes_ia_reintento`
    FOREIGN KEY (`reintento_de_solicitud_id`) REFERENCES `solicitudes_ia` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_solicitudes_ia_via_n8n` CHECK (`via_n8n` IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- SEMILLA ADITIVA IDEMPOTENTE: Proveedores compatibles y asignaciones iniciales
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `configuracion_proveedores_ia` (
  `codigo_proveedor`, `nombre`, `tipo_adaptador`, `modelo_principal`, `modelo_alternativo`,
  `url_servicio`, `credencial_n8n_alias`, `variable_entorno_key`,
  `temperatura`, `max_tokens`, `timeout_ms`, `limite_solicitudes_minuto`,
  `es_predeterminado`, `activo`, `verificado_llamada_real`, `notas_configuracion`
) VALUES
(
  'gemini',
  'Google Gemini API (Orquestado vía n8n Local)',
  'n8n_workflow',
  'models/gemini-3-flash-preview',
  'models/gemini-2.5-flash',
  'https://generativelanguage.googleapis.com/v1beta',
  'Google Gemini(PaLM) Api account 2 (2YWMf9RDxr6gim6h)',
  'GEMINI_API_KEY',
  0.20, 2500, 45000, 30,
  1, 1, 1,
  'Proveedor principal activo y verificado mediante workflows locales autenticados de n8n.'
),
(
  'deepseek',
  'DeepSeek API (Chat / Reasoner - Compatible OpenAI y n8n)',
  'openai_compatible_rest',
  'deepseek-chat',
  'deepseek-reasoner',
  'https://api.deepseek.com/v1',
  'DeepSeek API (n8n / .env)',
  'DEEPSEEK_API_KEY',
  0.20, 2500, 45000, 30,
  0, 0, 0,
  'Adaptador preparado. Configure DEEPSEEK_API_KEY en .env y ejecute verificación real antes de activarlo.'
),
(
  'openai_compatible',
  'OpenAI / Proveedor Compatible Chat Completions',
  'openai_compatible_rest',
  'gpt-4o-mini',
  'gpt-4o',
  'https://api.openai.com/v1',
  NULL,
  'OPENAI_API_KEY',
  0.20, 2500, 45000, 30,
  0, 0, 0,
  'Adaptador preparado para OpenAI, Groq, OpenRouter o endpoints compatibles /v1/chat/completions.'
),
(
  'anthropic',
  'Anthropic Claude Messages API',
  'anthropic_rest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'https://api.anthropic.com/v1',
  NULL,
  'ANTHROPIC_API_KEY',
  0.20, 2500, 45000, 30,
  0, 0, 0,
  'Adaptador nativo Anthropic /v1/messages preparado. Requiere ANTHROPIC_API_KEY válida en .env.'
),
(
  'gemini_rest_directo',
  'Google Gemini REST API Directa (Respaldo Backend)',
  'gemini_rest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'https://generativelanguage.googleapis.com/v1beta',
  NULL,
  'GEMINI_API_KEY',
  0.20, 2500, 45000, 30,
  0, 0, 0,
  'Adaptador REST directo para Gemini cuando se define GEMINI_API_KEY directamente en .env del backend.'
);

INSERT IGNORE INTO `asignaciones_proveedor_agente` (
  `agente_id`, `codigo_agente`, `proveedor_id`, `proveedor_alternativo_id`, `activo`
)
SELECT
  ca.id,
  ca.codigo_agente,
  (SELECT id FROM configuracion_proveedores_ia WHERE codigo_proveedor = 'gemini' LIMIT 1),
  NULL,
  1
FROM `catalogo_agentes` ca
WHERE ca.es_orquestador = 0;

