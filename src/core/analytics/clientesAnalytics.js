// Análisis de datos de clientes para el dashboard

/**
 * Agrupa movimientos por cliente y calcula estadísticas
 */
export function agruparPorCliente(movimientos) {
  const clientes = {};
  
  movimientos.forEach(m => {
    const nombre = m.nombreCliente || 'Sin identificar';
    if (!clientes[nombre]) {
      clientes[nombre] = {
        nombre,
        total: 0,
        cantidad: 0,
        movimientos: [],
        primerPago: null,
        ultimoPago: null,
      };
    }
    clientes[nombre].total += m.valor;
    clientes[nombre].cantidad += 1;
    clientes[nombre].movimientos.push(m);
    
    if (!clientes[nombre].primerPago || m.fecha < clientes[nombre].primerPago) {
      clientes[nombre].primerPago = m.fecha;
    }
    if (!clientes[nombre].ultimoPago || m.fecha > clientes[nombre].ultimoPago) {
      clientes[nombre].ultimoPago = m.fecha;
    }
  });
  
  return Object.values(clientes).sort((a, b) => b.total - a.total);
}

/**
 * Calcula estadísticas globales de todos los clientes
 */
export function calcularEstadisticasGlobales(clientesData) {
  if (!clientesData || clientesData.length === 0) {
    return {
      totalClientes: 0,
      totalIngresos: 0,
      totalTransacciones: 0,
      promedioPorCliente: 0,
      clienteMayorIngreso: null,
      clienteMasTransacciones: null,
    };
  }
  
  const totalIngresos = clientesData.reduce((s, c) => s + c.total, 0);
  const totalTransacciones = clientesData.reduce((s, c) => s + c.cantidad, 0);
  
  return {
    totalClientes: clientesData.length,
    totalIngresos,
    totalTransacciones,
    promedioPorCliente: totalIngresos / clientesData.length,
    clienteMayorIngreso: clientesData[0] || null,
    clienteMasTransacciones: clientesData.sort((a, b) => b.cantidad - a.cantidad)[0] || null,
  };
}

