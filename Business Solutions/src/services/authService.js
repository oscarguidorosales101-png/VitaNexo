const crypto = require('crypto');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');

const ROLE_CAPABILITIES = {
  direccion_comercial: [
    'dashboard:read',
    'clientes:write',
    'campanas:write',
    'contenidos:write',
    'contenidos:approve',
    'ventas:write',
    'metricas:read',
    'agentes:execute',
    'automatizaciones:manage',
  ],
  mercadeo: [
    'dashboard:read',
    'clientes:write',
    'campanas:write',
    'contenidos:write',
    'contenidos:approve',
    'metricas:read',
    'agentes:execute',
    'automatizaciones:manage',
  ],
  contenido: [
    'dashboard:read',
    'contenidos:write',
    'contenidos:approve',
    'metricas:read',
    'agentes:execute',
  ],
  ejecutivo_ventas: [
    'dashboard:read',
    'clientes:write',
    'ventas:write',
    'metricas:read',
    'agentes:execute',
  ],
  operaciones: [
    'dashboard:read',
    'clientes:write',
    'metricas:read',
    'agentes:execute',
    'automatizaciones:manage',
  ],
};

function base64UrlEncode(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

function signTokenPayload(payloadObj, secret = env.auth.tokenSecret) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'VNX' }));
  const body = base64UrlEncode(JSON.stringify(payloadObj));
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

function verifySignedToken(token, secret = env.auth.tokenSecret) {
  if (!token || typeof token !== 'string') {
    throw new AppError('Token de sesión ausente o inválido.', 401, 'UNAUTHENTICATED');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Formato de token de autenticación inválido.', 401, 'INVALID_AUTH_TOKEN');
  }

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new AppError('Firma de token de sesión no válida.', 401, 'INVALID_AUTH_TOKEN');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(body));
  } catch (_) {
    throw new AppError('Contenido de token corrupto.', 401, 'INVALID_AUTH_TOKEN');
  }

  if (!payload.exp || Date.now() >= payload.exp) {
    throw new AppError('La sesión ha expirado. Inicie sesión nuevamente.', 401, 'TOKEN_EXPIRED');
  }

  return payload;
}

function createAuthService({ catalogsRepo, authConfig = env.auth }) {
  return {
    async listAvailableCollaboratorsForLogin() {
      const rows = await catalogsRepo.listCollaborators({ activo: 1 });
      return rows.map((c) => ({
        id: c.id,
        codigo_colaborador: c.codigo_colaborador,
        nombre_completo: c.nombre_completo,
        correo: c.correo,
        rol: c.rol,
        permisos: ROLE_CAPABILITIES[c.rol] || ['dashboard:read'],
      }));
    },

    async login({ correo, colaborador_id, clave_acceso }) {
      if (!clave_acceso || String(clave_acceso) !== String(authConfig.accessCode)) {
        throw new AppError('Credenciales de acceso corporativo inválidas.', 401, 'INVALID_CREDENTIALS');
      }

      const activeCollaborators = await catalogsRepo.listCollaborators({ activo: 1 });
      let collaborator = null;

      if (colaborador_id) {
        collaborator = activeCollaborators.find((c) => Number(c.id) === Number(colaborador_id));
      } else if (correo) {
        const normEmail = String(correo).trim().toLowerCase();
        collaborator = activeCollaborators.find((c) => String(c.correo).toLowerCase() === normEmail);
      }

      if (!collaborator) {
        throw new AppError(
          'El colaborador indicado no existe o no se encuentra activo en VitaBase.',
          401,
          'COLLABORATOR_NOT_ACTIVE'
        );
      }

      const now = Date.now();
      const ttlMs = Math.max(1, Number(authConfig.tokenTtlHours || 12)) * 3600 * 1000;
      const permisos = ROLE_CAPABILITIES[collaborator.rol] || ['dashboard:read'];

      const tokenPayload = {
        sub: collaborator.id,
        id: collaborator.id,
        codigo_colaborador: collaborator.codigo_colaborador,
        nombre_completo: collaborator.nombre_completo,
        correo: collaborator.correo,
        rol: collaborator.rol,
        permisos,
        iat: now,
        exp: now + ttlMs,
      };

      const token = signTokenPayload(tokenPayload, authConfig.tokenSecret);

      return {
        token,
        tipo_token: 'Bearer',
        expira_en_horas: authConfig.tokenTtlHours || 12,
        expira_timestamp: tokenPayload.exp,
        usuario: {
          id: collaborator.id,
          codigo_colaborador: collaborator.codigo_colaborador,
          nombre_completo: collaborator.nombre_completo,
          correo: collaborator.correo,
          rol: collaborator.rol,
          permisos,
        },
      };
    },

    verifyToken(token) {
      return verifySignedToken(token, authConfig.tokenSecret);
    },
  };
}

module.exports = {
  createAuthService,
  signTokenPayload,
  verifySignedToken,
  ROLE_CAPABILITIES,
};

