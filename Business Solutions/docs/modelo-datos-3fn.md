# Modelo Relacional en Tercera Forma Normal (3FN) — VitaNexo (`VitaBase`)

## 1. Principios de Diseño y Normalización (3FN)

El esquema relacional implementado en [`01_schema.sql`](../sql/01_schema.sql) trabaja exclusivamente sobre la base de datos **`VitaBase`** en MySQL 8.0+ bajo tres garantías fundamentales:

1. **Primera Forma Normal (1FN):** Todos los atributos son atómicos y cada tabla posee clave primaria entera autoincremental (`id`) acompañada de claves naturales únicas de negocio (`codigo_*`).
2. **Segunda Forma Normal (2FN):** Las relaciones muchos a muchos (N:M) se resuelven mediante tablas intermedias explícitas (`contratos_servicios_cliente` y `contactos_contenidos_consumidos`), donde todo atributo no clave depende de la totalidad de la entidad representada.
3. **Tercera Forma Normal (3FN):** Se eliminaron dependencias transitivas:
   - La clasificación `organico` / `pagado` y la plataforma residen únicamente en `canales_mercadeo`, evitando duplicarlas en `campanas`, `contenidos`, `asignaciones_presupuesto` o `metricas_campana_periodo`.
   - Los datos de responsables internos (mercadeo, contenido, dirección y ejecutivos de ventas) residen únicamente en `colaboradores`.
   - Los segmentos de organizaciones cliente y prospectos se normalizan en `tipos_organizacion`.
   - Las etapas del recorrido comercial y su orden se normalizan en `etapas_embudo`.
   - Los importes ejecutados e ingresos atribuibles por periodo se registran como valores base auditables en `metricas_campana_periodo`, sin almacenar únicamente porcentajes precalculados.
4. **Cero información médica o clínica:** VitaNexo gestiona procesos administrativos y comerciales B2B; no existen tablas ni campos para pacientes, diagnósticos ni expedientes médicos.

---

## 2. Inventario de las 20 Tablas y Registros de Prueba ([`02_seed_data.sql`](../sql/02_seed_data.sql))

### A. Tablas de Catálogo (Mínimo requerido: 5 registros por tabla)

| # | Tabla | Rol en el Dominio | Claves Únicas | Registros Semilla |
|---|---|---|---|---|
| 1 | `tipos_organizacion` | Segmentos B2B (clínicas, consultorios, fisioterapia, rehabilitación, odontología) | `codigo`, `nombre` | **6** |
| 2 | `catalogo_servicios` | Servicios administrativos/tecnológicos de VitaNexo en CRC | `codigo_servicio`, `nombre` | **6** |
| 3 | `colaboradores` | Personal interno de mercadeo, contenido, dirección y ventas | `codigo_colaborador`, `correo` | **6** |
| 4 | `canales_mercadeo` | Canales diferenciados en `organico` y `pagado` | `codigo_canal`, `nombre` | **7** |
| 5 | `etapas_embudo` | Etapas ordenadas del recorrido comercial | `codigo_etapa`, `nombre`, `orden_embudo` | **6** |
| 6 | `catalogo_agentes` | Orquestador central y los 4 agentes deterministas | `codigo_agente`, `nombre` | **5** |

### B. Tablas de Movimientos, Intermedias (N:M) y Auditoría (Mínimo requerido: 10 registros por tabla)

| # | Tabla | Tipo | Relaciones Principales (FK) | Registros Semilla |
|---|---|---|---|---|
| 7 | `campanas` | Movimiento | `canales_mercadeo`, `colaboradores` | **10** |
| 8 | `asignaciones_presupuesto` | Movimiento | `campanas`, `canales_mercadeo`, `colaboradores` | **12** |
| 9 | `contenidos` | Movimiento | `campanas`, `canales_mercadeo`, `colaboradores` | **12** |
| 10 | `revisiones_contenido` | Auditoría inmutable | `contenidos`, `colaboradores` | **14** |
| 11 | `contactos` | Movimiento (Leads) | `tipos_organizacion`, `campanas`, `canales_mercadeo`, `etapas_embudo`, `colaboradores` | **12** |
| 12 | `historial_etapas_contacto` | Auditoría de embudo | `contactos`, `etapas_embudo` (anterior y nueva), `colaboradores` | **36** |
| 13 | `contactos_contenidos_consumidos` | Intermedia N:M | `contactos`, `contenidos` | **12** |
| 14 | `traspasos_ventas` | Movimiento / Auditoría | `contactos`, `colaboradores` (entrega y recibe) | **10** |
| 15 | `clientes` | Movimiento | `tipos_organizacion`, `contactos` (`origen_contacto_id` opcional) | **10** |
| 16 | `contactos_cliente` | Movimiento | `clientes` | **10** |
| 17 | `oportunidades` | Movimiento comercial | `contactos`, `clientes`, `campanas`, `traspasos_ventas`, `colaboradores`, `catalogo_servicios` | **10** |
| 18 | `contratos_servicios_cliente` | Intermedia N:M | `clientes`, `catalogo_servicios`, `oportunidades` | **12** |
| 19 | `metricas_campana_periodo` | Movimiento base KPIs | `campanas`, `canales_mercadeo` | **14** |
| 20 | `ejecuciones_agentes` | Auditoría de agentes | `catalogo_agentes`, `campanas`, `contenidos`, `contactos`, `oportunidades` | **10** |

---

## 3. Separación Conceptual Clave

- **Contacto (`contactos`) vs Oportunidad (`oportunidades`) vs Cliente (`clientes`):**
  Un contacto puede originar uno o más traspasos (`traspasos_ventas`) y múltiples oportunidades comerciales a lo largo del tiempo (por ejemplo, contratación inicial y expansión posterior a otro módulo), sin mezclar datos de persona prospecto con propuestas económicas ni contratos vigentes.
- **Presupuesto vs Gasto Publicitario vs Costos CAC vs Ingresos:**
  - `campanas.presupuesto_total_crc` y `asignaciones_presupuesto.monto_asignado_crc`: techo planificado.
  - `metricas_campana_periodo.gasto_publicitario_crc`: pauta publicitaria efectivamente consumida (usada en CPC y ROAS).
  - `costo_mercadeo_operativo_crc + costo_ventas_atribuible_crc + gasto_publicitario_crc`: denominador de inversión integral para el CAC.
  - `ingresos_atribuibles_crc`, `oportunidades.monto_cierre_crc` y `contratos_servicios_cliente.precio_acordado_crc`: ingresos comerciales reales, nunca confundidos con presupuesto publicitario.

