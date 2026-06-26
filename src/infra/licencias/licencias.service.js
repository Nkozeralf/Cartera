// ═══════════════════════════════════════════
// infra/licencias/licencias.service.js
// Servicios de validación de licencias.
// ═══════════════════════════════════════════

import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreInstance } from '../firebase.config.js';

const db = getFirestoreInstance();

/**
 * Obtiene los datos de licencia de un usuario.
 * @param {string} uid - ID del usuario
 * @returns {Promise<Object|null>} { tipo, vence, activa, ... } o null
 */
export async function obtenerLicenciaUsuario(uid) {
  try {
    const docRef = doc(db, 'licencias', uid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data();
  } catch (err) {
    console.error(`Error obtenerLicenciaUsuario(${uid}):`, err);
    throw err;
  }
}

/**
 * Verifica si la licencia de un usuario está activa (no vencida).
 * @param {string} uid - ID del usuario
 * @returns {Promise<boolean>} true si activa, false si vencida o no existe
 */
export async function esLicenciaActiva(uid) {
  try {
    const licencia = await obtenerLicenciaUsuario(uid);
    if (!licencia) {
      return false;
    }

    if (licencia.vence) {
      const fechaVencimiento = new Date(licencia.vence);
      const hoy = new Date();
      return hoy <= fechaVencimiento;
    }

    return true;
  } catch (err) {
    console.error(`Error esLicenciaActiva(${uid}):`, err);
    throw err;
  }
}

export default {
  obtenerLicenciaEmpresa,
  esLicenciaActiva,
};
