import { ArrowRight } from 'lucide-react';
import styles from './MetricCard.module.css';

export default function MetricCard({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  badge, 
  badgeColor,
  onClick,
  disabled = false,
}) {
  return (
    <div 
      className={`${styles.card} ${disabled ? styles.disabled : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={!disabled ? { '--card-color': color } : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={title}
      aria-disabled={disabled}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon} style={{ background: color + '15', color: color }}>
          <Icon size={24} />
        </div>
        {badge && (
          <span className={`${styles.cardBadge} ${badgeColor === '#10b981' ? styles.badgeVerde : badgeColor === '#f59e0b' ? styles.badgeAmarillo : styles.badgeGris}`}>
            {badge}
          </span>
        )}
      </div>
      
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDescription}>{description}</p>
      
      <div className={styles.cardFooter}>
        <span className={styles.cardAction}>
          {disabled ? 'Próximamente' : 'Acceder'}
          {!disabled && <ArrowRight size={16} className={styles.cardArrow} />}
        </span>
      </div>
      
      {!disabled && (
        <div className={styles.cardHoverGlow} style={{ background: `radial-gradient(circle at 30% 30%, ${color}20, transparent 70%)` }} />
      )}
    </div>
  );
}

