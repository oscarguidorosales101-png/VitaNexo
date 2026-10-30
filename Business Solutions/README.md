# VitaNexo — Plataforma Empresarial Full-Stack B2B, Automatizaciones n8n y Agentes con Gemini API

Plataforma integral desarrollada para **VitaNexo** (Costa Rica), orientada a la gestión tecnológica, administrativa, comercial y analítica B2B de clínicas pequeñas, consultorios médicos y centros de fisioterapia (moneda oficial: **CRC**, política estricta de **cero datos clínicos o expedientes de pacientes**).

---

## 1. Tecnologías y Arquitectura Definitiva

| Capa | Tecnología | Ubicación / Puerto Local |
|---|---|---|
| **Frontend** | React 19 + Vite 6 + TypeScript 5.7 + Tailwind CSS v4 | `./frontend` (`http://127.0.0.1:5173`) |
| **Backend REST & Orquestador** | Node.js + Express + `mysql2` + Auth/RBAC HMAC-SHA256 | `./src` (`http://127.0.0.1:3000`) |
| **Base de Datos** | MySQL `8.0.40` — Base exclusiva **`VitaBase`** (25 tablas en 3FN) | `127.0.0.1:3306` |
| **Automatizaciones Locales** | n8n local (`2.38.6`) con 5 workflows activos y webhooks autenticados (`httpHeaderAuth`) | `./n8n` (`http://127.0.0.1:5678`) |
| **Inteligencia Artificial** | Arquitectura Asíncrona Multiproveedor (Gemini API primario, DeepSeek, OpenAI, Anthropic) | Invocada vía n8n o adaptadores desacoplados |

### Flujo de Ejecución Asíncrono de Extremo a Extremo
`Frontend (React/TS) → Backend Express (RBAC) → Encolamiento Asíncrono (HTTP 202) → n8n / Adaptador IA → MySQL VitaBase (Persistencia) → Frontend Polling (Pills de Estado en Vivo)`

- **Persistencia y Resiliencia**: Las conversaciones y solicitudes de IA se guardan inmediatamente en las tablas `conversaciones_ia` y `solicitudes_ia`. Al recargar la página o cambiar de pestaña, el estado de cada solicitud se recupera en tiempo real.
- **Pills de Estado en Vivo**: `pendiente` (ámbar), `procesando` (azul animado), `completada` (verde), `error` (rojo) y `cancelada` (gris).
- **Control de Idempotencia y Cancelación**: Prevención de duplicados con clave de idempotencia (`X-Idempotency-Key` / `idempotency_key`) y botón de cancelación en tiempo real conectado a `AbortController`.
- **Frontera Ética y Guardián Contextual**: Distingue consultas de gestión administrativa/comercial para clínicas de solicitudes clínicas diagnósticas/terapéuticas, desviando amablemente estas últimas sin bloquear la operación general.

- El frontend **nunca** almacena claves de API ni invoca directamente a MySQL, n8n o Gemini API.
- Los 4 agentes especializados no se comunican directamente entre sí; toda tarea pasa por el **Orquestador Central** con control de idempotencia, límite de tasa, timeouts, reintentos con backoff y auditoría completa en `ejecuciones_agentes` y `ejecuciones_workflows_n8n`.

---

## 2. Estructura Separada del Proyecto

- `src/`, `sql/`, `scripts/`, `tests/`, `docs/`: Backend Node.js + Express, migraciones aditivas no destructivas, lanzadores locales y 32 pruebas automatizadas (Jest + Supertest).
- `frontend/`: Aplicación web empresarial independiente en React + Vite + TypeScript + Tailwind CSS (inicio de sesión corporativo y 8 módulos conectados en vivo a `VitaBase`).
- `n8n/`: Workflows exportados (`n8n/workflows/*.json`), scripts de construcción/importación/exportación (`n8n/scripts/`) y configuración alternativa `docker-compose.yml` restringida a `127.0.0.1:5678`.

---

## 3. Configuración e Inicio Local

### Variables de entorno
1. Copiar `.env.example` a `.env` en la raíz (protegido en `.gitignore`) y verificar credenciales locales (`MYSQL_USER=vitanexo_app`, `MYSQL_DATABASE=VitaBase`, `N8N_BASE_URL=http://127.0.0.1:5678`, `N8N_WEBHOOK_SECRET`, `AUTH_TOKEN_SECRET`, `AUTH_ACCESS_CODE`).
2. (Opcional) En `frontend/`, copiar `frontend/.env.example` a `frontend/.env` (`VITE_API_BASE_URL=/api`).

### Instalación y Base de Datos (No Destructiva)
```bash
npm install
npm --prefix frontend install
npm run db:inspect
npm run db:migrate
npm run db:seed
```

### Importar y activar los 5 workflows de VitaNexo en n8n local
```bash
npm run n8n:build
npm run n8n:import
```
*(Conserva intactos cualesquiera otros workflows preexistentes en la instancia local de n8n).*

### Iniciar / verificar / detener toda la plataforma
```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-vitanexo.ps1
powershell -ExecutionPolicy Bypass -File scripts/status-vitanexo.ps1
powershell -ExecutionPolicy Bypass -File scripts/stop-vitanexo.ps1
```

---

## 4. Módulos del Frontend Empresarial (`http://127.0.0.1:5173`)

1. **Inicio de Sesión Corporativo (RBAC)**: Selección de colaborador activo real en `VitaBase` y emisión de token firmado con permisos por rol (`direccion_comercial`, `mercadeo`, `contenido`, `ejecutivo_ventas`, `operaciones`).
2. **Dashboard Ejecutivo**: Clientes activos, facturación recurrente en CRC, embudo comercial, desempeño por campaña, estado de n8n + Gemini y ejecuciones recientes de agentes.
3. **Clientes y Servicios**: Alta/edición de clínicas, expediente comercial completo, personas de contacto, catálogo de servicios en CRC y formalización de contratos.
4. **Campañas**: Creación/edición, estados, topes presupuestarios por canal y estudio IA con Gemini (`analizar_estrategia_campana_ia`, persistiendo propuestas estrictamente en estado `propuesta` sin activar gasto real).
5. **Contenidos**: Generación con Gemini (`generar_publicacion_ia`, variantes A/B y calendario editorial), historial de versiones y flujo obligatorio de aprobación/rechazo humano antes de publicar.
6. **Contactos y Ventas**: Registro de leads, embudo de 6 etapas con historial de transiciones, seguimientos pendientes, traspasos a ventas, cierre formal de oportunidades y priorización/redacción comercial con Gemini sujeta a autorización humana.
7. **Métricas SQL**: Los 8 indicadores reales calculados con SQL parametrizado (`CPC`, `CTR`, `CAC`, `ROAS`, conversión del embudo, ciclo de venta, ticket promedio y vanidad vs negocio) más interpretación ejecutiva de Gemini sobre cifras reales.
8. **Centro de Inteligencia Artificial (3 Pestañas Integradas)**:
   - **Pestaña 1: Asistente Conversacional**: Sidebar con conversaciones guardadas, feed cronológico con pills de estado en tiempo real (`pendiente`, `procesando`, `completada`, `error`, `cancelada`), cancelación interactiva, botón de reintento, tarjetas enriquecidas de resultados y composer con autogeneración de claves de idempotencia.
   - **Pestaña 2: Consola Técnica de Agentes**: Invocación estructurada por JSON, histórico de auditoría técnica con tiempos en milisegundos, reintentos y trazabilidad directa con workflows n8n.
   - **Pestaña 3: Proveedores y Modelos IA**: Diagnóstico de conectividad en vivo hacia Google Gemini, DeepSeek, OpenAI y Anthropic, y tabla de asignaciones dinámicas por agente persistidas en VitaBase.
9. **Automatizaciones n8n**: Supervisión de los 5 workflows activos (`VitaNexoAgCamp01` a `VitaNexoHealth05`), métricas de salud y disparadores inmediatos.

---

## 5. Pruebas Automatizadas y Compilación

```bash
# Ejecutar las 7 suites completas (42 pruebas aprobadas: unitarias, HTTP, MySQL VitaBase, RBAC, n8n, 4 agentes Gemini y pruebas A-J)
npm test

# Ejecutar específicamente la suite de auditoría integral asíncrona de IA y multiproveedor
npx jest tests/integration/audit_async_ai_n8n_providers.test.js

# Verificar tipado estricto TypeScript y empaquetado de producción del Frontend (0 errores)
npm --prefix frontend run build
```
