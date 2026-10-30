const defaultDb = require('../config/database');

function createClientsServicesRepository(db = defaultDb) {
  return {
    // -------------------- CLIENTES --------------------
    async listClients(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.estado_cliente) {
        clauses.push('c.estado_cliente = ?');
        params.push(filters.estado_cliente);
      }
      if (filters.provincia) {
        clauses.push('c.provincia = ?');
        params.push(filters.provincia);
      }
      if (filters.tipo_organizacion_id) {
        clauses.push('c.tipo_organizacion_id = ?');
        params.push(Number(filters.tipo_organizacion_id));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT
           c.id,
           c.codigo_cliente,
           c.nombre_comercial,
           c.razon_social,
           c.cedula_juridica,
           c.tipo_organizacion_id,
           t.nombre AS tipo_organizacion_nombre,
           c.provincia,
           c.canton,
           c.correo_corporativo,
           c.telefono_principal,
           c.estado_cliente,
           c.fecha_alta,
           c.origen_contacto_id,
           c.creado_en,
           c.actualizado_en
         FROM clientes c
         INNER JOIN tipos_organizacion t ON t.id = c.tipo_organizacion_id
         ${whereSql}
         ORDER BY c.id DESC`,
        params
      );
    },

    async getClientById(id, executor = db) {
      const rows = await executor.query(
        `SELECT
           c.id,
           c.codigo_cliente,
           c.nombre_comercial,
           c.razon_social,
           c.cedula_juridica,
           c.tipo_organizacion_id,
           t.nombre AS tipo_organizacion_nombre,
           c.provincia,
           c.canton,
           c.correo_corporativo,
           c.telefono_principal,
           c.estado_cliente,
           c.fecha_alta,
           c.origen_contacto_id,
           c.creado_en,
           c.actualizado_en
         FROM clientes c
         INNER JOIN tipos_organizacion t ON t.id = c.tipo_organizacion_id
         WHERE c.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async createClient(data) {
      const result = await db.query(
        `INSERT INTO clientes (
           codigo_cliente, nombre_comercial, razon_social, cedula_juridica,
           tipo_organizacion_id, provincia, canton, correo_corporativo,
           telefono_principal, estado_cliente, fecha_alta, origen_contacto_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_cliente,
          data.nombre_comercial,
          data.razon_social,
          data.cedula_juridica,
          data.tipo_organizacion_id,
          data.provincia,
          data.canton,
          data.correo_corporativo,
          data.telefono_principal,
          data.estado_cliente || 'activo',
          data.fecha_alta,
          data.origen_contacto_id || null,
        ]
      );
      return this.getClientById(result.insertId);
    },

    async updateClient(id, data) {
      const updatable = [
        'nombre_comercial',
        'razon_social',
        'tipo_organizacion_id',
        'provincia',
        'canton',
        'correo_corporativo',
        'telefono_principal',
        'estado_cliente',
      ];
      const fields = [];
      const params = [];
      for (const key of updatable) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          params.push(data[key]);
        }
      }
      if (fields.length > 0) {
        params.push(id);
        await db.query(`UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getClientById(id);
    },

    // -------------------- CONTACTOS DE CLIENTE --------------------
    async listClientContacts(clienteId) {
      return db.query(
        `SELECT id, cliente_id, nombre_completo, cargo, correo, telefono, es_contacto_principal, activo, creado_en
         FROM contactos_cliente
         WHERE cliente_id = ?
         ORDER BY es_contacto_principal DESC, nombre_completo ASC`,
        [clienteId]
      );
    },

    async createClientContact(data) {
      const result = await db.query(
        `INSERT INTO contactos_cliente (
           cliente_id, nombre_completo, cargo, correo, telefono, es_contacto_principal, activo
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.cliente_id,
          data.nombre_completo,
          data.cargo,
          data.correo,
          data.telefono,
          data.es_contacto_principal ? 1 : 0,
          data.activo !== undefined ? Number(Boolean(data.activo)) : 1,
        ]
      );
      const rows = await db.query(
        `SELECT id, cliente_id, nombre_completo, cargo, correo, telefono, es_contacto_principal, activo, creado_en
         FROM contactos_cliente WHERE id = ?`,
        [result.insertId]
      );
      return rows[0] || null;
    },

    // -------------------- CATÁLOGO DE SERVICIOS --------------------
    async listServices(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.categoria) {
        clauses.push('categoria = ?');
        params.push(filters.categoria);
      }
      if (filters.activo !== undefined) {
        clauses.push('activo = ?');
        params.push(Number(filters.activo));
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT id, codigo_servicio, nombre, categoria, descripcion, modalidad_cobro, precio_lista_crc, activo, creado_en
         FROM catalogo_servicios
         ${whereSql}
         ORDER BY id ASC`,
        params
      );
    },

    async getServiceById(id, executor = db) {
      const rows = await executor.query(
        `SELECT id, codigo_servicio, nombre, categoria, descripcion, modalidad_cobro, precio_lista_crc, activo, creado_en
         FROM catalogo_servicios
         WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async createService(data) {
      const result = await db.query(
        `INSERT INTO catalogo_servicios (
           codigo_servicio, nombre, categoria, descripcion, modalidad_cobro, precio_lista_crc, activo
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_servicio,
          data.nombre,
          data.categoria,
          data.descripcion,
          data.modalidad_cobro || 'mensual',
          data.precio_lista_crc,
          data.activo !== undefined ? Number(Boolean(data.activo)) : 1,
        ]
      );
      return this.getServiceById(result.insertId);
    },

    async updateService(id, data) {
      const updatable = ['nombre', 'categoria', 'descripcion', 'modalidad_cobro', 'precio_lista_crc', 'activo'];
      const fields = [];
      const params = [];
      for (const key of updatable) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          params.push(key === 'activo' ? Number(Boolean(data[key])) : data[key]);
        }
      }
      if (fields.length > 0) {
        params.push(id);
        await db.query(`UPDATE catalogo_servicios SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getServiceById(id);
    },

    // -------------------- SERVICIOS CONTRATADOS --------------------
    async listContracts(filters = {}) {
      const clauses = [];
      const params = [];
      if (filters.cliente_id) {
        clauses.push('cs.cliente_id = ?');
        params.push(Number(filters.cliente_id));
      }
      if (filters.servicio_id) {
        clauses.push('cs.servicio_id = ?');
        params.push(Number(filters.servicio_id));
      }
      if (filters.estado_contrato) {
        clauses.push('cs.estado_contrato = ?');
        params.push(filters.estado_contrato);
      }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      return db.query(
        `SELECT
           cs.id,
           cs.codigo_contrato,
           cs.cliente_id,
           cl.nombre_comercial AS cliente_nombre,
           cs.servicio_id,
           sv.nombre AS servicio_nombre,
           sv.modalidad_cobro,
           cs.oportunidad_id,
           cs.fecha_contratacion,
           cs.fecha_inicio_servicio,
           cs.fecha_fin_servicio,
           cs.precio_acordado_crc,
           cs.estado_contrato,
           cs.observaciones,
           cs.creado_en
         FROM contratos_servicios_cliente cs
         INNER JOIN clientes cl ON cl.id = cs.cliente_id
         INNER JOIN catalogo_servicios sv ON sv.id = cs.servicio_id
         ${whereSql}
         ORDER BY cs.fecha_contratacion DESC, cs.id DESC`,
        params
      );
    },

    async getContractById(id, executor = db) {
      const rows = await executor.query(
        `SELECT
           cs.id,
           cs.codigo_contrato,
           cs.cliente_id,
           cl.nombre_comercial AS cliente_nombre,
           cs.servicio_id,
           sv.nombre AS servicio_nombre,
           sv.modalidad_cobro,
           cs.oportunidad_id,
           cs.fecha_contratacion,
           cs.fecha_inicio_servicio,
           cs.fecha_fin_servicio,
           cs.precio_acordado_crc,
           cs.estado_contrato,
           cs.observaciones,
           cs.creado_en
         FROM contratos_servicios_cliente cs
         INNER JOIN clientes cl ON cl.id = cs.cliente_id
         INNER JOIN catalogo_servicios sv ON sv.id = cs.servicio_id
         WHERE cs.id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async createContract(data) {
      const result = await db.query(
        `INSERT INTO contratos_servicios_cliente (
           codigo_contrato, cliente_id, servicio_id, oportunidad_id,
           fecha_contratacion, fecha_inicio_servicio, fecha_fin_servicio,
           precio_acordado_crc, estado_contrato, observaciones
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.codigo_contrato,
          data.cliente_id,
          data.servicio_id,
          data.oportunidad_id || null,
          data.fecha_contratacion,
          data.fecha_inicio_servicio,
          data.fecha_fin_servicio || null,
          data.precio_acordado_crc,
          data.estado_contrato || 'activo',
          data.observaciones || null,
        ]
      );
      return this.getContractById(result.insertId);
    },

    async updateContract(id, data) {
      const updatable = ['fecha_fin_servicio', 'precio_acordado_crc', 'estado_contrato', 'observaciones'];
      const fields = [];
      const params = [];
      for (const key of updatable) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          params.push(data[key]);
        }
      }
      if (fields.length > 0) {
        params.push(id);
        await db.query(`UPDATE contratos_servicios_cliente SET ${fields.join(', ')} WHERE id = ?`, params);
      }
      return this.getContractById(id);
    },
  };
}

module.exports = {
  createClientsServicesRepository,
};

