const crcFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numFormatter = new Intl.NumberFormat('es-CR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCRC(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/D';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/D';
  return crcFormatter.format(num);
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/D';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/D';
  return numFormatter.format(num);
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/D';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/D';
  return `${num.toFixed(2)}%`;
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const clean = String(dateStr).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  }
  return clean;
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const normalized = String(dateStr).includes('T') ? String(dateStr) : String(dateStr).replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRoleLabel(rol: string): string {
  const map: Record<string, string> = {
    direccion_comercial: 'Dirección Comercial',
    mercadeo: 'Mercadeo B2B',
    contenido: 'Especialista de Contenidos',
    ejecutivo_ventas: 'Ejecutivo de Ventas',
    operaciones: 'Operaciones y Soporte',
  };
  return map[rol] || rol;
}

export function getStatusColor(status: string | null | undefined): string {
  const s = String(status || '').toLowerCase();
  if (
    ['activo', 'activa', 'aprobado', 'aprobada', 'publicado', 'ganada', 'completada', 'exitoso', 'aceptado'].includes(
      s
    )
  ) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
  }
  if (
    ['propuesta', 'en_revision', 'pendiente', 'planificada', 'abierta', 'en_negociacion', 'propuesta_enviada', 'en_curso'].includes(
      s
    )
  ) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20';
  }
  if (['borrador', 'pausado', 'pausada', 'nutricion_futura'].includes(s)) {
    return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20';
  }
  if (
    ['rechazado', 'cancelada', 'cancelado', 'perdida', 'fallida', 'fallido', 'suspendido', 'inactivo', 'rechazada_regla_negocio'].includes(
      s
    )
  ) {
    return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20';
  }
  return 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20';
}

