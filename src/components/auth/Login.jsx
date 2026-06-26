// src/components/auth/Login.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  AlertCircle,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
} from '../../infra/auth/auth.service';

import { useMousePosition } from '../../hooks/useMousePosition';
import styles from './Login.module.css';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mousePos = useMousePosition();

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      containerRef.current.style.setProperty('--mouse-x', `${mousePos.x - rect.left}px`);
      containerRef.current.style.setProperty('--mouse-y', `${mousePos.y - rect.top}px`);
    }
  }, [mousePos]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Validación robusta según estándares de 2026
  const validateForm = () => {
    const { email, password } = formData;
    
    // Regex estándar y seguro para emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Introduce un correo electrónico válido.');
      return false;
    }

    // Estándar NIST 2026: Mínimo 8 caracteres (Alineado a QuadraFinances)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres por seguridad.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const authFunction = isRegister ? registerWithEmail : loginWithEmail;
      const result = await authFunction(formData.email, formData.password);

      if (result?.error) {
        // Norma de seguridad: No revelar si falló el correo o la contraseña (Evita enumeración)
        setError('Credenciales incorrectas. Por favor, verifica tus datos.');
        return;
      }

      navigate('/', { 
        state: { 
          isNewUser: isRegister, 
          userEmail: formData.email 
        } 
      });

    } catch (err) {
      // Log interno para desarrollo, pero jamás exponer detalles técnicos al usuario final
      console.error("Auth Emergency Log:", err);
      setError('Servicio no disponible temporalmente. Inténtalo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loginWithGoogle();
      if (result?.error) {
        setError('No se pudo autenticar con Google. Inténtalo de nuevo.');
        return;
      }
      if (result?.user) {
        navigate('/', { 
          state: { 
            isNewUser: false, 
            userEmail: result.user.email || 'Usuario' 
          } 
        });
      }
    } catch {
      setError('Error de conexión con el proveedor de identidad.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError(null);
    setFormData({ email: '', password: '' });
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.glowOrb} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Building2 size={24} />
          </div>
          <div className={styles.logoText}>
            Quadra<span>Finances</span>
          </div>
        </div>

        <p className={`${styles.subtitle} ${isRegister ? styles.subtitleRegister : ''}`}>
          {isRegister ? 'Comienza tu viaje financiero hoy' : 'Te extrañamos, accede a tu cuenta'}
        </p>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" width="18" height="18">
            <path fill="#EA4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.83 14.99 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.77 2.92c.88-2.64 3.38-4.38 6.73-4.38z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.67 2.84c2.14-1.97 3.38-4.88 3.38-8.48z"/>
            <path fill="#FBBC05" d="M5.27 14.58c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.5 7.3C.54 9.22 0 11.35 0 13.6s.54 4.38 1.5 6.3l3.77-2.92z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.67-2.84c-1.02.68-2.33 1.09-3.83 1.09-3.35 0-5.85-2.26-6.86-5.26L.83 16.01C2.73 19.92 6.78 23 12 23z"/>
          </svg>
          Continuar con Google
        </button>

        <div className={styles.divider}>
          <span>o usa tu correo electrónico</span>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Correo electrónico</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="ejemplo@correo.com"
                disabled={loading}
                className={error ? styles.error : ''}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                disabled={loading}
                className={error ? styles.error : ''}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage} role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={`${styles.submitButton} ${isRegister ? styles.registerActive : ''}`}
            disabled={loading || !formData.email || !formData.password}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                {isRegister ? 'Registrarme Ahora!' : 'Iniciar sesión'}
                <ArrowRight size={18} className={isRegister ? styles.arrowAnimated : ''} />
              </>
            )}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isRegister ? '¿Ya tienes una cuenta?' : 'Nuevo en Quadra'}
          <button type="button" onClick={toggleMode} className={styles.toggleLink}>
            {isRegister ? 'Inicia Sesión' : 'Regístrate aquí'}
          </button>
        </p>
      </div>
    </div>
  );
}