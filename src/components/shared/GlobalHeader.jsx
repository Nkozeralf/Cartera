// src/components/shared/GlobalHeader.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, 
  FileSpreadsheet, 
  Users, 
  TrendingUp,
  Search,
  Menu,
  ChevronRight,
  Home,
  ChevronDown,
  Command,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Settings,
} from 'lucide-react';
import styles from './GlobalHeader.module.css';
import Fuse from 'fuse.js';
import { obtenerDatos } from '../../infra/storage/localStorage.service';
import { logout } from '../../infra/auth/auth.service';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useBranding } from '../../context/BrandingContext';
import { QuadraLogo } from './QuadraLogo';

// ==================== UTILITARIO DE PERFIL ====================
function getLoggedUserProfile(firebaseUser) {
  if (!firebaseUser) {
    return { displayName: 'Cargando...', initials: 'U', role: 'Analista Cartera' };
  }
  
  let name = firebaseUser.displayName;
  if (!name && firebaseUser.email) {
    const alias = firebaseUser.email.split('@')[0];
    name = alias.replace(/[._-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
  
  const initials = name 
    ? name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() 
    : 'U';
  
  const dominiosCorp = ['@quadra.co', '@quadra.com', '@glowy.co'];
  const isCorporate = firebaseUser.email 
    ? dominiosCorp.some(d => firebaseUser.email.toLowerCase().endsWith(d)) 
    : false;
  
  return {
    displayName: name || 'Usuario',
    initials: initials,
    role: isCorporate ? 'Analista Cartera' : 'Usuario Externo'
  };
}

// ==================== COMPONENTE DE BÚSQUEDA GLOBAL ====================
function GlobalSearch({ onClose, movimientos = [], clientes = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  const datosGuardados = useMemo(() => {
    if (movimientos.length > 0 || clientes.length > 0) {
      return { movimientos, clientes };
    }
    const stored = obtenerDatos();
    return {
      movimientos: stored?.movimientos || [],
      clientes: stored?.clientesData || [],
    };
  }, [movimientos, clientes]);

  const fuse = useMemo(() => {
    const searchData = [];
    const { clientes: clientesData, movimientos: movsData } = datosGuardados;
    
    if (clientesData && clientesData.length > 0) {
      clientesData.forEach(c => {
        searchData.push({
          type: 'cliente',
          label: c.nombre || 'Sin nombre',
          description: `Total: $${c.total?.toLocaleString() || 0} · ${c.cantidad || 0} movimientos`,
          icon: Users,
          searchText: c.nombre || '',
          data: c,
        });
      });
    }
    
    if (movsData && movsData.length > 0) {
      movsData.slice(0, 200).forEach(m => {
        const desc = m.descripcion || '';
        const cliente = m.nombreCliente || '';
        searchData.push({
          type: 'movimiento',
          label: desc.substring(0, 50) || 'Movimiento sin descripción',
          description: `$${m.valor?.toLocaleString() || 0} · ${m.fecha || '—'}`,
          icon: FileSpreadsheet,
          searchText: `${desc} ${cliente} ${m.fecha || ''}`,
          data: m,
        });
      });
    }
    
    return new Fuse(searchData, {
      keys: ['searchText', 'label', 'description'],
      threshold: 0.3,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [datosGuardados]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const term = query.trim();
    const fuseResults = fuse.search(term);
    
    const formattedResults = fuseResults.slice(0, 10).map(r => ({
      ...r.item,
      score: r.score,
    }));
    
    setResults(formattedResults);
  }, [query, fuse]);

  const handleResultClick = (result) => {
    if (result.type === 'cliente') {
      onClose();
      if (window.onSearchResult) {
        window.onSearchResult(result.label);
      }
    }
    onClose();
  };

  return (
    <div className={styles.searchOverlay} onClick={onClose}>
      <div className={styles.searchModal} onClick={e => e.stopPropagation()}>
        <div className={styles.searchInputWrapper}>
          <Search size={20} className={styles.searchModalIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchModalInput}
            placeholder="Buscar cliente, factura o movimiento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={styles.searchModalShortcut} onClick={onClose}>
            <Command size={14} />
            Esc
          </button>
        </div>
        
        {results.length > 0 && (
          <div className={styles.searchResults}>
            {results.map((r, i) => {
              const Icon = r.icon || FileSpreadsheet;
              return (
                <div 
                  key={i} 
                  className={styles.searchResultItem}
                  onClick={() => handleResultClick(r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(r)}
                >
                  <Icon size={16} className={styles.searchResultIcon} />
                  <div>
                    <div className={styles.searchResultLabel}>
                      {r.label}
                      <span className={styles.searchResultType}>
                        {r.type === 'cliente' ? 'Cliente' : 'Movimiento'}
                      </span>
                    </div>
                    <div className={styles.searchResultDesc}>{r.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {query && results.length === 0 && (
          <div className={styles.searchEmpty}>
            <Search size={20} />
            <span>No se encontraron resultados para "{query}"</span>
          </div>
        )}
        
        {!query && (
          <div className={styles.searchHints}>
            <span>
              <Command size={12} />
              Buscar por cliente, factura o movimiento
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function GlobalHeader({ 
  pasoActual = 0,
  movimientosCount = 0,
  clientesCount = 0,
  facturasCount = 0,
  movimientosData = [],
  clientesData = [],
  isProcessing = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logo: brandLogo, nombre: brandName, modoOscuro } = useBranding();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const userMenuRef = useRef(null);
  
  const [userStatus, setUserStatus] = useState('active');
  const [statusText, setStatusText] = useState('Activo');
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const statusTimerRef = useRef(null);

  // ─── CORRECCIÓN: PERFIL REAL DE FIREBASE ───
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    // Escucha en tiempo real quién está conectado de verdad
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const profile = getLoggedUserProfile(user);
        setCurrentUserProfile(profile);
      } else {
        setCurrentUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── CORRECCIÓN: LOGOUT SEGURO QUE SÍ LIMPIA TODO ───
  const handleSecureLogOut = async () => {
    try {
      await logout();
      
      // Limpieza absoluta para evitar fugas de información entre usuarios
      localStorage.clear(); 
      sessionStorage.clear();
      
      setUserMenuOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error durante el cierre de sesión:', err);
    }
  };

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
        setShowResetConfirm(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detectar interacciones del usuario (camaleón)
  useEffect(() => {
    const handleInteraction = () => {
      setLastInteraction(Date.now());
      if (userStatus === 'ausente') {
        setUserStatus('active');
        setStatusText('Activo');
      }
    };

    const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [userStatus]);

  // Actualizar estado según inactividad
  useEffect(() => {
    const checkStatus = () => {
      const now = Date.now();
      const diff = now - lastInteraction;

      if (isProcessing) {
        setUserStatus('ocupado');
        setStatusText('Procesando...');
        return;
      }

      if (window.hasError) {
        setUserStatus('error');
        setStatusText('Error');
        return;
      }

      if (diff < 30000) {
        setUserStatus('active');
        setStatusText('Activo');
      } else if (diff < 120000) {
        setUserStatus('pensando');
        setStatusText('Pensando...');
      } else {
        setUserStatus('ausente');
        setStatusText('Ausente');
      }
    };

    statusTimerRef.current = setInterval(checkStatus, 5000);
    return () => clearInterval(statusTimerRef.current);
  }, [lastInteraction, isProcessing]);

  // Función para reiniciar todos los datos manualmente
  const handleResetAll = () => {
    localStorage.clear();
    sessionStorage.clear();
    
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    setUserMenuOpen(false);
    setShowResetConfirm(false);
    window.location.reload();
  };

  const statusColors = {
    active: '#68D916',
    pensando: '#FAC000',
    ausente: '#0097FA',
    ocupado: '#E53500',
    error: '#B40300',
  };

  // Exponer función de búsqueda global
  useEffect(() => {
    window.onSearchResult = (term) => {
      if (location.pathname !== '/clientes') {
        navigate('/clientes');
      }
      window.dispatchEvent(new CustomEvent('searchClient', { detail: term }));
    };
    return () => {
      delete window.onSearchResult;
    };
  }, [location.pathname, navigate]);

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const currentPath = location.pathname;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const canGoBack = window.history.length > 1 && currentPath !== '/';

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ label: 'Inicio', path: '/' }];
    
    if (parts.length === 0) return crumbs;
    
    parts.forEach((part, index) => {
      const path = '/' + parts.slice(0, index + 1).join('/');
      const labels = {
        'conciliacion': 'Conciliación',
        'clientes': 'Clientes',
        'recaudo': 'Recaudo',
        'indicadores': 'Indicadores',
      };
      crumbs.push({ 
        label: labels[part] || part.charAt(0).toUpperCase() + part.slice(1), 
        path 
      });
    });
    
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clientes', label: 'Clientes', icon: Users },
  ];

  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Saltar al contenido principal
      </a>

      <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.chameleonBar} />

        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            {canGoBack && (
              <button 
                className={styles.backButton}
                onClick={handleGoBack}
                aria-label="Volver atrás"
                title="Volver atrás"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div className={styles.logoContainer} onClick={() => navigate('/')}>
              <div className={styles.logoWrapper}>
                <QuadraLogo isDarkMode={modoOscuro} size={36} />
              </div>
              <span className={styles.logoText}>{brandName || 'Quadra Finances'}</span>
            </div>
          </div>

          <nav className={styles.nav} role="navigation" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <button
                  key={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={() => navigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={styles.headerRight}>
            <button 
              className={styles.globalSearchButton}
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buscar global (Ctrl+K)"
              title="Buscar global (Ctrl+K)"
            >
              <Search size={16} />
              <span className={styles.searchButtonLabel}>Buscar...</span>
              <span className={styles.searchShortcut}>
                <Command size={12} />
                K
              </span>
            </button>

            <div className={styles.indicators}>
              {facturasCount > 0 && (
                <span className={styles.indicator} title="Facturas pendientes">
                  <FileSpreadsheet size={14} />
                  {facturasCount}
                </span>
              )}
              {clientesCount > 0 && (
                <span className={styles.indicator} title="Clientes activos">
                  <Users size={14} />
                  {clientesCount}
                </span>
              )}
              {movimientosCount > 0 && (
                <span className={styles.indicator} title="Movimientos processed">
                  <TrendingUp size={14} />
                  {movimientosCount}
                </span>
              )}
            </div>
            
            {/* MENÚ DE USUARIO */}
            <div className={styles.userMenu} ref={userMenuRef}>
              <div 
                className={styles.userTrigger}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
              >
                <div className={`${styles.userAvatar} ${styles[userStatus]}`}>
                  <div className={styles.avatarRing} />
                  <span className={styles.userInitials}>
                    {currentUserProfile?.initials || 'U'}
                  </span>
                  <div 
                    className={`${styles.statusIndicator} ${userStatus === 'pensando' || userStatus === 'ocupado' ? styles.pulsing : ''}`}
                    style={{ 
                      backgroundColor: statusColors[userStatus] || '#68D916',
                      boxShadow: `0 0 12px ${statusColors[userStatus]}40`
                    }}
                  />
                </div>
                
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {currentUserProfile?.displayName || 'Cargando...'}
                  </span>
                  <span className={styles.userRole}>
                    {currentUserProfile?.role || 'Usuario'}
                    <span 
                      className={styles.statusText}
                      style={{ color: statusColors[userStatus] }}
                    >
                      • {statusText}
                    </span>
                  </span>
                </div>
                
                <ChevronDown 
                  size={14} 
                  className={`${styles.userChevron} ${userMenuOpen ? styles.chevronOpen : ''}`}
                />
              </div>

              {userMenuOpen && (
                <div className={styles.dropdown}>
                  {!showResetConfirm ? (
                    <>
                      <div className={styles.dropdownHeader}>
                        <div className={styles.dropdownAvatar}>
                          {currentUserProfile?.initials || 'U'}
                        </div>
                        <div className={styles.dropdownIdentity}>
                          <span className={styles.dropdownName}>
                            {currentUserProfile?.displayName || 'Usuario'}
                          </span>
                          <span className={styles.dropdownRole}>
                            {currentUserProfile?.role || 'Analista de cartera'}
                          </span>
                        </div>
                      </div>

                      <div className={styles.dropdownStatus}>
                        <span
                          className={styles.dropdownStatusDot}
                          style={{ backgroundColor: statusColors[userStatus] || '#68D916' }}
                        />
                        <span>{statusText}</span>
                      </div>

                      <div className={styles.dropdownSection}>
                        <button 
                          className={styles.dropdownItem}
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/settings');
                          }}
                        >
                          <Settings size={15} />
                          <div>
                            <span>Personalizar</span>
                            <small>Tema, color, logo y nombre</small>
                          </div>
                        </button>

                        <button 
                          className={styles.dropdownItem}
                          onClick={() => {
                            setUserMenuOpen(false);
                            window.location.reload();
                          }}
                        >
                          <RefreshCw size={15} />
                          <div>
                            <span>Reiniciar análisis</span>
                            <small>Recargar cálculos y métricas</small>
                          </div>
                        </button>

                        <button 
                          className={styles.dropdownItem}
                          onClick={handleSecureLogOut}
                        >
                          <LogOut size={15} />
                          <div>
                            <span>Cerrar sesión de forma segura</span>
                            <small>Finalizar tu sesión en este dispositivo</small>
                          </div>
                        </button>
                      </div>

                      <div className={styles.dropdownDangerZone}>
                        <span className={styles.dangerLabel}>Zona sensible</span>
                        <button
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          onClick={() => setShowResetConfirm(true)}
                        >
                          <Trash2 size={15} />
                          <div>
                            <span>Eliminar todos los datos</span>
                            <small>Acción irreversible</small>
                          </div>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.dropdownWarning}>
                        <AlertTriangle size={18} />
                        <div>
                          <span className={styles.warningTitle}>¿Eliminar todos los datos?</span>
                          <span className={styles.warningText}>
                            Se borrarán extractos, clientes y configuraciones. Esta acción no se puede deshacer.
                          </span>
                        </div>
                      </div>

                      <div className={styles.dropdownActions}>
                        <button 
                          className={styles.dropdownBtnCancel}
                          onClick={() => setShowResetConfirm(false)}
                        >
                          Cancelar
                        </button>
                        <button 
                          className={styles.dropdownBtnConfirm}
                          onClick={handleResetAll}
                        >
                          Sí, eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <button 
              className={styles.mobileMenuToggle}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className={styles.breadcrumbs}>
          <nav aria-label="Ruta de navegación">
            <ol className={styles.breadcrumbList}>
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.path} className={styles.breadcrumbItem}>
                  {index === 0 && <Home size={14} className={styles.breadcrumbHome} />}
                  {index > 0 && <ChevronRight size={14} className={styles.breadcrumbSeparator} />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className={styles.breadcrumbLink}>
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <span className={styles.breadcrumbDate}>
            {new Date().toLocaleDateString('es-CO', { 
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Menú Móvil */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <button
                  key={item.path}
                  className={`${styles.mobileNavItem} ${isActive ? styles.active : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            
            <div className={styles.mobileMenuDivider} />
            <button
              className={`${styles.mobileNavItem} ${styles.mobileNavItemDanger}`}
              onClick={() => {
                if (confirm('¿Reiniciar todos los datos? Se borrarán extractos, clientes y configuraciones.')) {
                  handleResetAll();
                }
                setIsMobileMenuOpen(false);
              }}
            >
              <Trash2 size={20} />
              <span>Reiniciar datos</span>
            </button>
          </div>
        )}
      </header>

      {isSearchOpen && (
        <GlobalSearch 
          onClose={() => setIsSearchOpen(false)}
          movimientos={movimientosData}
          clientes={clientesData}
        />
      )}
    </>
  );
}