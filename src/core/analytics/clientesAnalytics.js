// Análisis de datos de clientes para el dashboard

// 🔄 CAMBIO: Mapeo de tipo -> etiqueta legible, usado cuando un movimiento
// no tiene nombreCliente (egresos sin tercero identificable: impuestos,
// comisiones, transferencias a cuenta sin nombre, etc). Antes todos estos
// caían en el mismo cajón "Sin identificar"; ahora se agrupan por categoría.
export const ETIQUETAS_POR_TIPO = {
  INTERES: 'Intereses ahorro',
  IMPUESTO_4X1000: 'Impuesto 4x1000',
  IVA_SERVICIO: 'IVA servicios',
  COMISION_TRANSFERENCIA: 'Comisión transferencia',
  COMISION_MANEJO: 'Comisión manejo cuenta',
  SEGURO: 'Seguro PYME',
  PAGO_RECIBIDO: 'Pago recibido (sin identificar)',
  PAGO_PSE: 'Pago PSE (sin identificar)',
  PAGO_PROVEEDOR: 'Pago a proveedor (sin identificar)',
  PAGO_LLAVE: 'Pago llave (sin identificar)',
  TRANSFERENCIA_TERCEROS: 'Transferencia a terceros',
  TRANSFERENCIA_PROPIA: 'Transferencia entre cuentas propias',
  TRANSFERENCIA: 'Transferencia',
  OTRO: 'Otros movimientos',
};

// 🔄 CAMBIO: decide la clave de agrupación. Prioridad: nombreCliente real
// > etiqueta legible por tipo (formato nuevo, parseBancolombiaMov.js) >
// descripción cruda (formato viejo, parserBancolombia.js, sin campo tipo)
// > "Sin identificar" como último recurso.
function obtenerClaveAgrupacion(m) {
  if (m.nombreCliente) return m.nombreCliente;
  if (m.tipo && ETIQUETAS_POR_TIPO[m.tipo]) return ETIQUETAS_POR_TIPO[m.tipo];
  if (m.descripcion) return m.descripcion;
  return 'Sin identificar';
}

// En clientesAnalytics.js
// En clientesAnalytics.js - Versión mejorada
export function obtenerMovimientosDeCliente(cliente, movimientos) {
  // Caso 1: "Sin identificar"
  if (cliente.nombre === 'Sin identificar') {
    return movimientos.filter(m => !m.nombreCliente && !m.tipo);
  }
  
  // Caso 2: Buscar si el nombre del cliente coincide con alguna etiqueta de tipo
  const tipoKey = Object.keys(ETIQUETAS_POR_TIPO).find(
    key => ETIQUETAS_POR_TIPO[key] === cliente.nombre
  );
  
  if (tipoKey) {
    // Buscar por tipo exacto
    const porTipo = movimientos.filter(m => m.tipo === tipoKey);
    if (porTipo.length > 0) return porTipo;
    
    // Fallback: buscar por coincidencia parcial en la descripción
    const nombreLimpio = cliente.nombre.toLowerCase().trim();
    return movimientos.filter(m => 
      m.descripcion && m.descripcion.toLowerCase().includes(nombreLimpio)
    );
  }
  
  // Caso 3: Cliente normal con nombre
  return movimientos.filter(m => m.nombreCliente === cliente.nombre);
}

/**
 * Agrupa movimientos por cliente y calcula estadísticas
 */
export function agruparPorCliente(movimientos) {
  const clientes = {};
  
  movimientos.forEach(m => {
    const nombre = obtenerClaveAgrupacion(m);
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

