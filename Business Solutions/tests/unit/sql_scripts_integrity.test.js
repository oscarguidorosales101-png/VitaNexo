const fs = require('fs');
const path = require('path');
const { splitSqlStatementsQuoteAware } = require('../../src/utils/sqlParser');

describe('Auditoría de Integridad, 3FN y Seguridad No Destructiva de Scripts SQL', () => {
  const sqlDir = path.resolve(__dirname, '../../sql');
  const schemaSql = fs.readFileSync(path.join(sqlDir, '01_schema.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.join(sqlDir, '02_seed_data.sql'), 'utf8');
  const metricsSql = fs.readFileSync(path.join(sqlDir, '03_metrics_queries.sql'), 'utf8');

  const EXPECTED_CATALOG_TABLES = [
    'tipos_organizacion',
    'catalogo_servicios',
    'colaboradores',
    'canales_mercadeo',
    'etapas_embudo',
    'catalogo_agentes',
  ];

  const EXPECTED_MOVEMENT_AND_AUDIT_TABLES = [
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
  ];

  test('Ningún script SQL contiene instrucciones destructivas ni crea una base de datos sustituta', () => {
    const destructivePattern = /\b(DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM|CREATE\s+DATABASE\s+`?vitanexo)\b/i;

    for (const [name, content] of [
      ['01_schema.sql', schemaSql],
      ['02_seed_data.sql', seedSql],
      ['03_metrics_queries.sql', metricsSql],
    ]) {
      const activeLines = content
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n');

      expect({ script: name, hasDestructive: destructivePattern.test(activeLines) }).toEqual({
        script: name,
        hasDestructive: false,
      });
      expect(activeLines).toMatch(/USE\s+`?VitaBase`?\s*;/i);
    }
  });

  test('01_schema.sql define las 20 tablas en 3FN con CREATE TABLE IF NOT EXISTS, PK, FK, UNIQUE y CHECK', () => {
    const allTables = [...EXPECTED_CATALOG_TABLES, ...EXPECTED_MOVEMENT_AND_AUDIT_TABLES];
    for (const table of allTables) {
      const regex = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+\`${table}\``, 'i');
      expect(schemaSql).toMatch(regex);
    }

    const fkCount = (schemaSql.match(/FOREIGN\s+KEY/gi) || []).length;
    const checkCount = (schemaSql.match(/CONSTRAINT\s+`chk_/gi) || []).length;
    const uniqueCount = (schemaSql.match(/UNIQUE\s+KEY/gi) || []).length;

    expect(fkCount).toBeGreaterThanOrEqual(25);
    expect(checkCount).toBeGreaterThanOrEqual(20);
    expect(uniqueCount).toBeGreaterThanOrEqual(15);
  });

  test('02_seed_data.sql cumple los mínimos obligatorios (>= 5 catálogos y >= 10 movimientos) sin datos clínicos', () => {
    // Verificar ausencia de datos médicos/pacientes
    expect(seedSql).not.toMatch(/\b(expediente\s+clinico|diagnostico\s+medico|historia\s+clinica|receta\s+medica)\b/i);

    const seedStatements = splitSqlStatementsQuoteAware(seedSql);

    // Extraer bloques por tabla a partir de las sentencias SQL reales (respetando ';' dentro de strings)
    const countSeedRowsForTable = (tableName) => {
      const stmt = seedStatements.find((s) =>
        new RegExp(`INSERT\\s+(IGNORE\\s+)?INTO\\s+\`${tableName}\``, 'i').test(s)
      );
      if (!stmt) return 0;

      if (/INSERT\s+IGNORE\s+INTO/i.test(stmt)) {
        const valuesIdx = stmt.search(/\bVALUES\b/i);
        if (valuesIdx === -1) return 0;
        const valuesBlock = stmt.slice(valuesIdx + 6);
        let depth = 0;
        let tuples = 0;
        let inQuote = false;
        for (let i = 0; i < valuesBlock.length; i++) {
          const ch = valuesBlock[i];
          if (ch === "'" && valuesBlock[i - 1] !== '\\') {
            inQuote = !inQuote;
          } else if (!inQuote) {
            if (ch === '(') {
              if (depth === 0) tuples += 1;
              depth += 1;
            } else if (ch === ')') {
              depth -= 1;
            }
          }
        }
        return tuples;
      }

      const unionCount = (stmt.match(/UNION\s+ALL\s+SELECT/gi) || []).length;
      return 1 + unionCount;
    };

    for (const catalogTable of EXPECTED_CATALOG_TABLES) {
      const count = countSeedRowsForTable(catalogTable);
      expect({ table: catalogTable, count, meetsMin5: count >= 5 }).toEqual({
        table: catalogTable,
        count,
        meetsMin5: true,
      });
    }

    for (const movTable of EXPECTED_MOVEMENT_AND_AUDIT_TABLES) {
      const count = countSeedRowsForTable(movTable);
      expect({ table: movTable, count, meetsMin10: count >= 10 }).toEqual({
        table: movTable,
        count,
        meetsMin10: true,
      });
    }
  });

  test('03_metrics_queries.sql incluye las 8 consultas requeridas con protección NULLIF contra división por cero', () => {
    expect(metricsSql).toMatch(/AS\s+cpc_crc/i);
    expect(metricsSql).toMatch(/AS\s+ctr_porcentaje/i);
    expect(metricsSql).toMatch(/AS\s+cac_crc/i);
    expect(metricsSql).toMatch(/AS\s+roas_ratio/i);
    expect(metricsSql).toMatch(/AS\s+tasa_conversion_pct/i);
    expect(metricsSql).toMatch(/AS\s+dias_ciclo_venta/i);
    expect(metricsSql).toMatch(/AS\s+ticket_promedio_crc/i);
    expect(metricsSql).toMatch(/AS\s+diagnostico_comparativo/i);

    const nullifOccurrences = (metricsSql.match(/NULLIF\s*\(/gi) || []).length;
    expect(nullifOccurrences).toBeGreaterThanOrEqual(10);
  });

  test('Los 4 agentes especializados no importan otros agentes ni SDKs externos de IA', () => {
    const agentsDir = path.resolve(__dirname, '../../src/agents');
    const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.js'));
    expect(files.length).toBe(4);

    for (const file of files) {
      const code = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      expect(code).not.toMatch(/require\(['"]\.\/.*Agent['"]\)/);
      expect(code).not.toMatch(/\b(openai|anthropic|@google\/genai|langchain|cohere)\b/i);
    }
  });
});
