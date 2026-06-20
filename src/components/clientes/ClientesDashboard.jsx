import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Upload,
  FileText,
  Users,
  DollarSign,
  Search,
  X,
  Download,
  Building2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  LayoutGrid,
  List,
  HelpCircle,
  RotateCcw,
  Copy,
  ArrowUp,
  ArrowDown,
  Layers,
  Banknote,
  CheckCircle,
} from 'lucide-react';
import { parseDocumento, ErrorFormatoNoReconocido } from '@/core/parsers/parseDocumento.js';
import { agruparPorCliente, calcularEstadisticasGlobales, obtenerMovimientosDeCliente } from '../../core/analytics/clientesAnalytics';
import { obtenerClientesRankeados } from '../../core/analytics/clientesSelectors';
import { guardarDatos, obtenerDatos, agregarActividad } from '../../infra/storage/localStorage.service';
import { formatCOP, formatNumber } from '../../core/utils/formatUtils';
import styles from './ClientesDashboard.module.css';

import Toast from './components/Toast';
import KPI from './components/KPI';
import ClienteCard from './components/ClienteCard';
import ClienteDrawer from './components/ClienteDrawer';
import { getBancoLogo, getClienteIcon, esSinIdentificar } from './utils/clientesVisualUtils';

export default function ClientesDashboard({ onClientesUpdate }) {
  const [extractos, setExtractos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [metadatasExtractos, setMetadatasExtractos] = useState([]);
  const [detecciones, setDetecciones] = useState([]);
  const [clientesData, setClientesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [filtroDireccion, setFiltroDireccion] = useState('INGRESO');
  const inputRef = useRef(null);
  const hasLoaded = useRef(false);

  // 🔄 CAMBIO: Filtro de movimientos por dirección
  const movimientosFiltrados = useMemo(() => {
    if (filtroDireccion === 'TODOS') {
      return movimientos;
    }
    if (filtroDireccion === 'INGRESO') {
      return movimientos.filter(m => m.direccion === 'INGRESO' || m.direccion === undefined);
    }
    if (filtroDireccion === 'EGRESO') {
      return movimientos.filter(m => m.direccion === 'EGRESO');
    }
    return movimientos;
  }, [movimientos, filtroDireccion]);

  // 🔄 CAMBIO: Verificar si hay egresos para mostrar el selector
  const hayEgresos = useMemo(() => {
    return movimientos.some(m => m.direccion === 'EGRESO');
  }, [movimientos]);

  // Contadores para los badges del filtro
  const conteoIngresos = useMemo(() => {
    return movimientos.filter(m => m.direccion === 'INGRESO' || m.direccion === undefined).length;
  }, [movimientos]);

  const conteoEgresos = useMemo(() => {
    return movimientos.filter(m => m.direccion === 'EGRESO').length;
  }, [movimientos]);

  // ✅ Cargar datos guardados - SOLO UNA VEZ
  useEffect(() => {
    if (hasLoaded.current) return;
    
    const datos = obtenerDatos();
    if (datos && datos.movimientos && datos.movimientos.length > 0) {
      hasLoaded.current = true;
      
      setMovimientos(datos.movimientos);
      setExtractos(datos.extractos || []);
      setDetecciones(datos.detecciones || []);
      const clientesConRank = obtenerClientesRankeados(datos.movimientos);
      setClientesData(clientesConRank);
      
      if (onClientesUpdate) {
        onClientesUpdate(clientesConRank, datos.movimientos);
      }
    }
  }, [onClientesUpdate]);

  // ✅ Escuchar búsqueda global
  useEffect(() => {
    const handleSearch = (e) => {
      if (e.detail) {
        setSearchTerm(e.detail);
        if (clienteSeleccionado) {
          setClienteSeleccionado(null);
          setDrawerOpen(false);
        }
      }
    };
    
    window.addEventListener('searchClient', handleSearch);
    return () => window.removeEventListener('searchClient', handleSearch);
  }, [clienteSeleccionado]);

  // 🔄 CAMBIO: Procesar archivos con el nuevo parser
  const procesarArchivos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    setIsLoading(true);
    setProgress(0);
    setError('');
    
    const todosMovimientos = [];
    const nombresArchivos = [];
    const metadatas = [];
    const deteccionesPorArchivo = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') {
        setError(`El archivo "${file.name}" no es un PDF válido.`);
        continue;
      }
      
      try {
        const resultadoParse = await parseDocumento(file);
        const movs = resultadoParse.movimientos;
        const metadata = resultadoParse.metadata;
        const deteccion = resultadoParse.deteccion;
        
        console.log('🔍 Detección:', deteccion);
        
        if (movs.length > 0) {
          // 🔄 CAMBIO: Agregar el banco a cada movimiento
          const movsConBanco = movs.map(m => ({
            ...m,
            banco: deteccion?.banco || 'Desconocido',
          }));
          todosMovimientos.push(...movsConBanco);
          nombresArchivos.push(file.name);
          metadatas.push({ fileName: file.name, metadata });
          deteccionesPorArchivo.push({
            fileName: file.name,
            banco: deteccion?.banco || 'Desconocido',
            formato: deteccion?.formato || 'No identificado',
            confianza: deteccion?.confianza || 0,
          });
        }
      } catch (e) {
        if (e instanceof ErrorFormatoNoReconocido) {
          setError(`No reconocemos el formato del extracto "${file.name}". Verifica que sea un PDF de un banco soportado.`);
        } else {
          setError(`Error al leer "${file.name}": ${e.message}`);
        }
      }
      
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    if (todosMovimientos.length === 0) {
      setError('No se encontraron movimientos en los extractos subidos.');
      setIsLoading(false);
      return;
    }
    
    setMovimientos(todosMovimientos);
    setExtractos(nombresArchivos);
    setMetadatasExtractos(metadatas);
    setDetecciones(deteccionesPorArchivo);
    
    const clientesConRank = obtenerClientesRankeados(todosMovimientos);
    setClientesData(clientesConRank);
    
    if (onClientesUpdate) {
      onClientesUpdate(clientesConRank, todosMovimientos);
    }
    
    const total = todosMovimientos.reduce((s, m) => s + m.valor, 0);
    guardarDatos({
      movimientos: todosMovimientos,
      extractos: nombresArchivos,
      detecciones: deteccionesPorArchivo,
      pdfsCargados: nombresArchivos.length,
      clientesEncontrados: clientes.length,
      totalRecaudado: total,
      movimientosProcesados: todosMovimientos.length,
    });
    
    agregarActividad(`Procesados ${todosMovimientos.length} movimientos de ${nombresArchivos.length} extractos (${deteccionesPorArchivo.map(d => d.banco).join(', ')})`, 'FileText');
    setIsLoading(false);
  }, [onClientesUpdate]);

  // ✅ Handlers
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) procesarArchivos(files);
  }, [procesarArchivos]);

  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) procesarArchivos(files);
  }, [procesarArchivos]);

  const handleDragOver = useCallback((e) => e.preventDefault(), []);

  const handleClienteClick = useCallback((cliente) => {
    setClienteSeleccionado(cliente);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setClienteSeleccionado(null), 300);
  }, []);

  const handleLimpiar = useCallback(() => {
    if (clientesData.length === 0) return;
    
    const backup = {
      movimientos: [...movimientos],
      clientesData: [...clientesData],
      extractos: [...extractos],
      detecciones: [...detecciones],
    };
    setPendingDelete(backup);
    
    setMovimientos([]);
    setClientesData([]);
    setExtractos([]);
    setMetadatasExtractos([]);
    setDetecciones([]);
    setSearchTerm('');
    localStorage.removeItem('popCarteraData');
    agregarActividad('Datos limpiados', 'Trash2');
    
    if (onClientesUpdate) {
      onClientesUpdate([], []);
    }
    
    setToast({
      message: 'Datos eliminados correctamente',
      action: 'Deshacer',
    });
  }, [clientesData, movimientos, extractos, detecciones, onClientesUpdate]);

  const handleUndoDelete = useCallback(() => {
    if (!pendingDelete) return;
    
    setMovimientos(pendingDelete.movimientos);
    setClientesData(pendingDelete.clientesData);
    setExtractos(pendingDelete.extractos);
    setDetecciones(pendingDelete.detecciones || []);
    
    if (onClientesUpdate) {
      onClientesUpdate(pendingDelete.clientesData, pendingDelete.movimientos);
    }
    
    guardarDatos({
      movimientos: pendingDelete.movimientos,
      extractos: pendingDelete.extractos,
      detecciones: pendingDelete.detecciones || [],
      pdfsCargados: pendingDelete.extractos.length,
      clientesEncontrados: pendingDelete.clientesData.length,
      totalRecaudado: pendingDelete.movimientos.reduce((s, m) => s + m.valor, 0),
      movimientosProcesados: pendingDelete.movimientos.length,
    });
    
    setPendingDelete(null);
    setToast(null);
    agregarActividad('Restauración de datos completada', 'RotateCcw');
  }, [pendingDelete, onClientesUpdate]);

  const handleCloseToast = useCallback(() => {
    setToast(null);
    setPendingDelete(null);
  }, []);

  const handleExportar = useCallback(async () => {
    if (clientesData.length === 0) return;
    const XLSX = await import('xlsx');
    const filas = clientesData.map(c => ({
      'Cliente': c.nombre,
      'Total': c.total,
      'Transacciones': c.cantidad,
      'Promedio': Math.round(c.total / c.cantidad),
      'Primer pago': c.primerPago || '',
      'Último pago': c.ultimoPago || '',
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, `reporte_clientes_${new Date().toISOString().slice(0,10)}.xlsx`);
    agregarActividad('Reporte de clientes exportado', 'Download');
  }, [clientesData]);

  // 🔄 CAMBIO: Usar movimientosFiltrados para los cálculos
  const clientesFiltrados = useMemo(() => {
      return obtenerClientesRankeados(movimientosFiltrados, searchTerm);
    }, [movimientosFiltrados, searchTerm]);

  // 🔄 CAMBIO: Estadísticas basadas en movimientos filtrados
  const estadisticas = useMemo(() => calcularEstadisticasGlobales(clientesFiltrados), [clientesFiltrados]);
  const totalIngresos = movimientosFiltrados.reduce((s, m) => s + m.valor, 0);

  // 🔄 CAMBIO: Label dinámico para el KPI
  const getKpiLabel = () => {
    if (filtroDireccion === 'INGRESO') return 'Total recaudado';
    if (filtroDireccion === 'EGRESO') return 'Total pagado';
    if (filtroDireccion === 'TODOS') return 'Balance neto';
    return 'Total';
  };

  // 🔄 CAMBIO: Función para cambiar filtro
  const handleFiltroChange = (filtro) => {
    setFiltroDireccion(filtro);
  };

  // 🔄 CAMBIO: Determinar el banco principal (el que tiene más movimientos)
  const bancoPrincipal = useMemo(() => {
    if (detecciones.length === 0) return null;
    const bancoCount = {};
    detecciones.forEach(d => {
      const name = (d.banco || '').toLowerCase().trim();
      bancoCount[name] = (bancoCount[name] || 0) + 1;
    });
    const sorted = Object.entries(bancoCount).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [detecciones]);

  const bancosUnicos = useMemo(() => {
    const seen = new Set();
    return detecciones.filter(d => {
      const name = (d.banco || '').toLowerCase().trim();
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [detecciones]);

  const logoBanco = bancoPrincipal ? getBancoLogo(bancoPrincipal) : null;

  return (
    <div className={styles.container}>
      {toast && (
        <Toast 
          message={toast.message}
          action={toast.action}
          onAction={handleUndoDelete}
          onClose={handleCloseToast}
        />
      )}

    <div className={styles.header}>
  <div className={styles.headerLeft}>
    <div className={styles.headerIcon}>
      <Users size={28} />
    </div>
    <div>
      <h1 className={styles.titulo}>Reporte de Clientes</h1>
      <p className={styles.sub}>
        {clientesData.length > 0 
          ? `${clientesData.length} clientes · ${movimientos.length} movimientos · ${extractos.length} extractos`
          : 'Sube uno o varios extractos bancarios para analizar tus clientes'}
      </p>
      {/* 🔄 CAMBIO: Mostrar TODOS los logos de bancos en el header */}
      {bancosUnicos.length > 0 && (
        <div className={styles.bancosBadgeContainer}>
          {bancosUnicos.map((d) => {
            const logo = getBancoLogo(d.banco);
            if (!logo) return null;
            const key = (d.banco || '').toLowerCase().trim();
            return (
              <img 
                key={key}
                src={logo} 
                alt={d.banco} 
                className={styles.bancoLogo}
                title={d.banco}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            );
          })}
          {bancosUnicos.length > 3 && (
            <span className={styles.bancoMulti}>
              +{bancosUnicos.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
  <div className={styles.headerActions}>
    {clientesData.length > 0 && (
      <>
        {hayEgresos && (
          <div className={styles.filtroDireccion}>
            <button 
              className={`${styles.filtroDireccionBtn} ${filtroDireccion === 'INGRESO' ? styles.active : ''}`}
              data-tipo="INGRESO"
              onClick={() => handleFiltroChange('INGRESO')}
              aria-label="Mostrar solo ingresos"
            >
              <ArrowUp size={14} />
              Ingresos
              <span className={styles.filtroDireccionBadge}>
                {conteoIngresos}
              </span>
            </button>
            <button 
              className={`${styles.filtroDireccionBtn} ${filtroDireccion === 'EGRESO' ? styles.active : ''}`}
              data-tipo="EGRESO"
              onClick={() => handleFiltroChange('EGRESO')}
              aria-label="Mostrar solo egresos"
            >
              <ArrowDown size={14} />
              Egresos
              <span className={styles.filtroDireccionBadge}>
                {conteoEgresos}
              </span>
            </button>
            <button 
              className={`${styles.filtroDireccionBtn} ${filtroDireccion === 'TODOS' ? styles.active : ''}`}
              data-tipo="TODOS"
              onClick={() => handleFiltroChange('TODOS')}
              aria-label="Mostrar todos los movimientos"
            >
              <Layers size={14} />
              Todos
              <span className={styles.filtroDireccionBadge}>
                {movimientos.length}
              </span>
            </button>
          </div>
        )}
        <button 
          className={`${styles.btnViewMode} ${viewMode === 'cards' ? styles.active : ''}`}
          onClick={() => setViewMode('cards')}
          aria-label="Vista tarjetas"
        >
          <LayoutGrid size={16} />
        </button>
        <button 
          className={`${styles.btnViewMode} ${viewMode === 'table' ? styles.active : ''}`}
          onClick={() => setViewMode('table')}
          aria-label="Vista tabla"
        >
          <List size={16} />
        </button>
        <button className={styles.btnExportar} onClick={handleExportar}>
          <Download size={16} />
          <span>Exportar</span>
        </button>
        <button className={styles.btnLimpiar} onClick={handleLimpiar}>
          <Trash2 size={16} />
        </button>
      </>
    )}
  </div>
</div>

      {movimientos.length === 0 && !isLoading && (
        <div
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Subir extractos bancarios"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className={styles.placeholder}>
            <div className={styles.uploadIcon}>
              <Upload size={48} />
            </div>
            <h3 className={styles.placeholderTitle}>Sube tus extractos bancarios</h3>
            <p className={styles.placeholderText}>Arrastra uno o varios PDF aquí o haz clic para seleccionarlos</p>
            <div className={styles.formatTags}>
              <span className={styles.formatTag}>PDF</span>
              <span className={styles.formatTag}>Bancolombia</span>
              <span className={styles.formatTag}>BBVA</span>
              <span className={styles.formatTag}>Múltiples</span>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Procesando extractos…</p>
          <p className={styles.loadingProgress}>{progress}%</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.errorClose}>
            <X size={16} />
          </button>
        </div>
      )}

      {movimientos.length > 0 && !isLoading && (
        <>
          <div className={styles.kpiGrid}>
            <KPI icon={DollarSign} value={formatCOP(totalIngresos)} label={getKpiLabel()} color="blue" />
            <KPI icon={Users} value={clientesFiltrados.length} label="Clientes activos" color="green" />
            <KPI icon={FileText} value={movimientosFiltrados.length} label="Transacciones" color="purple" />
            <KPI icon={DollarSign} value={estadisticas.promedioPorCliente > 0 ? formatCOP(estadisticas.promedioPorCliente) : '—'} label="Ticket promedio" color="orange" />
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchContainerFull}>
              <Search size={18} className={styles.searchIconFull} />
              <input
                type="text"
                className={styles.searchInputFull}
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar clientes"
              />
              {searchTerm && (
                <button className={styles.clearSearchFull} onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </button>
              )}
            </div>
            <span className={styles.resultCount}>
              {clientesFiltrados.length} clientes {searchTerm && `(filtrados)`}
            </span>
          </div>

          {viewMode === 'cards' ? (
            <div className={styles.clientesGrid}>
              {clientesFiltrados.map((cliente) => (
                <ClienteCard 
                  key={cliente.nombre || cliente.rank} 
                  cliente={cliente} 
                  onClick={handleClienteClick}
                  isSelected={clienteSeleccionado?.nombre === cliente.nombre}
                />
              ))}
            </div>
          ) : (
            <div className={styles.tablaWrap}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className={styles.thRight}>Total</th>
                    <th className={styles.thCenter}>Pagos</th>
                    <th className={styles.thRight}>Promedio</th>
                    <th className={styles.thCenter}>Último pago</th>
                    <th className={styles.thCenter}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr 
                      key={cliente.nombre || cliente.rank} 
                      className={styles.row}
                      onClick={() => handleClienteClick(cliente)}
                    >
                      <td className={styles.clienteCell}>
                        <div className={styles.clienteInfo}>
                          <Building2 size={14} className={styles.clienteIcon} />
                          <span className={styles.clienteNombre}>{cliente.nombre}</span>
                        </div>
                      </td>
                      <td className={styles.montoCell}>{formatCOP(cliente.total)}</td>
                      <td className={styles.cantidadCell}>{cliente.cantidad}</td>
                      <td className={styles.promedioCell}>{formatCOP(cliente.total / cliente.cantidad)}</td>
                      <td className={styles.fechaCell}>{cliente.ultimoPago || '—'}</td>
                      <td className={styles.accionesCell}>
                        <button 
                          className={styles.btnVer}
                          onClick={(e) => { e.stopPropagation(); handleClienteClick(cliente); }}
                          aria-label={`Ver detalles de ${cliente.nombre}`}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.footerInfo}>
            <span>
              <FileText size={14} />
              {extractos.length} extracto{extractos.length > 1 ? 's' : ''} cargados
            </span>
            {bancosUnicos.length > 0 && (
              <span className={styles.footerBancos}>
                <Banknote size={14} />
                {bancosUnicos.map((d, idx) => (
                  <span key={(d.banco || '').toLowerCase().trim()} className={styles.footerBanco}>
                    {d.banco}
                    {idx < bancosUnicos.length - 1 && ', '}
                  </span>
                ))}
              </span>
            )}
            <span>
              <Clock size={14} />
              Última actualización: {new Date().toLocaleString('es-CO')}
            </span>
          </div>
        </>
      )}

      {drawerOpen && clienteSeleccionado && (
        <ClienteDrawer 
          cliente={clienteSeleccionado} 
          movimientos={movimientosFiltrados}
          onClose={handleCloseDrawer}
          filtroDireccion={filtroDireccion}
          detecciones={detecciones}
        />
      )}
    </div>
  );
}