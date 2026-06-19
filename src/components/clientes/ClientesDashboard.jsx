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
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Trash2,
  LayoutGrid,
  List,
  HelpCircle,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { parsearExtractoPDF } from '../../core/parsers/parseDocumento';
import { agruparPorCliente, calcularEstadisticasGlobales } from '../../core/analytics/clientesAnalytics';
import { buscarClientes } from '../../core/utils/fuzzySearch';
import { guardarDatos, obtenerDatos, agregarActividad } from '../../infra/storage/localStorage.service';
import { formatCOP, formatNumber } from '../../core/utils/formatUtils';
import styles from './ClientesDashboard.module.css';

// ✅ Mapeo de iconos por cliente
const CLIENTE_ICONS = {
  'NEQUI': 'https://cdn.brandfetch.io/idVKd5RHgI/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1781708737156',
  'DAVIPLATA': 'https://cdn.brandfetch.io/idYUaU0ImR/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1772768145632',
  'DAVI PLATA': 'https://cdn.brandfetch.io/idYUaU0ImR/theme/dark/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1772768145632',
  'AUROS COPIAS': 'https://auros.com.co/wp-content/uploads/2026/02/cropped-favicon-300x300.png',
  'AUROS COPIAS S.A.S': 'https://auros.com.co/wp-content/uploads/2026/02/cropped-favicon-300x300.png',
  'BOYDORR': 'https://boydorr.com/wp-content/uploads/2023/05/profile-boydorr-lb-v2.png',
  'PEXTO COLOMBIA': 'https://colombiafintech.co/wp-content/uploads/2025/07/WhatsApp-Image-2026-04-13-at-8.41.23-AM.jpeg',
  'ATTON BOGOTA 93': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmmCt0Vvyn9MWVQuImfyLuHGa_hm8gwqy3hg&s',
  'DANOSA ANDINA S': 'https://www.danosa.com/es-co/wp-content/uploads/sites/8/2026/03/FAVICON_logo_danosa_nuevo_azul.svg',
};

// ✅ Función para obtener icono de cliente
function getClienteIcon(clienteNombre) {
  if (!clienteNombre) return null;
  const normalized = clienteNombre.toUpperCase().trim();
  
  if (normalized.includes('SIN IDENTIFICAR') || normalized.includes('SINIDENTIFICAR')) {
    return null;
  }
  
  for (const [key, url] of Object.entries(CLIENTE_ICONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }
  return null;
}

function esSinIdentificar(clienteNombre) {
  if (!clienteNombre) return true;
  const normalized = clienteNombre.toUpperCase().trim();
  return normalized.includes('SIN IDENTIFICAR') || 
         normalized.includes('SINIDENTIFICAR') ||
         normalized === 'SIN IDENTIFICAR';
}

// ✅ Toast component
function Toast({ message, action, onAction, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={styles.toast}>
      <span className={styles.toastMessage}>{message}</span>
      {action && (
        <button className={styles.toastAction} onClick={onAction}>
          <RotateCcw size={14} />
          {action}
        </button>
      )}
      <button className={styles.toastClose} onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

// ✅ KPI Component
function KPI({ icon: Icon, value, label, color }) {
  return (
    <div className={`${styles.kpi} ${styles[color]}`}>
      <div className={styles.kpiIcon}>
        <Icon size={18} />
      </div>
      <div className={styles.kpiInfo}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
    </div>
  );
}

// ✅ Cliente Card
function ClienteCard({ cliente, onClick, isSelected }) {
  const iconUrl = getClienteIcon(cliente.nombre);
  const esSinId = esSinIdentificar(cliente.nombre);
  
  return (
    <div 
      className={`${styles.clienteCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => onClick(cliente)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(cliente)}
    >
      <div className={styles.clienteCardHeader}>
        <div className={styles.clienteCardNombre}>
          {iconUrl ? (
            <img src={iconUrl} alt={cliente.nombre} className={styles.clienteCardIcon} />
          ) : esSinId ? (
            <HelpCircle size={16} className={styles.clienteCardIconSinId} />
          ) : (
            <Building2 size={16} className={styles.clienteCardIconDefault} />
          )}
          <span className={esSinId ? styles.clienteNombreSinId : ''}>{cliente.nombre}</span>
        </div>
        <span className={styles.clienteCardRank}>#{cliente.rank || 0}</span>
      </div>
      <div className={styles.clienteCardMonto}>{formatCOP(cliente.total)}</div>
      <div className={styles.clienteCardDetalle}>
        <span>{cliente.cantidad} pagos</span>
        <span>Prom: {formatCOP(cliente.total / cliente.cantidad)}</span>
        <span>Último: {cliente.ultimoPago || '—'}</span>
      </div>
      <div className={styles.clienteCardBar}>
        <div 
          className={styles.clienteCardBarFill}
          style={{ width: `${Math.min((cliente.total / (cliente._maxTotal || 1)) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ✅ Drawer de detalles del cliente
function ClienteDrawer({ cliente, movimientos, onClose }) {
  const [toastMessage, setToastMessage] = useState(null);
  
  const pagosCliente = useMemo(() => {
    let pagos;
    if (cliente.nombre && !esSinIdentificar(cliente.nombre)) {
      pagos = movimientos.filter(m => m.nombreCliente === cliente.nombre);
    } else {
      pagos = movimientos.filter(m => !m.nombreCliente || m.nombreCliente === 'Sin identificar');
    }
    return pagos.filter(m => m.valor > 0);
  }, [movimientos, cliente]);

  const iconUrl = getClienteIcon(cliente.nombre);
  const esSinId = esSinIdentificar(cliente.nombre);

  const handleCopyNombre = useCallback(() => {
    navigator.clipboard.writeText(cliente.nombre).then(() => {
      setToastMessage('Nombre copiado');
      setTimeout(() => setToastMessage(null), 2000);
    });
  }, [cliente.nombre]);

  const handleCopyPagos = useCallback(() => {
    const texto = pagosCliente.map(p => 
      `${p.fecha} | ${p.descripcion} | ${formatCOP(p.valor)}`
    ).join('\n');
    navigator.clipboard.writeText(texto).then(() => {
      setToastMessage(`${pagosCliente.length} pagos copiados`);
      setTimeout(() => setToastMessage(null), 2000);
    });
  }, [pagosCliente]);

  const handleCopyPago = useCallback((pago) => {
    const texto = `${pago.fecha} | ${pago.descripcion} | ${formatCOP(pago.valor)}`;
    navigator.clipboard.writeText(texto).then(() => {
      setToastMessage('Pago copiado');
      setTimeout(() => setToastMessage(null), 2000);
    });
  }, []);

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>
            {iconUrl ? (
              <img src={iconUrl} alt={cliente.nombre} className={styles.drawerIcon} />
            ) : esSinId ? (
              <HelpCircle size={20} className={styles.drawerIconSinId} />
            ) : (
              <Building2 size={20} className={styles.drawerIconDefault} />
            )}
            <span className={esSinId ? styles.drawerTitleSinId : ''}>{cliente.nombre}</span>
            <button 
              className={styles.drawerCopyBtn} 
              onClick={handleCopyNombre}
              aria-label="Copiar nombre del cliente"
              title="Copiar nombre"
            >
              <Copy size={14} />
            </button>
          </div>
          <button className={styles.drawerClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {toastMessage && (
          <div className={styles.drawerToast}>
            <span>✅ {toastMessage}</span>
          </div>
        )}
        
        <div className={styles.drawerStats}>
          <div className={styles.drawerStat}>
            <span className={styles.drawerStatLabel}>Total recaudado</span>
            <span className={styles.drawerStatValue}>{formatCOP(cliente.total)}</span>
          </div>
          <div className={styles.drawerStat}>
            <span className={styles.drawerStatLabel}>Pagos</span>
            <span className={styles.drawerStatValue}>{cliente.cantidad}</span>
          </div>
          <div className={styles.drawerStat}>
            <span className={styles.drawerStatLabel}>Promedio</span>
            <span className={styles.drawerStatValue}>{formatCOP(cliente.total / cliente.cantidad)}</span>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionHeader}>
            <h4 className={styles.drawerSectionTitle}>Historial de pagos</h4>
            {pagosCliente.length > 0 && (
              <button 
                className={styles.drawerCopyAllBtn} 
                onClick={handleCopyPagos}
                aria-label="Copiar todos los pagos"
                title="Copiar todos los pagos"
              >
                <Copy size={14} />
                Copiar todo
              </button>
            )}
          </div>
          <div className={styles.drawerPagos}>
            {pagosCliente.length > 0 ? (
              pagosCliente.map((pago, i) => (
                <div key={i} className={styles.drawerPago}>
                  <span className={styles.drawerPagoFecha}>{pago.fecha}</span>
                  <span className={styles.drawerPagoDesc}>{pago.descripcion}</span>
                  <span className={styles.drawerPagoValor}>{formatCOP(pago.valor)}</span>
                  <button 
                    className={styles.drawerPagoCopy}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPago(pago);
                    }}
                    aria-label="Copiar este pago"
                    title="Copiar pago"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.drawerEmpty}>No hay pagos registrados</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientesDashboard({ onClientesUpdate }) {
  const [extractos, setExtractos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
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
  const inputRef = useRef(null);
  const hasLoaded = useRef(false); // ✅ Prevenir loop infinito

  // ✅ Cargar datos guardados - SOLO UNA VEZ
  useEffect(() => {
    // ✅ Evitar ejecución múltiple
    if (hasLoaded.current) return;
    
    const datos = obtenerDatos();
    if (datos && datos.movimientos && datos.movimientos.length > 0) {
      hasLoaded.current = true;
      
      setMovimientos(datos.movimientos);
      setExtractos(datos.extractos || []);
      const clientes = agruparPorCliente(datos.movimientos);
      const sorted = [...clientes].sort((a, b) => b.total - a.total);
      const maxTotal = sorted[0]?.total || 1;
      const clientesConRank = sorted.map((c, i) => ({ ...c, rank: i + 1, _maxTotal: maxTotal }));
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

  // ✅ Procesar archivos
  const procesarArchivos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    
    setIsLoading(true);
    setProgress(0);
    setError('');
    
    const todosMovimientos = [];
    const nombresArchivos = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') {
        setError(`El archivo "${file.name}" no es un PDF válido.`);
        continue;
      }
      
      try {
        const movs = await parsearExtractoPDF(file);
        if (movs.length > 0) {
          todosMovimientos.push(...movs);
          nombresArchivos.push(file.name);
        }
      } catch (e) {
        setError(`Error al leer "${file.name}": ${e.message}`);
      }
      
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    if (todosMovimientos.length === 0) {
      setError('No se encontraron ingresos en los extractos subidos.');
      setIsLoading(false);
      return;
    }
    
    setMovimientos(todosMovimientos);
    setExtractos(nombresArchivos);
    const clientes = agruparPorCliente(todosMovimientos);
    const sorted = [...clientes].sort((a, b) => b.total - a.total);
    const maxTotal = sorted[0]?.total || 1;
    const clientesConRank = sorted.map((c, i) => ({ ...c, rank: i + 1, _maxTotal: maxTotal }));
    setClientesData(clientesConRank);
    
    // ✅ Notificar a App.jsx con verificación
    if (onClientesUpdate) {
      onClientesUpdate(clientesConRank, todosMovimientos);
    }
    
    const totalIngresos = todosMovimientos.reduce((s, m) => s + m.valor, 0);
    guardarDatos({
      movimientos: todosMovimientos,
      extractos: nombresArchivos,
      pdfsCargados: nombresArchivos.length,
      clientesEncontrados: clientes.length,
      totalRecaudado: totalIngresos,
      movimientosProcesados: todosMovimientos.length,
    });
    
    agregarActividad(`Procesados ${todosMovimientos.length} movimientos de ${nombresArchivos.length} extractos`, 'FileText');
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
    };
    setPendingDelete(backup);
    
    setMovimientos([]);
    setClientesData([]);
    setExtractos([]);
    setSearchTerm('');
    localStorage.removeItem('popCarteraData');
    agregarActividad('Datos limpiados', 'Trash2');
    
    // ✅ Notificar a App.jsx con verificación
    if (onClientesUpdate) {
      onClientesUpdate([], []);
    }
    
    setToast({
      message: 'Datos eliminados correctamente',
      action: 'Deshacer',
    });
  }, [clientesData, movimientos, extractos, onClientesUpdate]);

  const handleUndoDelete = useCallback(() => {
    if (!pendingDelete) return;
    
    setMovimientos(pendingDelete.movimientos);
    setClientesData(pendingDelete.clientesData);
    setExtractos(pendingDelete.extractos);
    
    // ✅ Notificar a App.jsx con verificación
    if (onClientesUpdate) {
      onClientesUpdate(pendingDelete.clientesData, pendingDelete.movimientos);
    }
    
    guardarDatos({
      movimientos: pendingDelete.movimientos,
      extractos: pendingDelete.extractos,
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
      'Total recaudado': c.total,
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

  const clientesFiltrados = useMemo(() => {
    return searchTerm.trim() 
      ? buscarClientes(clientesData, searchTerm)
      : clientesData;
  }, [clientesData, searchTerm]);

  const estadisticas = useMemo(() => calcularEstadisticasGlobales(clientesData), [clientesData]);
  const totalIngresos = movimientos.reduce((s, m) => s + m.valor, 0);

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
          </div>
        </div>
        <div className={styles.headerActions}>
          {clientesData.length > 0 && (
            <>
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
            <KPI icon={DollarSign} value={formatCOP(totalIngresos)} label="Total recaudado" color="blue" />
            <KPI icon={Users} value={clientesData.length} label="Clientes activos" color="green" />
            <KPI icon={FileText} value={movimientos.length} label="Transacciones" color="purple" />
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
              {clientesFiltrados.map((cliente, i) => (
                <ClienteCard 
                  key={i} 
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
                  {clientesFiltrados.map((cliente, i) => (
                    <tr 
                      key={i} 
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
          movimientos={movimientos}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}

