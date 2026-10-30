const express = require('express');
const { body, param } = require('express-validator');
const {
  validateRequest,
  allowOnlyFields,
  asyncHandler,
} = require('../middlewares/validateRequest');

const idParamRule = param('id').isInt({ min: 1 }).withMessage('El parámetro id debe ser un entero positivo.');

function createCrmSalesRoutes(controller) {
  const router = express.Router();

  // Etapas del embudo
  router.get('/embudo/etapas', asyncHandler(controller.listFunnelStages));

  // Contactos y leads
  router.get('/contactos', asyncHandler(controller.listContacts));
  router.get('/contactos/seguimientos-pendientes', asyncHandler(controller.listPendingFollowUps));
  router.get('/contactos/:id', [idParamRule, validateRequest], asyncHandler(controller.getContact));
  router.post(
    '/contactos',
    [
      allowOnlyFields([
        'codigo_contacto',
        'nombre_completo',
        'cargo',
        'nombre_organizacion',
        'tipo_organizacion_id',
        'correo',
        'telefono',
        'provincia',
        'fuente_origen',
        'campana_origen_id',
        'canal_origen_id',
        'etapa_actual_id',
        'codigo_etapa',
        'puntuacion_lead',
        'necesidad_comercial',
        'presupuesto_declarado_crc',
        'responsable_comercial_id',
        'fecha_captura_lead',
        'fecha_proximo_seguimiento',
      ]),
      body('nombre_completo').trim().notEmpty().withMessage('nombre_completo es obligatorio.'),
      body('cargo').trim().notEmpty().withMessage('cargo es obligatorio.'),
      body('nombre_organizacion').trim().notEmpty().withMessage('nombre_organizacion es obligatorio.'),
      body('tipo_organizacion_id').isInt({ min: 1 }).withMessage('tipo_organizacion_id es obligatorio.'),
      body('correo').isEmail().withMessage('correo debe ser válido.'),
      body('telefono').trim().notEmpty().withMessage('telefono es obligatorio.'),
      body('provincia').trim().notEmpty().withMessage('provincia es obligatoria.'),
      body('fuente_origen')
        .isIn([
          'campana_digital',
          'busqueda_organica',
          'referido',
          'evento_salud',
          'prospeccion_directa',
          'sitio_web',
        ])
        .withMessage('fuente_origen inválida.'),
      body('puntuacion_lead')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('puntuacion_lead debe estar entre 0 y 100.'),
      body('necesidad_comercial').trim().notEmpty().withMessage('necesidad_comercial es obligatoria.'),
      body('presupuesto_declarado_crc')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('presupuesto_declarado_crc debe ser >= 0.'),
      validateRequest,
    ],
    asyncHandler(controller.createContact)
  );
  router.patch(
    '/contactos/:id',
    [
      idParamRule,
      allowOnlyFields([
        'nombre_completo',
        'cargo',
        'nombre_organizacion',
        'tipo_organizacion_id',
        'telefono',
        'provincia',
        'puntuacion_lead',
        'necesidad_comercial',
        'presupuesto_declarado_crc',
        'responsable_comercial_id',
        'fecha_proximo_seguimiento',
        'activo',
      ]),
      body('puntuacion_lead').optional().isInt({ min: 0, max: 100 }),
      body('presupuesto_declarado_crc').optional({ nullable: true }).isFloat({ min: 0 }),
      validateRequest,
    ],
    asyncHandler(controller.updateContact)
  );
  router.post(
    '/contactos/:id/etapa',
    [
      idParamRule,
      allowOnlyFields([
        'etapa_nueva_id',
        'codigo_etapa_nueva',
        'cambiado_por_id',
        'fecha_transicion',
        'motivo',
        'fecha_proximo_seguimiento',
      ]),
      body('motivo').trim().notEmpty().withMessage('motivo de la transición de etapa es obligatorio.'),
      validateRequest,
    ],
    asyncHandler(controller.changeContactStage)
  );
  router.post(
    '/contactos/:id/contenidos-consumidos',
    [
      idParamRule,
      allowOnlyFields(['contenido_id', 'tipo_interaccion', 'fecha_interaccion']),
      body('contenido_id').isInt({ min: 1 }).withMessage('contenido_id es obligatorio.'),
      body('tipo_interaccion')
        .isIn(['lectura', 'descarga', 'clic', 'registro_formulario', 'asistencia_webinar'])
        .withMessage('tipo_interaccion inválido.'),
      validateRequest,
    ],
    asyncHandler(controller.recordContentConsumption)
  );

  // Traspasos de mercadeo a ventas
  router.get('/traspasos-ventas', asyncHandler(controller.listHandoffs));
  router.get('/traspasos-ventas/:id', [idParamRule, validateRequest], asyncHandler(controller.getHandoff));
  router.post(
    '/traspasos-ventas',
    [
      allowOnlyFields([
        'codigo_traspaso',
        'contacto_id',
        'entregado_por_id',
        'recibido_por_id',
        'puntuacion_al_traspaso',
        'necesidad_detectada',
        'presupuesto_declarado_crc',
        'referencias_contenidos',
        'observaciones_seguimiento',
        'fecha_traspaso',
      ]),
      body('contacto_id').isInt({ min: 1 }).withMessage('contacto_id es obligatorio.'),
      body('entregado_por_id').isInt({ min: 1 }).withMessage('entregado_por_id es obligatorio.'),
      body('recibido_por_id').isInt({ min: 1 }).withMessage('recibido_por_id es obligatorio.'),
      body('puntuacion_al_traspaso').optional().isInt({ min: 0, max: 100 }),
      body('observaciones_seguimiento')
        .trim()
        .notEmpty()
        .withMessage('observaciones_seguimiento es obligatorio.'),
      validateRequest,
    ],
    asyncHandler(controller.createHandoff)
  );
  router.post(
    '/traspasos-ventas/:id/decision',
    [
      idParamRule,
      allowOnlyFields(['decision_ventas', 'motivo_decision', 'fecha_respuesta']),
      body('decision_ventas')
        .isIn(['aceptado', 'rechazado'])
        .withMessage('decision_ventas debe ser aceptado o rechazado.'),
      validateRequest,
    ],
    asyncHandler(controller.respondToHandoff)
  );

  // Oportunidades comerciales
  router.get('/oportunidades', asyncHandler(controller.listOpportunities));
  router.get('/oportunidades/:id', [idParamRule, validateRequest], asyncHandler(controller.getOpportunity));
  router.post(
    '/oportunidades',
    [
      allowOnlyFields([
        'codigo_oportunidad',
        'contacto_id',
        'cliente_id',
        'campana_atribuida_id',
        'traspaso_id',
        'responsable_ventas_id',
        'titulo_propuesta',
        'servicio_principal_id',
        'valor_estimado_crc',
        'estado_oportunidad',
        'fecha_apertura',
        'fecha_proximo_seguimiento',
      ]),
      body('contacto_id').isInt({ min: 1 }).withMessage('contacto_id es obligatorio.'),
      body('responsable_ventas_id').isInt({ min: 1 }).withMessage('responsable_ventas_id es obligatorio.'),
      body('titulo_propuesta').trim().notEmpty().withMessage('titulo_propuesta es obligatorio.'),
      body('valor_estimado_crc').isFloat({ min: 0 }).withMessage('valor_estimado_crc debe ser >= 0.'),
      body('estado_oportunidad')
        .optional()
        .isIn(['abierta', 'en_negociacion', 'propuesta_enviada'])
        .withMessage('estado_oportunidad inicial inválido.'),
      validateRequest,
    ],
    asyncHandler(controller.createOpportunity)
  );
  router.patch(
    '/oportunidades/:id',
    [
      idParamRule,
      allowOnlyFields([
        'titulo_propuesta',
        'servicio_principal_id',
        'valor_estimado_crc',
        'estado_oportunidad',
        'resultado_cierre',
        'fecha_proximo_seguimiento',
        'responsable_ventas_id',
      ]),
      body('valor_estimado_crc').optional().isFloat({ min: 0 }),
      validateRequest,
    ],
    asyncHandler(controller.updateOpportunity)
  );
  router.post(
    '/oportunidades/:id/cerrar',
    [
      idParamRule,
      allowOnlyFields(['resultado_cierre', 'monto_cierre_crc', 'motivo_cierre', 'fecha_cierre', 'cliente_id']),
      body('resultado_cierre')
        .isIn(['ganada', 'perdida'])
        .withMessage('resultado_cierre debe ser ganada o perdida.'),
      body('motivo_cierre').trim().notEmpty().withMessage('motivo_cierre es obligatorio.'),
      body('monto_cierre_crc').optional({ nullable: true }).isFloat({ min: 0 }),
      validateRequest,
    ],
    asyncHandler(controller.closeOpportunity)
  );

  return router;
}

module.exports = {
  createCrmSalesRoutes,
};

