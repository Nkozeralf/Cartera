// src/hooks/usePasskey.js
import { useState, useEffect } from 'react';
import { 
  isPasskeySupported, 
  isBiometricAvailable, 
  hasPasskey,
  registerPasskey,
  authenticateWithPasskey,
  removePasskey
} from '../infra/auth/passkey.service';

export function usePasskey() {
  const [supported, setSupported] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const supportedCheck = isPasskeySupported();
        setSupported(supportedCheck);
        
        if (supportedCheck) {
          const bioCheck = await isBiometricAvailable();
          setBiometricAvailable(bioCheck);
        }
        
        setHasRegisteredPasskey(hasPasskey());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, []);

  const register = async (email, displayName) => {
    setLoading(true);
    setError(null);
    try {
      const result = await registerPasskey(email, displayName);
      setHasRegisteredPasskey(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authenticateWithPasskey(email);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    removePasskey();
    setHasRegisteredPasskey(false);
  };

  return {
    supported,
    biometricAvailable,
    hasRegisteredPasskey,
    loading,
    error,
    register,
    authenticate,
    remove,
  };
}