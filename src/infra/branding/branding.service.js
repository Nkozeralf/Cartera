// src/infra/branding/branding.service.js
// Servicio de branding con Firestore + localStorage fallback

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreInstance } from '../firebase.config';
import { saveBranding as saveToLocal, loadBranding as loadFromLocal } from '../../utils/persistence';

/**
 * Guarda branding en Firestore (no bloquea UI)
 */
export async function saveBrandingToFirestore(uid, brandingData) {
  try {
    if (!uid) throw new Error('UID de usuario requerido');
    
    const db = getFirestoreInstance();
    const docRef = doc(db, 'usuarios', uid, 'config', 'branding');
    
    const payload = {
      ...brandingData,
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (error) {
    console.warn('Error guardando branding en Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Carga branding desde Firestore
 */
export async function loadBrandingFromFirestore(uid) {
  try {
    if (!uid) throw new Error('UID de usuario requerido');
    
    const db = getFirestoreInstance();
    const docRef = doc(db, 'usuarios', uid, 'config', 'branding');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    
    return { success: false, data: null, message: 'No hay configuración guardada' };
  } catch (error) {
    console.warn('Error cargando branding desde Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sincroniza branding: guarda en Firestore y localStorage
 */
export async function syncBrandingToFirestore(uid, brandingData) {
  // Guardar en localStorage inmediatamente (offline-first)
  saveToLocal(brandingData);
  
  // Guardar en Firestore en background (no bloquear)
  if (uid) {
    saveBrandingToFirestore(uid, brandingData);
  }
}

/**
 * Migra datos de localStorage a Firestore (solo una vez)
 */
export async function migrateLocalBrandingToFirestore(uid) {
  try {
    const localData = loadFromLocal();
    if (!localData || !uid) return { success: false, skipped: true };
    
    // Verificar si ya existe en Firestore
    const existing = await loadBrandingFromFirestore(uid);
    if (existing.success && existing.data) {
      return { success: false, skipped: true, reason: 'Ya existe en Firestore' };
    }
    
    // Migrar
    const result = await saveBrandingToFirestore(uid, {
      ...localData,
      createdAt: serverTimestamp(),
    });
    
    return result;
  } catch (error) {
    console.warn('Error en migración:', error);
    return { success: false, error: error.message };
  }
}