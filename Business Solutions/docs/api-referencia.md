# Referencia de la API REST — VitaNexo Backend

Base URL local por defecto: `http://localhost:3000/api`
Formato de intercambio: `application/json` (sin vistas HTML ni ejecución de SQL arbitrario).

---

## 1. Salud del Servicio y Conexión a MySQL

### `GET /api/health`
Comprueba si la API está activa y verifica en tiempo real el pool de conexiones hacia `VitaBase` sin exponer credenciales.

**Respuesta `200 OK` (conectado a `VitaBase`):**
```json
{
  "ok": true,
  "service": "VitaNexo Backend API",
  "api_status": "online",
  "timestamp": "2026-10-29T19:30:00.000Z",
  "database": {
    "connected": true,
    "database": "VitaBase",
    "latency_ms": 3,
    "status": "connected",
    "message": "Conexión activa y verificada contra MySQL VitaBase."
  }
}
```

**Respuesta `503 Service Unavailable` (cuando MySQL no está accesible o faltan credenciales en `.env`):**
```json
{
  "ok": false,
  "service": "VitaNexo Backend API",
  "api_status": "online",
  "database": {
    "connected": false,
    "database": "VitaBase",
    "latency_ms": null,
    "status": "not_configured",
    "error_code": "DATABASE_NOT_CONFIGURED",
    "message": "La conexión a la base de datos MySQL (VitaBase) aún no está configurada en las variables de entorno del servidor."
  }
}
```

---

## 2. Clientes, Catálogo de Servicios y Contratos

- `GET /api/catalogos/tipos-organizacion` — Lista tipos de organización.
- `GET /api/catalogos/colaboradores?rol=ejecutivo_ventas` — Lista colaboradores internos.
- `GET /api/clientes?estado_cliente=activo&provincia=Cartago` — Lista clientes.
- `GET /api/clientes/:id` — Detalle del cliente con `contactos_comerciales` y `servicios_contratados`.
- `POST /api/clientes` — Crea un cliente B2B.
- `PATCH /api/clientes/:id` — Actualiza datos o aplica baja lógica (`"estado_cliente": "inactivo"`).
- `POST /api/clientes/:id/contactos` — Registra persona de contacto comercial de la organización.
- `GET /api/servicios` | `GET /api/servicios/:id` | `POST /api/servicios` | `PATCH /api/servicios/:id`
- `GET /api/contratos-servicios` | `GET /api/contratos-servicios/:id` | `POST /api/contratos-servicios` | `PATCH /api/contratos-servicios/:id`

**Ejemplo `POST /api/clientes`:**
```json
{
  "nombre_comercial": "Centro Fisioterapia Valle Azul",
  "razon_social": "Valle Azul Terapia Física S.A.",
  "cedula_juridica": "3-101-909090",
  "tipo_organizacion_id": 3,
  "provincia": "Cartago",
  "canton": "Cartago",
  "correo_corporativo": "administracion@valleazul.cr.example",
  "telefono_principal": "+506 2551-9090",
  "fecha_alta": "2026-04-15"
}
```

---

## 3. Canales, Campañas y Asignaciones de Presupuesto

- `GET /api/canales?clasificacion=pagado` | `GET /api/canales/:id` | `POST /api/canales` | `PATCH /api/canales/:id`
- `GET /api/campanas?etapa_recorrido=decision&clasificacion=pagado`
- `GET /api/campanas/:id` — Incluye resumen separado de presupuesto total, presupuesto asignado a canales, gasto publicitario ejecutado, costos atribuibles e ingresos atribuibles.
- `POST /api/campanas` | `PATCH /api/campanas/:id`
- `GET /api/asignaciones-presupuesto?campana_id=1`
- `POST /api/asignaciones-presupuesto` — Valida que la suma asignada no supere `presupuesto_total_crc` y bloquea gasto publicitario en canales `organico`.

---

## 4. Contenido, Calendario Editorial y Aprobaciones

- `GET /api/contenidos?campana_id=1&estado=en_revision`
- `GET /api/contenidos/:id` — Incluye `historial_revisiones` completo en orden cronológico.
- `POST /api/contenidos` — Crea borrador (`version_actual = 1`, `estado = "borrador"`).
- `PATCH /api/contenidos/:id` — Si la pieza estaba `aprobado`, `rechazado` o `publicado` y cambia el texto, incrementa `version_actual` y regresa automáticamente a `en_revision` sin sobrescribir revisiones anteriores.
- `GET /api/revisiones-contenido`
- `POST /api/contenidos/:id/revisiones` — Registra `enviar_a_revision`, `aprobar`, `rechazar` o `solicitar_cambios`. Bloquea aprobación por el mismo autor o por agentes (`403`).
- `POST /api/contenidos/:id/publicar` — Solo permitido cuando `estado === "aprobado"` (`409` en cualquier otro estado).

**Ejemplo `POST /api/contenidos/1/revisiones`:**
```json
{
  "revisor_id": 4,
  "decision": "aprobar",
  "comentarios": "Cifras en colones verificadas y enfoque administrativo correcto."
}
```

---

## 5. Contactos, Embudo, Traspasos a Ventas y Oportunidades

- `GET /api/embudo/etapas`
- `GET /api/contactos?codigo_etapa=prospecto_calificado`
- `GET /api/contactos/seguimientos-pendientes?hasta_fecha=2026-05-15`
- `GET /api/contactos/:id` — Incluye `historial_etapas` y `contenidos_consumidos`.
- `POST /api/contactos` — Crea lead e inserta transición inicial en `historial_etapas_contacto` transaccionalmente.
- `PATCH /api/contactos/:id`
- `POST /api/contactos/:id/etapa` — Registra transición formal de etapa en el embudo.
- `POST /api/contactos/:id/contenidos-consumidos`
- `GET /api/traspasos-ventas` | `GET /api/traspasos-ventas/:id` | `POST /api/traspasos-ventas`
- `POST /api/traspasos-ventas/:id/decision` — `aceptado` o `rechazado` (`motivo_decision` obligatorio al rechazar).
- `GET /api/oportunidades` | `GET /api/oportunidades/:id` | `POST /api/oportunidades` | `PATCH /api/oportunidades/:id`
- `POST /api/oportunidades/:id/cerrar` — Exige `monto_cierre_crc > 0` y `motivo_cierre` cuando `resultado_cierre === "ganada"`.

---

## 6. Métricas Base y Consultas SQL de Indicadores

- `GET /api/metricas/mediciones` | `GET /api/metricas/mediciones/:id` | `POST /api/metricas/mediciones` | `PATCH /api/metricas/mediciones/:id`
- Todos los endpoints de indicadores aceptan filtros opcionales `?campana_id=&canal_id=&desde=YYYY-MM-DD&hasta=YYYY-MM-DD`:
  - `GET /api/metricas/indicadores/cpc`
  - `GET /api/metricas/indicadores/ctr`
  - `GET /api/metricas/indicadores/cac`
  - `GET /api/metricas/indicadores/roas`
  - `GET /api/metricas/indicadores/conversiones-embudo`
  - `GET /api/metricas/indicadores/ciclo-venta`
  - `GET /api/metricas/indicadores/ticket-promedio`
  - `GET /api/metricas/indicadores/vanidad-vs-negocio`

---

## 7. Agentes Deterministas y Orquestador Central

- `GET /api/agentes` — Estado de los agentes registrados en `VitaBase`.
- `GET /api/agentes/capacidades` — Mapa de tareas deterministas soportadas por cada agente.
- `GET /api/agentes/ejecuciones?codigo_agente=agente_contenido&estado=rechazada_regla_negocio`
- `GET /api/agentes/ejecuciones/:id`
- `POST /api/orquestador/ejecutar` — Punto único de coordinación centralizada.

**Ejemplo `POST /api/orquestador/ejecutar`:**
```json
{
  "tipo_tarea": "generar_borrador_contenido",
  "parametros": {
    "campana_id": 1,
    "canal_id": 1,
    "etapa_recorrido": "decision",
    "tipo_contenido": "correo_electronico",
    "segmento_objetivo": "centros de fisioterapia en Cartago y Heredia",
    "problema_administrativo": "ausentismo del 20% por falta de confirmación previa",
    "beneficio_clave": "enviar recordatorios automáticos y liberar 6 horas semanales en recepción"
  }
}
```

