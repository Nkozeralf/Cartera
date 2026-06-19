import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  X, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  CreditCard,
  Building2,
  Plus,
  FolderOpen,
} from 'lucide-react';
import styles from './PasoFacturas.module.css';

// ✅ Constantes fuera del componente
const COLUMNAS = [
  { key: 'consecutivo', label: 'Consec.', icon: 'Hash', align: 'center' },
  { key: 'nombreTercero', label: 'Cliente', icon: 'Building2', align: 'left' },
  { key: 'fechaCreacion', label: 'Fecha', icon: 'Calendar', align: 'center' },
  { key: 'total', label: 'Total', icon: 'DollarSign', align: 'right' },
  { key: 'formaPago', label: 'Forma de pago', icon: 'CreditCard', align: 'center' },
  { key: 'fechaVencimiento', label: 'Vencimiento', icon: 'Calendar', align: 'center' },
];

// ✅ Funciones puras fuera del componente
function parsearTotal(str) {
  if (!str) return 0;
  const limpio = str.replace(/[$\s.]/g, '').replace(',', '.');
  const valor = parseFloat(limpio);
  return isNaN(valor) ? 0 : valor;
}

function parsearFilaExcel(texto) {
  const filas = texto.trim().split(/\r?\n/);
  
  return filas
    .map(fila => {
      const cols = fila.split('\t');
      const nombreRaw = cols[4] || cols[7] || '';
      const totalRaw = cols[8] || '';
      
      return {
        consecutivo: (cols[2] || '').trim(),
        nombreTercero: nombreRaw.trim(),
        fechaCreacion: (cols[5] || '').trim(),
        total: parsearTotal(totalRaw),
        formaPago: (cols[9] || '').trim(),
        fechaVencimiento: (cols[10] || '').trim(),
      };
    })
    .filter(f => f.consecutivo && f.nombreTercero && f.total > 0);
}

// ✅ Formateador memoizado
const formatearCOP = (valor) => {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(valor);
};

// ✅ Componente de estadísticas
function StatsCards({ estadisticas, filas }) {
  if (!estadisticas) return null;
  
  return (
    <div className={styles.statsGrid}>
      <div className={`${styles.statCard} ${styles.statTotal}`}>
        <div className={styles.statIconWrapper}>
          <DollarSign size={20} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Total facturado</span>
          <span className={styles.statValue}>{formatearCOP(estadisticas.total)}</span>
        </div>
        <div className={styles.statTrend}>
          <TrendingUp size={14} />
          <span>{filas.length} facturas</span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
          <Users size={20} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Promedio por factura</span>
          <span className={styles.statValue}>{formatearCOP(estadisticas.promedio)}</span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
          <TrendingUp size={20} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Factura más alta</span>
          <span className={styles.statValue}>{formatearCOP(estadisticas.maximo)}</span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
          <TrendingUp size={20} className={styles.statIcon} style={{ transform: 'rotate(180deg)' }} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Factura más baja</span>
          <span className={styles.statValue}>{formatearCOP(estadisticas.minimo)}</span>
        </div>
      </div>
    </div>
  );
}

export default function PasoFacturas({ onSiguiente, onAtras }) {
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState({ columna: 'consecutivo', direccion: 'asc' });
  const [animando, setAnimando] = useState(false);
  const areaRef = useRef(null);

  // ✅ Memoización de datos derivados
  const totalFacturado = useMemo(() => 
    filas.reduce((s, f) => s + f.total, 0), 
    [filas]
  );

  // ✅ Filtrar y ordenar datos
  const datosFiltrados = useMemo(() => {
    let resultado = [...filas];
    
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase().trim();
      resultado = resultado.filter(f => 
        f.consecutivo.toLowerCase().includes(term) ||
        f.nombreTercero.toLowerCase().includes(term) ||
        f.fechaCreacion.includes(term) ||
        (f.formaPago && f.formaPago.toLowerCase().includes(term))
      );
    }
    
    resultado.sort((a, b) => {
      let valA = a[orden.columna];
      let valB = b[orden.columna];
      
      if (orden.columna === 'total') {
        valA = a.total;
        valB = b.total;
      }
      
      if (typeof valA === 'string') {
        return orden.direccion === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      
      return orden.direccion === 'asc' ? valA - valB : valB - valA;
    });
    
    return resultado;
  }, [filas, busqueda, orden]);

  // ✅ Estadísticas
  const estadisticas = useMemo(() => {
    if (filas.length === 0) return null;
    
    const total = filas.reduce((s, f) => s + f.total, 0);
    const promedio = total / filas.length;
    const maximo = Math.max(...filas.map(f => f.total));
    const minimo = Math.min(...filas.map(f => f.total));
    
    return { total, promedio, maximo, minimo };
  }, [filas]);

  // ✅ Handlers
  const handlePegar = useCallback((e) => {
    e.preventDefault();
    const texto = e.clipboardData.getData('text/plain');
    
    if (!texto.trim()) {
      setError('No se detectó contenido para pegar.');
      return;
    }
    
    try {
      const parsed = parsearFilaExcel(texto);
      
      if (parsed.length === 0) {
        setError('No se pudieron leer los datos. Verifica que hayas copiado las columnas correctas de SIIGO.');
        return;
      }
      
      setAnimando(true);
      setFilas(parsed);
      setError('');
      
      if (navigator.vibrate) navigator.vibrate(50);
      
      setTimeout(() => setAnimando(false), 600);
      
    } catch (err) {
      setError('Error al procesar los datos: ' + err.message);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (text) {
          const parsed = parsearFilaExcel(text);
          if (parsed.length > 0) {
            setFilas(parsed);
            setError('');
            if (navigator.vibrate) navigator.vibrate(50);
          }
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const handleEliminarFila = useCallback((idx) => {
    setFilas(prev => prev.filter((_, i) => i !== idx));
    const announcer = document.getElementById('status-announcer');
    if (announcer) {
      announcer.textContent = `Fila ${idx + 1} eliminada. ${filas.length - 1} facturas restantes.`;
    }
  }, [filas.length]);

  const handleLimpiar = useCallback(() => {
    if (filas.length === 0) return;
    
    if (window.confirm(`¿Eliminar todas las ${filas.length} facturas cargadas?`)) {
      setFilas([]);
      setBusqueda('');
      if (areaRef.current) {
        areaRef.current.focus();
      }
    }
  }, [filas]);

  const handleOrdenar = useCallback((columna) => {
    setOrden(prev => ({
      columna,
      direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      return;
    }
    if (e.key === 'Escape' && error) {
      setError('');
    }
  }, [error]);

  // ✅ Efecto para focus automático
  useEffect(() => {
    if (filas.length === 0 && areaRef.current) {
      setTimeout(() => areaRef.current?.focus(), 100);
    }
  }, [filas]);

  const fmt = useCallback(formatearCOP, []);

  // ✅ Icono de ordenamiento
  const SortIcon = ({ columna }) => {
    if (orden.columna !== columna) return <ArrowUpDown size={12} className={styles.sortIcon} />;
    return orden.direccion === 'asc' 
      ? <ArrowUp size={12} className={styles.sortIconActive} />
      : <ArrowDown size={12} className={styles.sortIconActive} />;
  };

  return (
    <div className={styles.container}>
      <div id="status-announcer" className={styles.srOnly} aria-live="polite" aria-atomic="true" />
      
      <div className={styles.card}>
        {/* Header con icono */}
        <div className={styles.headerSection}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h1 className={styles.titulo}>Facturas del mes</h1>
              <p className={styles.sub}>
                Copia las filas desde SIIGO o Excel y pégalas aquí con <kbd>⌘V</kbd> o <kbd>Ctrl+V</kbd>
              </p>
            </div>
          </div>
          {filas.length > 0 && (
            <div className={styles.headerBadge}>
              <CheckCircle size={16} />
              <span>{filas.length} facturas cargadas</span>
            </div>
          )}
        </div>

        {/* Área de pegado moderna */}
        <div
          ref={areaRef}
          className={`
            ${styles.dropZone} 
            ${filas.length > 0 ? styles.tieneDatos : ''} 
            ${isFocused ? styles.focused : ''}
            ${isDragging ? styles.dragging : ''}
            ${error ? styles.hasError : ''}
            ${animando ? styles.animando : ''}
          `}
          tabIndex={0}
          role="textbox"
          aria-label="Área para pegar facturas desde SIIGO"
          aria-describedby="paste-help"
          aria-invalid={!!error}
          onPaste={handlePegar}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
        >
          {filas.length === 0 ? (
            <div className={styles.placeholder}>
              <div className={styles.pasteIconWrapper}>
                <ClipboardPaste size={48} className={styles.pasteIcon} />
              </div>
              <p className={styles.placeholderTitle}>Pega tus facturas aquí</p>
              <p id="paste-help" className={styles.hint}>
                Copia desde SIIGO o Excel y pega con <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd>
              </p>
              <div className={styles.formatos}>
                <span className={styles.formatTag}>Excel</span>
                <span className={styles.formatTag}>SIIGO</span>
                <span className={styles.formatTag}>CSV</span>
              </div>
              {error && (
                <div className={styles.errorMsg} role="alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                  <button 
                    className={styles.errorClose} 
                    onClick={() => setError('')}
                    aria-label="Cerrar mensaje de error"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.pasteOver}>
              <FileSpreadsheet size={20} />
              <span>
                <strong>{filas.length}</strong> facturas cargadas — 
                <span className={styles.pasteOverHint}>Pega nuevamente para reemplazar</span>
              </span>
            </div>
          )}
        </div>

        {/* Mensaje de error */}
        {error && filas.length === 0 && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} className={styles.errorDismiss}>
              <X size={16} />
            </button>
          </div>
        )}

        {filas.length > 0 && (
          <>
            {/* Stats Cards */}
            <StatsCards 
              estadisticas={estadisticas} 
              filas={filas} 
            />

            {/* Barra de controles */}
            <div className={styles.controlsBar}>
              <div className={styles.controlsLeft}>
                <div className={styles.searchContainer}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Buscar factura..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    aria-label="Buscar facturas por consecutivo, cliente o fecha"
                  />
                  {busqueda && (
                    <button 
                      className={styles.clearSearch}
                      onClick={() => setBusqueda('')}
                      aria-label="Limpiar búsqueda"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className={styles.controlsRight}>
                <span className={styles.resultCount}>
                  {datosFiltrados.length} / {filas.length} facturas
                </span>
              </div>
            </div>

            {/* Tabla moderna */}
            <div className={styles.tablaWrap}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    {COLUMNAS.map(c => (
                      <th 
                        key={c.key}
                        className={`${styles[c.align]} ${styles.thSortable}`}
                        onClick={() => handleOrdenar(c.key)}
                        aria-sort={
                          orden.columna === c.key 
                            ? (orden.direccion === 'asc' ? 'ascending' : 'descending')
                            : 'none'
                        }
                      >
                        <span className={styles.thContent}>
                          {c.label}
                          <SortIcon columna={c.key} />
                        </span>
                      </th>
                    ))}
                    <th className={styles.colAcciones} aria-label="Acciones">
                      <span className={styles.thContent}>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.length > 0 ? (
                    datosFiltrados.map((fila, i) => (
                      <tr key={i} className={styles.fila}>
                        <td className={styles.mono}>{fila.consecutivo}</td>
                        <td className={styles.cliente}>
                          <div className={styles.clienteInfo}>
                            <Building2 size={14} className={styles.clienteIcon} />
                            {fila.nombreTercero}
                          </div>
                        </td>
                        <td>
                          <span className={styles.fechaBadge}>{fila.fechaCreacion}</span>
                        </td>
                        <td className={styles.monto}>{fmt(fila.total)}</td>
                        <td>
                          <span className={`${styles.formaPagoBadge} ${styles[fila.formaPago?.toLowerCase().replace(/ /g, '')] || ''}`}>
                            {fila.formaPago || '—'}
                          </span>
                        </td>
                        <td>
                          {fila.fechaVencimiento ? (
                            <span className={styles.fechaBadge}>{fila.fechaVencimiento}</span>
                          ) : '—'}
                        </td>
                        <td>
                          <button 
                            className={styles.btnEliminar} 
                            onClick={() => handleEliminarFila(i)}
                            aria-label={`Eliminar factura ${fila.consecutivo} de ${fila.nombreTercero}`}
                            title="Eliminar factura"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={COLUMNAS.length + 1} className={styles.sinResultados}>
                        <Search size={20} />
                        <span>No hay facturas que coincidan con la búsqueda</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer de tabla */}
            <div className={styles.tableFooter}>
              <span className={styles.footerInfo}>
                Mostrando {datosFiltrados.length} de {filas.length} facturas
                {busqueda && ` — Filtrado por: "${busqueda}"`}
              </span>
            </div>

            {/* Acciones principales */}
            <div className={styles.acciones}>
              <button 
                className={styles.btnLimpiar} 
                onClick={handleLimpiar}
                aria-label="Eliminar todas las facturas"
              >
                <Trash2 size={16} />
                <span>Limpiar tabla</span>
              </button>
              
              <div className={styles.accionesDerecha}>
                {onAtras && (
                  <button 
                    className={styles.btnAtras} 
                    onClick={onAtras}
                    aria-label="Volver al paso anterior"
                  >
                    <ChevronLeft size={18} />
                    <span>Atrás</span>
                  </button>
                )}
                <button 
                  className={styles.btnSiguiente} 
                  onClick={() => onSiguiente(filas)}
                  disabled={filas.length === 0}
                  aria-label={`Continuar con ${filas.length} facturas`}
                >
                  <span>Siguiente — Subir extracto</span>
                  <span className={styles.btnBadge}>{filas.length}</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

