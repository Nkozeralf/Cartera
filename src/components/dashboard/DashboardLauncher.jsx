// src/components/dashboard/DashboardLauncher.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FileSpreadsheet,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Upload,
  FileText,
  ChevronRight,
  Zap,
  BarChart3,
  Download, 
  Layers,
  Scale, 
  Trash2,
  RotateCcw,
} from 'lucide-react';
import styles from './DashboardLauncher.module.css';

// Componente de KPI Card
function KPICard({ icon: Icon, value, label, color, trend }) {
  return (
    <div className={`${styles.kpiCard} ${styles[color]}`}>
      <div className={styles.kpiIconWrapper}>
        <Icon size={20} />
      </div>
      <div className={styles.kpiContent}>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiLabel}>{label}</span>
        {trend && <span className={styles.kpiTrend}>{trend}</span>}
      </div>
    </div>
  );
}

// Componente de Módulo Destacado
function FeaturedModule({ icon: Icon, title, description, badge, color, onClick }) {
  return (
    <div 
      className={`${styles.featuredCard} ${styles[color]}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Acceder a ${title}`}
    >
      <div className={styles.featuredIcon}>
        <Icon size={32} />
      </div>
      <div className={styles.featuredContent}>
        <div className={styles.featuredHeader}>
          <h3 className={styles.featuredTitle}>{title}</h3>
          {badge && <span className={styles.featuredBadge}>{badge}</span>}
        </div>
        <p className={styles.featuredDescription}>{description}</p>
        <span className={styles.featuredAction}>
          Acceder <ArrowRight size={16} />
        </span>
      </div>
    </div>
  );
}

// Componente de Módulo Secundario
function SecondaryModule({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  disabled = false, 
  statusIcon: StatusIcon = Clock,
  statusText 
}) {
  return (
    <div 
      className={`${styles.secondaryCard} ${disabled ? styles.disabled : styles.available}`}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && onClick()}
      aria-label={disabled ? `${title} (${statusText})` : `${title} - Disponible`}
    >
      <div className={styles.secondaryIcon}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <div className={styles.secondaryContent}>
        <h4 className={styles.secondaryTitle}>{title}</h4>
        <p className={styles.secondaryDescription}>{description}</p>
      </div>
      <div className={styles.secondaryRight}>
        <span className={`${styles.secondaryBadge} ${disabled ? styles.badgeDisabled : styles.badgeAvailable}`}>
          {StatusIcon && <StatusIcon size={12} />}
          {statusText || (disabled ? 'Próximamente' : 'Disponible')}
        </span>
        {!disabled && (
          <ChevronRight size={18} className={styles.secondaryChevron} />
        )}
      </div>
    </div>
  );
}

export default function DashboardLauncher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionData, setSessionData] = useState({
    firstVisit: true,
    hasData: false,
    pdfsCargados: 0,
    clientesEncontrados: 0,
    totalRecaudado: 0,
    movimientosProcesados: 0,
    ultimaActualizacion: null,
    actividadReciente: [],
  });

  // 1. Efecto unificado para controlar el Toast de bienvenida una sola vez
  useEffect(() => {
    // Almacenamos localmente las propiedades del estado actual de la navegación
    const state = location.state;
    if (!state?.userEmail) return; // Si no hay estado de login, no hace nada.

    const isNewUser = state.isNewUser;
    const userEmail = state.userEmail;
    // Extraer y capitalizar la primera letra del nombre para estética premium
    const rawName = userEmail.split('@')[0];
    const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    // Calcular saludo según hora
    const currentHour = new Date().getHours();
    let greeting = '¡Hola!';
    if (currentHour >= 6 && currentHour < 12) greeting = '¡Buenos días!';
    else if (currentHour >= 12 && currentHour < 19) greeting = '¡Buenas tardes!';
    else greeting = '¡Buenas noches!';

    const message = isNewUser 
      ? 'Te damos la bienvenida a QuadraFinances.' 
      : 'Qué bueno verte de nuevo en tu panel de control.';

    // Mostrar Toast con diseño pulido
    toast.custom((t) => (
      <div
        className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px 24px',
          borderRadius: '16px',
          color: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontFamily: 'system-ui, sans-serif',
          minWidth: '300px',
        }}
      >
        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#a78bfa' }}>
          {greeting} {userName}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          {message}
        </span>
      </div>
    ), { 
      id: 'welcome-toast', 
      duration: 5000,
      position: 'top-right',
    });

    // Limpiar el estado de la navegación de forma segura diferida
    window.history.replaceState({}, document.title);
  }, []); // Se ejecuta estrictamente una sola vez al montar el componente

  // 2. Cargar datos desde localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem('quadraData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSessionData(prev => ({
          ...prev,
          firstVisit: false,
          hasData: true,
          pdfsCargados: parsed.pdfsCargados || 0,
          clientesEncontrados: parsed.clientesEncontrados || 0,
          totalRecaudado: parsed.totalRecaudado || 0,
          movimientosProcesados: parsed.movimientosProcesados || 0,
          ultimaActualizacion: parsed.ultimaActualizacion || null,
          actividadReciente: parsed.actividadReciente || [],
        }));
      } catch (e) {
        console.error('Error al cargar datos:', e);
      }
    }
  }, []);

  // 3. Escuchar cambios en localStorage desde otros módulos
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'quadraData' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSessionData(prev => ({
            ...prev,
            hasData: true,
            pdfsCargados: parsed.pdfsCargados || 0,
            clientesEncontrados: parsed.clientesEncontrados || 0,
            totalRecaudado: parsed.totalRecaudado || 0,
            movimientosProcesados: parsed.movimientosProcesados || 0,
            ultimaActualizacion: parsed.ultimaActualizacion || null,
            actividadReciente: parsed.actividadReciente || [],
          }));
        } catch (e) {
          console.error('Error al procesar cambio:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Formatear valores numéricos a moneda colombiana estándar
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tieneDatos = sessionData.hasData && sessionData.pdfsCargados > 0;

  return (
    <div className={styles.container}>
      {/* Hero - Bienvenida */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>
            {sessionData.firstVisit ? 'Bienvenido a Quadra Finances' : 'Panel de Control'}
          </h1>
          <p className={styles.heroSubtitle}>
            {sessionData.firstVisit 
              ? 'Herramientas financieras para análisis y conciliación de cartera.' 
              : `Última actualización: ${formatDate(sessionData.ultimaActualizacion)}`
            }
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.sessionStatus}>
            <span className={`${styles.statusDot} ${tieneDatos ? styles.active : styles.inactive}`} />
            <span className={styles.statusText}>
              {tieneDatos ? `${sessionData.pdfsCargados} PDFs cargados` : 'Sin datos guardados'}
            </span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {tieneDatos && (
        <div className={styles.kpiGrid}>
          <KPICard
            icon={DollarSign}
            value={formatCurrency(sessionData.totalRecaudado)}
            label="Total recaudado"
            color="blue"
          />
          <KPICard
            icon={Users}
            value={sessionData.clientesEncontrados}
            label="Clientes detectados"
            color="green"
          />
          <KPICard
            icon={FileText}
            value={sessionData.movimientosProcesados}
            label="Movimientos procesados"
            color="purple"
          />
          <KPICard
            icon={FileSpreadsheet}
            value={sessionData.pdfsCargados}
            label="PDFs cargados"
            color="orange"
          />
        </div>
      )}

      {/* Guía de inicio */}
      {sessionData.firstVisit && (
        <div className={styles.guideCard}>
          <div className={styles.guideIcon}>
            <Zap size={24} />
          </div>
          <div className={styles.guideContent}>
            <h3 className={styles.guideTitle}>Comienza aquí</h3>
            <p className={styles.guideText}>
              Carga tus extractos bancarios para empezar a analizar el comportamiento de pago de tus clientes.
            </p>
            <div className={styles.guideSteps}>
              <span className={styles.guideStep}>
                <span className={styles.guideStepNum}>1</span>
                Sube extractos PDF
              </span>
              <span className={styles.guideStep}>
                <span className={styles.guideStepNum}>2</span>
                Procesa la información
              </span>
              <span className={styles.guideStep}>
                <span className={styles.guideStepNum}>3</span>
                Analiza resultados
              </span>
              <span className={styles.guideStep}>
                <span className={styles.guideStepNum}>4</span>
                Exporta reportes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Módulo Principal */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {tieneDatos ? 'Herramienta principal' : 'Empieza aquí'}
          </h2>
          <span className={styles.sectionBadge}>Recomendado</span>
        </div>
        <FeaturedModule
          icon={Users}
          title="Reporte de Clientes"
          description={tieneDatos 
            ? `${sessionData.clientesEncontrados} clientes analizados · ${formatCurrency(sessionData.totalRecaudado)} recaudados`
            : 'Sube tus extractos para analizar ingresos por cliente.'
          }
          badge={tieneDatos ? `${sessionData.clientesEncontrados} clientes` : 'Nuevo'}
          color="primary"
          onClick={() => navigate('/clientes')}
        />
      </div>

      {/* Módulos Secundarios */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <Layers size={18} strokeWidth={1.5} />
            <h2 className={styles.sectionTitle}>Herramientas adicionales</h2>
          </div>
        </div>
        <div className={styles.secondaryGrid}>
          <SecondaryModule
            icon={BarChart3}
            title="Indicadores Financieros"
            description="KPIs consolidados, concentración y salud de cartera."
            onClick={() => navigate('/indicadores')}
            disabled={false}
            statusIcon={CheckCircle}
            statusText="Disponible"
          />
          
          <SecondaryModule
            icon={FileSpreadsheet}
            title="Conciliación de Facturas"
            description="Cruza facturas de SIIGO contra extractos bancarios."
            onClick={() => navigate('/conciliacion')}
            disabled={true}
            statusIcon={Clock}
            statusText="En desarrollo"
          />
          
          <SecondaryModule
            icon={TrendingUp}
            title="Análisis de Recaudo"
            description="Evolución de ingresos detallada en el tiempo."
            disabled={true}
            statusIcon={Clock}
            statusText="Próximamente"
          />
          
          <SecondaryModule
            icon={Scale}
            title="Flujo de Caja"
            description="Visualiza ingresos vs egresos y calcula el flujo neto."
            disabled={true}
            statusIcon={Clock}
            statusText="Próximamente"
          />
        </div>
      </div>

      {/* Actividad Reciente */}
      {tieneDatos && sessionData.actividadReciente?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <Clock size={16} className={styles.sectionHeaderIcon} />
              <h2 className={styles.sectionTitle}>Actividad reciente</h2>
            </div>
            <span className={styles.sectionSubtitle}>
              {sessionData.actividadReciente.length} eventos
            </span>
          </div>
          
          <div className={styles.timeline}>
            {sessionData.actividadReciente.map((item, index) => {
              let Icon = FileSpreadsheet;
              let iconClass = styles.timelineIconDefault;
              
              if (item.text.includes('Procesados')) {
                Icon = BarChart3;
                iconClass = styles.timelineIconSuccess;
              } else if (item.text.toLowerCase().includes('limpiados')) {
                Icon = Trash2;
                iconClass = styles.timelineIconWarning;
              } else if (item.text.toLowerCase().includes('exportado')) {
                Icon = Download;
                iconClass = styles.timelineIconInfo;
              } else if (item.text.includes('Restauración')) {
                Icon = RotateCcw;
                iconClass = styles.timelineIconSuccess;
              }
              
              return (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineLeft}>
                    <div className={`${styles.timelineIcon} ${iconClass}`}>
                      <Icon size={14} />
                    </div>
                    {index < sessionData.actividadReciente.length - 1 && (
                      <div className={styles.timelineLine} />
                    )}
                  </div>
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineText}>{item.text}</p>
                    <span className={styles.timelineTime}>{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!tieneDatos && !sessionData.firstVisit && (
        <div className={styles.emptyState}>
          <Upload size={48} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Aún no hay datos</h3>
          <p className={styles.emptyText}>
            Carga tu primer extracto bancario en el módulo de <strong>Clientes</strong> o <strong>Conciliación</strong>.
          </p>
          <div className={styles.emptyActions}>
            <button className={styles.emptyButton} onClick={() => navigate('/clientes')}>
              <Users size={16} />
              Ir a Clientes
            </button>
            <button className={`${styles.emptyButton} ${styles.outline}`} onClick={() => navigate('/conciliacion')}>
              <FileSpreadsheet size={16} />
              Ir a Conciliación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}