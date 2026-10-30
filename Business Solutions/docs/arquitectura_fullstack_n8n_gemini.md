# Arquitectura Full-Stack, Centro de IA Asíncrono, n8n Local y Multiproveedor — VitaNexo

## 1. Cadena de Comunicación Asíncrona y Aislamiento de Secretos

```text
[Frontend React + Vite + TS] (127.0.0.1:5173)
       │  POST /api/ia/solicitudes (Bearer HMAC Token + X-Idempotency-Key)
       ▼  Responde HTTP 202 Accepted + { id, codigo_solicitud, estado: 'pendiente' }
[Backend Node.js + Express] (127.0.0.1:3000)
   ├─ RBAC por Rol (direccion_comercial, mercadeo, contenido, ejecutivo_ventas, operaciones)
   ├─ Guardián Contextual de Política (aiPolicyGuardService: frontera clínica vs administrativa)
   ├─ Resolución de Plan Multiproveedor (aiProvidersService: Gemini, DeepSeek, OpenAI, Anthropic)
   ├─ Encolador en Segundo Plano (pumpQueue, control de concurrencia y AbortController)
   │
   ├──► [MySQL 8.0.40: VitaBase] (127.0.0.1:3306, usuario vitanexo_app, 25 tablas en 3FN)
   │      - Registro inmediato en 'solicitudes_ia' y 'conversaciones_ia'
   │      - Estado transiciona: 'pendiente' → 'procesando' → 'completada' | 'error' | 'cancelada'
   │
   └──► [Motor Local n8n 2.38.6] (127.0.0.1:5678)
          │  POST /webhook/vitanexo/* con cabecera X-VitaNexo-Webhook-Secret
          │  Autenticado nativamente vía credencial encriptada 'httpHeaderAuth' (VitaNexoWhAuth01)
          ▼
        [Nodo Agente IA / Gemini API] (models/gemini-flash-latest / gemini-3-flash-preview)
          - Extracción de datos o consultas SQL en VitaBase
          - Razonamiento B2B en colones costarricenses (CRC)
          - Validación estricta del esquema JSON de salida
```

---

## 2. Diagnóstico Técnico de n8n y Solución Definitiva (Ejecuciones 140–149)

### Causa Raíz Diagnosticada
Las ejecuciones 140 a 149 en n8n 2.38.6 fallaban de forma sistemática con el error:
```text
ExpressionError: access to env vars denied
```
Esto ocurría porque el motor de aislamiento `JsTaskRunnerSandbox` de n8n bloquea el acceso a variables de entorno (`$env`) dentro de los nodos de código cuando no se configuran variables especiales en el proceso de Node.

### Solución Implementada
1. Se reemplazó el acceso a `$env` por el sistema de autenticación de cabecera nativo de n8n (`httpHeaderAuth`).
2. Se generó e importó en SQLite (`~/.n8n/database.sqlite`) la credencial encriptada corporativa:
   - Nombre: `VitaNexo Webhook Header Auth`
   - Identificador: `VitaNexoWhAuth01`
   - Cabecera: `X-VitaNexo-Webhook-Secret`
   - Valor: Encriptado con la clave de cifrado local de n8n (`N8N_ENCRYPTION_KEY`).
3. Todos los webhooks de n8n (`VitaNexoAgCamp01` a `VitaNexoHealth05`) tienen configurado `authentication: 'headerAuth'` vinculado a esta credencial nativa.
4. El webhook de salud `/webhook/vitanexo/health` responde en vivo `HTTP 200` con `{"ok": true, "webhook_authenticated": true, "auth_mode": "n8n_encrypted_header_auth"}`.

---

## 3. Workflows Locales Activos en `n8n/workflows/`

| ID Workflow | Nombre en n8n | Ruta Webhook | Propósito |
|---|---|---|---|
| `VitaNexoAgCamp01` | VitaNexo — Agente de Campañas B2B | `/webhook/vitanexo/agente-campanas` | Estrategia de pauta, canales y segmentación |
| `VitaNexoAgCont02` | VitaNexo — Agente de Contenido y Editorial | `/webhook/vitanexo/agente-contenido` | Copys, variantes A/B y calendario editorial |
| `VitaNexoAgMetr03` | VitaNexo — Agente de Métricas y KPIs | `/webhook/vitanexo/agente-metricas` | Interpretación ejecutiva de los 8 KPIs SQL |
| `VitaNexoAgVent04` | VitaNexo — Agente de Contactos y Ventas | `/webhook/vitanexo/agente-ventas` | Priorización de leads y borradores comerciales |
| `VitaNexoHealth05` | VitaNexo — Healthcheck & Diagnóstico | `/webhook/vitanexo/health` | Verificación de vida y autenticación de webhooks |

---

## 4. Estructura de Base de Datos Evolucionada en `VitaBase` (25 Tablas)

Se aplicó la migración aditiva segura `sql/05_centro_ia_asincrono_y_proveedores.sql` sin modificar ninguna de las 21 tablas preexistentes ni alterar datos:

1. **`configuracion_proveedores_ia`**: Registro de proveedores admitidos (`gemini-api`, `deepseek`, `openai-compatible`, `anthropic`), modelos configurados, estado activo, orden de prioridad y marcas de cuota.
2. **`asignaciones_proveedor_agente`**: Mapeo relacional de modelo primario y modelo de respaldo por cada uno de los 4 agentes.
3. **`conversaciones_ia`**: Sesiones conversacionales asociadas a un colaborador y agente, con contador de mensajes y fecha de última actividad.
4. **`solicitudes_ia`**: Registro transaccional de cada petición asíncrona, con código único `SOL-YYYY-HEX`, clave de idempotencia, estado (`pendiente`, `procesando`, `completada`, `error`, `cancelada`), prompt, respuesta estructurada, traza n8n y duración en ms.

---

## 5. Guardián Contextual de Frontera Clínica vs Administrativa

En cumplimiento estricto de la política de confidencialidad de VitaNexo:
- **Permitido**: Gestión tecnológica, procesos administrativos de clínicas, facturación recurrente en CRC, automatización de recordatorios de citas, campañas B2B y prospección comercial.
- **Prohibido**: Diagnósticos médicos, recetas farmacológicas, tratamientos terapéuticos o expedientes individuales de pacientes.
- **Respuesta Contextual**: Ante cualquier petición que involucre atención médica directa, el guardián de política (`aiPolicyGuardService.js`) no aborta agresivamente el sistema; intercepta la solicitud y genera una respuesta profesional y empática aclarando el alcance exclusivamente de gestión empresarial de VitaNexo y ofreciendo alternativas comerciales/administrativas.

---

## 6. Arquitectura Multiproveedor Desacoplada

El servicio `src/services/aiProvidersService.js` implementa el patrón adaptador para 4 familias de proveedores:
1. **Google Gemini API** (`models/gemini-flash-latest`, `models/gemini-3.8-flash`, etc.): Invoca vía workflows de n8n o directamente a la API REST de Gemini. Cuenta con reintentos con retroceso exponencial ante códigos 429 (Resource Exhausted).
2. **DeepSeek**: Compatible con endpoints OpenAI-compatible (`deepseek-chat`, `deepseek-reasoner`).
3. **OpenAI-Compatible**: Integración con modelos de lenguaje estándar con cabecera `Authorization: Bearer`.
4. **Anthropic Claude**: Adaptador listo para `anthropic-version: 2023-06-01` y modelos `claude-3-5-sonnet`.

---

## 7. Frontend Empresarial: Centro de IA de 3 Pestañas

La vista `frontend/src/views/AgentsCenterView.tsx` unifica toda la experiencia en tres pestañas reactivas:
1. **Asistente Conversacional**:
   - Sidebar con historial de conversaciones persistidas en `conversaciones_ia`.
   - Feed de mensajes interactivo con pills de estado en tiempo real (`pendiente`, `procesando`, `completada`, `error`, `cancelada`).
   - Botón de cancelación de peticiones en curso (conecta con `AbortController` en el backend).
   - Botón de reintento para peticiones fallidas o canceladas.
   - Composer con autogeneración de claves de idempotencia (`idemp-<timestamp>-<random>`) para prevenir envíos duplicados por doble clic.
2. **Consola Técnica de Agentes**:
   - Selector estructurado de tarea por agente y editor JSON interactivo.
   - Tabla de auditoría técnica con tiempos en milisegundos, referencias de trazabilidad n8n y metadatos de tokens.
3. **Proveedores y Modelos IA**:
   - Monitor de conectividad en vivo con botón de prueba para verificar latencia y estado de cuotas de cada proveedor.
   - Tabla de asignaciones de modelos primarios y secundarios por agente.
