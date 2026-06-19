// Gestión de persistencia con localStorage

const STORAGE_KEY = 'popCarteraData';

export function guardarDatos(data) {
  try {
    const current = obtenerDatos();
    const updated = {
      ...current,
      ...data,
      ultimaActualizacion: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Disparar evento para actualizar otros componentes
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(updated),
    }));
    return updated;
  } catch (e) {
    console.error('Error guardando datos:', e);
    return null;
  }
}

export function obtenerDatos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error obteniendo datos:', e);
  }
  return {
    pdfsCargados: 0,
    clientesEncontrados: 0,
    totalRecaudado: 0,
    movimientosProcesados: 0,
    ultimaActualizacion: null,
    actividadReciente: [],
  };
}

export function agregarActividad(texto, icono = '📄') {
  const data = obtenerDatos();
  const ahora = new Date();
  const timeStr = ahora.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  data.actividadReciente = [
    { text: texto, time: timeStr, icon: icono },
    ...(data.actividadReciente || []),
  ].slice(0, 20); // Mantener solo los últimos 20 eventos
  
  guardarDatos(data);
}

export function actualizarMetricas(pdfs, clientes, total, movimientos) {
  guardarDatos({
    pdfsCargados: pdfs,
    clientesEncontrados: clientes,
    totalRecaudado: total,
    movimientosProcesados: movimientos,
  });
}

