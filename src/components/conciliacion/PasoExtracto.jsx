import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { 
  FileText,
  Upload,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Building2,
  Filter,
  List,
  Calendar,
  MousePointer2,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { parsearExtractoPDF } from '../../core/parsers/parseDocumento';
import styles from './PasoExtracto.module.css';

// ✅ Componente de estadísticas
function StatsCards({ estadisticas, movimientos, fmt }) {
  if (!estadisticas) return null;
  
  return (
    <div className={styles.statsGrid}>
      <div className={`${styles.statCard} ${styles.statTotal}`}>
        <div className={styles.statIconWrapper}>
          <DollarSign size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Total ingresos</span>
          <span className={styles.statValue}>{fmt(estadisticas.total)}</span>
        </div>
        <div className={styles.statTrend}>
          <TrendingUp size={14} />
          <span>{movimientos.length} movimientos</span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
          <Users size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Promedio por pago</span>
          <span className={styles.statValue}>{fmt(estadisticas.promedio)}</span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
          <TrendingUp size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Pago más alto</span>
          <span className={styles.statValue}>{fmt(estadisticas.maximo)}</span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
          <TrendingUp size={20} style={{ transform: 'rotate(180deg)' }} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Pago más bajo</span>
          <span className={styles.statValue}>{fmt(estadisticas.minimo)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PasoExtracto({ onSiguiente, onAtras, facturas }) {
  const [estado, setEstado] = useState('idle');
  const [movimientos, setMovimientos] = useState([]);
  const [extractosCargados, setExtractosCargados] = useState([]); // ✅ Array de nombres de archivos
  const [errorMsg, setErrorMsg] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [orden, setOrden] = useState({ columna: 'fecha', direccion: 'desc' });
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(15);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [mostrarResumenClientes, setMostrarResumenClientes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(0);
  const inputRef = useRef(null);
  const tablaRef = useRef(null);

  // ✅ Estadísticas
  const estadisticas = useMemo(() => {
    if (movimientos.length === 0) return null;
    
    const total = movimientos.reduce((s, m) => s + m.valor, 0);
    const promedio = total / movimientos.length;
    const maximo = Math.max(...movimientos.map(m => m.valor));
    const minimo = Math.min(...movimientos.map(m => m.valor));
    
    return { total, promedio, maximo, minimo, totalMovimientos: movimientos.length };
  }, [movimientos]);

  // ✅ Rango de fechas
  const rangoFechas = useMemo(() => {
    if (movimientos.length === 0) return null;
    
    const fechas = movimientos.map(m => {
      const [dia, mes] = m.fecha.split('/');
      return new Date(2026, parseInt(mes) - 1, parseInt(dia));
    });
    
    const minFecha = new Date(Math.min(...fechas));
    const maxFecha = new Date(Math.max(...fechas));
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    return {
      desde: `${minFecha.getDate().toString().padStart(2, '0')}-${meses[minFecha.getMonth()]}`,
      hasta: `${maxFecha.getDate().toString().padStart(2, '0')}-${meses[maxFecha.getMonth()]}`
    };
  }, [movimientos]);

  // ✅ Clientes únicos
  const clientesUnicos = useMemo(() => {
    if (movimientos.length === 0) return [];
    const clientes = new Set();
    movimientos.forEach(m => {
      if (m.nombreCliente && m.nombreCliente !== 'Otros' && m.nombreCliente !== m.descripcion) {
        clientes.add(m.nombreCliente);
      }
    });
    return Array.from(clientes).sort();
  }, [movimientos]);

  // ✅ Resumen por cliente
  const resumenClientes = useMemo(() => {
    if (movimientos.length === 0) return {};
    
    return movimientos.reduce((acc, m) => {
      const cliente = m.nombreCliente || 'Sin identificar';
      if (!acc[cliente]) {
        acc[cliente] = { total: 0, cantidad: 0, movimientos: [] };
      }
      acc[cliente].total += m.valor;
      acc[cliente].cantidad += 1;
      acc[cliente].movimientos.push(m);
      return acc;
    }, {});
  }, [movimientos]);

  // ✅ Datos filtrados y ordenados
  const datosFiltrados = useMemo(() => {
    if (!movimientos.length) return [];
    
    let filtrados = [...movimientos];
    
    if (filtroBusqueda.trim()) {
      const busqueda = filtroBusqueda.toLowerCase().trim();
      const palabras = busqueda.split(/\s+/).filter(p => p.length > 1);
      
      filtrados = filtrados.filter(m => {
        const textoBusqueda = [
          m.descripcion.toLowerCase(),
          m.nombreCliente?.toLowerCase() || '',
          m.fecha
        ].join(' ');
        return palabras.every(palabra => textoBusqueda.includes(palabra));
      });
    }
    
    if (filtroCliente) {
      filtrados = filtrados.filter(m => m.nombreCliente === filtroCliente);
    }
    
    filtrados.sort((a, b) => {
      let valorA = a[orden.columna];
      let valorB = b[orden.columna];
      
      if (orden.columna === 'valor') {
        valorA = a.valor;
        valorB = b.valor;
      }
      
      if (typeof valorA === 'string') {
        return orden.direccion === 'asc' ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      }
      
      return orden.direccion === 'asc' ? valorA - valorB : valorB - valorA;
    });
    
    return filtrados;
  }, [movimientos, filtroBusqueda, filtroCliente, orden]);

  // ✅ Paginación
  const totalPaginas = Math.ceil(datosFiltrados.length / itemsPorPagina);
  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return datosFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [datosFiltrados, paginaActual, itemsPorPagina]);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroBusqueda, filtroCliente, orden]);

  // ✅ Procesar múltiples archivos
  const procesarArchivos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    setProcesando(true);
    setProgresoCarga(0);
    setErrorMsg('');
    
    const todosMovimientos = [];
    const nombresArchivos = [];
    let errores = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.type !== 'application/pdf') {
        setErrorMsg(`El archivo "${file.name}" no es un PDF válido.`);
        errores++;
        continue;
      }
      
      try {
        const movs = await parsearExtractoPDF(file);
        if (movs.length > 0) {
          todosMovimientos.push(...movs);
          nombresArchivos.push(file.name);
        } else {
          console.warn(`⚠️ No se encontraron ingresos en: ${file.name}`);
        }
      } catch (e) {
        console.error(`Error procesando ${file.name}:`, e);
        setErrorMsg(`Error al leer "${file.name}": ${e.message}`);
        errores++;
      }
      
      setProgresoCarga(Math.round(((i + 1) / files.length) * 100));
    }
    
    setProcesando(false);
    
    if (todosMovimientos.length === 0) {
      setErrorMsg('No se encontraron ingresos en los extractos subidos.');
      setEstado('error');
      return;
    }
    
    setMovimientos(todosMovimientos);
    setExtractosCargados(nombresArchivos);
    setEstado('listo');
    
    if (navigator.vibrate) navigator.vibrate(50);
    
    setTimeout(() => {
      tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, []);

  // ✅ Handler para subir archivos (múltiples)
  const handleFileUpload = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      procesarArchivos(files);
    }
  }, [procesarArchivos]);

  // ✅ Handler para drag & drop (múltiples archivos)
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      procesarArchivos(files);
    }
  }, [procesarArchivos]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleOrden = useCallback((columna) => {
    setOrden(prev => ({
      columna,
      direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleSeleccion = useCallback((index) => {
    setSeleccionados(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index];
    });
  }, []);

  const handleSeleccionarTodos = useCallback(() => {
    if (seleccionados.length === datosPaginados.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(datosPaginados.map((_, i) => i));
    }
  }, [seleccionados, datosPaginados]);

  const handleClienteResumenClick = useCallback((cliente) => {
    setFiltroCliente(cliente === filtroCliente ? '' : cliente);
    setMostrarResumenClientes(false);
  }, [filtroCliente]);

  // ✅ Eliminar un extracto individual
  const handleEliminarExtracto = useCallback((index) => {
    const nuevosExtractos = [...extractosCargados];
    nuevosExtractos.splice(index, 1);
    setExtractosCargados(nuevosExtractos);
    
    // Si no quedan extractos, limpiar todo
    if (nuevosExtractos.length === 0) {
      setMovimientos([]);
      setEstado('idle');
    }
  }, [extractosCargados]);

  const fmt = useCallback((v) => 
    new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(v), []
  );

  const totalIngresos = useMemo(() => 
    movimientos.reduce((s, m) => s + m.valor, 0), [movimientos]
  );

  const irPagina = useCallback((pagina) => {
    setPaginaActual(Math.max(1, Math.min(pagina, totalPaginas)));
    tablaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPaginas]);

  const SortIcon = ({ columna }) => {
    if (orden.columna !== columna) return <span className={styles.sortIcon}>↕</span>;
    return orden.direccion === 'asc' 
      ? <span className={styles.sortIconActive}>↑</span>
      : <span className={styles.sortIconActive}>↓</span>;
  };

  // ✅ Limpiar todo
  const handleLimpiarTodo = useCallback(() => {
    if (movimientos.length === 0) return;
    if (window.confirm('¿Eliminar todos los extractos cargados?')) {
      setMovimientos([]);
      setExtractosCargados([]);
      setEstado('idle');
      setSeleccionados([]);
      setFiltroBusqueda('');
      setFiltroCliente('');
    }
  }, [movimientos]);

  return (
    <div className={styles.container}>
      <div id="status-announcer" className={styles.srOnly} aria-live="polite" aria-atomic="true" />
      
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.headerSection}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FileText size={28} />
            </div>
            <div>
              <h1 className={styles.titulo}>Extracto bancario</h1>
              <p className={styles.sub}>
                Sube uno o varios extractos de Bancolombia (PDF). Solo usaremos los ingresos (valores positivos).
              </p>
            </div>
          </div>
          {estado === 'listo' && (
            <div className={styles.headerBadge}>
              <CheckCircle size={16} />
              <span>{movimientos.length} movimientos</span>
            </div>
          )}
        </div>

        {/* Drop Zone con soporte múltiple */}
        {estado !== 'listo' && (
          <div
            className={`
              ${styles.dropZone} 
              ${estado === 'cargando' || procesando ? styles.cargando : ''} 
              ${estado === 'error' ? styles.hasError : ''}
              ${isDragging ? styles.dragging : ''}
              ${isFocused ? styles.focused : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            tabIndex={0}
            role="button"
            aria-label="Subir extracto bancario en PDF"
          >
            <input 
              ref={inputRef} 
              type="file" 
              accept=".pdf" 
              multiple 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
            
            {procesando ? (
              <div className={styles.spinner}>
                <div className={styles.spinnerRing} />
                <p className={styles.spinnerText}>Leyendo extractos…</p>
                <p className={styles.spinnerSub}>{progresoCarga}% completado</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progresoCarga}%` }} />
                </div>
              </div>
            ) : (
              <div className={styles.placeholder}>
                <div className={styles.uploadIconWrapper}>
                  <Upload size={48} className={styles.uploadIcon} />
                </div>
                <p className={styles.placeholderTitle}>Sube tus extractos bancarios</p>
                <p className={styles.hint}>Arrastra uno o varios PDF aquí o haz clic para seleccionarlos</p>
                <div className={styles.formatos}>
                  <span className={styles.formatTag}>PDF</span>
                  <span className={styles.formatTag}>Bancolombia</span>
                  <span className={styles.formatTag}>Múltiples</span>
                </div>
                {errorMsg && estado === 'error' && (
                  <div className={styles.errorMsg} role="alert">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                    <button 
                      className={styles.errorClose} 
                      onClick={(e) => { e.stopPropagation(); setErrorMsg(''); setEstado('idle'); }}
                      aria-label="Cerrar mensaje de error"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && estado === 'error' && !procesando && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
            <button className={styles.errorDismiss} onClick={() => { setErrorMsg(''); setEstado('idle'); }}>
              <X size={16} />
            </button>
          </div>
        )}

        {estado === 'listo' && (
          <>
            {/* Estado de éxito con lista de extractos */}
            <div className={styles.exito}>
              <div className={styles.exitoHeader}>
                <div className={styles.exitoInfo}>
                  <div className={styles.exitoIconWrapper}>
                    <CheckCircle size={20} className={styles.exitoIcon} />
                  </div>
                  <div>
                    <div className={styles.extractosLista}>
                      <span className={styles.extractosLabel}>
                        <FolderOpen size={14} />
                        {extractosCargados.length} extracto{extractosCargados.length > 1 ? 's' : ''} cargados:
                      </span>
                      <div className={styles.extractosTags}>
                        {extractosCargados.map((nombre, i) => (
                          <span key={i} className={styles.extractoTag}>
                            {nombre}
                            <button 
                              className={styles.extractoRemove}
                              onClick={() => handleEliminarExtracto(i)}
                              aria-label={`Eliminar ${nombre}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className={styles.resumen}>
                      {movimientos.length} ingresos — Total: <span className={styles.totalResaltado}>{fmt(totalIngresos)}</span>
                      {rangoFechas && (
                        <span className={styles.rangoFechas}>
                          <Calendar size={14} />
                          {rangoFechas.desde} → {rangoFechas.hasta}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className={styles.exitoAcciones}>
                  <button 
                    className={styles.btnAgregar}
                    onClick={() => {
                      setEstado('idle');
                      setTimeout(() => inputRef.current?.click(), 100);
                    }}
                    aria-label="Agregar otro extracto"
                  >
                    <Plus size={16} />
                    <span>Agregar</span>
                  </button>
                  <button 
                    className={styles.btnLimpiarExtractos}
                    onClick={handleLimpiarTodo}
                    aria-label="Limpiar todos los extractos"
                  >
                    <Trash2 size={16} />
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <StatsCards estadisticas={estadisticas} movimientos={movimientos} fmt={fmt} />

            {/* Resumen por cliente */}
            {Object.keys(resumenClientes).length > 0 && (
              <div className={styles.clientesResumenContainer}>
                <button 
                  className={`${styles.clientesResumenToggle} ${mostrarResumenClientes ? styles.active : ''}`}
                  onClick={() => setMostrarResumenClientes(!mostrarResumenClientes)}
                >
                  <List size={16} />
                  <span>{mostrarResumenClientes ? 'Ocultar' : 'Ver'} resumen por cliente</span>
                  {mostrarResumenClientes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {mostrarResumenClientes && (
                  <div className={styles.clientesResumenGrid}>
                    {Object.entries(resumenClientes)
                      .sort((a, b) => b[1].total - a[1].total)
                      .map(([cliente, data]) => (
                        <div 
                          key={cliente} 
                          className={`${styles.clienteResumenCard} ${filtroCliente === cliente ? styles.active : ''}`}
                          onClick={() => handleClienteResumenClick(cliente)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleClienteResumenClick(cliente)}
                          aria-label={`Filtrar por ${cliente}`}
                        >
                          <div className={styles.clienteResumenHeader}>
                            <span className={styles.clienteResumenNombre}>
                              <Building2 size={14} />
                              {cliente}
                            </span>
                            <span className={styles.clienteResumenCantidad}>
                              {data.cantidad} movs
                            </span>
                          </div>
                          <div className={styles.clienteResumenTotal}>
                            {fmt(data.total)}
                          </div>
                          <div className={styles.clienteResumenDetalle}>
                            {data.movimientos.slice(0, 3).map((m, i) => (
                              <span key={i} className={styles.clienteResumenItem}>
                                {m.fecha} - {fmt(m.valor)}
                              </span>
                            ))}
                            {data.movimientos.length > 3 && (
                              <span className={styles.clienteResumenMas}>
                                +{data.movimientos.length - 3} más
                              </span>
                            )}
                          </div>
                          {filtroCliente === cliente && (
                            <span className={styles.clienteResumenFiltroActivo}>
                              <CheckCircle size={12} /> Filtro activo
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Controles de tabla */}
            <div className={styles.controlsBar}>
              <div className={styles.searchContainer}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar por descripción, cliente o fecha..."
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  aria-label="Buscar movimientos"
                />
                {filtroBusqueda && (
                  <button 
                    className={styles.clearSearch}
                    onClick={() => setFiltroBusqueda('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className={styles.controlsRight}>
                {clientesUnicos.length > 0 && (
                  <div className={styles.filtroClienteWrapper}>
                    <Filter size={14} className={styles.filtroIcon} />
                    <select
                      className={styles.filtroCliente}
                      value={filtroCliente}
                      onChange={(e) => setFiltroCliente(e.target.value)}
                      aria-label="Filtrar por cliente"
                    >
                      <option value="">Todos</option>
                      {clientesUnicos.map(cliente => (
                        <option key={cliente} value={cliente}>{cliente}</option>
                      ))}
                    </select>
                    {filtroCliente && (
                      <button 
                        className={styles.clearFiltroCliente}
                        onClick={() => setFiltroCliente('')}
                        aria-label="Limpiar filtro"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}

                <div className={styles.seleccionWrapper}>
                  <button 
                    className={`${styles.btnSeleccion} ${modoSeleccion ? styles.active : ''}`}
                    onClick={() => setModoSeleccion(!modoSeleccion)}
                    aria-label={modoSeleccion ? "Desactivar selección" : "Seleccionar movimientos"}
                  >
                    {modoSeleccion ? <CheckSquare size={14} /> : <Square size={14} />}
                    <span>{modoSeleccion ? 'Seleccionando' : 'Seleccionar'}</span>
                  </button>
                  
                  {modoSeleccion && (
                    <div className={styles.seleccionInfo}>
                      {seleccionados.length > 0 ? (
                        <span className={styles.seleccionados}>
                          {seleccionados.length} seleccionados
                          <button 
                            className={styles.seleccionAccion}
                            onClick={() => {
                              const seleccionadosData = datosPaginados.filter((_, i) => 
                                seleccionados.includes((paginaActual - 1) * itemsPorPagina + i)
                              );
                              const total = seleccionadosData.reduce((s, m) => s + m.valor, 0);
                              alert(
                                `Movimientos seleccionados: ${seleccionadosData.length}\n` +
                                `Total: ${fmt(total)}\n` +
                                `Clientes: ${[...new Set(seleccionadosData.map(m => m.nombreCliente || 'Sin identificar'))].join(', ')}`
                              );
                            }}
                            aria-label="Ver resumen de seleccionados"
                          >
                            Ver resumen
                          </button>
                        </span>
                      ) : (
                        <span className={styles.seleccionTooltip}>
                          <MousePointer2 size={12} />
                          Haz clic en filas para seleccionar
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <span className={styles.resultCount}>
                  {datosFiltrados.length} / {movimientos.length}
                </span>
              </div>
            </div>

            {/* Tabla */}
            <div className={styles.tablaWrap} ref={tablaRef}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    {modoSeleccion && (
                      <th className={styles.colSeleccion}>
                        <input
                          type="checkbox"
                          checked={seleccionados.length === datosPaginados.length && datosPaginados.length > 0}
                          onChange={handleSeleccionarTodos}
                          aria-label="Seleccionar todos"
                        />
                      </th>
                    )}
                    <th 
                      className={styles.thSortable}
                      onClick={() => handleOrden('fecha')}
                      aria-sort={orden.columna === 'fecha' ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span className={styles.thContent}>
                        Fecha <SortIcon columna="fecha" />
                      </span>
                    </th>
                    <th 
                      className={styles.thSortable}
                      onClick={() => handleOrden('descripcion')}
                      aria-sort={orden.columna === 'descripcion' ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span className={styles.thContent}>
                        Descripción / Cliente <SortIcon columna="descripcion" />
                      </span>
                    </th>
                    <th 
                      className={`${styles.thSortable} ${styles.colValor}`}
                      onClick={() => handleOrden('valor')}
                      aria-sort={orden.columna === 'valor' ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span className={styles.thContent}>
                        Valor recibido <SortIcon columna="valor" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datosPaginados.length > 0 ? (
                    datosPaginados.map((m, i) => {
                      const indexReal = (paginaActual - 1) * itemsPorPagina + i;
                      return (
                        <tr 
                          key={i} 
                          className={`${styles.fila} ${seleccionados.includes(indexReal) ? styles.seleccionado : ''}`}
                          onClick={() => modoSeleccion && handleSeleccion(indexReal)}
                          style={{ cursor: modoSeleccion ? 'pointer' : 'default' }}
                        >
                          {modoSeleccion && (
                            <td className={styles.colSeleccion}>
                              <input
                                type="checkbox"
                                checked={seleccionados.includes(indexReal)}
                                onChange={() => handleSeleccion(indexReal)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Seleccionar movimiento ${i + 1}`}
                              />
                            </td>
                          )}
                          <td className={styles.fecha}>
                            <span className={styles.fechaBadge}>{m.fecha}</span>
                          </td>
                          <td>
                            <div className={styles.descripcionCell}>
                              <span className={styles.descripcion}>{m.descripcion}</span>
                              {m.nombreCliente && m.nombreCliente !== m.descripcion && (
                                <span className={styles.clienteTag}>
                                  <Building2 size={12} />
                                  {m.nombreCliente}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`${styles.valor} ${styles.valorCentrado}`}>{fmt(m.valor)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={modoSeleccion ? 4 : 3} className={styles.sinResultados}>
                        <Search size={20} />
                        <span>{filtroBusqueda || filtroCliente ? 'No hay resultados' : 'No hay movimientos'}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={modoSeleccion ? 4 : 3}>
                      <div className={styles.footerTabla}>
                        <span className={styles.totalFooter}>
                          Total: {fmt(datosFiltrados.reduce((s, m) => s + m.valor, 0))}
                        </span>
                        <span className={styles.contadorFooter}>
                          Mostrando {datosPaginados.length} de {datosFiltrados.length}
                          {(filtroBusqueda || filtroCliente) && ' (filtrados)'}
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
                <button 
                  className={styles.btnPagina}
                  onClick={() => irPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  aria-label="Página anterior"
                >
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
                      aria-current={pagina === paginaActual ? 'page' : undefined}
                    >
                      {pagina}
                    </button>
                  );
                })}
                
                <button 
                  className={styles.btnPagina}
                  onClick={() => irPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Acciones */}
        <div className={styles.acciones}>
          <button className={styles.btnAtras} onClick={onAtras}>
            <ChevronLeft size={18} />
            <span>Atrás</span>
          </button>
          
          {estado === 'listo' && (
            <button 
              className={styles.btnSiguiente} 
              onClick={() => onSiguiente(movimientos)}
              disabled={movimientos.length === 0}
              aria-label={`Conciliar ${movimientos.length} movimientos`}
              title={`Conciliar ${movimientos.length} movimientos`}
            >
              <span>Conciliar</span>
              <span className={styles.btnBadge}>{movimientos.length}</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

