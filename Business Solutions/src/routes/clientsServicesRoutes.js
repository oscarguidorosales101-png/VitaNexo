const express = require('express');
const { body, param } = require('express-validator');
const {
  validateRequest,
  allowOnlyFields,
  asyncHandler,
} = require('../middlewares/validateRequest');

const idParamRule = param('id').isInt({ min: 1 }).withMessage('El parámetro id debe ser un entero positivo.');

function createClientsServicesRoutes(controller) {
  const router = express.Router();

  // Catálogos auxiliares
  router.get('/catalogos/tipos-organizacion', asyncHandler(controller.listOrganizationTypes));
  router.get('/catalogos/colaboradores', asyncHandler(controller.listCollaborators));

  // Canales de mercadeo
  router.get('/canales', asyncHandler(controller.listChannels));
  router.get('/canales/:id', [idParamRule, validateRequest], asyncHandler(controller.getChannel));
  router.post(
    '/canales',
    [
      allowOnlyFields(['codigo_canal', 'nombre', 'clasificacion', 'plataforma', 'descripcion', 'activo']),
      body('nombre').trim().notEmpty().withMessage('El nombre del canal es obligatorio.'),
      body('clasificacion')
        .isIn(['organico', 'pagado'])
        .withMessage('La clasificacion debe ser organico o pagado.'),
      body('plataforma').trim().notEmpty().withMessage('La plataforma es obligatoria.'),
      validateRequest,
    ],
    asyncHandler(controller.createChannel)
  );
  router.patch(
    '/canales/:id',
    [
      idParamRule,
      allowOnlyFields(['nombre', 'clasificacion', 'plataforma', 'descripcion', 'activo']),
      body('clasificacion')
        .optional()
        .isIn(['organico', 'pagado'])
        .withMessage('La clasificacion debe ser organico o pagado.'),
      validateRequest,
    ],
    asyncHandler(controller.updateChannel)
  );

  // Clientes
  router.get('/clientes', asyncHandler(controller.listClients));
  router.get('/clientes/:id', [idParamRule, validateRequest], asyncHandler(controller.getClient));
  router.post(
    '/clientes',
    [
      allowOnlyFields([
        'codigo_cliente',
        'nombre_comercial',
        'razon_social',
        'cedula_juridica',
        'tipo_organizacion_id',
        'provincia',
        'canton',
        'correo_corporativo',
        'telefono_principal',
        'estado_cliente',
        'fecha_alta',
        'origen_contacto_id',
      ]),
      body('nombre_comercial').trim().notEmpty().withMessage('nombre_comercial es obligatorio.'),
      body('razon_social').trim().notEmpty().withMessage('razon_social es obligatoria.'),
      body('cedula_juridica').trim().notEmpty().withMessage('cedula_juridica es obligatoria.'),
      body('tipo_organizacion_id')
        .isInt({ min: 1 })
        .withMessage('tipo_organizacion_id debe ser un entero positivo.'),
      body('provincia').trim().notEmpty().withMessage('provincia es obligatoria.'),
      body('canton').trim().notEmpty().withMessage('canton es obligatorio.'),
      body('correo_corporativo').isEmail().withMessage('correo_corporativo debe ser un correo válido.'),
      body('telefono_principal').trim().notEmpty().withMessage('telefono_principal es obligatorio.'),
      body('estado_cliente')
        .optional()
        .isIn(['activo', 'suspendido', 'inactivo'])
        .withMessage('estado_cliente inválido.'),
      body('fecha_alta').optional().isISO8601().withMessage('fecha_alta debe tener formato YYYY-MM-DD.'),
      validateRequest,
    ],
    asyncHandler(controller.createClient)
  );
  router.patch(
    '/clientes/:id',
    [
      idParamRule,
      allowOnlyFields([
        'nombre_comercial',
        'razon_social',
        'tipo_organizacion_id',
        'provincia',
        'canton',
        'correo_corporativo',
        'telefono_principal',
        'estado_cliente',
      ]),
      body('correo_corporativo').optional().isEmail().withMessage('correo_corporativo inválido.'),
      body('estado_cliente')
        .optional()
        .isIn(['activo', 'suspendido', 'inactivo'])
        .withMessage('estado_cliente inválido.'),
      validateRequest,
    ],
    asyncHandler(controller.updateClient)
  );
  router.post(
    '/clientes/:id/contactos',
    [
      idParamRule,
      allowOnlyFields(['nombre_completo', 'cargo', 'correo', 'telefono', 'es_contacto_principal', 'activo']),
      body('nombre_completo').trim().notEmpty().withMessage('nombre_completo es obligatorio.'),
      body('cargo').trim().notEmpty().withMessage('cargo es obligatorio.'),
      body('correo').isEmail().withMessage('correo debe ser válido.'),
      body('telefono').trim().notEmpty().withMessage('telefono es obligatorio.'),
      validateRequest,
    ],
    asyncHandler(controller.addClientContact)
  );

  // Catálogo de servicios
  router.get('/servicios', asyncHandler(controller.listServices));
  router.get('/servicios/:id', [idParamRule, validateRequest], asyncHandler(controller.getService));
  router.post(
    '/servicios',
    [
      allowOnlyFields([
        'codigo_servicio',
        'nombre',
        'categoria',
        'descripcion',
        'modalidad_cobro',
        'precio_lista_crc',
        'activo',
      ]),
      body('nombre').trim().notEmpty().withMessage('nombre del servicio es obligatorio.'),
      body('categoria')
        .isIn([
          'automatizacion',
          'gestion_administrativa',
          'facturacion',
          'crm_comercial',
          'analitica',
          'soporte',
        ])
        .withMessage('categoria inválida.'),
      body('descripcion').trim().notEmpty().withMessage('descripcion es obligatoria.'),
      body('modalidad_cobro')
        .optional()
        .isIn(['mensual', 'anual', 'unico'])
        .withMessage('modalidad_cobro inválida.'),
      body('precio_lista_crc')
        .isFloat({ min: 0 })
        .withMessage('precio_lista_crc debe ser un monto numérico >= 0.'),
      validateRequest,
    ],
    asyncHandler(controller.createService)
  );
  router.patch(
    '/servicios/:id',
    [
      idParamRule,
      allowOnlyFields(['nombre', 'categoria', 'descripcion', 'modalidad_cobro', 'precio_lista_crc', 'activo']),
      body('precio_lista_crc').optional().isFloat({ min: 0 }).withMessage('precio_lista_crc debe ser >= 0.'),
      validateRequest,
    ],
    asyncHandler(controller.updateService)
  );

  // Contratos de servicios por cliente
  router.get('/contratos-servicios', asyncHandler(controller.listContracts));
  router.get('/contratos-servicios/:id', [idParamRule, validateRequest], asyncHandler(controller.getContract));
  router.post(
    '/contratos-servicios',
    [
      allowOnlyFields([
        'codigo_contrato',
        'cliente_id',
        'servicio_id',
        'oportunidad_id',
        'fecha_contratacion',
        'fecha_inicio_servicio',
        'fecha_fin_servicio',
        'precio_acordado_crc',
        'estado_contrato',
        'observaciones',
      ]),
      body('cliente_id').isInt({ min: 1 }).withMessage('cliente_id es obligatorio.'),
      body('servicio_id').isInt({ min: 1 }).withMessage('servicio_id es obligatorio.'),
      body('fecha_contratacion').isISO8601().withMessage('fecha_contratacion es obligatoria (YYYY-MM-DD).'),
      body('fecha_inicio_servicio').isISO8601().withMessage('fecha_inicio_servicio es obligatoria (YYYY-MM-DD).'),
      body('precio_acordado_crc').isFloat({ min: 0 }).withMessage('precio_acordado_crc debe ser >= 0.'),
      body('estado_contrato')
        .optional()
        .isIn(['pendiente_activacion', 'activo', 'pausado', 'finalizado', 'cancelado'])
        .withMessage('estado_contrato inválido.'),
      validateRequest,
    ],
    asyncHandler(controller.createContract)
  );
  router.patch(
    '/contratos-servicios/:id',
    [
      idParamRule,
      allowOnlyFields(['fecha_fin_servicio', 'precio_acordado_crc', 'estado_contrato', 'observaciones']),
      body('precio_acordado_crc').optional().isFloat({ min: 0 }).withMessage('precio_acordado_crc debe ser >= 0.'),
      body('estado_contrato')
        .optional()
        .isIn(['pendiente_activacion', 'activo', 'pausado', 'finalizado', 'cancelado'])
        .withMessage('estado_contrato inválido.'),
      validateRequest,
    ],
    asyncHandler(controller.updateContract)
  );

  return router;
}

module.exports = {
  createClientsServicesRoutes,
};

