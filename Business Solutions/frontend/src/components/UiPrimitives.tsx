import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { ApiClientError } from '../api/client';
import { getStatusColor } from '../utils/formatters';

export function StatusBadge({ label }: { label: string | null | undefined }) {
  const text = label ? String(label).replace(/_/g, ' ') : 'N/D';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusColor(
        label
      )}`}
    >
      {text}
    </span>
  );
}

export function ErrorAlert({
  error,
  onDismiss,
}: {
  error: unknown;
  onDismiss?: () => void;
}) {
  if (!error) return null;
  const isApi = error instanceof ApiClientError;
  const message = error instanceof Error ? error.message : String(error);
  const code = isApi ? `${error.code} (HTTP ${error.status})` : null;
  const details =
    isApi && Array.isArray(error.details)
      ? (error.details as Array<{ field?: string; message?: string }>)
      : null;

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <div className="font-semibold text-rose-900">
              {code ? `Error operativo — ${code}` : 'No se pudo completar la operación'}
            </div>
            <p className="mt-1 text-rose-800">{message}</p>
            {details && details.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-rose-700">
                {details.map((d, idx) => (
                  <li key={idx}>
                    {d.field ? <strong className="font-medium">{d.field}: </strong> : null}
                    {d.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{message}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingSpinner({ label = 'Consultando datos reales en VitaBase...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-14 text-slate-600">
      <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
      <p className="mt-3 text-sm font-medium">{label}</p>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div
        className={`flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

