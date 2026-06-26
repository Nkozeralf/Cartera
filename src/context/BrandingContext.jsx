import React, { createContext, useState, useCallback, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestoreInstance } from '../infra/firebase.config';
import { 
  loadBrandingFromFirestore, 
  saveBrandingToFirestore, 
  migrateLocalBrandingToFirestore 
} from '../infra/branding/branding.service';
import { saveBranding as saveToLocal, loadBranding as loadFromLocal, saveTheme, loadTheme } from '../utils/persistence';

// Importar fuentes desde Google Fonts (cargadas en index.html)
const FONT_MAP = {
  'Syne': "'Syne', sans-serif",
  'Space Grotesk': "'Space Grotesk', sans-serif",
  'Orbitron': "'Orbitron', sans-serif",
  'Lexend': "'Lexend', sans-serif",
  'MuseoModerno': "'MuseoModerno', sans-serif",
  'Inter': "'Inter', sans-serif",
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * Determina el modo según la hora (18:00 - 07:00 = oscuro)
 */
function getAutoMode() {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 7) ? 'dark' : 'light';
}

/**
 * Aplica el tema completo al DOM: modo, color de marca, fuente.
 * CRÍTICO: Aplica a document.documentElement Y document.body
 */
function applyThemeToDOM(mode, primaryColor, fontFamily = 'Inter') {
  const root = document.documentElement;
  const body = document.body;

  // 1. data-theme (controla todos los tokens semánticos)
  root.setAttribute('data-theme', mode);

  // 2. Color de marca y variantes
  root.style.setProperty('--brand-primary', primaryColor);
  const { r, g, b } = hexToRgb(primaryColor);
  const hover = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
  root.style.setProperty('--brand-primary-hover', hover);
  root.style.setProperty('--brand-primary-light', `rgba(${r}, ${g}, ${b}, 0.15)`);
  root.style.setProperty('--brand-primary-gradient', `linear-gradient(135deg, ${primaryColor}, ${hover})`);

  // 3. Fuente personalizable - APLICAR A AMBOS root Y body
  const fontValue = FONT_MAP[fontFamily] || FONT_MAP['Inter'];
  root.style.setProperty('--font-family-base', fontValue);
  root.style.setProperty('--font-family-display', fontValue);
  body.style.fontFamily = fontValue;
}

export const BrandingContext = createContext();

export function BrandingProvider({ children }) {
  const [state, setState] = useState({
    nombre: 'Quadra Finances',
    logo: null,
    brandPrimary: '#4f7cff',
    modoOscuro: true,
    fontFamily: 'Inter',
    manualMode: false,
    uid: null,
    isLoading: true,
  });

  // Obtener UID del usuario autenticado
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario autenticado - cargar desde Firestore
        const uid = user.uid;
        
        // Intentar cargar desde Firestore
        const firestoreResult = await loadBrandingFromFirestore(uid);
        
        let brandingData;
        if (firestoreResult.success && firestoreResult.data) {
          // Firestore tiene datos - usarlos
          brandingData = firestoreResult.data;
        } else {
          // Firestore no tiene datos - intentar localStorage
          const localData = loadFromLocal();
          if (localData) {
            brandingData = localData;
            // Migrar a Firestore en background
            migrateLocalBrandingToFirestore(uid);
          } else {
            // Sin datos - usar defaults
            brandingData = {
              nombre: 'Quadra Finances',
              logo: null,
              brandPrimary: '#4f7cff',
              fontFamily: 'Inter',
            };
          }
        }
        
        // Determinar modo
        const savedTheme = loadTheme();
        const autoMode = getAutoMode();
        const initialMode = savedTheme ? savedTheme : autoMode;
        
        setState({
          nombre: brandingData.nombre || 'Quadra Finances',
          logo: brandingData.logo || null,
          brandPrimary: brandingData.brandPrimary || '#4f7cff',
          modoOscuro: initialMode === 'dark',
          fontFamily: brandingData.fontFamily || 'Inter',
          manualMode: !!savedTheme,
          uid,
          isLoading: false,
        });
        
        // Aplicar al DOM
        applyThemeToDOM(
          initialMode === 'dark' ? 'dark' : 'light',
          brandingData.brandPrimary || '#4f7cff',
          brandingData.fontFamily || 'Inter'
        );
      } else {
        // Sin usuario - usar solo localStorage
        const localData = loadFromLocal();
        const savedTheme = loadTheme();
        const autoMode = getAutoMode();
        const initialMode = savedTheme ? savedTheme : autoMode;
        
        setState({
          nombre: localData?.nombre || 'Quadra Finances',
          logo: localData?.logo || null,
          brandPrimary: localData?.brandPrimary || '#4f7cff',
          modoOscuro: initialMode === 'dark',
          fontFamily: localData?.fontFamily || 'Inter',
          manualMode: !!savedTheme,
          uid: null,
          isLoading: false,
        });
        
        applyThemeToDOM(
          initialMode === 'dark' ? 'dark' : 'light',
          localData?.brandPrimary || '#4f7cff',
          localData?.fontFamily || 'Inter'
        );
      }
    });

    return () => unsubscribe();
  }, []);

  // Modo automático: verificar cada minuto (solo si no hay usuario o manualMode es false)
  useEffect(() => {
    if (state.manualMode || state.isLoading) return;

    const checkHour = () => {
      const autoMode = getAutoMode();
      const shouldBeDark = autoMode === 'dark';
      
      if (shouldBeDark !== state.modoOscuro) {
        const newMode = shouldBeDark ? 'dark' : 'light';
        setState(prev => ({ ...prev, modoOscuro: shouldBeDark }));
        applyThemeToDOM(newMode, state.brandPrimary, state.fontFamily);
        saveTheme(newMode);
      }
    };

    const interval = setInterval(checkHour, 60000);
    checkHour();

    return () => clearInterval(interval);
  }, [state.manualMode, state.isLoading, state.modoOscuro, state.brandPrimary, state.fontFamily]);

  const actualizarBranding = useCallback(async (nuevosBranding) => {
    setState((prev) => {
      const actualizado = { ...prev, ...nuevosBranding };
      
      // Guardar en localStorage inmediatamente
      saveToLocal({
        nombre: actualizado.nombre,
        logo: actualizado.logo,
        brandPrimary: actualizado.brandPrimary,
        fontFamily: actualizado.fontFamily,
      });
      
      // Guardar en Firestore en background (no bloquear)
      if (actualizado.uid) {
        saveBrandingToFirestore(actualizado.uid, {
          nombre: actualizado.nombre,
          logo: actualizado.logo,
          brandPrimary: actualizado.brandPrimary,
          fontFamily: actualizado.fontFamily,
        });
      }
      
      // Aplicar al DOM
      const mode = actualizado.modoOscuro ? 'dark' : 'light';
      applyThemeToDOM(mode, actualizado.brandPrimary, actualizado.fontFamily);
      
      return actualizado;
    });
  }, []);

  const alternarModoOscuro = useCallback(() => {
    setState((prev) => {
      const newMode = !prev.modoOscuro;
      saveTheme(newMode ? 'dark' : 'light');
      applyThemeToDOM(newMode ? 'dark' : 'light', prev.brandPrimary, prev.fontFamily);
      return { ...prev, modoOscuro: newMode, manualMode: true };
    });
  }, []);

  const resetToAutoMode = useCallback(() => {
    const autoMode = getAutoMode();
    setState((prev) => {
      saveTheme(null); // Limpiar tema guardado
      applyThemeToDOM(autoMode, prev.brandPrimary, prev.fontFamily);
      return { ...prev, modoOscuro: autoMode === 'dark', manualMode: false };
    });
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        nombre: state.nombre,
        logo: state.logo,
        brandPrimary: state.brandPrimary,
        modoOscuro: state.modoOscuro,
        fontFamily: state.fontFamily,
        manualMode: state.manualMode,
        uid: state.uid,
        isLoading: state.isLoading,
        actualizarBranding,
        alternarModoOscuro,
        resetToAutoMode,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = React.useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding debe estar dentro de BrandingProvider');
  }
  return context;
}