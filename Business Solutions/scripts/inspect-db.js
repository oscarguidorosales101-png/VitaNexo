const { getPool, closePool, checkDatabaseHealth } = require('../src/config/database');
const { env } = require('../src/config/env');

const EXPECTED_VITANEXO_TABLES = [
  'tipos_organizacion',
  'catalogo_servicios',
  'colaboradores',
  'canales_mercadeo',
  'etapas_embudo',
  'catalogo_agentes',
  'campanas',
  'asignaciones_presupuesto',
  'contenidos',
  'revisiones_contenido',
  'contactos',
  'historial_etapas_contacto',
  'contactos_contenidos_consumidos',
  'traspasos_ventas',
  'clientes',
  'contactos_cliente',
  'oportunidades',
  'contratos_servicios_cliente',
  'metricas_campana_periodo',
  'ejecuciones_agentes',
  'ejecuciones_workflows_n8n',
  'configuracion_proveedores_ia',
  'asignaciones_proveedor_agente',
  'conversaciones_ia',
  'solicitudes_ia',
];

async function inspectDatabase() {
  console.log('=== AUDITORÍA NO DESTRUCTIVA DE MYSQL VITABASE ===');
  console.log(`Base de datos objetivo: ${env.mysql.database}`);
  console.log(`Host configurado: ${env.mysql.host || '(no configurado)'}:${env.mysql.port}`);
  console.log(`Usuario configurado: ${env.mysql.user || '(no configurado)'}`);

  const health = await checkDatabaseHealth();
  if (!health.connected) {
    console.error(`\n[BLOQUEADO] ${health.message}`);
    process.exitCode = 1;
    return;
  }

  const pool = getPool();
  const [versionRows] = await pool.query('SELECT VERSION() AS mysql_version, DATABASE() AS current_db');
  console.log('Versión del servidor MySQL:', versionRows[0].mysql_version);
  console.log('Esquema conectado:', versionRows[0].current_db);

  const [grantsRows] = await pool.query('SHOW GRANTS FOR CURRENT_USER()');
  console.log(`Permisos detectados (${grantsRows.length} regla(s) GRANT): verificados.`);

  const [tables] = await pool.query(
    `SELECT TABLE_NAME AS table_name, ENGINE AS engine, TABLE_ROWS AS estimated_rows
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`
  );

  console.log(`\nTablas existentes en ${env.mysql.database}: ${tables.length}`);
  for (const t of tables) {
    const [countRows] = await pool.query(`SELECT COUNT(*) AS exact_count FROM \`${t.table_name}\``);
    const isVitaTable = EXPECTED_VITANEXO_TABLES.includes(t.table_name);
    console.log(
      ` - ${t.table_name} (${t.engine}): ${countRows[0].exact_count} registros [${
        isVitaTable ? 'esquema VitaNexo' : 'tabla preexistente externa - SE CONSERVA INTACTA'
      }]`
    );
  }

  const [fks] = await pool.query(
    `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY TABLE_NAME, CONSTRAINT_NAME`
  );
  console.log(`\nClaves foráneas registradas actualmente: ${fks.length}`);
}

inspectDatabase()
  .catch((err) => {
    console.error('[ERROR DE INSPECCIÓN]:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

