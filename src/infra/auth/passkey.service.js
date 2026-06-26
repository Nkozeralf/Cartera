// src/infra/auth/passkey.service.js
// ═══════════════════════════════════════════
// Servicio de Passkeys (WebAuthn) - SIN CONTRASEÑAS
// ═══════════════════════════════════════════

import { getAuthInstance } from '../firebase.config.js';
import { signInAnonymously } from 'firebase/auth';

function getAuth() {
  return getAuthInstance();
}

// ─── UTILITIES ───

function bufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64URLToBuffer(base64url) {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const str = atob(base64);
  const buffer = new ArrayBuffer(str.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return buffer;
}

// ─── DETECCIÓN ───

export function isPasskeySupported() {
  return (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function' &&
    navigator.credentials &&
    typeof navigator.credentials.get === 'function'
  );
}

export async function isBiometricAvailable() {
  if (!isPasskeySupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ─── REGISTRO DE PASSKEY ───

/**
 * Registra una nueva Passkey para el usuario autenticado
 * @param {string} email - Email del usuario
 * @param {string} uid - UID de Firebase
 * @param {string} displayName - Nombre para mostrar
 */
export async function registerPasskey(email, uid, displayName) {
  if (!isPasskeySupported()) {
    throw new Error('Este navegador no soporta Passkeys');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: 'Quadra Finances',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(uid),
      name: email,
      displayName: displayName || email.split('@')[0],
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
    timeout: 60000,
    attestation: 'none',
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    const credData = {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
        attestationObject: bufferToBase64URL(credential.response.attestationObject),
        transports: credential.response.transports || [],
      },
    };

    // Almacenar credencial en localStorage (demo)
    localStorage.setItem('quadra_passkey', JSON.stringify(credData));
    localStorage.setItem('quadra_passkey_user', uid);

    console.log('✓ Passkey registrada correctamente');
    return { success: true, credential: credData };
  } catch (error) {
    console.error('Error registrando Passkey:', error);
    throw new Error(`Error registrando Passkey: ${error.message}`);
  }
}

// ─── AUTENTICACIÓN CON PASSKEY ───

/**
 * Autentica al usuario usando su Passkey registrada
 * @param {string} email - Email del usuario (para validación)
 */
export async function authenticateWithPasskey(email) {
  if (!isPasskeySupported()) {
    throw new Error('Este navegador no soporta Passkeys');
  }

  const storedCred = localStorage.getItem('quadra_passkey');
  if (!storedCred) {
    throw new Error('No se encontró una Passkey registrada en este dispositivo.');
  }

  const credData = JSON.parse(storedCred);
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions = {
    challenge: challenge,
    timeout: 60000,
    rpId: window.location.hostname,
    allowCredentials: [{
      id: base64URLToBuffer(credData.rawId),
      type: 'public-key',
    }],
    userVerification: 'required',
  };

  try {
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    if (!credential) {
      throw new Error('Autenticación cancelada');
    }

    const userUid = localStorage.getItem('quadra_passkey_user');
    if (!userUid) {
      throw new Error('Usuario local no mapeado');
    }

    console.log('✓ Autenticación Passkey exitosa');

    // Bridge: Crear sesión en Firebase Auth para persistencia
    const auth = getAuthInstance();
    await signInAnonymously(auth);

    return { success: true, uid: userUid };
  } catch (error) {
    console.error('Error autenticando con Passkey:', error);
    throw new Error(`Error de autenticación: ${error.message}`);
  }
}

export function removePasskey() {
  localStorage.removeItem('quadra_passkey');
  localStorage.removeItem('quadra_passkey_user');
}

export function hasPasskey() {
  return !!localStorage.getItem('quadra_passkey');
}