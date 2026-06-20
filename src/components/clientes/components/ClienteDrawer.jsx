import React, { useState, useMemo, useCallback } from 'react';
import { HelpCircle, Building2, Copy, RotateCcw, X } from 'lucide-react';
import styles from '../ClientesDashboard.module.css';
import { obtenerMovimientosDeCliente } from '@/core/analytics/clientesAnalytics';
import { getClienteIcon, getBancoLogo, esSinIdentificar } from '../utils/clientesVisualUtils';
import { formatCOP } from '@/core/utils/formatUtils';

export default function ClienteDrawer({ cliente, movimientos, onClose, filtroDireccion, detecciones }) {
  const [toastMessage, setToastMessage] = useState(null);

  const pagosCliente = useMemo(() => obtenerMovimientosDeCliente(cliente, movimientos), [movimientos, cliente]);
  const iconUrl = getClienteIcon(cliente.nombre);
  const esSinId = esSinIdentificar(cliente.nombre);

  const bancoOrigen = useMemo(() => {
    if (!detecciones || detecciones.length === 0) return null;
    if (pagosCliente.length === 0) return null;
    const primerMovimiento = pagosCliente[0];
    if (primerMovimiento && primerMovimiento.banco) return primerMovimiento.banco;
    return detecciones[0]?.banco || null;
  }, [detecciones, pagosCliente]);

  const logoBanco = bancoOrigen ? getBancoLogo(bancoOrigen) : null;

  const getTotalLabel = () => {
    if (filtroDireccion === 'INGRESO') return 'Total recaudado';
    if (filtroDireccion === 'EGRESO') return 'Total pagado';
    if (filtroDireccion === 'TODOS') return 'Balance neto';
    return 'Total';
  };

  const safeCopy = useCallback(async (text, successMsg) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setToastMessage(successMsg);
      } else {
        throw new Error('Clipboard not available');
      }
    } catch (err) {
      console.error('Clipboard error', err);
      setToastMessage('Error copiando al portapapeles');
    }
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const handleCopyNombre = useCallback(() => safeCopy(cliente.nombre, 'Nombre copiado'), [cliente.nombre, safeCopy]);

  const handleCopyPagos = useCallback(() => {
    const texto = pagosCliente.map(p => `${p.fecha} | ${p.descripcion} | ${formatCOP(p.valor)}`).join('\n');
    safeCopy(texto, `${pagosCliente.length} pagos copiados`);
  }, [pagosCliente, safeCopy]);

  const handleCopyPago = useCallback((pago) => {
    const texto = `${pago.fecha} | ${pago.descripcion} | ${formatCOP(pago.valor)}`;
    safeCopy(texto, 'Pago copiado');
  }, [safeCopy]);

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
          <div className={styles.drawerHeaderRight}>
            {logoBanco && (
              <img 
                src={logoBanco} 
                alt={bancoOrigen} 
                className={styles.drawerBancoLogo}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <button className={styles.drawerClose} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className={styles.drawerToast}>
            <span>✅ {toastMessage}</span>
          </div>
        )}

        <div className={styles.drawerStats}>
          <div className={styles.drawerStat}>
            <span className={styles.drawerStatLabel}>{getTotalLabel()}</span>
            <span className={styles.drawerStatValue}>{formatCOP(cliente.total)}</span>
          </div>
          <div className={styles.drawerStat}>
            <span className={styles.drawerStatLabel}>Movimientos</span>
            <span className={styles.drawerStatValue}>{cliente.cantidad}</span>
          </div>
          <div className={styles.drawerStat}>
            <span className={styles.drawerStatLabel}>Promedio</span>
            <span className={styles.drawerStatValue}>{formatCOP(cliente.total / cliente.cantidad)}</span>
          </div>
        </div>

        <div className={styles.drawerSection}>
          <div className={styles.drawerSectionHeader}>
            <h4 className={styles.drawerSectionTitle}>Historial de movimientos</h4>
            {pagosCliente.length > 0 && (
              <button 
                className={styles.drawerCopyAllBtn} 
                onClick={handleCopyPagos}
                aria-label="Copiar todos los movimientos"
                title="Copiar todos los movimientos"
              >
                <Copy size={14} />
                Copiar todo
              </button>
            )}
          </div>
          <div className={styles.drawerPagos}>
            {pagosCliente.length > 0 ? (
              pagosCliente.map((pago) => (
                <div key={`${pago.fecha}-${pago.descripcion}-${pago.valor}`} className={styles.drawerPago}>
                  <span className={styles.drawerPagoFecha}>{pago.fecha}</span>
                  <span className={styles.drawerPagoDesc}>{pago.descripcion}</span>
                  <span className={styles.drawerPagoValor}>{formatCOP(pago.valor)}</span>
                  <button 
                    className={styles.drawerPagoCopy}
                    onClick={(e) => { e.stopPropagation(); handleCopyPago(pago); }}
                    aria-label="Copiar este movimiento"
                    title="Copiar movimiento"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.drawerEmpty}>No hay movimientos registrados</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
