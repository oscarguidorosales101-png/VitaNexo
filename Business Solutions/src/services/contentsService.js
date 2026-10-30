const { AppError } = require('../utils/AppError');
const { generateBusinessCode } = require('../utils/sanitize');

function formatNowMysql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function createContentsService({ catalogsRepo, campaignsRepo, contentsRepo }) {
  return {
    async listContents(filters = {}) {
      return contentsRepo.listContents(filters);
    },

    async getContentDetail(id) {
      const content = await contentsRepo.getContentById(id);
      if (!content) {
        throw new AppError(`Contenido con id ${id} no encontrado.`, 404, 'CONTENT_NOT_FOUND');
      }
      const historialRevisiones = await contentsRepo.listReviewsByContent(id);
      return {
        ...content,
        historial_revisiones: historialRevisiones,
      };
    },

    async createContentDraft(payload, options = { agentCode: null }) {
      const campaign = await campaignsRepo.getCampaignById(payload.campana_id);
      if (!campaign) {
        throw new AppError(
          `La campaña ${payload.campana_id} no existe.`,
          400,
          'FOREIGN_KEY_VIOLATION'
        );
      }

      const channel = await catalogsRepo.getChannelById(payload.canal_id);
      if (!channel) {
        throw new AppError(`El canal ${payload.canal_id} no existe.`, 400, 'FOREIGN_KEY_VIOLATION');
      }

      if (payload.autor_colaborador_id) {
        const autor = await catalogsRepo.getCollaboratorById(payload.autor_colaborador_id);
        if (!autor) {
          throw new AppError(
            `El colaborador autor ${payload.autor_colaborador_id} no existe.`,
            400,
            'FOREIGN_KEY_VIOLATION'
          );
        }
      }

      return contentsRepo.createContent({
        codigo_contenido: payload.codigo_contenido || generateBusinessCode('CNT'),
        campana_id: Number(payload.campana_id),
        canal_id: Number(payload.canal_id),
        autor_colaborador_id: payload.autor_colaborador_id || null,
        creado_por_agente: options.agentCode || null,
        titulo: payload.titulo,
        etapa_recorrido: payload.etapa_recorrido || campaign.etapa_recorrido,
        tipo_contenido: payload.tipo_contenido,
        cuerpo_borrador: payload.cuerpo_borrador,
        fecha_programada_publicacion: payload.fecha_programada_publicacion || null,
      });
    },

    /**
     * Si el contenido ya estaba aprobado, rechazado o publicado y se modifica su
     * título o cuerpo, se incrementa version_actual y vuelve automáticamente a
     * revisión ('en_revision'), conservando intacto el historial de revisiones previas.
     */
    async updateContent(id, payload) {
      const existing = await contentsRepo.getContentById(id);
      if (!existing) {
        throw new AppError(`Contenido con id ${id} no encontrado.`, 404, 'CONTENT_NOT_FOUND');
      }

      const textChanged =
        (payload.titulo !== undefined && payload.titulo !== existing.titulo) ||
        (payload.cuerpo_borrador !== undefined && payload.cuerpo_borrador !== existing.cuerpo_borrador);

      const updateFields = {};
      if (payload.titulo !== undefined) updateFields.titulo = payload.titulo;
      if (payload.cuerpo_borrador !== undefined) updateFields.cuerpo_borrador = payload.cuerpo_borrador;
      if (payload.etapa_recorrido !== undefined) updateFields.etapa_recorrido = payload.etapa_recorrido;
      if (payload.tipo_contenido !== undefined) updateFields.tipo_contenido = payload.tipo_contenido;
      if (payload.fecha_programada_publicacion !== undefined) {
        updateFields.fecha_programada_publicacion = payload.fecha_programada_publicacion;
      }

      if (textChanged && ['aprobado', 'rechazado', 'publicado'].includes(existing.estado)) {
        updateFields.version_actual = Number(existing.version_actual) + 1;
        updateFields.estado = 'en_revision';
        updateFields.fecha_publicacion = null;
      }

      return contentsRepo.updateContentFields(id, updateFields);
    },

    async listReviews(filters = {}) {
      return contentsRepo.listAllReviews(filters);
    },

    /**
     * Registra una revisión/decisión en revisiones_contenido sin sobrescribir
     * decisiones anteriores y actualiza el estado del contenido dentro de una transacción.
     */
    async reviewContent(contenidoId, payload, options = { isAgent: false }) {
      const { decision, revisor_id, comentarios, actor_tipo } = payload;

      // Regla de seguridad obligatoria: los agentes no pueden aprobar borradores
      if ((options.isAgent || actor_tipo === 'agente') && decision === 'aprobar') {
        throw new AppError(
          'Regla de seguridad: los agentes automatizados no pueden aprobar borradores de contenido. Se requiere aprobación de un revisor humano autorizado.',
          403,
          'AGENT_SELF_APPROVAL_FORBIDDEN'
        );
      }

      const content = await contentsRepo.getContentById(contenidoId);
      if (!content) {
        throw new AppError(`Contenido con id ${contenidoId} no encontrado.`, 404, 'CONTENT_NOT_FOUND');
      }

      const reviewer = await catalogsRepo.getCollaboratorById(revisor_id);
      if (!reviewer || !reviewer.activo) {
        throw new AppError(
          `El revisor ${revisor_id} no existe o no está activo en el catálogo de colaboradores.`,
          400,
          'INVALID_REVIEWER'
        );
      }

      // Impedir auto-aprobación del mismo autor humano cuando es creador del borrador
      if (
        decision === 'aprobar' &&
        content.autor_colaborador_id &&
        Number(content.autor_colaborador_id) === Number(revisor_id)
      ) {
        throw new AppError(
          'El autor de un borrador no puede aprobar su propia pieza de contenido; debe intervenir un revisor distinto.',
          403,
          'AUTHOR_SELF_APPROVAL_FORBIDDEN'
        );
      }

      let resultingState;
      if (decision === 'enviar_a_revision') {
        if (!['borrador', 'rechazado'].includes(content.estado)) {
          throw new AppError(
            `No se puede enviar a revisión un contenido que ya está en estado '${content.estado}'.`,
            409,
            'INVALID_CONTENT_STATE_TRANSITION'
          );
        }
        resultingState = 'en_revision';
      } else if (decision === 'aprobar') {
        if (content.estado !== 'en_revision') {
          throw new AppError(
            `Solo se puede aprobar contenido que esté 'en_revision' (estado actual: '${content.estado}').`,
            409,
            'INVALID_CONTENT_STATE_TRANSITION'
          );
        }
        resultingState = 'aprobado';
      } else if (decision === 'rechazar' || decision === 'solicitar_cambios') {
        if (!['en_revision', 'aprobado'].includes(content.estado)) {
          throw new AppError(
            `Solo se puede rechazar o solicitar cambios sobre contenido 'en_revision' o 'aprobado' (estado actual: '${content.estado}').`,
            409,
            'INVALID_CONTENT_STATE_TRANSITION'
          );
        }
        resultingState = 'rechazado';
      } else {
        throw new AppError(`Decisión de revisión inválida: '${decision}'.`, 400, 'INVALID_REVIEW_DECISION');
      }

      const now = formatNowMysql();

      return contentsRepo.withTransaction(async (tx) => {
        const reviewRecord = await contentsRepo.insertReview(
          {
            contenido_id: Number(contenidoId),
            version_revisada: Number(content.version_actual),
            revisor_id: Number(revisor_id),
            fecha_revision: now,
            decision,
            estado_anterior: content.estado,
            estado_resultante: resultingState,
            comentarios,
          },
          tx
        );

        const updatedContent = await contentsRepo.updateContentFields(
          contenidoId,
          {
            estado: resultingState,
            fecha_ultima_revision: now,
          },
          tx
        );

        return {
          contenido: updatedContent,
          revision_registrada: reviewRecord,
        };
      });
    },

    /**
     * Marca una pieza como publicada internamente en el calendario editorial
     * ÚNICAMENTE si ya cuenta con estado 'aprobado'. Prohibido para agentes.
     */
    async publishContent(contenidoId, options = { isAgent: false }) {
      if (options.isAgent) {
        throw new AppError(
          'Los agentes automatizados no están autorizados a publicar contenido.',
          403,
          'AGENT_PUBLISH_FORBIDDEN'
        );
      }

      const content = await contentsRepo.getContentById(contenidoId);
      if (!content) {
        throw new AppError(`Contenido con id ${contenidoId} no encontrado.`, 404, 'CONTENT_NOT_FOUND');
      }

      if (content.estado !== 'aprobado') {
        throw new AppError(
          `Prohibido publicar contenido no aprobado. Estado actual: '${content.estado}'.`,
          409,
          'CONTENT_NOT_APPROVED_FOR_PUBLICATION'
        );
      }

      const now = formatNowMysql();
      return contentsRepo.updateContentFields(contenidoId, {
        estado: 'publicado',
        fecha_publicacion: now,
      });
    },
  };
}

module.exports = {
  createContentsService,
};

