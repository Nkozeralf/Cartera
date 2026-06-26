// ═══════════════════════════════════════════
// auth.service.js
// Firebase Authentication service
// Proveedores: Email/Password + Google
// ═══════════════════════════════════════════

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from 'firebase/auth';

import { getAuthInstance } from '../firebase.config.js';

function getAuth() {
  return getAuthInstance();
}

// ─── EMAIL/PASSWORD LOGIN ───

export async function loginWithEmail(email, password) {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (err) {
    return { user: null, error: traducirErrorFirebase(err.code) };
  }
}

// ─── EMAIL/PASSWORD REGISTER ───

export async function registerWithEmail(email, password) {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (err) {
    return { user: null, error: traducirErrorFirebase(err.code) };
  }
}

// ─── GOOGLE LOGIN ───

export async function loginWithGoogle() {
  try {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    return { user: userCredential.user, error: null };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      return { user: null, error: null };
    }
    return { user: null, error: traducirErrorFirebase(err.code) };
  }
}

// ─── LOGOUT ───

export async function logout() {
  try {
    const auth = getAuth();
    await signOut(auth);
    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── PERFIL ───

const DOMINIOS_CORPORATIVOS = ['@quadra.co', '@quadra.com', '@glowy.co'];

export function getLoggedUserProfile() {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return null;

    let name = user.displayName;

    if (!name && user.email) {
      const alias = user.email.split('@')[0];
      name = alias
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const initials = name
      ? name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'U';

    const isCorporate = DOMINIOS_CORPORATIVOS.some((d) =>
      user.email?.toLowerCase().endsWith(d)
    );

    return {
      uid: user.uid,
      email: user.email,
      displayName: name || 'Usuario',
      photoURL: user.photoURL || null,
      initials: initials || 'U',
      role: isCorporate ? 'Analista Cartera' : 'Usuario Público',
      emailVerified: user.emailVerified,
      metadata: user.metadata,
    };
  } catch {
    return null;
  }
}

// ─── AUTH STATE ───

export function getCurrentUser() {
  try {
    const auth = getAuth();
    return auth.currentUser;
  } catch {
    return null;
  }
}

export function onAuthStateChangedListener(callback) {
  const auth = getAuth();
  return onAuthStateChanged(auth, callback);
}

// ─── UPDATE / DELETE ───

export async function actualizarPerfilUsuario(nuevoNombre, urlFoto = null) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) return false;
    await updateProfile(auth.currentUser, {
      displayName: nuevoNombre,
      photoURL: urlFoto || auth.currentUser.photoURL,
    });
    return true;
  } catch {
    return false;
  }
}

export async function eliminarCuenta() {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return { error: 'No hay usuario autenticado' };
    }
    await deleteUser(auth.currentUser);
    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── ERRORES ───

function traducirErrorFirebase(code) {
  const map = {
    'auth/user-not-found': 'No existe una cuenta con este correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/invalid-email': 'Correo electrónico inválido',
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método',
    'auth/popup-blocked': 'El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio',
    'auth/cancelled-popup-request': 'Operación cancelada',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
  };
  return map[code] || 'Error de autenticación. Intenta de nuevo';
}