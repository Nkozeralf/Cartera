import BANCO_LOGOS from '../constants/bancoLogos';
import CLIENTE_ICONS from '../constants/clienteIcons';

export function getBancoLogo(bancoNombre) {
  if (!bancoNombre) return null;
  const normalized = bancoNombre.toLowerCase().trim();
  // Direct match
  const direct = Object.keys(BANCO_LOGOS).find(k => k.toLowerCase() === normalized);
  if (direct) return BANCO_LOGOS[direct];
  // Partial match
  for (const [key, url] of Object.entries(BANCO_LOGOS)) {
    const kn = key.toLowerCase();
    if (normalized.includes(kn) || kn.includes(normalized)) {
      return url;
    }
  }
  return null;
}

export function getClienteIcon(clienteNombre) {
  if (!clienteNombre) return null;
  const normalized = clienteNombre.toUpperCase().trim();
  if (normalized.includes('SIN IDENTIFICAR') || normalized.includes('SINIDENTIFICAR')) return null;
  for (const [key, url] of Object.entries(CLIENTE_ICONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }
  return null;
}

export function esSinIdentificar(clienteNombre) {
  if (!clienteNombre) return true;
  const normalized = clienteNombre.toUpperCase().trim();
  return normalized.includes('SIN IDENTIFICAR') || normalized.includes('SINIDENTIFICAR') || normalized === 'SIN IDENTIFICAR';
}
