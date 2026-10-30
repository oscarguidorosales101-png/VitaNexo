const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });

const workflowsDir = path.resolve(__dirname, '../workflows');

function resolveN8nRunner() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    const winBin = path.join(process.env.APPDATA, 'npm', 'node_modules', 'n8n', 'bin', 'n8n');
    if (fs.existsSync(winBin)) {
      return { cmd: process.execPath, prefixArgs: [winBin], shell: false };
    }
  }
  return {
    cmd: process.platform === 'win32' ? 'n8n.cmd' : 'n8n',
    prefixArgs: [],
    shell: process.platform === 'win32',
  };
}

const runner = resolveN8nRunner();

function syncEncryptedWebhookCredential() {
  const secret = String(process.env.N8N_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    console.warn('[AVISO] N8N_WEBHOOK_SECRET no está definido en .env; se omite sincronización de credencial httpHeaderAuth.');
    return;
  }

  // Archivo temporal efímero fuera del repositorio para cifrar la credencial en SQLite de n8n sin exponer secretos
  const tmpFile = path.join(os.tmpdir(), `vitanexo-wh-cred-${process.pid}-${Date.now()}.json`);
  const credentialPayload = [
    {
      id: 'VitaNexoWhAuth01',
      name: 'VitaNexo Webhook Local Auth',
      type: 'httpHeaderAuth',
      data: {
        name: 'x-vitanexo-webhook-secret',
        value: secret,
      },
    },
  ];

  try {
    fs.writeFileSync(tmpFile, JSON.stringify(credentialPayload, null, 2), 'utf8');
    console.log('-> Sincronizando credencial cifrada httpHeaderAuth (VitaNexoWhAuth01) en n8n local...');
    execFileSync(runner.cmd, [...runner.prefixArgs, 'import:credentials', `--input=${tmpFile}`], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: runner.shell,
    });
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}

const files = fs
  .readdirSync(workflowsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error('No se encontraron archivos JSON en n8n/workflows.');
  process.exit(1);
}

console.log(`=== SINCRONIZANDO CREDENCIAL DE WEBHOOK E IMPORTANDO ${files.length} WORKFLOWS VITANEXO ===`);
syncEncryptedWebhookCredential();

for (const file of files) {
  const fullPath = path.join(workflowsDir, file);
  const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
  const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  console.log(`\n-> Importando ${file} (id=${parsed.id})...`);
  execFileSync(runner.cmd, [...runner.prefixArgs, 'import:workflow', `--input=${relPath}`], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: runner.shell,
  });

  console.log(`-> Publicando/activando workflow id=${parsed.id}...`);
  execFileSync(runner.cmd, [...runner.prefixArgs, 'publish:workflow', `--id=${parsed.id}`], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: runner.shell,
  });
}

console.log('\n[COMPLETADO] Credencial cifrada y los 5 workflows de VitaNexo están importados y publicados en n8n local.');
