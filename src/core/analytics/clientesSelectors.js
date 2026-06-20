import { agruparPorCliente } from './clientesAnalytics';
import { buscarClientes } from '../utils/fuzzySearch';

export function obtenerClientesRankeados(movimientos, searchTerm) {
  const clientes = agruparPorCliente(movimientos || []);
  const sorted = [...clientes].sort((a, b) => b.total - a.total);
  const maxTotal = sorted[0]?.total || 1;
  const clientesConRank = sorted.map((c, i) => ({ ...c, rank: i + 1, _maxTotal: maxTotal }));
  if (searchTerm && searchTerm.trim()) {
    return buscarClientes(clientesConRank, searchTerm);
  }
  return clientesConRank;
}
