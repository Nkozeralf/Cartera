// ═══════════════════════════════════════════
// infra/user/user.service.js
// Persistencia de configuración de usuario en Firestore
// SOLO lectura silenciosa. Writes desactivados temporalmente.
// localStorage = fuente principal de verdad.
// ═══════════════════════════════════════════

import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreInstance } from '../firebase.config.js';

/**
 * Obtiene la configuración de un usuario desde Firestore.
 * @param {string} uid
 * @returns {Promise<Object|null>} config o null si falla
 */
export async function getUserConfig(uid) {
  if (!uid) return null;

  try {
    const db = getFirestoreInstance();
    const docRef = doc(db, 'usuarios', uid, 'config', 'preferences');
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    if (!data || typeof data !== 'object') return null;

    return data;
  } catch {
    // Silencio total - no mostrar errores de permisos
    return null;
  }
}