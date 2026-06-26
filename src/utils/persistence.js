// Servicio simple para persistencia en localStorage
// Usado por BrandingContext para guardar preferencias del usuario

const STORAGE_KEYS = {
  branding: 'quadra-branding',
  theme: 'quadra-theme',
};

export function saveBranding(branding) {
  try {
    localStorage.setItem(STORAGE_KEYS.branding, JSON.stringify(branding));
  } catch (err) {
    console.warn('Failed to save branding:', err);
  }
}

export function loadBranding() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.branding);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('Failed to load branding:', err);
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch (err) {
    console.warn('Failed to save theme:', err);
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  } catch (err) {
    console.warn('Failed to load theme:', err);
    return 'light';
  }
}
