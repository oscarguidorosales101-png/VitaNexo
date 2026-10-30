const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function loadEnv(overrides = {}) {
  const raw = { ...process.env, ...overrides };

  const port = Number.parseInt(raw.PORT || '3000', 10);
  const mysqlPort = Number.parseInt(raw.MYSQL_PORT || '3306', 10);
  const connectionLimit = Number.parseInt(raw.MYSQL_CONNECTION_LIMIT || '10', 10);
  const connectTimeout = Number.parseInt(raw.MYSQL_CONNECT_TIMEOUT_MS || '5000', 10);
  const tokenTtlHours = Number.parseInt(raw.AUTH_TOKEN_TTL_HOURS || '12', 10);
  const n8nTimeoutMs = Number.parseInt(raw.N8N_TIMEOUT_MS || '45000', 10);
  const n8nMaxRetries = Number.parseInt(raw.N8N_MAX_RETRIES || '2', 10);
  const n8nRateLimitPerMin = Number.parseInt(raw.N8N_RATE_LIMIT_PER_MINUTE || '30', 10);

  const allowedOrigins = String(
    raw.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    nodeEnv: raw.NODE_ENV || 'development',
    port: Number.isNaN(port) ? 3000 : port,
    mysql: {
      host: raw.MYSQL_HOST || '',
      port: Number.isNaN(mysqlPort) ? 3306 : mysqlPort,
      user: raw.MYSQL_USER || '',
      password: raw.MYSQL_PASSWORD || '',
      database: raw.MYSQL_DATABASE || 'VitaBase',
      connectionLimit: Number.isNaN(connectionLimit) ? 10 : connectionLimit,
      connectTimeout: Number.isNaN(connectTimeout) ? 5000 : connectTimeout,
    },
    cors: {
      allowedOrigins,
    },
    auth: {
      tokenSecret: raw.AUTH_TOKEN_SECRET || 'vitanexo-dev-local-hmac-secret-key',
      tokenTtlHours: Number.isNaN(tokenTtlHours) ? 12 : tokenTtlHours,
      accessCode: raw.AUTH_ACCESS_CODE || 'VitaNexoCR2026',
    },
    n8n: {
      baseUrl: String(raw.N8N_BASE_URL || 'http://127.0.0.1:5678').replace(/\/+$/, ''),
      webhookSecret: raw.N8N_WEBHOOK_SECRET || '',
      timeoutMs: Number.isNaN(n8nTimeoutMs) ? 45000 : n8nTimeoutMs,
      maxRetries: Number.isNaN(n8nMaxRetries) ? 2 : Math.max(0, Math.min(5, n8nMaxRetries)),
      rateLimitPerMinute: Number.isNaN(n8nRateLimitPerMin) ? 30 : Math.max(1, n8nRateLimitPerMin),
    },
    gemini: {
      model: raw.GEMINI_MODEL || 'models/gemini-3-flash-preview',
      apiKey: raw.GEMINI_API_KEY || '',
    },
  };
}

const env = loadEnv();

module.exports = {
  env,
  loadEnv,
};
