// ═══════════════════════════════════════════
// infra/useAuth.js
// Hook de autenticación que envuelve auth.service.
// Maneja estado (user, loading, error).
// ═══════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  login as loginService,
  logout as logoutService,
  getCurrentUser,
  onAuthStateChangedListener,
} from './auth/auth.service.js';

/**
 * Hook de autenticación.
 * @returns {{
 *   user: Object|null,
 *   loading: boolean,
 *   error: string|null,
 *   login: (email: string, password: string) => Promise<void>,
 *   logout: () => Promise<void>
 * }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Suscribirse a cambios de auth al montar
  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((authUser) => {
      setUser(authUser);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    const { user: authUser, error: authError } = await loginService(email, password);
    if (authError) {
      setError(authError);
      setLoading(false);
      throw new Error(authError);
    }
    setUser(authUser);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    const { error: logoutError } = await logoutService();
    if (logoutError) {
      setError(logoutError);
      setLoading(false);
      throw new Error(logoutError);
    }
    setUser(null);
    setLoading(false);
  };

  return { user, loading, error, login, logout };
}

export default useAuth;
