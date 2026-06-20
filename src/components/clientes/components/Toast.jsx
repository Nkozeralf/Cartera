import React, { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import styles from '../ClientesDashboard.module.css';

export default function Toast({ message, action, onAction, onClose }) {
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
