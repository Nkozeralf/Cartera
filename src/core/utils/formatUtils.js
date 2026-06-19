// src/utils/formatUtils.js
export function formatCOP(valor) {
  if (valor === undefined || valor === null) return '—';
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(valor);
}

export function formatNumber(valor) {
  if (valor === undefined || valor === null) return '—';
  return new Intl.NumberFormat('es-CO').format(valor);
}

