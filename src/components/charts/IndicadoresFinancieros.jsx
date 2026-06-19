import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  X,
  ArrowUp,
  ArrowDown,
  Download,
  Settings,
  RotateCcw,
  Users,
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Activity,
  Layers,
  Target,
  BarChart3,
  Clock,
  Upload,
  Trash2,
  CircleDot,
  Play,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import * as XLSX from 'xlsx';
import styles from './IndicadoresFinancieros.module.css';
import { obtenerDatos } from '../../infra/storage/localStorage.service';
import { agruparPorCliente } from '../../core/analytics/clientesAnalytics';
import { formatCOP } from '../../core/utils/formatUtils';

// Paleta reducida y con intención
const ACCENT_COLOR = '#1e2b4f';
const NEUTRAL = '#94a3b8';

// =================== SECCIONES EDITORIALES ===================
const DEFAULT_SECTIONS = [
  'hero-total',
  'hero-insight',
  'chart-tendencia',
  'detail-clientes',
  'detail-concentracion',
  'detail-rangos',
  'activity-feed',
];

// =================== COMPONENTES PREMIUM ===================

// -- Gráfico de Tendencia con anotaciones flotantes --
function TendenciaChart({ data, onExport }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const maxPoint = data.reduce((max, d) => (d.total > max.total ? d : max), data[0]);
  const minPoint = data.reduce((min, d) => (d.total < min.total ? d : min), data[0]);
  const avgValue = data.reduce((s, d) => s + d.total, 0) / data.length;
  const lastPoint = data[data.length - 1];

  const handleMouseMove = (e) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      setHoveredPoint(e.activePayload[0].payload);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className={styles.mainChartWrapper}>
      <div className={styles.mainChartHeader}>
        <div className={styles.mainChartTitleGroup}>
          <Activity size={18} strokeWidth={1.5} className={styles.mainChartIcon} />
          <span className={styles.mainChartTitle}>Evolución diaria</span>
        </div>
        <button 
          className={styles.chartActionBtn} 
          onClick={onExport}
          aria-label="Exportar datos de tendencia"
        >
          <Download size={14} />
        </button>
      </div>
      <div 
        className={styles.chartWithAnnotations}
        onMouseLeave={handleMouseLeave}
      >
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart 
            data={data} 
            margin={{ top: 30, right: 30, bottom: 20, left: 30 }}
            onMouseMove={handleMouseMove}
          >
            <defs>
              <linearGradient id="mainGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0a1e3c" stopOpacity={0.06} />
                <stop offset="95%" stopColor="#0a1e3c" stopOpacity={0} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <XAxis dataKey="fecha" hide />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={styles.customTooltip}>
                      <span className={styles.tooltipDate}>{payload[0].payload.fecha}</span>
                      <span className={styles.tooltipValue}>{formatCOP(payload[0].value)}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine 
              y={avgValue} 
              stroke="#94a3b8" 
              strokeDasharray="4 4" 
              strokeWidth={1} 
            />
            <ReferenceDot 
              x={maxPoint.fecha} 
              y={maxPoint.total} 
              r={6} 
              fill="#0c8a5f" 
              stroke="white" 
              strokeWidth={2}
              filter="url(#glow)"
            />
            <ReferenceDot 
              x={minPoint.fecha} 
              y={minPoint.total} 
              r={4} 
              fill="#c24a0e" 
              stroke="white" 
              strokeWidth={1.5} 
            />
            <ReferenceDot 
              x={lastPoint.fecha} 
              y={lastPoint.total} 
              r={5} 
              fill="#0a1e3c" 
              stroke="white" 
              strokeWidth={2}
              filter="url(#glow)"
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#0a1e3c"
              strokeWidth={1.8}
              fill="url(#mainGradient)"
              dot={false}
              activeDot={{ 
                r: 5, 
                strokeWidth: 2, 
                stroke: 'white', 
                fill: '#0a1e3c',
                filter: 'url(#glow)'
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Anotaciones flotantes */}
        <div className={styles.chartAnnotationsFloating}>
          <div 
            className={`${styles.annotation} ${styles.annotationRecord}`}
            style={{ left: '8%', top: '12%' }}
          >
            <span className={styles.annotationLabel}>Récord</span>
            <span className={styles.annotationValue}>{maxPoint.fecha}</span>
            <span className={styles.annotationAmount}>{formatCOP(maxPoint.total)}</span>
          </div>
          <div 
            className={`${styles.annotation} ${styles.annotationAvg}`}
            style={{ right: '8%', bottom: '18%' }}
          >
            <span className={styles.annotationLabel}>Promedio</span>
            <span className={styles.annotationAmount}>{formatCOP(avgValue)}</span>
          </div>
          <div 
            className={`${styles.annotation} ${styles.annotationLast}`}
            style={{ right: '8%', top: '28%' }}
          >
            <span className={styles.annotationLabel}>Último día</span>
            <span className={styles.annotationValue}>{lastPoint.fecha}</span>
            <span className={styles.annotationAmount}>{formatCOP(lastPoint.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Ranking de Clientes con barras animadas --
function TopClientesChart({ data }) {
  return (
    <div className={styles.topClientesWidget}>
      <div className={styles.widgetHeader}>
        <Users size={18} strokeWidth={1.5} />
        <span className={styles.sectionTitle}>Principales clientes</span>
      </div>
      <div className={styles.rankingList}>
        {data.map((cliente, i) => (
          <div 
            key={i} 
            className={styles.rankingRow}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className={styles.rankingPosition} aria-label={`Posición ${i + 1}`}>
              {i + 1}
            </span>
            <div className={styles.rankingInfo}>
              <span className={styles.rankingName} title={cliente.nombre}>
                {cliente.nombre}
              </span>
              <div className={styles.rankingBarWrapper}>
                <div
                  className={styles.rankingBar}
                  style={{ width: `${cliente.porcentaje}%` }}
                  role="progressbar"
                  aria-valuenow={cliente.porcentaje}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${cliente.nombre}: ${cliente.porcentaje}%`}
                />
              </div>
            </div>
            <div className={styles.rankingValues}>
              <span className={styles.rankingValue}>{formatCOP(cliente.total)}</span>
              <span className={styles.rankingPercent}>{cliente.porcentaje}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Indicador de Concentración Narrativa con tooltip --
function ConcentracionIndicator({ data, porcentaje }) {
  const risk = porcentaje > 60;
  const [activeSegment, setActiveSegment] = useState(null);

  return (
    <div className={styles.concentracionWidget}>
      <div className={styles.widgetHeader}>
        <Target size={18} strokeWidth={1.5} />
        <span className={styles.sectionTitle}>Concentración</span>
      </div>
      <div className={styles.concentracionContent}>
        <div className={styles.concentracionHeader}>
          <span className={`${styles.riskBadge} ${risk ? styles.riskHigh : styles.riskLow}`}>
            {risk ? (
              <><AlertCircle size={12} /> Alto riesgo</>
            ) : (
              <><CheckCircle size={12} /> Saludable</>
            )}
          </span>
          <span className={styles.concentracionValue}>
            {Math.round(porcentaje)}% en Top 3
          </span>
        </div>
        <div className={styles.concentracionVisual}>
          {data.map((item, idx) => (
            <div 
              key={idx} 
              className={`${styles.segmentBar} ${activeSegment === idx ? styles.segmentActive : ''}`}
              style={{ flex: item.total }}
              onMouseEnter={() => setActiveSegment(idx)}
              onMouseLeave={() => setActiveSegment(null)}
              role="tooltip"
              aria-label={`${item.nombre}: ${formatCOP(item.total)}`}
            >
              <span className={styles.segmentLabel}>
                {item.nombre.length > 20 ? item.nombre.substring(0, 18) + '...' : item.nombre}
              </span>
              {activeSegment === idx && (
                <span className={styles.segmentTooltip}>
                  {formatCOP(item.total)}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className={styles.concentracionText}>
          {risk
            ? `El ${Math.round(porcentaje)}% de tus ingresos depende de 3 clientes.`
            : `Distribución equilibrada entre tus principales clientes.`}
        </p>
      </div>
    </div>
  );
}

// -- Rangos de Pago con Visualización Clara --
function RangosPagoChart({ data, total }) {
  const sorted = [...data].sort((a, b) => b.cantidad - a.cantidad);
  const maxCantidad = Math.max(...sorted.map(r => r.cantidad), 1);

  const getBarColor = (index, cantidad, maximo) => {
    const ratio = cantidad / maximo;
    if (ratio > 0.7) return 'linear-gradient(90deg, #1000A1, #0046FB)';
    if (ratio > 0.4) return 'linear-gradient(90deg, #0046FB, #0097FA)';
    return 'linear-gradient(90deg, #64748b, #94a3b8)';
  };

  const rangoMasComun = sorted[0];

  return (
    <div className={styles.rangosWidget}>
      <div className={styles.widgetHeader}>
        <BarChart3 size={18} strokeWidth={1.5} />
        <span className={styles.sectionTitle}>Rangos de pago</span>
      </div>
      
      <div className={styles.rangosContent}>
        <div className={styles.rangosHeader}>
          <span className={styles.rangosTotal}>
            <DollarSign size={14} />
            {total} movimientos totales
          </span>
        </div>

        <div className={styles.rangosList}>
          {sorted.map((rango, i) => {
            const porcentaje = total > 0 ? Math.round((rango.cantidad / total) * 100) : 0;
            const widthPercent = (rango.cantidad / maxCantidad) * 100;
            const isDominant = rango.cantidad > total * 0.4;
            
            return (
              <div 
                key={i} 
                className={`${styles.rangoRow} ${isDominant ? styles.rangoDominant : ''}`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={styles.rangoInfo}>
                  <span className={styles.rangoNombre}>{rango.rango}</span>
                  <span className={styles.rangoCantidad}>
                    {rango.cantidad} {rango.cantidad === 1 ? 'pago' : 'pagos'}
                  </span>
                </div>
                
                <div className={styles.rangoBarWrapper}>
                  <div 
                    className={styles.rangoBarFill}
                    style={{ 
                      width: `${widthPercent}%`,
                      background: getBarColor(i, rango.cantidad, maxCantidad)
                    }}
                    role="progressbar"
                    aria-valuenow={porcentaje}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${rango.rango}: ${porcentaje}%`}
                  />
                </div>
                
                <span className={styles.rangoPorcentaje}>{porcentaje}%</span>
              </div>
            );
          })}
        </div>
        
        {/* Insight contextual */}
        <div className={`${styles.rangoInsight} ${rangoMasComun.cantidad > total * 0.4 ? styles.rangoInsightWarning : styles.rangoInsightInfo}`}>
          {rangoMasComun.cantidad > total * 0.4 ? (
            <>
              <AlertCircle size={14} />
              <span>
                El {Math.round((rangoMasComun.cantidad / total) * 100)}% de pagos están en "{rangoMasComun.rango}"
              </span>
            </>
          ) : (
            <>
              <CheckCircle size={14} />
              <span>Distribución equilibrada entre rangos de pago</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Actividad Reciente (Feed con timeline) --
function ActivityFeed({ movimientos, onExport }) {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpand = (index) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const fechaMasReciente = useMemo(() => {
    if (movimientos.length === 0) return null;
    const fechas = movimientos.map(m => m.fecha).sort();
    return fechas[fechas.length - 1];
  }, [movimientos]);

  const calcularFechaRelativa = (fechaMovimiento) => {
    if (!fechaMasReciente) return '';
    const partes = fechaMovimiento.split('/');
    const partesReciente = fechaMasReciente.split('/');
    const fechaMov = new Date(partes[2], partes[1] - 1, partes[0]);
    const fechaRec = new Date(partesReciente[2], partesReciente[1] - 1, partesReciente[0]);
    const diffTiempo = fechaRec.getTime() - fechaMov.getTime();
    const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias <= 7) return `Hace ${diffDias} días`;
    return fechaMovimiento;
  };

  const getActivityIcon = (mov) => {
    if (!mov.nombreCliente || mov.nombreCliente === 'Sin identificar') return AlertCircle;
    if (mov.valor > 5000000) return Zap;
    return CircleDot;
  };

  const getActivityColor = (mov) => {
    if (!mov.nombreCliente || mov.nombreCliente === 'Sin identificar') return styles.activityWarning;
    if (mov.valor > 5000000) return styles.activityHighValue;
    return styles.activityDefault;
  };

  return (
    <div className={styles.feedWidget}>
      <div className={styles.feedHeader}>
        <div className={styles.widgetHeader}>
          <Activity size={18} strokeWidth={1.5} />
          <span className={styles.sectionTitle}>Actividad reciente</span>
        </div>
        <button 
          className={styles.chartActionBtn} 
          onClick={onExport}
          aria-label="Exportar actividad reciente"
        >
          <Download size={14} />
        </button>
      </div>
      <div className={styles.feedList}>
        {movimientos.map((mov, i) => {
          const fechaRelativa = calcularFechaRelativa(mov.fecha);
          const Icon = getActivityIcon(mov);
          const colorClass = getActivityColor(mov);
          const isExpanded = expandedItems.has(i);

          return (
            <div 
              key={i} 
              className={`${styles.feedCard} ${isExpanded ? styles.feedCardExpanded : ''}`}
              onClick={() => toggleExpand(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleExpand(i)}
              aria-expanded={isExpanded}
              aria-label={`${mov.nombreCliente || 'Sin identificar'}: ${mov.descripcion}`}
            >
              <div className={`${styles.feedCardIcon} ${colorClass}`}>
                <Icon size={14} strokeWidth={2} />
              </div>
              <div className={styles.feedCardBody}>
                <div className={styles.feedCardRow}>
                  <span className={styles.feedCardClient}>
                    {mov.nombreCliente || 'Sin identificar'}
                  </span>
                  <span className={styles.feedCardAmount}>{formatCOP(mov.valor)}</span>
                </div>
                <div className={styles.feedCardRow}>
                  <span className={styles.feedCardDesc}>{mov.descripcion}</span>
                  <span className={styles.feedCardDate}>
                    <Clock size={10} />
                    {fechaRelativa}
                  </span>
                </div>
                {isExpanded && (
                  <div className={styles.feedCardDetails}>
                    <span className={styles.feedDetailItem}>
                      <Calendar size={12} />
                      Fecha: {mov.fecha}
                    </span>
                    <span className={styles.feedDetailItem}>
                      <FileText size={12} />
                      Referencia: {mov.referencia || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
              <ChevronRight 
                size={16} 
                className={`${styles.feedCardChevron} ${isExpanded ? styles.chevronRotated : ''}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Drawer de personalización --
function CustomizationDrawer({ isOpen, onClose, activeSections, setActiveSections }) {
  const [draft, setDraft] = useState(activeSections);

  useEffect(() => {
    setDraft(activeSections);
  }, [activeSections]);

  const toggle = (id) => {
    setDraft(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const save = () => {
    setActiveSections(draft);
    onClose();
  };

  return (
    <div className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <Settings size={18} strokeWidth={1.5} />
          <h3>Personalizar vista</h3>
          <button className={styles.drawerClose} onClick={onClose} aria-label="Cerrar panel">
            <X size={18} />
          </button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.drawerSection}>
            <p className={styles.drawerHint}>
              <Layers size={14} />
              Selecciona las secciones visibles en tu dashboard editorial.
            </p>
            <div className={styles.widgetToggleList}>
              {DEFAULT_SECTIONS.map(id => {
                const isActive = draft.includes(id);
                return (
                  <label key={id} className={styles.widgetToggle}>
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={() => toggle(id)}
                      aria-label={sectionLabels[id] || id}
                    />
                    <span>{sectionLabels[id] || id}</span>
                    {isActive && <CheckCircle size={14} className={styles.checkActive} />}
                  </label>
                );
              })}
            </div>
          </div>
          <div className={styles.drawerActions}>
            <button 
              className={styles.drawerBtnSecondary} 
              onClick={() => setDraft(DEFAULT_SECTIONS)}
            >
              <RotateCcw size={14} /> Por defecto
            </button>
            <button className={styles.drawerBtnPrimary} onClick={save}>
              <Play size={14} /> Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionLabels = {
  'hero-total': 'Métrica principal (Total recaudado)',
  'hero-insight': 'Insight financiero',
  'chart-tendencia': 'Gráfica de tendencia',
  'detail-clientes': 'Top clientes',
  'detail-concentracion': 'Concentración',
  'detail-rangos': 'Rangos de pago',
  'activity-feed': 'Actividad reciente',
};

// =================== COMPONENTE PRINCIPAL ===================
export default function IndicadoresFinancieros() {
  const [activeSections, setActiveSections] = useState(() => {
    const saved = localStorage.getItem('popCarteraDashboardSections');
    return saved ? JSON.parse(saved) : DEFAULT_SECTIONS;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);

  const datos = useMemo(() => {
    const data = obtenerDatos();
    return {
      movimientos: data?.movimientos || [],
      clientes: data?.clientesEncontrados || 0,
      pdfs: data?.pdfsCargados || 0,
      totalRecaudado: data?.totalRecaudado || 0,
    };
  }, []);

  const analytics = useMemo(() => {
    const movs = datos.movimientos;
    if (movs.length === 0) return null;

    const total = movs.reduce((s, m) => s + m.valor, 0);

    const porDia = {};
    movs.forEach(m => {
      if (!porDia[m.fecha]) porDia[m.fecha] = { total: 0, movimientos: [] };
      porDia[m.fecha].total += m.valor;
      porDia[m.fecha].movimientos.push(m);
    });

    const diaRecord = Object.entries(porDia).sort((a, b) => b[1].total - a[1].total)[0];
    const diaRecordData = diaRecord ? {
      fecha: diaRecord[0],
      total: diaRecord[1].total,
      movimientos: diaRecord[1].movimientos,
      cantidad: diaRecord[1].movimientos.length,
    } : null;

    const clientesData = agruparPorCliente(movs);
    const topClientes = clientesData.slice(0, 5);
    const clientePrincipal = clientesData[0] || null;

    const sinIdentificar = movs.filter(m => !m.nombreCliente || m.nombreCliente === 'Sin identificar');
    const sinIdentificarTotal = sinIdentificar.reduce((s, m) => s + m.valor, 0);

    const rangos = { 'Menos de $100k': 0, '$100k - $500k': 0, '$500k - $1M': 0, '$1M - $5M': 0, 'Más de $5M': 0 };
    movs.forEach(m => {
      if (m.valor < 100000) rangos['Menos de $100k']++;
      else if (m.valor < 500000) rangos['$100k - $500k']++;
      else if (m.valor < 1000000) rangos['$500k - $1M']++;
      else if (m.valor < 5000000) rangos['$1M - $5M']++;
      else rangos['Más de $5M']++;
    });

    const tendencia = Object.entries(porDia)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([fecha, data]) => ({ fecha, total: data.total }));

    const top3Total = clientesData.slice(0, 3).reduce((s, c) => s + c.total, 0);
    const concentracion = total > 0 ? (top3Total / total) * 100 : 0;

    const fechas = movs.map(m => m.fecha).sort();
    const fechaDesde = fechas[0] || null;
    const fechaHasta = fechas[fechas.length - 1] || null;

    const mitad = Math.floor(tendencia.length / 2);
    const periodoAnterior = tendencia.slice(0, mitad).reduce((s, d) => s + d.total, 0);
    const periodoActual = tendencia.slice(mitad).reduce((s, d) => s + d.total, 0);
    const variacion = periodoAnterior > 0 ? ((periodoActual - periodoAnterior) / periodoAnterior) * 100 : 0;

    const sinIdentificarPct = total > 0 ? (sinIdentificarTotal / total) * 100 : 0;

    return {
      total,
      diaRecord: diaRecordData,
      clientePrincipal,
      topClientes,
      sinIdentificarTotal,
      rangos,
      tendencia,
      concentracion,
      fechaDesde,
      fechaHasta,
      totalMovimientos: movs.length,
      totalClientes: clientesData.length,
      totalPDFs: datos.pdfs,
      variacion: Math.round(variacion),
      sinIdentificarPct: Math.round(sinIdentificarPct),
    };
  }, [datos]);

  const handleExport = useCallback((data, filename) => {
    try {
      if (!data || data.length === 0) return;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Error exporting:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('popCarteraDashboardSections', JSON.stringify(activeSections));
  }, [activeSections]);

  if (!analytics) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <FileText size={48} strokeWidth={1} />
          <h3>Sin datos financieros</h3>
          <p>Carga extractos bancarios para ver tus indicadores.</p>
        </div>
      </div>
    );
  }

  const topClientesData = analytics.topClientes.map(c => ({
    nombre: c.nombre,
    total: c.total,
    porcentaje: Math.round((c.total / analytics.total) * 100),
  }));

  const concentracionData = analytics.topClientes.slice(0, 3).map(c => ({
    nombre: c.nombre,
    total: c.total,
  }));

  const rangosData = Object.entries(analytics.rangos).map(([rango, cantidad]) => ({ rango, cantidad }));

  const insightMessage = (() => {
    if (analytics.sinIdentificarTotal > 0)
      return `Hay ${formatCOP(analytics.sinIdentificarTotal)} sin clasificar (${analytics.sinIdentificarPct}% del total)`;
    if (analytics.concentracion > 60)
      return `${Math.round(analytics.concentracion)}% de los ingresos dependen de 3 clientes`;
    if (analytics.variacion > 10)
      return `El volumen creció un ${analytics.variacion}% respecto al período anterior`;
    return null;
  })();

  const sectionActive = id => activeSections.includes(id);

  const mesNombre = analytics.fechaDesde
    ? new Date(2026, parseInt(analytics.fechaDesde.split('/')[1]) - 1, 1)
        .toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={styles.container} role="main" aria-label="Dashboard de Indicadores Financieros">
      {/* Header simplificado */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Resumen financiero</h1>
          <p className={styles.periodo}>
            <Calendar size={14} />
            {mesNombre} · {analytics.totalPDFs} extractos · {analytics.totalMovimientos} movimientos
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconBtn} 
            onClick={() => setDrawerOpen(true)} 
            title="Personalizar vista"
            aria-label="Personalizar vista del dashboard"
          >
            <Settings size={18} />
          </button>
          <button 
            className={styles.iconBtn} 
            onClick={() => handleExport(analytics.movimientos, 'indicadores')}
            aria-label="Exportar todos los datos"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Hero premium */}
      {sectionActive('hero-total') && (
        <div className={styles.heroWrapper} role="banner">
          <div className={styles.heroBackground} />
          <div className={styles.heroContent}>
            <div className={styles.heroMainMetric}>
              <span className={styles.heroValue} aria-label={`Total recaudado: ${formatCOP(analytics.total)}`}>
                {formatCOP(analytics.total)}
              </span>
              <span className={styles.heroLabel}>Total recaudado</span>
              <div className={styles.heroDivider} />
              {analytics.variacion !== 0 && (
                <div className={`${styles.heroTrend} ${analytics.variacion >= 0 ? styles.trendPositive : styles.trendNegative}`}>
                  {analytics.variacion >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  <span>{Math.abs(analytics.variacion)}% vs período anterior</span>
                </div>
              )}
            </div>
            <div className={styles.heroMetadata}>
              <div className={styles.metadataItem}>
                <DollarSign size={16} className={styles.metadataIcon} />
                <span className={styles.metadataValue}>{analytics.totalMovimientos}</span>
                <span className={styles.metadataLabel}>pagos</span>
              </div>
              <div className={styles.metadataItem}>
                <Users size={16} className={styles.metadataIcon} />
                <span className={styles.metadataValue}>{analytics.totalClientes}</span>
                <span className={styles.metadataLabel}>clientes</span>
              </div>
              <div className={styles.metadataItem}>
                <Calendar size={16} className={styles.metadataIcon} />
                <span className={styles.metadataValue}>{mesNombre.split(' ')[0]}</span>
                <span className={styles.metadataLabel}>mes</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insight editorial */}
      {sectionActive('hero-insight') && insightMessage && (
        <div className={styles.insightEditorial} role="alert">
          <div className={styles.insightIcon}>
            <Zap size={14} />
          </div>
          <div>
            <p className={styles.insightTitle}>Insight principal</p>
            <p className={styles.insightText}>{insightMessage}</p>
            {analytics.sinIdentificarTotal > 0 && (
              <p className={styles.insightDetail}>
                Representan el {Math.round((analytics.sinIdentificarTotal / analytics.total) * 100)}% del recaudo total.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Visualización principal */}
      {sectionActive('chart-tendencia') && (
        <div className={styles.mainChartSection}>
          <TendenciaChart
            data={analytics.tendencia}
            onExport={() => handleExport(analytics.tendencia, 'tendencia')}
          />
        </div>
      )}

      {/* Detalles secundarios */}
      <div className={styles.secondaryGrid}>
        {sectionActive('detail-clientes') && (
          <div className={styles.secondaryItem} style={{ gridArea: 'clientes' }}>
            <TopClientesChart data={topClientesData} />
          </div>
        )}
        {sectionActive('detail-concentracion') && (
          <div className={styles.secondaryItem} style={{ gridArea: 'concentracion' }}>
            <ConcentracionIndicator data={concentracionData} porcentaje={analytics.concentracion} />
          </div>
        )}
        {sectionActive('detail-rangos') && (
          <div className={styles.secondaryItem} style={{ gridArea: 'rangos' }}>
            <RangosPagoChart 
              data={rangosData} 
              total={analytics.totalMovimientos} 
            />
          </div>
        )}
      </div>

      {/* Feed de actividad */}
      {sectionActive('activity-feed') && (
        <div className={styles.feedSection}>
          <ActivityFeed
            movimientos={datos.movimientos.slice(0, 10)}
            onExport={() => handleExport(datos.movimientos.slice(0, 10), 'actividad')}
          />
        </div>
      )}

      {/* Drawer */}
      <CustomizationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeSections={activeSections}
        setActiveSections={setActiveSections}
      />

      {/* Modal de detalle */}
      {detailModal && (
        <div className={styles.modalOverlay} onClick={() => setDetailModal(null)} role="dialog" aria-modal="true">
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Detalle</h3>
              <button 
                className={styles.modalClose} 
                onClick={() => setDetailModal(null)}
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>Información detallada próximamente.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

