const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../..');
const workflowsDir = path.resolve(__dirname, '../workflows');

function resolveN8nRunner() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    const winBin = path.join(process.env.APPDATA, 'npm', 'node_modules', 'n8n', 'bin', 'n8n');
    if (fs.existsSync(winBin)) {
      return { cmd: process.execPath, prefixArgs: [winBin], shell: false };
    }
  }
  return { cmd: process.platform === 'win32' ? 'n8n.cmd' : 'n8n', prefixArgs: [], shell: process.platform === 'win32' };
}

const runner = resolveN8nRunner();

const VITANEXO_WORKFLOWS = [
  { id: 'VitaNexoAgCamp01', filename: '01_vitanexo_agente_campanas.json' },
  { id: 'VitaNexoAgCont02', filename: '02_vitanexo_agente_contenido.json' },
  { id: 'VitaNexoAgMetr03', filename: '03_vitanexo_agente_metricas.json' },
  { id: 'VitaNexoAgVent04', filename: '04_vitanexo_agente_ventas.json' },
  { id: 'VitaNexoHealth05', filename: '05_vitanexo_estado_salud.json' },
];

fs.mkdirSync(workflowsDir, { recursive: true });
console.log('=== EXPORTANDO WORKFLOWS DE VITANEXO DESDE N8N LOCAL ===');

for (const wf of VITANEXO_WORKFLOWS) {
  const outPath = path.join(workflowsDir, wf.filename);
  const relPath = path.relative(projectRoot, outPath).replace(/\\/g, '/');
  console.log(`-> Exportando ${wf.id} hacia ${wf.filename}...`);
  execFileSync(runner.cmd, [...runner.prefixArgs, 'export:workflow', `--id=${wf.id}`, `--output=${relPath}`], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: runner.shell,
  });
}

console.log('\n[COMPLETADO] Workflows de VitaNexo exportados en n8n/workflows/.');
