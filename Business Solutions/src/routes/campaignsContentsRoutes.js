const express = require('express');
const { body, param } = require('express-validator');
const {
  validateRequest,
  allowOnlyFields,
  asyncHandler,
} = require('../middlewares/validateRequest');

const idParamRule = param('id').isInt({ min: 1 }).withMessage('El parámetro id debe ser un entero positivo.');

function createCampaignsContentsRoutes(controller) {
  const router = express.Router();

  // Campañas
  router.get('/campanas', asyncHandler(controller.listCampaigns));
  router.get('/campanas/:id', [idParamRule, validateRequest], asyncHandler(controller.getCampaign));
  router.post(
    '/campanas',
    [
      allowOnlyFields([
        'codigo_campana',
        'nombre',
        'descripcion',
        'objetivo',
        'etapa_recorrido',
        'canal_principal_id',
        'responsable_id',
        'fecha_inicio',
        'fecha_fin',
        'presupuesto_total_crc',
        'justificacion_presupuesto',
        'costo_operativo_mercadeo_crc',
        'estado',
        'permitir_pauta_secundaria',
      ]),
      body('nombre').trim().notEmpty().withMessage('nombre de la campaña es obligatorio.'),
      body('descripcion').trim().notEmpty().withMessage('descripcion es obligatoria.'),
      body('objetivo').trim().notEmpty().withMessage('objetivo es obligatorio.'),
      body('etapa_recorrido')
        .isIn(['conciencia', 'consideracion', 'decision'])
        .withMessage('etapa_recorrido debe ser conciencia, consideracion o decision.'),
      body('canal_principal_id').isInt({ min: 1 }).withMessage('canal_principal_id es obligatorio.'),
      body('fecha_inicio').isISO8601().withMessage('fecha_inicio inválida (YYYY-MM-DD).'),
      body('fecha_fin').isISO8601().withMessage('fecha_fin inválida (YYYY-MM-DD).'),
      body('presupuesto_total_crc')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('presupuesto_total_crc debe ser >= 0.'),
      body('justificacion_presupuesto')
        .trim()
        .notEmpty()
        .withMessage('justificacion_presupuesto es obligatoria.'),
      body('costo_operativo_mercadeo_crc')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('costo_operativo_mercadeo_crc debe ser >= 0.'),
      body('estado')
        .optional()
        .isIn(['propuesta', 'planificada', 'activa', 'pausada', 'finalizada', 'cancelada'])
        .withMessage('estado de campaña inválido.'),
      validateRequest,
    ],
    asyncHandler(controller.createCampaign)
  );
  router.patch(
    '/campanas/:id',
    [
      idParamRule,
      allowOnlyFields([
        'nombre',
        'descripcion',
        'objetivo',
        'etapa_recorrido',
        'canal_principal_id',
        'responsable_id',
        'fecha_inicio',
        'fecha_fin',
        'presupuesto_total_crc',
        'justificacion_presupuesto',
        'costo_operativo_mercadeo_crc',
        'estado',
      ]),
      body('etapa_recorrido')
        .optional()
        .isIn(['conciencia', 'consideracion', 'decision'])
        .withMessage('etapa_recorrido inválida.'),
      body('presupuesto_total_crc').optional().isFloat({ min: 0 }),
      body('estado')
        .optional()
        .isIn(['propuesta', 'planificada', 'activa', 'pausada', 'finalizada', 'cancelada']),
      validateRequest,
    ],
    asyncHandler(controller.updateCampaign)
  );

  // Asignaciones de presupuesto
  router.get('/asignaciones-presupuesto', asyncHandler(controller.listBudgetAllocations));
  router.post(
    '/asignaciones-presupuesto',
    [
      allowOnlyFields([
        'campana_id',
        'canal_id',
        'responsable_id',
        'periodo_inicio',
        'periodo_fin',
        'monto_asignado_crc',
        'razon_decision',
        'estado_asignacion',
      ]),
      body('campana_id').isInt({ min: 1 }).withMessage('campana_id es obligatorio.'),
      body('canal_id').isInt({ min: 1 }).withMessage('canal_id es obligatorio.'),
      body('responsable_id').isInt({ min: 1 }).withMessage('responsable_id es obligatorio.'),
      body('periodo_inicio').isISO8601().withMessage('periodo_inicio es obligatorio.'),
      body('periodo_fin').isISO8601().withMessage('periodo_fin es obligatorio.'),
      body('monto_asignado_crc').isFloat({ min: 0 }).withMessage('monto_asignado_crc debe ser >= 0.'),
      body('razon_decision').trim().notEmpty().withMessage('razon_decision es obligatoria.'),
      body('estado_asignacion')
        .optional()
        .isIn(['propuesta', 'aprobada', 'ejecutada', 'ajustada', 'cancelada']),
      validateRequest,
    ],
    asyncHandler(controller.createBudgetAllocation)
  );

  // Contenidos y calendario editorial
  router.get('/contenidos', asyncHandler(controller.listContents));
  router.get('/contenidos/:id', [idParamRule, validateRequest], asyncHandler(controller.getContent));
  router.post(
    '/contenidos',
    [
      allowOnlyFields([
        'codigo_contenido',
        'campana_id',
        'canal_id',
        'autor_colaborador_id',
        'titulo',
        'etapa_recorrido',
        'tipo_contenido',
        'cuerpo_borrador',
        'fecha_programada_publicacion',
      ]),
      body('campana_id').isInt({ min: 1 }).withMessage('campana_id es obligatorio.'),
      body('canal_id').isInt({ min: 1 }).withMessage('canal_id es obligatorio.'),
      body('titulo').trim().notEmpty().withMessage('titulo es obligatorio.'),
      body('etapa_recorrido')
        .optional()
        .isIn(['conciencia', 'consideracion', 'decision'])
        .withMessage('etapa_recorrido inválida.'),
      body('tipo_contenido')
        .isIn([
          'publicacion_social',
          'correo_electronico',
          'anuncio_pagado',
          'articulo_blog',
          'guia_descargable',
          'guion_webinar',
        ])
        .withMessage('tipo_contenido inválido.'),
      body('cuerpo_borrador').trim().notEmpty().withMessage('cuerpo_borrador es obligatorio.'),
      validateRequest,
    ],
    asyncHandler(controller.createContent)
  );
  router.patch(
    '/contenidos/:id',
    [
      idParamRule,
      allowOnlyFields([
        'titulo',
        'cuerpo_borrador',
        'etapa_recorrido',
        'tipo_contenido',
        'fecha_programada_publicacion',
      ]),
      body('etapa_recorrido').optional().isIn(['conciencia', 'consideracion', 'decision']),
      body('tipo_contenido')
        .optional()
        .isIn([
          'publicacion_social',
          'correo_electronico',
          'anuncio_pagado',
          'articulo_blog',
          'guia_descargable',
          'guion_webinar',
        ]),
      validateRequest,
    ],
    asyncHandler(controller.updateContent)
  );

  // Aprobaciones e historial de revisiones
  router.get('/revisiones-contenido', asyncHandler(controller.listReviews));
  router.post(
    '/contenidos/:id/revisiones',
    [
      idParamRule,
      allowOnlyFields(['revisor_id', 'decision', 'comentarios', 'actor_tipo']),
      body('revisor_id').isInt({ min: 1 }).withMessage('revisor_id es obligatorio.'),
      body('decision')
        .isIn(['enviar_a_revision', 'aprobar', 'rechazar', 'solicitar_cambios'])
        .withMessage('decision inválida.'),
      body('comentarios').trim().notEmpty().withMessage('comentarios / motivo de revisión es obligatorio.'),
      body('actor_tipo').optional().isIn(['humano', 'agente']),
      validateRequest,
    ],
    asyncHandler(controller.reviewContent)
  );
  router.post(
    '/contenidos/:id/publicar',
    [
      idParamRule,
      allowOnlyFields(['actor_tipo']),
      body('actor_tipo').optional().isIn(['humano', 'agente']),
      validateRequest,
    ],
    asyncHandler(controller.publishContent)
  );

  return router;
}

module.exports = {
  createCampaignsContentsRoutes,
};

