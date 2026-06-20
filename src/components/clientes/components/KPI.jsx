import React from 'react';
import styles from '../ClientesDashboard.module.css';

export default function KPI({ icon: Icon, value, label, color }) {
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
