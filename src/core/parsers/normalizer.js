// ═══════════════════════════════════════════
// NORMALIZER.JS - Funciones de limpieza y normalización
// Compartido por todos los parsers de extractos bancarios.
// ═══════════════════════════════════════════

/**
 * Convierte un string de valor en pesos colombianos a número
 * Ejemplos:
 *   "$ 1.000.000" → 1000000
 *   "1.000.000,00" → 1000000
 *   "-500,000.00" → -500000
 *   "1000000" → 1000000
 */
export function parsearValorCOP(valorStr) {
  if (!valorStr || typeof valorStr !== 'string') return 0;

  let limpio = valorStr.trim();

  // Eliminar símbolo de peso y espacios
  limpio = limpio.replace(/\$\s*/g, '');

  // Detectar si es formato colombiano (puntos para miles, coma para decimales)
  // o formato internacional (comas para miles, punto para decimales)
  const tieneComaDecimal = /,\d{2}$/.test(limpio);
  const tienePuntoDecimal = /\.\d{2}$/.test(limpio);

  if (tieneComaDecimal) {
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  } else if (tienePuntoDecimal) {
    limpio = limpio.replace(/,/g, '');
  } else {
    limpio = limpio.replace(/[.,]/g, '');
  }

  const numero = parseFloat(limpio);
  return isNaN(numero) ? 0 : numero;
}

/**
 * Limpia y normaliza la descripción de un movimiento
 */
export function limpiarDescripcion(descripcion) {
  if (!descripcion) return '';

  let limpia = descripcion.trim();
  limpia = limpia.replace(/\s+/g, ' ');
  limpia = limpia.replace(/^[^\wáéíóúñÁÉÍÓÚÑ]+/, '');
  limpia = limpia.replace(/[^\wáéíóúñÁÉÍÓÚÑ]+$/, '');
  limpia = limpia.toUpperCase();

  return limpia;
}

/**
 * Detecta si un movimiento es genérico (no contiene nombre de cliente)
 */
export function esMovimientoGenerico(descripcion) {
  if (!descripcion) return true;

  const descUpper = descripcion.toUpperCase();

  const palabrasGenericas = [
    'ABONO INTERESES', 'CUOTA MANEJO', 'COMISION', 'IMPUESTO',
    'RETENCION', 'GRAVAMEN', 'IVA', 'RETEICA', 'RETEFUENTE',
    '4X1000', 'CUATRO POR MIL', 'SEGURO', 'TRANSFERENCIA INTERNA',
    'TRASLADO', 'AJUSTE', 'NOTA DEBITO', 'NOTA CREDITO', 'INTERESES',
    'RENDIMIENTOS', 'PAGO AUTOMATICO', 'DEBITO AUTOMATICO',
    'PAGO TARJETA', 'AVANCE', 'COMPRA', 'RETIRO', 'CONSIGNACION', 'DEPOSITO',
  ];

  if (descUpper.length < 50) {
    for (const palabra of palabrasGenericas) {
      if (descUpper.includes(palabra)) return true;
    }
  }

  if (descUpper.length < 10) return true;

  return false;
}

/**
 * Extrae el nombre del cliente de una descripción
 */
export function extraerNombreCliente(descripcion) {
  if (!descripcion) return null;

  const descUpper = descripcion.toUpperCase().trim();

  const patrones = [
    /TRANSF\s+(?:DE|DESDE|RECIBIDA\s+DE)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s+(?:POR|NIT|CC|$|REF|VALOR))/i,
    /PAGO\s+(?:DE|A|RECIBIDO\s+DE)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s+(?:POR|NIT|CC|$|REF|FACTURA))/i,
    /(?:CONSIGNACION|DEPOSITO)\s+(?:DE|DESDE)\s+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s+(?:NIT|CC|$|REF))/i,
    /(?:DE|PARA):\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,40}?)(?:\s+(?:NIT|CC|$|REF|VALOR))/i,
    /\b([A-ZÁÉÍÓÚÑ]{3,20}\s+[A-ZÁÉÍÓÚÑ]{3,20}(?:\s+[A-ZÁÉÍÓÚÑ]{3,20})?)\b/,
  ];

  for (const patron of patrones) {
    const match = descUpper.match(patron);
    if (match && match[1]) {
      const nombre = match[1].trim();

      const palabrasInvalidas = [
        'BANCO', 'BANCOLOMBIA', 'BBVA', 'DAVIVIENDA', 'ITAU',
        'TRANSFERENCIA', 'PAGO', 'ABONO', 'INTERES', 'TOTAL',
        'SALDO', 'VALOR', 'FECHA', 'DESCRIPCION', 'MOVIMIENTO',
        'DEBITO', 'CREDITO', 'EFECTIVO', 'CHEQUE', 'TARJETA',
        'CUENTA', 'AHORROS', 'CORRIENTE', 'NIT', 'CEDULA',
        'REFERENCIA', 'COMPROBANTE', 'OFICINA', 'CIUDAD',
      ];

      const esValido = !palabrasInvalidas.some(p =>
        nombre === p || nombre.startsWith(p + ' ')
      );

      if (esValido && nombre.length >= 3 && nombre.length <= 60) {
        return nombre;
      }
    }
  }

  return null;
}

/**
 * Extrae NIT de una descripción
 */
export function extraerNIT(descripcion) {
  if (!descripcion) return null;
  const match = descripcion.match(/\b(\d{8,10})\b/);
  return match ? match[1] : null;
}

/**
 * Normaliza una fecha a formato DD/MM/AAAA
 */
export function normalizarFecha(fechaStr) {
  if (!fechaStr) return null;

  const meses = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
  };

  let anio = new Date().getFullYear().toString();

  let match = fechaStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
  }

  match = fechaStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${anio}`;
  }

  match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  match = fechaStr.match(/^(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+(\d{4})$/i);
  if (match) {
    return `${match[1].padStart(2, '0')}/${meses[match[2].toUpperCase()]}/${match[3]}`;
  }

  return fechaStr;
}

/**
 * Determina la confianza de un movimiento basado en sus datos
 */
export function calcularConfianzaMovimiento(movimiento) {
  let puntuacion = 0;

  if (movimiento.fecha && movimiento.fecha.length >= 5) puntuacion += 25;
  if (movimiento.valor && !isNaN(movimiento.valor) && movimiento.valor !== 0) puntuacion += 25;
  if (movimiento.descripcion && movimiento.descripcion.length > 5) puntuacion += 20;
  if (movimiento.nombreCliente) puntuacion += 20;
  if (movimiento.nit) puntuacion += 10;

  return Math.min(100, puntuacion);
}

/**
 * Clasifica un movimiento como INGRESO o EGRESO
 */
export function clasificarMovimiento(valor) {
  if (valor > 0) return 'INGRESO';
  if (valor < 0) return 'EGRESO';
  return 'NEUTRO';
}

/**
 * Detecta si un texto contiene información de extracto bancario
 */
export function esExtractoBancario(texto) {
  if (!texto) return false;

  const textoUpper = texto.toUpperCase();

  const indicadores = [
    'EXTRACTO', 'ESTADO DE CUENTA', 'MOVIMIENTOS', 'CARTOLA',
    'TOTAL ABONOS', 'TOTAL CARGOS', 'SALDO ANTERIOR', 'SALDO ACTUAL',
    'FECHA', 'DESCRIPCION', 'VALOR',
  ];

  let coincidencias = 0;
  for (const indicador of indicadores) {
    if (textoUpper.includes(indicador)) coincidencias++;
  }

  return coincidencias >= 2;
}

export default {
  parsearValorCOP,
  limpiarDescripcion,
  esMovimientoGenerico,
  extraerNombreCliente,
  extraerNIT,
  normalizarFecha,
  calcularConfianzaMovimiento,
  clasificarMovimiento,
  esExtractoBancario,
};