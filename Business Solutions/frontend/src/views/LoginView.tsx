import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Database, KeyRound, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { vitanexoApi, saveStoredSession } from '../api/client';
import type { CollaboratorProfile, SessionData } from '../types/vitanexo';
import { formatRoleLabel } from '../utils/formatters';
import { ErrorAlert } from '../components/UiPrimitives';

export function LoginView({ onAuthenticated }: { onAuthenticated: (session: SessionData) => void }) {
  const [collaborators, setCollaborators] = useState<CollaboratorProfile[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [accessCode, setAccessCode] = useState('VitaNexoCR2026');
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingInit(true);
      setError(null);
      try {
        const [health, list] = await Promise.all([
          vitanexoApi.getHealth(),
          vitanexoApi.listLoginCollaborators(),
        ]);
        if (!active) return;
        setDbHealthy(Boolean(health?.database?.connected));
        setCollaborators(list);
        const dir = list.find((c) => c.rol === 'direccion_comercial') || list[0];
        if (dir) setSelectedId(dir.id);
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoadingInit(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const selectedCollaborator = collaborators.find((c) => c.id === Number(selectedId)) || null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await vitanexoApi.login({
        colaborador_id: Number(selectedId),
        clave_acceso: accessCode,
      });
      saveStoredSession(session);
      onAuthenticated(session);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 px-4 py-12">
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700/70 bg-white shadow-2xl md:grid md:grid-cols-12">
        {/* Panel Corporativo Izquierdo */}
        <div className="flex flex-col justify-between bg-slate-900 p-8 text-white md:col-span-5">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-xl bg-teal-500/15 px-3.5 py-2 text-teal-300 ring-1 ring-teal-400/30">
              <Building2 className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wide">VITANEXO COSTA RICA</span>
            </div>
            <h1 className="mt-6 text-2xl font-bold leading-snug">
              Plataforma Comercial B2B, Automatizaciones n8n y Agentes Gemini
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Gestión tecnológica, mercadeo, aprobación editorial, embudo comercial y analítica SQL en
              colones (CRC) para clínicas pequeñas, consultorios médicos y centros de fisioterapia.
            </p>
          </div>

          <div className="mt-8 space-y-3 border-t border-slate-800 pt-6 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-teal-400" />
              <span>
                Motor MySQL 8.0 (<strong>VitaBase</strong>):{' '}
                {dbHealthy === null ? 'Verificando...' : dbHealthy ? 'Conectado en tiempo real' : 'Sin conexión'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              <span>Política estricta: Cero datos clínicos o expedientes de pacientes</span>
            </div>
          </div>
        </div>

        {/* Formulario de Acceso Corporativo */}
        <div className="p-8 md:col-span-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Inicio de Sesión Corporativo</h2>
            <p className="mt-1 text-sm text-slate-600">
              Seleccione un colaborador activo registrado en <code className="font-mono text-xs">VitaBase</code>{' '}
              para operar según sus permisos de rol (RBAC).
            </p>
          </div>

          {error ? (
            <div className="mb-5">
              <ErrorAlert error={error} onDismiss={() => setError(null)} />
            </div>
          ) : null}

          {loadingInit ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-600" />
              <span className="text-sm">Cargando colaboradores activos desde VitaBase...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Colaborador Activo (VitaBase)
                </label>
                <div className="relative mt-1.5">
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                    required
                  >
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_completo} — {formatRoleLabel(c.rol)} ({c.correo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCollaborator && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <UserCheck className="h-4 w-4 text-teal-600" />
                    <span>
                      Rol asignado: {formatRoleLabel(selectedCollaborator.rol)} (
                      {selectedCollaborator.codigo_colaborador})
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedCollaborator.permisos.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        <CheckCircle2 className="h-3 w-3 text-teal-600" />
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Clave de Acceso Corporativo Local
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Ingrese clave corporativa"
                    className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-9 text-sm text-slate-900 shadow-xs focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Autenticación firmada con HMAC-SHA256 validada contra la configuración segura del servidor.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Autenticando sesión...</span>
                  </>
                ) : (
                  <span>Ingresar a VitaNexo</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

