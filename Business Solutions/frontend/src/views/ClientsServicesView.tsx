import React, { useEffect, useState } from 'react';
import { Building2, Edit3, Eye, FileSignature, Package, Plus, UserPlus } from 'lucide-react';
import { vitanexoApi } from '../api/client';
import type {
  ClientDetail,
  ClientItem,
  OrganizationType,
  ServiceContract,
  ServiceItem,
} from '../types/vitanexo';
import { formatCRC, formatDateShort } from '../utils/formatters';
import {
  ErrorAlert,
  LoadingSpinner,
  ModalDialog,
  SectionHeader,
  StatusBadge,
  SuccessBanner,
} from '../components/UiPrimitives';

const PROVINCIAS_CR = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
];

export function ClientsServicesView() {
  const [tab, setTab] = useState<'clientes' | 'servicios' | 'contratos'>('clientes');
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detalle comercial del cliente
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [contactForm, setContactForm] = useState({
    nombre_completo: '',
    cargo: '',
    correo: '',
    telefono: '',
    es_contacto_principal: false,
  });

  // Modal crear/editar cliente
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [clientForm, setClientForm] = useState({
    nombre_comercial: '',
    razon_social: '',
    cedula_juridica: '',
    tipo_organizacion_id: 1,
    provincia: 'San José',
    canton: 'Central',
    correo_corporativo: '',
    telefono_principal: '',
    estado_cliente: 'activo',
  });

  // Modal nuevo contrato
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    cliente_id: 0,
    servicio_id: 0,
    fecha_contratacion: new Date().toISOString().slice(0, 10),
    fecha_inicio_servicio: new Date().toISOString().slice(0, 10),
    precio_acordado_crc: 85000,
    estado_contrato: 'activo',
    observaciones: '',
  });

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [cl, sv, ct, ot] = await Promise.all([
        vitanexoApi.listClients(),
        vitanexoApi.listServices(),
        vitanexoApi.listContracts(),
        vitanexoApi.listOrganizationTypes(),
      ]);
      setClients(cl);
      setServices(sv);
      setContracts(ct);
      setOrgTypes(ot);
      if (cl[0] && sv[0]) {
        setContractForm((prev) => ({
          ...prev,
          cliente_id: prev.cliente_id || cl[0].id,
          servicio_id: prev.servicio_id || sv[0].id,
        }));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function openClientDetail(id: number) {
    setError(null);
    try {
      const detail = await vitanexoApi.getClientDetail(id);
      setSelectedClient(detail);
    } catch (err) {
      setError(err);
    }
  }

  function openNewClientModal() {
    setEditingClient(null);
    setClientForm({
      nombre_comercial: '',
      razon_social: '',
      cedula_juridica: '',
      tipo_organizacion_id: orgTypes[0]?.id || 1,
      provincia: 'San José',
      canton: 'Escazú',
      correo_corporativo: '',
      telefono_principal: '+506 ',
      estado_cliente: 'activo',
    });
    setClientModalOpen(true);
  }

  function openEditClientModal(c: ClientItem) {
    setEditingClient(c);
    setClientForm({
      nombre_comercial: c.nombre_comercial,
      razon_social: c.razon_social,
      cedula_juridica: c.cedula_juridica,
      tipo_organizacion_id: c.tipo_organizacion_id,
      provincia: c.provincia,
      canton: c.canton,
      correo_corporativo: c.correo_corporativo,
      telefono_principal: c.telefono_principal,
      estado_cliente: c.estado_cliente,
    });
    setClientModalOpen(true);
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingClient) {
        const { cedula_juridica: _unused, ...patchFields } = clientForm;
        await vitanexoApi.updateClient(editingClient.id, {
          ...patchFields,
          tipo_organizacion_id: Number(clientForm.tipo_organizacion_id),
        });
        setSuccess(`Cliente '${clientForm.nombre_comercial}' actualizado en VitaBase.`);
      } else {
        await vitanexoApi.createClient({
          ...clientForm,
          tipo_organizacion_id: Number(clientForm.tipo_organizacion_id),
        });
        setSuccess(`Cliente '${clientForm.nombre_comercial}' registrado exitosamente en VitaBase.`);
      }
      setClientModalOpen(false);
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  async function handleAddClientContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    setError(null);
    try {
      await vitanexoApi.addClientContact(selectedClient.id, {
        ...contactForm,
        es_contacto_principal: contactForm.es_contacto_principal ? 1 : 0,
      });
      setContactForm({
        nombre_completo: '',
        cargo: '',
        correo: '',
        telefono: '',
        es_contacto_principal: false,
      });
      const refreshed = await vitanexoApi.getClientDetail(selectedClient.id);
      setSelectedClient(refreshed);
      setSuccess('Persona de contacto vinculada al expediente comercial del cliente.');
    } catch (err) {
      setError(err);
    }
  }

  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await vitanexoApi.createContract({
        cliente_id: Number(contractForm.cliente_id),
        servicio_id: Number(contractForm.servicio_id),
        fecha_contratacion: contractForm.fecha_contratacion,
        fecha_inicio_servicio: contractForm.fecha_inicio_servicio,
        precio_acordado_crc: Number(contractForm.precio_acordado_crc),
        estado_contrato: contractForm.estado_contrato,
        observaciones: contractForm.observaciones || undefined,
      });
      setContractModalOpen(false);
      setSuccess('Contrato de servicio tecnológico B2B registrado en VitaBase.');
      await loadAll();
    } catch (err) {
      setError(err);
    }
  }

  const filteredClients = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.nombre_comercial.toLowerCase().includes(q) ||
      c.codigo_cliente.toLowerCase().includes(q) ||
      c.provincia.toLowerCase().includes(q) ||
      c.cedula_juridica.toLowerCase().includes(q)
    );
  });

  if (loading && clients.length === 0) {
    return <LoadingSpinner label="Cargando clientes, servicios tecnológicos y contratos desde VitaBase..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Clientes y Servicios Contratados"
        subtitle="Directorio comercial de clínicas, consultorios médicos y centros de fisioterapia en Costa Rica (sin datos clínicos)."
        actions={
          <>
            <button
              type="button"
              onClick={() => setContractModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileSignature className="h-4 w-4 text-teal-600" />
              <span>Nuevo Contrato</span>
            </button>
            <button
              type="button"
              onClick={openNewClientModal}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Cliente</span>
            </button>
          </>
        }
      />

      {error ? <ErrorAlert error={error} onDismiss={() => setError(null)} /> : null}
      <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />

      {/* Pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('clientes')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              tab === 'clientes' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Clientes ({clients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('contratos')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              tab === 'contratos' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSignature className="h-4 w-4" />
            <span>Servicios Contratados ({contracts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('servicios')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
              tab === 'servicios' ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Catálogo B2B ({services.length})</span>
          </button>
        </div>

        {tab === 'clientes' && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por clínica, provincia o cédula jurídica..."
            className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        )}
      </div>

      {/* Tabla de Clientes */}
      {tab === 'clientes' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Código / Clínica</th>
                  <th className="px-4 py-3">Segmento</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Contacto Corporativo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.nombre_comercial}</div>
                      <div className="text-xs text-slate-500">
                        {c.codigo_cliente} · Céd. {c.cedula_juridica}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {c.tipo_organizacion_nombre || `Tipo #${c.tipo_organizacion_id}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {c.provincia}, {c.canton}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <div>{c.correo_corporativo}</div>
                      <div className="text-slate-500">{c.telefono_principal}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={c.estado_cliente} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openClientDetail(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5 text-teal-600" />
                          <span>Historial</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditClientModal(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de Contratos */}
      {tab === 'contratos' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Servicio Contratado</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3 text-right">Tarifa Acordada (CRC)</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((ct) => (
                  <tr key={ct.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                      {ct.codigo_contrato}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {ct.cliente_nombre || `Cliente #${ct.cliente_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ct.servicio_nombre || `Servicio #${ct.servicio_id}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {formatDateShort(ct.fecha_inicio_servicio)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCRC(ct.precio_acordado_crc)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={ct.estado_contrato} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catálogo de Servicios */}
      {tab === 'servicios' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((sv) => (
            <div
              key={sv.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-teal-700">
                    {sv.codigo_servicio}
                  </span>
                  <StatusBadge label={sv.categoria} />
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{sv.nombre}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{sv.descripcion}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500 capitalize">Cobro {sv.modalidad_cobro}</span>
                <span className="text-base font-bold text-slate-900">
                  {formatCRC(sv.precio_lista_crc ?? sv.tarifa_base_crc)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Cliente */}
      <ModalDialog
        open={clientModalOpen}
        title={editingClient ? `Editar Cliente — ${editingClient.codigo_cliente}` : 'Registrar Nuevo Cliente B2B'}
        onClose={() => setClientModalOpen(false)}
      >
        <form onSubmit={handleSaveClient} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Nombre Comercial</label>
            <input
              type="text"
              required
              value={clientForm.nombre_comercial}
              onChange={(e) => setClientForm({ ...clientForm, nombre_comercial: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Razón Social</label>
            <input
              type="text"
              required
              value={clientForm.razon_social}
              onChange={(e) => setClientForm({ ...clientForm, razon_social: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Cédula Jurídica</label>
            <input
              type="text"
              required
              disabled={Boolean(editingClient)}
              placeholder="3-101-XXXXXX"
              value={clientForm.cedula_juridica}
              onChange={(e) => setClientForm({ ...clientForm, cedula_juridica: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Tipo de Organización</label>
            <select
              value={clientForm.tipo_organizacion_id}
              onChange={(e) =>
                setClientForm({ ...clientForm, tipo_organizacion_id: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {orgTypes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Provincia</label>
            <select
              value={clientForm.provincia}
              onChange={(e) => setClientForm({ ...clientForm, provincia: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {PROVINCIAS_CR.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Cantón</label>
            <input
              type="text"
              required
              value={clientForm.canton}
              onChange={(e) => setClientForm({ ...clientForm, canton: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Correo Corporativo</label>
            <input
              type="email"
              required
              value={clientForm.correo_corporativo}
              onChange={(e) => setClientForm({ ...clientForm, correo_corporativo: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Teléfono Principal</label>
            <input
              type="text"
              required
              value={clientForm.telefono_principal}
              onChange={(e) => setClientForm({ ...clientForm, telefono_principal: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Estado Comercial</label>
            <select
              value={clientForm.estado_cliente}
              onChange={(e) => setClientForm({ ...clientForm, estado_cliente: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => setClientModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Guardar en VitaBase
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Nuevo Contrato */}
      <ModalDialog
        open={contractModalOpen}
        title="Formalizar Contrato de Servicio Tecnológico"
        onClose={() => setContractModalOpen(false)}
      >
        <form onSubmit={handleCreateContract} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Cliente</label>
            <select
              value={contractForm.cliente_id}
              onChange={(e) => setContractForm({ ...contractForm, cliente_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_comercial} ({c.codigo_cliente})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Servicio Tecnológico</label>
            <select
              value={contractForm.servicio_id}
              onChange={(e) => setContractForm({ ...contractForm, servicio_id: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {formatCRC(s.precio_lista_crc ?? s.tarifa_base_crc)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Fecha Contratación</label>
              <input
                type="date"
                required
                value={contractForm.fecha_contratacion}
                onChange={(e) => setContractForm({ ...contractForm, fecha_contratacion: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Inicio Servicio</label>
              <input
                type="date"
                required
                value={contractForm.fecha_inicio_servicio}
                onChange={(e) =>
                  setContractForm({ ...contractForm, fecha_inicio_servicio: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Precio Acordado (CRC)</label>
            <input
              type="number"
              min={0}
              required
              value={contractForm.precio_acordado_crc}
              onChange={(e) =>
                setContractForm({ ...contractForm, precio_acordado_crc: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Observaciones Administrativas</label>
            <textarea
              rows={2}
              value={contractForm.observaciones}
              onChange={(e) => setContractForm({ ...contractForm, observaciones: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setContractModalOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Registrar Contrato
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Modal Expediente Comercial Completo del Cliente */}
      <ModalDialog
        open={Boolean(selectedClient)}
        title={
          selectedClient
            ? `Expediente Comercial — ${selectedClient.nombre_comercial} (${selectedClient.codigo_cliente})`
            : ''
        }
        onClose={() => setSelectedClient(null)}
        maxWidth="max-w-3xl"
      >
        {selectedClient && (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Razón Social</span>
                <div className="font-semibold text-slate-900">{selectedClient.razon_social}</div>
              </div>
              <div>
                <span className="text-slate-500">Cédula Jurídica</span>
                <div className="font-semibold text-slate-900">{selectedClient.cedula_juridica}</div>
              </div>
              <div>
                <span className="text-slate-500">Alta Comercial</span>
                <div className="font-semibold text-slate-900">
                  {formatDateShort(selectedClient.fecha_alta)}
                </div>
              </div>
            </div>

            {/* Servicios contratados */}
            <div>
              <h4 className="font-bold text-slate-900">
                Servicios Tecnológicos Contratados ({selectedClient.contratos_servicios?.length || 0})
              </h4>
              <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {(selectedClient.contratos_servicios || []).length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">Sin contratos registrados aún.</p>
                ) : (
                  selectedClient.contratos_servicios.map((ct) => (
                    <div key={ct.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {ct.servicio_nombre || ct.codigo_contrato}
                        </div>
                        <div className="text-slate-500">
                          {ct.codigo_contrato} · Inicio {formatDateShort(ct.fecha_inicio_servicio)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          {formatCRC(ct.precio_acordado_crc)}
                        </span>
                        <StatusBadge label={ct.estado_contrato} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Personas de Contacto */}
            <div>
              <h4 className="font-bold text-slate-900">
                Personas de Contacto ({selectedClient.personas_contacto?.length || 0})
              </h4>
              <div className="mt-2 space-y-2">
                {(selectedClient.personas_contacto || []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {p.nombre_completo}{' '}
                        {p.es_contacto_principal ? (
                          <span className="ml-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      <div className="text-slate-500">{p.cargo}</div>
                    </div>
                    <div className="text-right text-slate-600">
                      <div>{p.correo}</div>
                      <div>{p.telefono}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulario rápido para añadir persona de contacto */}
              <form
                onSubmit={handleAddClientContact}
                className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
              >
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <UserPlus className="h-3.5 w-3.5 text-teal-600" />
                  <span>Agregar Persona de Contacto</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={contactForm.nombre_completo}
                    onChange={(e) => setContactForm({ ...contactForm, nombre_completo: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Cargo administrativo"
                    value={contactForm.cargo}
                    onChange={(e) => setContactForm({ ...contactForm, cargo: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="email"
                    required
                    placeholder="correo@clinica.cr"
                    value={contactForm.correo}
                    onChange={(e) => setContactForm({ ...contactForm, correo: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Teléfono (+506 ...)"
                    value={contactForm.telefono}
                    onChange={(e) => setContactForm({ ...contactForm, telefono: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={contactForm.es_contacto_principal}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, es_contacto_principal: e.target.checked })
                      }
                    />
                    <span>Contacto principal</span>
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Vincular Contacto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

