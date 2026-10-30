function createAiCenterController({ aiCenterService, aiProvidersService, n8nBridge }) {
  return {
    async listConversations(req, res) {
      const data = await aiCenterService.listConversations(req.user, req.query);
      res.status(200).json({ ok: true, data });
    },

    async createConversation(req, res) {
      const data = await aiCenterService.createConversation(req.user, req.body || {});
      res.status(201).json({ ok: true, data });
    },

    async getConversation(req, res) {
      const data = await aiCenterService.getConversationDetail(req.user, Number(req.params.id));
      res.status(200).json({ ok: true, data });
    },

    async listRequests(req, res) {
      const data = await aiCenterService.listRequests(req.user, req.query);
      res.status(200).json({ ok: true, data });
    },

    async getRequest(req, res) {
      const data = await aiCenterService.getRequestStatus(req.user, Number(req.params.id));
      res.status(200).json({ ok: true, data });
    },

    async submitRequest(req, res) {
      const idempotencyKey =
        req.headers['x-idempotency-key'] ||
        req.body?.idempotency_key ||
        null;

      const { solicitud, idempotente_reutilizado } = await aiCenterService.submitRequest(req.user, {
        mensaje_usuario: req.body?.mensaje_usuario,
        codigo_agente: req.body?.codigo_agente,
        conversacion_id: req.body?.conversacion_id ? Number(req.body.conversacion_id) : null,
        tipo_tarea: req.body?.tipo_tarea || null,
        parametros: req.body?.parametros || {},
        idempotency_key: idempotencyKey,
      });

      // 202 Accepted para solicitudes nuevas en segundo plano; 200 si fue resultado existente reutilizado
      const statusCode = idempotente_reutilizado && solicitud.estado === 'completada' ? 200 : 202;
      res.status(statusCode).json({
        ok: true,
        data: solicitud,
        idempotente_reutilizado: Boolean(idempotente_reutilizado),
        mensaje:
          solicitud.estado === 'completada'
            ? 'Solicitud completada.'
            : 'Solicitud aceptada y en proceso en segundo plano. Consulte su avance vía GET /api/ia/solicitudes/' + solicitud.id,
      });
    },

    async cancelRequest(req, res) {
      const data = await aiCenterService.cancelRequest(req.user, Number(req.params.id));
      res.status(200).json({
        ok: true,
        data,
        mensaje: 'Solicitud de IA cancelada.',
      });
    },

    async retryRequest(req, res) {
      const { solicitud } = await aiCenterService.retryRequest(req.user, Number(req.params.id));
      res.status(202).json({
        ok: true,
        data: solicitud,
        mensaje: 'Solicitud reenviada al procesador asíncrono.',
      });
    },

    async listProviders(req, res) {
      const data = await aiProvidersService.listProviders();
      res.status(200).json({ ok: true, data });
    },

    async updateProvider(req, res) {
      const data = await aiProvidersService.updateProvider(req.params.codigo, req.body || {});
      res.status(200).json({ ok: true, data, mensaje: `Proveedor '${req.params.codigo}' actualizado.` });
    },

    async verifyProvider(req, res) {
      const data = await aiProvidersService.verifyProvider(req.params.codigo, { n8nBridge });
      res.status(200).json({ ok: true, data });
    },

    async assignProviderToAgent(req, res) {
      const data = await aiProvidersService.assignProviderToAgent(req.params.codigo, req.body || {});
      res.status(200).json({ ok: true, data, mensaje: `Proveedor asignado al agente '${req.params.codigo}'.` });
    },
  };
}

module.exports = {
  createAiCenterController,
};

