const express = require('express');
const { buildContainer } = require('./container');
const { createApiRouter } = require('./routes');
const { createCorsAndSecurityHeadersMiddleware } = require('./middlewares/corsMiddleware');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

function createApp(customDb = undefined, options = {}) {
  const app = express();
  const container = buildContainer(customDb, options);

  app.disable('x-powered-by');
  app.use(createCorsAndSecurityHeadersMiddleware(options.allowedOrigins));
  app.use(express.json({ limit: '512kb' }));

  // Endpoint informativo raíz (JSON puro)
  app.get('/', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'VitaNexo Backend API',
      version: '2.0.0',
      documentation: '/docs/openapi.json',
      health_endpoint: '/api/health',
    });
  });

  app.use('/api', createApiRouter(container, options));

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.container = container;
  return app;
}

module.exports = {
  createApp,
};
