const { env } = require('../config/env');

function createCorsAndSecurityHeadersMiddleware(allowedOrigins = env.cors.allowedOrigins) {
  const allowedSet = new Set(allowedOrigins);

  return function corsAndSecurityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const origin = req.headers.origin;
    if (origin && (allowedSet.has(origin) || allowedSet.has('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Idempotency-Key, X-Requested-With'
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  };
}

module.exports = {
  createCorsAndSecurityHeadersMiddleware,
};

