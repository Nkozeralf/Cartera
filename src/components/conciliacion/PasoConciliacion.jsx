import { useMemo, useState, useCallback } from 'react';
import { 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';
import { conciliar, formatCOP } from '../../core/analytics/conciliar';
import styles from './PasoConciliacion.module.css';

const BADGE = {
  CONCILIADO: { label: 'Conciliado', cls: 'verde', icon: CheckCircle },
  PARCIAL: { label: 'Pago parcial', cls: 'amarillo', icon: AlertTriangle },
  REVISAR: { label: 'Revisar', cls: 'amarillo', icon: Info },
  PENDIENTE: { label: 'Pendiente', cls: 'rojo', icon: XCircle },
};

export default function PasoConciliacion({ facturas, movimientos, onAtras }) {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [orden, setOrden] = useState({ columna: 'total', direccion: 'desc' });
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(10);
  const [mostrarDetalles, setMostrarDetalles] = useState({});

  // ✅ Resultado de conciliación
  const resultado = useMemo(() => conciliar(facturas, movimientos), [facturas, movimientos]);

  // ✅ Totales por estado (incluyendo REVISAR)
  const totales = useMemo(() => {
    const stats = {
      conciliado: { count: 0, total: 0 },
      parcial: { count: 0, total: 0 },
      revisar: { count: 0, total: 0 },
      pendiente: { count: 0, total: 0 },
    };
    
    if (!resultado || !Array.isArray(resultado)) return stats;
    
    resultado.forEach(r => {
      const estadoKey = (r.estado || 'pendiente').toLowerCase();
      if (stats[estadoKey]) {
        stats[estadoKey].count += 1;
        stats[estadoKey].total += (r.total || 0);
      }
    });
    return stats;
  }, [resultado]);

  // ✅ Datos filtrados y ordenados
  const datosFiltrados = useMemo(() => {
    if (!resultado || !Array.isArray(resultado)) return [];
    let filtrados = [...resultado];
    
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(r => r.estado === filtroEstado);
    }
    
    if (filtroBusqueda.trim()) {
      const busqueda = filtroBusqueda.toLowerCase().trim();
      filtrados = filtrados.filter(r =>
        r.consecutivo?.toLowerCase().includes(busqueda) ||
        r.nombreTercero?.toLowerCase().includes(busqueda)
      );
    }
    
    filtrados.sort((a, b) => {
      let valA = a[orden.columna] || 0;
      let valB = b[orden.columna] || 0;
      
      if (typeof valA === 'string') {
        return orden.direccion === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return orden.direccion === 'asc' ? valA - valB : valB - valA;
    });
    
    return filtrados;
  }, [resultado, filtroEstado, filtroBusqueda, orden]);

  // ✅ Paginación
  const totalPaginas = Math.ceil(datosFiltrados.length / itemsPorPagina);
  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return datosFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [datosFiltrados, paginaActual, itemsPorPagina]);

  // ✅ Handlers
  const handleOrden = useCallback((columna) => {
    setOrden(prev => ({
      columna,
      direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const toggleDetalle = useCallback((index) => {
    setMostrarDetalles(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const irPagina = useCallback((pagina) => {
    setPaginaActual(Math.max(1, Math.min(pagina, totalPaginas)));
  }, [totalPaginas]);

  // ✅ Exportar Excel mejorado
  const exportarExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const filas = resultado.map(r => ({
      'Consecutivo': r.consecutivo || '',
      'Cliente': r.nombreTercero || '',
      'Fecha factura': r.fechaCreacion || '',
      'Vencimiento': r.fechaVencimiento || '',
      'Total facturado': r.total || 0,
      'Estado': BADGE[r.estado]?.label || r.estado || 'Pendiente',
      'Pagos encontrados': r.pagos?.map(p => `${p.fecha} | ${p.descripcion} | ${formatCOP(p.valor)}`).join(' / ') || '',
      'Diferencia': r.diferencia || 0,
      'Confianza': r.confianza || 0,
      'Total pagado': r.totalPagado || 0,
      'Nota': r.nota || '',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conciliación');
    XLSX.writeFile(wb, `conciliacion_${new Date().toISOString().slice(0,10)}.xlsx`);
  }, [resultado]);

  // ✅ Icono de ordenamiento
  const SortIcon = ({ columna }) => {
    if (orden.columna !== columna) return <ArrowUpDown size={12} className={styles.sortIcon} />;
    return orden.direccion === 'asc' 
      ? <ChevronUp size={12} className={styles.sortIconActive} />
      : <ChevronDown size={12} className={styles.sortIconActive} />;
  };

  const totalGeneral = resultado?.reduce((s, r) => s + (r.total || 0), 0) || 0;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h1 className={styles.titulo}>Resultado de conciliación</h1>
              <p className={styles.sub}>
                {resultado?.length || 0} facturas analizadas · {movimientos?.length || 0} movimientos del extracto
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnExportar} onClick={exportarExcel}>
              <Download size={16} />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* ✅ Stats Cards con REVISAR incluido */}
        <div className={styles.resumenCards}>
          <div className={`${styles.resCard} ${styles.resVerde}`}>
            <div className={styles.resCardContent}>
              <span className={styles.resNum}>{totales.conciliado?.count || 0}</span>
              <span className={styles.resLabel}>Conciliadas</span>
              <span className={styles.resMonto}>{formatCOP(totales.conciliado?.total || 0)}</span>
            </div>
            <div className={styles.resBar}>
              <div className={styles.resBarFill} style={{ 
                width: `${totalGeneral > 0 ? ((totales.conciliado?.total || 0) / totalGeneral) * 100 : 0}%`,
                background: '#10b981'
              }} />
            </div>
          </div>
          
          <div className={`${styles.resCard} ${styles.resAmarillo}`}>
            <div className={styles.resCardContent}>
              <span className={styles.resNum}>{totales.revisar?.count || 0}</span>
              <span className={styles.resLabel}>Revisar</span>
              <span className={styles.resMonto}>{formatCOP(totales.revisar?.total || 0)}</span>
            </div>
            <div className={styles.resBar}>
              <div className={styles.resBarFill} style={{ 
                width: `${totalGeneral > 0 ? ((totales.revisar?.total || 0) / totalGeneral) * 100 : 0}%`,
                background: '#f59e0b'
              }} />
            </div>
          </div>
          
          <div className={`${styles.resCard} ${styles.resRojo}`}>
            <div className={styles.resCardContent}>
              <span className={styles.resNum}>{totales.pendiente?.count || 0}</span>
              <span className={styles.resLabel}>Pendientes</span>
              <span className={styles.resMonto}>{formatCOP(totales.pendiente?.total || 0)}</span>
            </div>
            <div className={styles.resBar}>
              <div className={styles.resBarFill} style={{ 
                width: `${totalGeneral > 0 ? ((totales.pendiente?.total || 0) / totalGeneral) * 100 : 0}%`,
                background: '#ef4444'
              }} />
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className={styles.controlsBar}>
          <div className={styles.controlsLeft}>
            <div className={styles.searchContainer}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar por cliente o consecutivo..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                aria-label="Buscar facturas"
              />
              {filtroBusqueda && (
                <button className={styles.clearSearch} onClick={() => setFiltroBusqueda('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className={styles.filtroContainer}>
              <Filter size={14} className={styles.filtroIcon} />
              <select
                className={styles.filtroSelect}
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                aria-label="Filtrar por estado"
              >
                <option value="todos">Todos los estados</option>
                <option value="CONCILIADO">✅ Conciliados</option>
                <option value="REVISAR">🔍 Revisar</option>
                <option value="PENDIENTE">❌ Pendientes</option>
              </select>
            </div>
          </div>
          
          <div className={styles.controlsRight}>
            <span className={styles.resultCount}>
              {datosFiltrados.length} / {resultado?.length || 0} facturas
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th className={styles.thSortable} onClick={() => handleOrden('consecutivo')}>
                  <span className={styles.thContent}>Consec. <SortIcon columna="consecutivo" /></span>
                </th>
                <th className={styles.thSortable} onClick={() => handleOrden('nombreTercero')}>
                  <span className={styles.thContent}>Cliente <SortIcon columna="nombreTercero" /></span>
                </th>
                <th><span className={styles.thContent}>Fecha</span></th>
                <th><span className={styles.thContent}>Vence</span></th>
                <th className={styles.thSortable} onClick={() => handleOrden('total')}>
                  <span className={styles.thContent}>Total <SortIcon columna="total" /></span>
                </th>
                <th><span className={styles.thContent}>Estado</span></th>
                <th className={styles.colPagos}><span className={styles.thContent}>Datos del pago</span></th>
                <th className={styles.thSortable} onClick={() => handleOrden('diferencia')}>
                  <span className={styles.thContent}>Diferencia <SortIcon columna="diferencia" /></span>
                </th>
                <th className={styles.thSortable} onClick={() => handleOrden('confianza')}>
                  <span className={styles.thContent}>Confianza <SortIcon columna="confianza" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {datosPaginados.length > 0 ? (
                datosPaginados.map((r, i) => {
                  const StatusIcon = BADGE[r.estado]?.icon || XCircle;
                  const indexReal = (paginaActual - 1) * itemsPorPagina + i;
                  const detalleAbierto = mostrarDetalles[indexReal] || false;
                  const badgeInfo = BADGE[r.estado] || BADGE.PENDIENTE;
                  
                  return (
                    <tr key={i} className={`${styles.fila} ${styles[`fila${r.estado}`] || ''}`}>
                      <td className={styles.mono}>{r.consecutivo || '—'}</td>
                      <td className={styles.cliente}>
                        <div className={styles.clienteInfo}>
                          <Building2 size={14} className={styles.clienteIcon} />
                          {r.nombreTercero || 'Sin nombre'}
                        </div>
                      </td>
                      <td className={styles.fecha}>{r.fechaCreacion || '—'}</td>
                      <td className={styles.fecha}>{r.fechaVencimiento || '—'}</td>
                      <td className={styles.monto}>{formatCOP(r.total || 0)}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[badgeInfo.cls]}`}>
                          <StatusIcon size={12} />
                          {badgeInfo.label}
                        </span>
                        {r.nota && (
                          <span className={styles.notaTooltip} title={r.nota}>
                            <Info size={12} />
                          </span>
                        )}
                      </td>
                      <td className={styles.pagos}>
                        {!r.pagos || r.pagos.length === 0 ? (
                          <span className={styles.sinPago}>
                            <XCircle size={12} />
                            Sin movimiento
                          </span>
                        ) : (
                          <>
                            <div className={styles.pagosResumen}>
                              <span className={styles.pagosCount}>
                                {r.pagos.length} pago{r.pagos.length > 1 ? 's' : ''}
                              </span>
                              <button 
                                className={styles.toggleDetalle}
                                onClick={() => toggleDetalle(indexReal)}
                                aria-label="Ver detalles del pago"
                              >
                                {detalleAbierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                              {r.ratioPago > 1.05 && (
                                <span className={styles.excedenteTag}>
                                  <TrendingUp size={12} />
                                  Excedente
                                </span>
                              )}
                            </div>
                            {detalleAbierto && (
                              <div className={styles.pagosDetalle}>
                                {r.pagos.map((p, j) => (
                                  <div key={j} className={styles.pago}>
                                    <span className={styles.pagoFecha}>{p.fecha || '—'}</span>
                                    <span className={styles.pagoDesc}>{p.descripcion || '—'}</span>
                                    <span className={styles.pagoValor}>{formatCOP(p.valor || 0)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className={(r.diferencia || 0) > 1000 ? styles.difRojo : styles.difVerde}>
                        {(r.diferencia || 0) > 0 ? (
                          <span className={styles.difMonto}>{formatCOP(r.diferencia)}</span>
                        ) : (
                          <span className={styles.difCero}>✓</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.confianzaBar}>
                          <div 
                            className={`${styles.confianzaFill} ${(r.confianza || 0) >= 70 ? styles.alta : (r.confianza || 0) >= 40 ? styles.media : styles.baja}`}
                            style={{ width: `${Math.min(r.confianza || 0, 100)}%` }}
                          />
                          <span className={styles.confianzaLabel}>{r.confianza || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className={styles.sinResultados}>
                    <Search size={20} />
                    <span>No hay resultados para esta búsqueda</span>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={9}>
                  <div className={styles.footerTabla}>
                    <span className={styles.totalFooter}>
                      Total general: {formatCOP(datosFiltrados.reduce((s, r) => s + (r.total || 0), 0))}
                    </span>
                    <span className={styles.contadorFooter}>
                      Mostrando {datosPaginados.length} de {datosFiltrados.length} facturas
                      {filtroEstado !== 'todos' && ` · Filtro: ${filtroEstado.toLowerCase()}`}
                      {filtroBusqueda && ` · Búsqueda: "${filtroBusqueda}"`}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className={styles.paginacion}>
            <button className={styles.btnPagina} onClick={() => irPagina(paginaActual - 1)} disabled={paginaActual === 1}>
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              let pagina;
              if (totalPaginas <= 5) {
                pagina = i + 1;
              } else if (paginaActual <= 3) {
                pagina = i + 1;
              } else if (paginaActual >= totalPaginas - 2) {
                pagina = totalPaginas - 4 + i;
              } else {
                pagina = paginaActual - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  className={`${styles.btnPagina} ${pagina === paginaActual ? styles.paginaActiva : ''}`}
                  onClick={() => irPagina(pagina)}
                  aria-label={`Página ${pagina}`}
                >
                  {pagina}
                </button>
              );
            })}
            
            <button className={styles.btnPagina} onClick={() => irPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Acciones */}
        <div className={styles.acciones}>
          <button className={styles.btnAtras} onClick={onAtras}>
            <ChevronLeft size={18} />
            <span>Atrás</span>
          </button>
          
          <div className={styles.accionesDerecha}>
            <button className={styles.btnExportar} onClick={exportarExcel}>
              <Download size={16} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

