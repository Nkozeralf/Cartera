import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import { BrandingProvider } from './context/BrandingContext';
import GlobalHeader from './components/shared/GlobalHeader';
import DashboardLauncher from './components/dashboard/DashboardLauncher';
import PasoFacturas from './components/conciliacion/PasoFacturas';
import PasoExtracto from './components/conciliacion/PasoExtracto';
import PasoConciliacion from './components/conciliacion/PasoConciliacion';
import ClientesDashboard from './components/clientes/ClientesDashboard';
import IndicadoresFinancieros from './components/charts/IndicadoresFinancieros';
import UserSettingsPanel from './components/settings/UserSettingsPanel';
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthInstance } from './infra/firebase.config.js';
import { obtenerDatos } from './infra/storage/localStorage.service';
import AppFooter from './components/shared/AppFooter';
import Login from './components/auth/Login';

export default function App() {
  const [facturas, setFacturas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pasoConciliacion, setPasoConciliacion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth listener - sesion persistente de Firebase
  useEffect(() => {
    const auth = getAuthInstance();
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Cargar datos para el header
  const datos = obtenerDatos();
  const headerClientes = datos?.clientesEncontrados || 0;
  const headerMovimientos = datos?.movimientosProcesados || 0;
  const headerFacturas = facturas.length;

  function handleFacturasSiguiente(data) {
    setFacturas(data);
    setPasoConciliacion(1);
  }

  function handleExtractoSiguiente(data) {
    setMovimientos(data);
    setPasoConciliacion(2);
  }

  function handleAtras(pasoDestino) {
    setPasoConciliacion(pasoDestino);
  }

  // Callback para recibir datos desde ClientesDashboard
  const handleClientesUpdate = (clientesData, movimientosData) => {
    setClientes(clientesData);
    setMovimientos(movimientosData);
  };

  return (
    <BrandingProvider>
      <BrowserRouter>
        <Toaster 
          position="top-right" 
          reverseOrder={false}
          toastOptions={{
            style: {
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              fontFamily: 'system-ui, sans-serif',
            },
          }}
        />
        
        {authLoading ? null : !authUser ? (
          <Login />
        ) : (
          <>
            <GlobalHeader
              pasoActual={pasoConciliacion}
              movimientosCount={headerMovimientos}
              clientesCount={headerClientes}
              facturasCount={headerFacturas}
              movimientosData={movimientos}
              clientesData={clientes}
              isProcessing={isLoading}
            />

            <main id="main-content">
              <Routes>
                <Route path="/" element={<DashboardLauncher />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />

                <Route path="/conciliacion" element={
                  <>
                    {pasoConciliacion === 0 && (
                      <PasoFacturas
                        onSiguiente={handleFacturasSiguiente}
                      />
                    )}
                    {pasoConciliacion === 1 && (
                      <PasoExtracto
                        onSiguiente={handleExtractoSiguiente}
                        onAtras={() => handleAtras(0)}
                        facturas={facturas}
                      />
                    )}
                    {pasoConciliacion === 2 && (
                      <PasoConciliacion
                        facturas={facturas}
                        movimientos={movimientos}
                        onAtras={() => handleAtras(1)}
                      />
                    )}
                  </>
                } />

                <Route path="/clientes" element={
                  <ClientesDashboard onClientesUpdate={handleClientesUpdate} />
                } />

                <Route path="/indicadores" element={<IndicadoresFinancieros />} />

                <Route path="/settings" element={<UserSettingsPanel />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <AppFooter />
          </>
        )}
      </BrowserRouter>
    </BrandingProvider>
  );
}