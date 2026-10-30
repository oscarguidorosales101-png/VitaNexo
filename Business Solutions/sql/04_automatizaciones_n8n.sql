-- =============================================================================
-- VITANEXO — EXTENSIÓN ADITIVA NO DESTRUCTIVA PARA AUTOMATIZACIONES N8N Y GEMINI
-- Base de datos objetivo: VitaBase (MySQL 8.0+)
-- Conserva intactas las 20 tablas existentes y todos sus registros.
-- =============================================================================

USE `VitaBase`;

CREATE TABLE IF NOT EXISTS `ejecuciones_workflows_n8n` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_traza` VARCHAR(50) NOT NULL,
  `idempotency_key` VARCHAR(90) NULL,
  `ejecucion_agente_id` INT NULL,
  `codigo_agente` VARCHAR(45) NOT NULL,
  `tipo_tarea` VARCHAR(80) NOT NULL,
  `workflow_id` VARCHAR(60) NOT NULL,
  `workflow_nombre` VARCHAR(150) NOT NULL,
  `webhook_path` VARCHAR(160) NOT NULL,
  `proveedor_ia` VARCHAR(40) NOT NULL DEFAULT 'gemini-api',
  `modelo_ia` VARCHAR(80) NOT NULL,
  `estado` ENUM('en_curso', 'exitoso', 'fallido', 'reintentado') NOT NULL DEFAULT 'en_curso',
  `intentos_realizados` INT NOT NULL DEFAULT 1,
  `http_status` INT NULL,
  `duracion_ms` INT NULL,
  `entrada_sanitizada` JSON NOT NULL,
  `respuesta_validada` JSON NULL,
  `mensaje_error` VARCHAR(500) NULL,
  `reintento_de_id` INT NULL,
  `fecha_inicio` DATETIME(3) NOT NULL,
  `fecha_fin` DATETIME(3) NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_n8n_exec_codigo_traza` (`codigo_traza`),
  UNIQUE KEY `uk_n8n_exec_idempotency` (`idempotency_key`),
  KEY `idx_n8n_exec_estado_fecha` (`estado`, `fecha_inicio`),
  KEY `idx_n8n_exec_workflow` (`workflow_id`, `estado`),
  KEY `idx_n8n_exec_agente` (`codigo_agente`, `tipo_tarea`),
  CONSTRAINT `fk_n8n_exec_ejecucion_agente`
    FOREIGN KEY (`ejecucion_agente_id`) REFERENCES `ejecuciones_agentes` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_n8n_exec_reintento`
    FOREIGN KEY (`reintento_de_id`) REFERENCES `ejecuciones_workflows_n8n` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_n8n_exec_intentos` CHECK (`intentos_realizados` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

