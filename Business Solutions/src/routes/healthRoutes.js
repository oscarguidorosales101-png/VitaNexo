const express = require('express');
const { asyncHandler } = require('../middlewares/validateRequest');

function createHealthRoutes(healthController) {
  const router = express.Router();
  router.get('/health', asyncHandler(healthController.getHealth));
  return router;
}

module.exports = {
  createHealthRoutes,
};

