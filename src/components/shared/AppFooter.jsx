import { useState, useEffect, useMemo } from 'react';
import { ArrowUp, AlertTriangle, CheckCircle, Wifi, Globe } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './AppFooter.module.css';
import packageJson from '../../../package.json';
import { obtenerDatos } from '../../infra/storage/localStorage.service';

const VERSION = packageJson.version || '1.0.0';

export default function AppFooter() {
  const [systemStatus, setSystemStatus] = useState({
    status: 'stable',
    message: 'Sistema estable',
    icon: CheckCircle,
    color: '#10b981',
  });
  const [errors, setErrors] = useState([]);

  // ✅ Leer datos REALES de localStorage
  const datosReales = useMemo(() => {
    const data = obtenerDatos();
    return {
      movimientos: data?.movimientos || [],
      totalRecaudado: data?.totalRecaudado || 0,
      clientes: data?.clientesEncontrados || 0,
      pdfs: data?.pdfsCargados || 0,
      ultimaActualizacion: data?.ultimaActualizacion || null,
    };
  }, []);

  // ✅ Generar datos para el gráfico desde movimientos REALES
  const chartData = useMemo(() => {
    const movs = datosReales.movimientos;
    if (!movs || movs.length === 0) return [];

    const agrupado = {};
    movs.forEach(m => {
      if (!agrupado[m.fecha]) agrupado[m.fecha] = 0;
      agrupado[m.fecha] += m.valor;
    });

    return Object.entries(agrupado)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([fecha, valor]) => ({ fecha, valor }));
  }, [datosReales.movimientos]);

  // ✅ Detectar errores de consola - CORREGIDO (sin dependencias que cambian)
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      setErrors(prev => [...prev, { type: 'error', message: args.join(' '), time: new Date() }].slice(-5));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      setErrors(prev => [...prev, { type: 'warn', message: args.join(' '), time: new Date() }].slice(-5));
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []); // ✅ Dependencia vacía - solo se ejecuta una vez

  // ✅ Estado del sistema - CORREGIDO (dependencias correctas)
  useEffect(() => {
    if (errors.some(e => e.type === 'error')) {
      setSystemStatus({
        status: 'error',
        message: `${errors.filter(e => e.type === 'error').length} errores`,
        icon: AlertTriangle,
        color: '#ef4444',
      });
    } else if (errors.some(e => e.type === 'warn')) {
      setSystemStatus({
        status: 'warning',
        message: `${errors.filter(e => e.type === 'warn').length} advertencias`,
        icon: AlertTriangle,
        color: '#f59e0b',
      });
    } else {
      setSystemStatus({
        status: 'stable',
        message: 'Sistema estable',
        icon: CheckCircle,
        color: '#10b981',
      });
    }
  }, [errors]); // ✅ Dependencia correcta

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const StatusIcon = systemStatus.icon;
  const tieneDatos = datosReales.movimientos.length > 0;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerMain}>
          {/* Logo y nombre */}
          <div className={styles.footerBrand}>
            <img 
              src="https://www.popagenciacreativa.com/page/page/include/img/simbolo.png" 
              alt="POP Agencia"
              className={styles.brandLogo}
            />
            <span className={styles.brandName}>POP Cartera</span>
            <span className={styles.brandVersion}>v{VERSION}</span>
          </div>

          {/* Stats */}
          <div className={styles.footerStats}>
            {tieneDatos ? (
              <>
                <span className={styles.footerStat}>
                  <span className={styles.footerStatLabel}>Recaudo</span>
                  <span className={styles.footerStatValue}>
                    ${(datosReales.totalRecaudado / 1000000).toFixed(1)}M
                  </span>
                </span>
                <span className={styles.footerStatDivider} />
                <span className={styles.footerStat}>
                  <span className={styles.footerStatLabel}>Clientes</span>
                  <span className={styles.footerStatValue}>
                    {datosReales.clientes}
                  </span>
                </span>
                <span className={styles.footerStatDivider} />
                <span className={styles.footerStat}>
                  <span className={styles.footerStatLabel}>PDFs</span>
                  <span className={styles.footerStatValue}>
                    {datosReales.pdfs}
                  </span>
                </span>
              </>
            ) : (
              <span className={styles.footerStatEmpty}>Sin datos cargados</span>
            )}
          </div>

          {/* Estado del sistema */}
          <div className={styles.footerTech}>
            <div className={`${styles.techItem} ${styles[systemStatus.status]}`}>
              <StatusIcon size={12} />
              <span>{systemStatus.message}</span>
            </div>
            <div className={styles.techDivider} />
            <div className={styles.techItem}>
              <Wifi size={12} />
              <span>{navigator.onLine ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Mini Gráfica */}
          <div className={styles.footerChart}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="footerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="fecha" hide />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(v) => [`$${v.toLocaleString()}`, 'Recaudo']}
                    labelFormatter={(label) => `Fecha: ${label}`}
                    contentStyle={{ 
                      background: 'rgba(11,16,38,0.95)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px',
                      fontSize: '10px',
                      color: 'white',
                      padding: '4px 8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#3b82f6" 
                    strokeWidth={1.5}
                    fill="url(#footerGradient)"
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.footerChartEmpty}>
                <span>Sin datos</span>
              </div>
            )}
          </div>

          {/* Volver arriba */}
          <button 
            className={styles.scrollButton}
            onClick={scrollToTop}
            aria-label="Volver al inicio"
            title="Volver al inicio"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}

