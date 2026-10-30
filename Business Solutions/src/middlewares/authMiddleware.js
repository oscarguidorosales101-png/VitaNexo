const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

const PUBLIC_API_ROUTES = new Set([
  'GET /health',
  'GET /auth/colaboradores-disponibles',
  'POST /auth/login',
]);

function resolveRequiredCapability(req) {
  const method = req.method.toUpperCase();
  const path = req.path || '';

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return 'dashboard:read';
  }

  if (path.startsWith('/orquestador/ejecutar')) {
    return 'agentes:execute';
  }

  if (path.startsWith('/ia/proveedores') || path.startsWith('/ia/agentes/')) {
    return 'automatizaciones:manage';
  }

  if (path.startsWith('/ia/')) {
    return 'agentes:execute';
  }

  if (path.startsWith('/automatizaciones/') && path.endsWith('/reintentar')) {
    return 'automatizaciones:manage';
  }

  if (/^\/contenidos\/\d+\/publicar/.test(path)) {
    return 'contenidos:approve';
  }

  if (/^\/contenidos\/\d+\/revisiones/.test(path)) {
    const decision = req.body?.decision;
    if (decision === 'aprobar' || decision === 'rechazar') {
      return 'contenidos:approve';
    }
    return 'contenidos:write';
  }

  if (path.startsWith('/contenidos')) {
    return 'contenidos:write';
  }

  if (
    path.startsWith('/campanas') ||
    path.startsWith('/asignaciones-presupuesto') ||
    path.startsWith('/presupuestos-campana')
  ) {
    return 'campanas:write';
  }

  if (
    path.startsWith('/contactos') ||
    path.startsWith('/oportunidades') ||
    path.startsWith('/traspasos-ventas')
  ) {
    return 'ventas:write';
  }

  if (
    path.startsWith('/clientes') ||
    path.startsWith('/servicios') ||
    path.startsWith('/contratos-servicios') ||
    path.startsWith('/canales') ||
    path.startsWith('/colaboradores')
  ) {
    return 'clientes:write';
  }

  return null;
}

function createAuthMiddleware({ authService, enforceAuth = env.nodeEnv !== 'test' }) {
  return function authAndRbacMiddleware(req, _res, next) {
    try {
      const routeKey = `${req.method.toUpperCase()} ${req.path}`;
      const isPublic = PUBLIC_API_ROUTES.has(routeKey);

      const authHeader = req.headers.authorization || '';
      const hasBearer = authHeader.toLowerCase().startsWith('bearer ');

      if (hasBearer) {
        const rawToken = authHeader.slice(7).trim();
        const payload = authService.verifyToken(rawToken);
        req.user = { id: payload.id || payload.sub, ...payload };
      }

      if (isPublic) {
        return next();
      }

      if (req.path === '/auth/perfil' && !req.user) {
        throw new AppError(
          'Debe iniciar sesión corporativa para consultar su perfil activo.',
          401,
          'UNAUTHENTICATED'
        );
      }

      if (!enforceAuth && !req.user) {
        return next();
      }

      if (!req.user) {
        throw new AppError(
          'Autenticación requerida. Envíe un encabezado Authorization: Bearer <token> válido.',
          401,
          'UNAUTHENTICATED'
        );
      }

      const requiredCap = resolveRequiredCapability(req);
      if (requiredCap) {
        const userPerms = Array.isArray(req.user.permisos) ? req.user.permisos : [];
        if (!userPerms.includes(requiredCap)) {
          throw new AppError(
            `Permisos insuficientes: el rol '${req.user.rol}' no posee la capacidad requerida '${requiredCap}'.`,
            403,
            'FORBIDDEN_ROLE_CAPABILITY'
          );
        }
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  createAuthMiddleware,
  resolveRequiredCapability,
};
