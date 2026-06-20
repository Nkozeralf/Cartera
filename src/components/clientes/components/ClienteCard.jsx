import React from 'react';
import { Building2, HelpCircle } from 'lucide-react';
import styles from '../ClientesDashboard.module.css';
import { getClienteIcon, esSinIdentificar } from '../utils/clientesVisualUtils';
import { formatCOP } from '@/core/utils/formatUtils';

export default function ClienteCard({ cliente, onClick, isSelected }) {
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
