import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { clearStoredSession, loadStoredSession, vitanexoApi } from './api/client';
import type { ModuleKey, SessionData } from './types/vitanexo';
import { formatRoleLabel } from './utils/formatters';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ClientsServicesView } from './views/ClientsServicesView';
import { CampaignsView } from './views/CampaignsView';
import { ContentsView } from './views/ContentsView';
import { CrmSalesView } from './views/CrmSalesView';
import { MetricsView } from './views/MetricsView';
import { AgentsCenterView } from './views/AgentsCenterView';
import { AutomationsView } from './views/AutomationsView';

const NAV_ITEMS: Array<{ key: ModuleKey; label: string; icon: React.ComponentType<any> }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'clientes', label: 'Clientes y servicios', icon: Building2 },
  { key: 'campanas', label: 'Campañas', icon: Megaphone },
  { key: 'contenidos', label: 'Contenidos', icon: FileText },
  { key: 'ventas', label: 'Contactos y ventas', icon: Users },
  { key: 'metricas', label: 'Métricas SQL', icon: BarChart3 },
  { key: 'agentes', label: 'Centro de agentes', icon: Bot },
  { key: 'automatizaciones', label: 'Automatizaciones n8n', icon: Workflow },
];

export function App() {
  const [session, setSession] = useState<SessionData | null>(() => loadStoredSession());
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean>(true);

  useEffect(() => {
    if (!session) return;
    vitanexoApi
      .getHealth()
      .then((h) => setDbOnline(Boolean(h?.database?.connected)))
      .catch(() => setDbOnline(false));
  }, [session, activeModule]);

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setActiveModule('dashboard');
  }

  if (!session) {
    return <LoginView onAuthenticated={(newSession) => setSession(newSession)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar Corporativo */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col justify-between bg-slate-900 text-slate-100 transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 font-bold text-slate-950">
                VN
              </div>
              <div>
                <div className="text-sm font-bold tracking-wide text-white">VitaNexo</div>
                <div className="text-[11px] text-teal-400">Costa Rica · B2B Salud</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1 text-slate-400 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-4 space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Estado y Sesión Activa */}
        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-800/80 px-3 py-2">
            <span className="text-slate-300">MySQL VitaBase</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
              <span
                className={`h-2 w-2 rounded-full ${dbOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}
              />
              {dbOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="rounded-xl bg-slate-800/50 p-3">
            <div className="truncate font-semibold text-white">
              {session.usuario.nombre_completo}
            </div>
            <div className="mt-0.5 text-[11px] text-teal-300">
              {formatRoleLabel(session.usuario.rol)}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Barra superior móvil */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-slate-900">VitaNexo B2B</span>
          <span className="text-xs font-medium text-teal-700">
            {formatRoleLabel(session.usuario.rol)}
          </span>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-5 sm:p-8">
          {activeModule === 'dashboard' && <DashboardView onNavigate={setActiveModule} />}
          {activeModule === 'clientes' && <ClientsServicesView />}
          {activeModule === 'campanas' && <CampaignsView currentUser={session.usuario} />}
          {activeModule === 'contenidos' && <ContentsView currentUser={session.usuario} />}
          {activeModule === 'ventas' && <CrmSalesView currentUser={session.usuario} />}
          {activeModule === 'metricas' && <MetricsView />}
          {activeModule === 'agentes' && <AgentsCenterView />}
          {activeModule === 'automatizaciones' && <AutomationsView />}
        </main>
      </div>
    </div>
  );
}

