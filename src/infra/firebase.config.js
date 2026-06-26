// ═══════════════════════════════════════════
// infra/firebase.config.js
// Configuración e inicialización de Firebase.
// Se llama una sola vez en main.jsx ANTES de createRoot.
// ═══════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app, auth, db;

/**
 * Inicializa Firebase con credenciales de .env.local
 * Llamar una sola vez en main.jsx, antes de renderizar la app.
 * @throws {Error} si faltan variables de .env.local
 */
export function initializeFirebase() {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Validar que todas las variables están presentes
  const camposRequeridos = Object.entries(firebaseConfig);
  const faltantes = camposRequeridos
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (faltantes.length > 0) {
    throw new Error(
      `Firebase: faltan variables de .env.local: [${faltantes.join(', ')}]. ` +
      `Copia .env.local.example a .env.local y llénalo con tus credenciales.`
    );
  }

  // Inicializar Firebase 
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  console.log('✓ Firebase initialized:', firebaseConfig.projectId);
}

/**
 * Obtiene la instancia de Auth después de inicializar.
 * @returns {Object} Firebase Auth instance
 */
export function getAuthInstance() {
  if (!auth) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() in main.jsx before creating the app.'
    );
  }
  return auth;
}

/**
 * Obtiene la instancia de Firestore después de inicializar.
 * @returns {Object} Firebase Firestore instance
 */
export function getFirestoreInstance() {
  if (!db) {
    throw new Error(
      'Firebase not initialized. Call initializeFirebase() in main.jsx before creating the app.'
    );
  }
  return db;
}

export default {
  initializeFirebase,
  getAuthInstance,
  getFirestoreInstance,
};
