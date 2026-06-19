import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import GlobalHeader from './components/shared/GlobalHeader';
import DashboardLauncher from './components/dashboard/DashboardLauncher';
import PasoFacturas from './components/conciliacion/PasoFacturas';
import PasoExtracto from './components/conciliacion/PasoExtracto';
import PasoConciliacion from './components/conciliacion/PasoConciliacion';
import ClientesDashboard from './components/clientes/ClientesDashboard';
import IndicadoresFinancieros from './components/charts/IndicadoresFinancieros';
import { obtenerDatos } from './infra/storage/localStorage.service';
import AppFooter from './components/shared/AppFooter';

export default function App() {
  const [facturas, setFacturas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pasoConciliacion, setPasoConciliacion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Cargar datos para el header
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

  // ✅ Callback para recibir datos desde ClientesDashboard
  const handleClientesUpdate = (clientesData, movimientosData) => {
    setClientes(clientesData);
    setMovimientos(movimientosData);
  };

  return (
    <BrowserRouter>
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
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <AppFooter />
    </BrowserRouter>
  );
}

