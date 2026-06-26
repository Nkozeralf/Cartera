import { useState, useEffect } from 'react';
import styles from './Header.module.css';

const PASOS = ['Facturas SIIGO', 'Extracto bancario', 'Conciliación'];

export default function Header({ pasoActual }) {
  const [isSticky, setIsSticky] = useState(false);

  // Efecto para sticky en scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calcular porcentaje de progreso
  const progressPercentage = ((pasoActual + 1) / PASOS.length) * 100;

  // Determinar estado del paso
  const getStatus = (index) => {
    if (index < pasoActual) return 'completado';
    if (index === pasoActual) return 'activo';
    return 'pendiente';
  };

  return (
    <header 
      className={`${styles.header} ${isSticky ? styles.sticky : ''}`}
      role="banner"
      aria-label="Encabezado de navegación"
    >
      {/* Barra de progreso del stepper */}
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>

      <div className={styles.headerContent}>
        {/* Logo - Placeholder Quadra */}
        <div className={styles.logoContainer}>
          <div className={styles.logoPlaceholder}>
            Q
          </div>
        </div>

        {/* Stepper */}
        <nav 
          className={styles.stepper}
          role="navigation"
          aria-label="Progreso de pasos"
        >
          {PASOS.map((paso, i) => {
            const status = getStatus(i);
            
            return (
              <div
                key={i}
                className={`${styles.paso} ${styles[status]}`}
              >
                {/* Círculo del paso */}
                <div className={styles.circulo}>
                  {status === 'completado' ? (
                    <svg className={styles.checkmark} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  ) : (
                    <span className={styles.numero}>{i + 1}</span>
                  )}
                </div>

                {/* Label del paso */}
                <span className={styles.label}>
                  {paso}
                  {status === 'activo' && (
                    <span className={styles.liveDot} aria-label="Activo">●</span>
                  )}
                </span>

                {/* Línea conectora */}
                {i < PASOS.length - 1 && (
                  <div className={`${styles.linea} ${status === 'completado' ? styles.lineaCompletada : ''}`} />
                )}
              </div>
            );
          })}
        </nav>

        {/* Indicador de paso actual */}
        <div className={styles.stepCounter}>
          <span className={styles.currentStep}>{pasoActual + 1}</span>
          <span className={styles.totalSteps}>/{PASOS.length}</span>
        </div>
      </div>
    </header>
  );
}

