// src/components/settings/UserSettingsPanel.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Palette, Image, User, ArrowLeft, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBranding } from '../../context/BrandingContext';
import styles from './UserSettingsPanel.module.css';

const COLOR_PRESETS = [
  '#1000A1', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7',
];

export default function UserSettingsPanel() {
  const navigate = useNavigate();
  const { 
    nombre, 
    logo, 
    brandPrimary, 
    fontFamily: fontFamilyProp, 
    modoOscuro, 
    manualMode,
    actualizarBranding, 
    alternarModoOscuro,
    resetToAutoMode 
  } = useBranding();

  const [displayName, setDisplayName] = useState(nombre);
  const [logoSrc, setLogoSrc] = useState(logo || '');
  const [primaryColor, setPrimaryColor] = useState(brandPrimary);
  const [fontFamily, setFontFamily] = useState(fontFamilyProp);

  const showToast = (message, icon, color) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '12px 20px',
          borderRadius: '12px',
          color: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '280px',
        }}
      >
        {icon}
        <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)' }}>
          {message}
        </span>
      </div>
    ), { id: 'settings-toast', duration: 2000 });
  };

  const handleColorSelect = (color) => {
    setPrimaryColor(color);
    actualizarBranding({ brandPrimary: color });
    showToast('Color de marca actualizado', <Palette size={16} style={{ color }} />, color);
  };

  const handleFontChange = (e) => {
    const newFont = e.target.value;
    setFontFamily(newFont);
    actualizarBranding({ fontFamily: newFont });
    showToast(`Fuente cambiada a ${newFont}`, <span style={{ fontSize: '1rem', fontFamily: 'serif' }}>Aa</span>);
  };

  const handleNameChange = (e) => {
    setDisplayName(e.target.value);
    actualizarBranding({ nombre: e.target.value });
    showToast('Nombre actualizado', <User size={16} style={{ color: '#a78bfa' }} />);
  };

  const handleLogoUrlChange = (e) => {
    setLogoSrc(e.target.value);
    actualizarBranding({ logo: e.target.value || null });
    if (e.target.value) {
      showToast('Logo actualizado', <Image size={16} style={{ color: '#60a5fa' }} />);
    }
  };

  const handleToggleMode = () => {
    alternarModoOscuro();
    showToast(
      `Modo cambiado a ${modoOscuro ? 'oscuro' : 'claro'}`,
      modoOscuro ? <Moon size={16} style={{ color: '#fbbf24' }} /> : <Sun size={16} style={{ color: '#f59e0b' }} />
    );
  };

  const handleResetToAuto = () => {
    resetToAutoMode();
    showToast('Modo automático activado', <Zap size={16} style={{ color: '#22c55e' }} />);
  };

  return (
    <div className={styles.container}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          padding: '0.5rem 0',
          marginBottom: '1rem',
        }}
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <h1 className={styles.title}>Personalización</h1>
      <p className={styles.subtitle}>Configura tu experiencia en Quadra Finances</p>

      {/* A. Tema */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          {modoOscuro ? <Moon size={18} className={styles.sectionIcon} /> : <Sun size={18} className={styles.sectionIcon} />}
          <span className={styles.sectionTitle}>Tema</span>
          <span className={styles.modeBadge}>
            {manualMode ? 'Manual' : 'Auto'}
          </span>
        </div>
        
        <div className={styles.themeToggle}>
          <div
            className={`${styles.toggleSwitch} ${modoOscuro ? styles.active : ''}`}
            onClick={handleToggleMode}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleToggleMode()}
          >
            <div className={styles.toggleKnob} />
          </div>
          <span className={styles.toggleLabel}>
            {modoOscuro ? 'Modo oscuro' : 'Modo claro'}
          </span>
          {!manualMode && (
            <button 
              className={styles.autoToggle}
              onClick={handleResetToAuto}
            >
              Auto
            </button>
          )}
        </div>
        
        <p className={styles.modeHint}>
          {manualMode 
            ? 'Modo fijado manualmente. El modo automático se activa de 18:00 a 07:00.' 
            : `Modo automático activo (${modoOscuro ? 'oscuro' : 'claro'}). Cambia según la hora.`}
        </p>
      </div>

      {/* B. Fuente */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} style={{ fontFamily: 'serif', fontSize: '18px' }}>Aa</span>
          <span className={styles.sectionTitle}>Fuente</span>
        </div>
        <select
          value={fontFamily}
          onChange={handleFontChange}
          className={styles.fontSelector}
        >
          <option value="Inter">Inter — Estándar</option>
          <option value="Syne">Syne — Vanguardista</option>
          <option value="Space Grotesk">Space Grotesk — Geométrico</option>
          <option value="Orbitron">Orbitron — Cyberpunk</option>
          <option value="Lexend">Lexend — Legibilidad</option>
          <option value="MuseoModerno">MuseoModerno — Artístico</option>
        </select>
        <p className={styles.fontHint}>
          {fontFamily === 'Syne' && 'Fuente imponente y brutalista para startups financieras'}
          {fontFamily === 'Space Grotesk' && 'Geometría pura, optimizada para pantallas'}
          {fontFamily === 'Orbitron' && 'Cyberpunk futurista para sistemas financieros'}
          {fontFamily === 'Lexend' && 'Máxima legibilidad en pantallas'}
          {fontFamily === 'MuseoModerno' && 'Vanguardia artística con estructura sólida'}
          {fontFamily === 'Inter' && 'Estándar, limpia y universal'}
        </p>

        {/* Vista previa de la fuente */}
        <div className={styles.fontPreview}>
          <h3 style={{ fontFamily: `var(--font-family-display)` }}>
            Vista previa de la fuente
          </h3>
          <p style={{ fontFamily: `var(--font-family-base)` }}>
            Este es un ejemplo de cómo se ve la fuente seleccionada.
            Quadra Finances - El cruce de cartera inteligente.
          </p>
          <div style={{ fontFamily: `var(--font-family-base)` }}>
            <strong>Negrita</strong> · <em>Itálica</em> · 1234567890
          </div>
        </div>
      </div>

      {/* C. Color primario */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Palette size={18} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>Color de marca</span>
        </div>
        <div className={styles.colorSection}>
          <div className={styles.colorGrid}>
            {COLOR_PRESETS.map((color) => (
              <div
                key={color}
                className={`${styles.colorSwatch} ${primaryColor === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleColorSelect(color)}
                title={color}
              >
                {primaryColor === color && (
                  <Check
                    size={16}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#fff',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className={styles.colorPreview}>
            <div className={styles.colorPreviewDot} style={{ backgroundColor: primaryColor }} />
            <input
              type="text"
              className={styles.colorInput}
              value={primaryColor}
              onChange={(e) => handleColorSelect(e.target.value)}
              placeholder="#1000A1"
            />
          </div>
        </div>
      </div>

      {/* D. Logo */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Image size={18} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>Logo</span>
        </div>
        <div className={styles.logoSection}>
          <div className={styles.logoPreview}>
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <Image size={28} className={styles.logoPlaceholder} />
            )}
          </div>
          <input
            type="text"
            className={styles.logoUrlInput}
            value={logoSrc}
            onChange={handleLogoUrlChange}
            placeholder="URL del logo (opcional)"
          />
        </div>
      </div>

      {/* E. Nombre */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <User size={18} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>Nombre para mostrar</span>
        </div>
        <input
          type="text"
          className={styles.nameInput}
          value={displayName}
          onChange={handleNameChange}
          placeholder="Tu nombre"
        />
      </div>

      {/* Info: cambios en vivo */}
      <p className={styles.liveHint}>
        <Zap size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
        Todos los cambios se aplican automáticamente en tiempo real
      </p>
    </div>
  );
}