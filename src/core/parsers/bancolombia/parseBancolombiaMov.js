// ═══════════════════════════════════════════
// parseBancolombiaMov.js
// Parser para extractos Bancolombia formato "Movimientos de cuenta" empresarial
// (columnas: FECHA | DESCRIPCIÓN | SUCURSAL/CANAL | REFERENCIA 1 | REFERENCIA 2 | DOCUMENTO | VALOR)
//
// Captura TODOS los movimientos (ingresos y egresos), clasificados por tipo.
// Fecha en formato AAAA/MM/DD. Columnas separadas por posición X en el PDF.
// ═══════════════════════════════════════════

import {
  parsearValorCOP,
  limpiarDescripcion,
  extraerNombreCliente,
  extraerNIT,
} from '../normalizer.js';

const TOLERANCIA_Y = 2;

const COLUMNAS = {
  FECHA: { min: 0, max: 65 },
  DESCRIPCION: { min: 65, max: 235 },
  SUCURSAL: { min: 235, max: 325 },
  REFERENCIA_1: { min: 325, max: 393 },
  REFERENCIA_2: { min: 393, max: 462 },
  DOCUMENTO: { min: 462, max: 520 },
};

const REGEX_FECHA_ISO = /^(\d{4})\/(\d{2})\/(\d{2})$/;

const CLASIFICACION = [
  { prefijo: 'ABONO INTERESES', tipo: 'INTERES' },
  { prefijo: 'IMPTO GOBIERNO 4X1000', tipo: 'IMPUESTO_4X1000' },
  { prefijo: 'IMPO GOBIERNO 4X1000', tipo: 'IMPUESTO_4X1000' },
  { prefijo: 'COBRO IVA PAGOS AUTOMATICOS', tipo: 'IVA_SERVICIO' },
  { prefijo: 'IVA CUOTA PLAN', tipo: 'IVA_SERVICIO' },
  { prefijo: 'SERVICIO TRANSFERENCIA', tipo: 'COMISION_TRANSFERENCIA' },
  { prefijo: 'CUOTA PLAN CANAL', tipo: 'COMISION_MANEJO' },
  { prefijo: 'CUOTA MANEJO', tipo: 'COMISION_MANEJO' },
  { prefijo: 'PAGO PYME PROTEGIDO', tipo: 'SEGURO' },
  { prefijo: 'PAGO INTERBANC', tipo: 'PAGO_RECIBIDO' },
  { prefijo: 'PAGO PSE', tipo: 'PAGO_PSE' },
  { prefijo: 'PAGO DE PROV', tipo: 'PAGO_PROVEEDOR' },
  { prefijo: 'PAGO LLAVE', tipo: 'PAGO_LLAVE' },
  { prefijo: 'TRANSFERENCIA CTA SUC VIRTUAL', tipo: 'TRANSFERENCIA_TERCEROS' },
  { prefijo: 'TRANSFERENCIA VIRTUAL', tipo: 'TRANSFERENCIA_PROPIA' },
  { prefijo: 'TRANSFERENCIA', tipo: 'TRANSFERENCIA' },
];

const PREFIJOS_GENERICOS = [
  'ABONO INTERESES',
  'IMPTO GOBIERNO',
  'IMPO GOBIERNO',
  'COBRO IVA PAGOS AUTOMATICOS',
  'IVA CUOTA PLAN',
  'SERVICIO TRANSFERENCIA',
  'CUOTA PLAN CANAL',
  'CUOTA MANEJO',
  'PAGO PYME PROTEGIDO',
  'TRANSFERENCIA VIRTUAL',
  // Transferencias a otra cuenta solo identificadas por número de cuenta
  // (ver referencia1/referencia2), nunca por nombre legible en el texto.
  // Sin esto, el patrón genérico de extraerNombreCliente() produce falsos
  // positivos como "TRANSFERENCIA CTA SUC" tratado como si fuera un cliente.
  'TRANSFERENCIA CTA SUC VIRTUAL',
];

const PREFIJOS_OPERACION = [
  'PAGO INTERBANC',
  'PAGO DE PROV',
  'PAGO DE TERC',
  'PAGO LLAVE',
  'PAGO PSE',
];

// Sufijos societarios a quitar del nombre extraído, igual que hace
// parserBancolombia.js. Sin esto, extraerNombreCliente() de normalizer.js
// puede fallar en nombres cortos: su patrón genérico de respaldo exige que
// AMBAS palabras tengan 3+ letras, así que "MARPICO SA" no matchea (SA
// tiene solo 2 letras) y devuelve null, aunque "MARPICO" sí sea un nombre
// válido por sí solo.
const SUFIJOS_SOCIETARIOS = [
  ' S.A.S.', ' S.A.S', ' SAS',
  ' S.A.', ' S.A', ' SA',
  ' LIMITADA', ' LTDA',
  ' Y CIA', ' Y COMPAÑIA', ' SOCIEDAD',
];

/**
 * Heurística de detección: este formato se reconoce por tener MUCHAS líneas
 * que son exclusivamente una fecha con año completo (AAAA/MM/DD) — una por
 * cada fila de movimiento, ya que pdf.js extrae la fecha como un item de
 * texto aislado en su propia línea (columna separada por posición X).
 *
 * OJO: el formato antiguo (parserBancolombia.js) también puede contener
 * fechas AAAA/MM/DD sueltas en su propia línea, pero solo 1-2 veces (el
 * rango "DESDE: 2025/12/31 HASTA: 2026/01/31" del encabezado). Por eso no
 * basta con detectar SI aparece el patrón — hay que contar CUÁNTAS veces,
 * y exigir un mínimo que solo se explica por filas de movimiento reales,
 * no por un rango de fechas en el header.
 */
function detectar(textoCompleto) {
  if (!textoCompleto) return 0;

  let puntuacion = 0;

  if (/BANCOLOMBIA/i.test(textoCompleto)) puntuacion += 10;

  const lineasFechaCompleta = textoCompleto
    .split('\n')
    .filter(l => /^\d{4}\/\d{2}\/\d{2}$/.test(l.trim()));

  // Un extracto con muchas líneas de fecha completa aislada es casi
  // seguro este formato (una por fila). 2 líneas sueltas (rango de header
  // tipo DESDE/HASTA) no deben puntuar como si fueran filas de movimiento.
  if (lineasFechaCompleta.length >= 5) puntuacion += 60;
  else if (lineasFechaCompleta.length >= 1) puntuacion -= 30;

  if (/REFERENCIA\s*1/i.test(textoCompleto)) puntuacion += 20;
  if (/SUCURSAL\/CANAL/i.test(textoCompleto)) puntuacion += 10;

  return Math.max(0, Math.min(100, puntuacion));
}

/**
 * Función principal: parsea un extracto Bancolombia formato "Movimientos de cuenta".
 * @param {File} file - archivo PDF subido por el usuario
 * @returns {Promise<{movimientos: object[], metadata: object}>}
 */
async function parsear(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let metadata = null;
  const movimientos = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    const filas = reconstruirFilas(items);

    if (i === 1) {
      metadata = extraerMetadata(filas);
    }

    for (const fila of filas) {
      const mov = parsearFilaMovimiento(fila);
      if (mov) movimientos.push(mov);
    }
  }

  return { movimientos, metadata };
}

function reconstruirFilas(items) {
  const piezas = items
    .map(it => ({ text: it.str, x: it.transform[4], y: it.transform[5] }))
    .filter(p => p.text && p.text.trim());

  const filas = [];
  piezas.forEach(pieza => {
    const fila = filas.find(f => Math.abs(f.y - pieza.y) <= TOLERANCIA_Y);
    if (fila) {
      fila.piezas.push(pieza);
    } else {
      filas.push({ y: pieza.y, piezas: [pieza] });
    }
  });

  return filas
    .sort((a, b) => b.y - a.y)
    .map(f => ({ y: f.y, piezas: f.piezas.sort((a, b) => a.x - b.x) }));
}

function extraerMetadata(filas) {
  const texto = filas.map(f => f.piezas.map(p => p.text).join(' ')).join(' | ');

  const cuenta = (texto.match(/Cuenta:\s*(\d+)/) || [])[1] || null;
  const nit = (texto.match(/NIT:\s*(\d+)/) || [])[1] || null;
  const saldoActual = (texto.match(/Saldo Total Actual:\s*\$?([\d.,]+)/) || [])[1] || null;

  return {
    cuenta,
    nit,
    saldoActual: saldoActual ? parsearValorCOP(saldoActual) : null,
  };
}

function parsearFilaMovimiento(fila) {
  const { piezas } = fila;
  if (piezas.length === 0) return null;

  const primera = piezas[0];
  const matchFecha = primera.text.match(REGEX_FECHA_ISO);
  if (!matchFecha) return null;

  const [, anio, mes, dia] = matchFecha;

  const ultimaPieza = piezas[piezas.length - 1];
  if (!/^-?[\d.,]+\.\d{2}$/.test(ultimaPieza.text)) {
    return null;
  }
  const valor = parsearValorCOP(ultimaPieza.text);

  const piezasIntermedias = piezas.slice(1, piezas.length - 1);

  const columnas = {
    descripcion: [],
    sucursal: [],
    referencia1: [],
    referencia2: [],
    documento: [],
  };

  for (const pieza of piezasIntermedias) {
    const col = identificarColumna(pieza.x);
    if (col) columnas[col].push(pieza.text);
  }

  const descripcionOriginal = columnas.descripcion.join(' ').trim();
  const descripcion = limpiarDescripcion(descripcionOriginal);

  if (!descripcion) return null;

  const tipo = clasificarPorDescripcion(descripcion);
  const direccion = valor >= 0 ? 'INGRESO' : 'EGRESO';
  const esGenerico = esDescripcionGenerica(descripcion);

  let nombreCliente = null;
  if (!esGenerico) {
    nombreCliente = extraerNombreProveedor(quitarPrefijoOperacion(descripcion));
  }

  const referencia1 = limpiarReferencia(columnas.referencia1.join(' ').trim());
  const referencia2 = limpiarReferencia(columnas.referencia2.join(' ').trim());
  const documento = limpiarReferencia(columnas.documento.join(' ').trim());

  return {
    fecha: `${dia}/${mes}/${anio}`,
    fechaISO: `${anio}-${mes}-${dia}`,
    descripcion,
    descripcionOriginal,
    sucursal: columnas.sucursal.join(' ').trim() || null,
    referencia1,
    referencia2,
    documento,
    valor,
    direccion,
    tipo,
    nit: extraerNIT(descripcion),
    nombreCliente,
    esGenerico,
    confianza: nombreCliente ? 'ALTA' : (esGenerico ? 'BAJA' : 'MEDIA'),
  };
}

function identificarColumna(x) {
  if (x >= COLUMNAS.DESCRIPCION.min && x < COLUMNAS.DESCRIPCION.max) return 'descripcion';
  if (x >= COLUMNAS.SUCURSAL.min && x < COLUMNAS.SUCURSAL.max) return 'sucursal';
  if (x >= COLUMNAS.REFERENCIA_1.min && x < COLUMNAS.REFERENCIA_1.max) return 'referencia1';
  if (x >= COLUMNAS.REFERENCIA_2.min && x < COLUMNAS.REFERENCIA_2.max) return 'referencia2';
  if (x >= COLUMNAS.DOCUMENTO.min && x < COLUMNAS.DOCUMENTO.max) return 'documento';
  return null;
}

function clasificarPorDescripcion(descripcion) {
  const desc = descripcion.toUpperCase();
  for (const { prefijo, tipo } of CLASIFICACION) {
    if (desc.startsWith(prefijo)) return tipo;
  }
  return 'OTRO';
}

/**
 * Quita el prefijo operativo (ej. "PAGO INTERBANC", "PAGO DE PROV") Y los
 * sufijos societarios comunes (SA, SAS, LTDA...) del texto, dejando solo
 * el nombre "limpio" del proveedor/tercero. Esto es necesario antes de
 * llamar a extraerNombreCliente(), porque su patrón genérico de respaldo
 * no reconoce sufijos cortos como "SA" como parte válida de un nombre.
 */
function quitarPrefijoOperacion(descripcion) {
  const desc = descripcion.toUpperCase();
  let resultado = descripcion;

  for (const prefijo of PREFIJOS_OPERACION) {
    if (desc.startsWith(prefijo)) {
      resultado = descripcion.slice(prefijo.length).trim();
      break;
    }
  }

  const resultadoUpper = resultado.toUpperCase();
  for (const sufijo of SUFIJOS_SOCIETARIOS) {
    if (resultadoUpper.endsWith(sufijo)) {
      resultado = resultado.slice(0, resultado.length - sufijo.length).trim();
      break;
    }
  }

  return resultado;
}

/**
 * Intenta extraer el nombre de un proveedor/tercero para movimientos de
 * egreso. A diferencia de los ingresos (donde extraerNombreCliente busca
 * patrones como "TRANSF DE X"), en egresos el texto que queda después de
 * quitar el prefijo operativo YA ES el nombre casi siempre (ej. "PAGO PSE
 * MARPICO SA" → "MARPICO"). Por eso, si extraerNombreCliente() no encuentra
 * nada pero queda un texto razonable, se usa directamente como fallback.
 */
function extraerNombreProveedor(descripcionSinPrefijo) {
  const porPatron = extraerNombreCliente(descripcionSinPrefijo);
  if (porPatron) return porPatron;

  const limpio = descripcionSinPrefijo.trim();
  if (limpio.length >= 3 && !esDescripcionGenerica(limpio)) {
    return limpio;
  }

  return null;
}

function esDescripcionGenerica(descripcion) {
  const desc = descripcion.toUpperCase();
  return PREFIJOS_GENERICOS.some(p => desc.startsWith(p));
}

function limpiarReferencia(valor) {
  if (!valor) return null;
  const limpio = valor.replace(/\bnull\b/gi, '').trim();
  return limpio || null;
}

export default {
  id: 'bancolombia-movimientos',
  banco: 'Bancolombia',
  formato: 'Movimientos de cuenta empresarial (ingresos y egresos, clasificados)',
  detectar,
  parsear,
};