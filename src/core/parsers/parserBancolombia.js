// ═══════════════════════════════════════════
// parserBancolombia.js - Parser original funcional
// ═══════════════════════════════════════════

const TOLERANCIA_Y = 2;
const REGEX_FILA = /^(\d{1,2})\/(\d{2})\s+(.+?)\s+(-?[\d.,]+)\s+(-?[\d.,]+)$/;
const REGEX_FILA_SIN_SALDO = /^(\d{1,2})\/(\d{2})\s+(.+?)\s+(-?[\d.,]+)$/;
const REGEX_NIT = /\b(\d{8,10})\b/;
const REGEX_TOTAL_ABONOS = /TOTAL ABONOS\s*\$?\s*([\d.,]+)/i;

// Prefijos para extraer nombre del cliente
const PREFIJOS_BANCO = [
  'PAGO INTERBANC',
  'PAGO PSE',
  'PAGO DE PROV',
  'PAGO DE TERC',
  'TRANSFERENCIA CTA SUC VIRTUAL',
  'TRANSFERENCIA VIRTUAL',
  'TRANSFERENCIA DESDE',
  'TRANSFERENCIA',
  'REV',
  'ABONO',
  'PAGO',
];

// Patrones de movimientos genéricos
const GENERIC_PATTERNS = [
  /^TRANSFERENCIA CTA SUC VIRTUAL/i,
  /^TRANSFERENCIA VIRTUAL/i,
  /^SERVICIO TRANSFERENCIA/i,
  /^CUOTA PLAN CANAL/i,
  /^IVA CUOTA PLAN/i,
  /^IMPO GOBIERNO/i,
  /^IMPTO GOBIERNO/i,
  /^COBRO IVA/i,
  /^PAGO PYME/i,
  /^ABONO INTERESES/i,
  /^REV /i,
  /^PAGO PSE/i,
];

const SUFIJOS = [
  ' S.A.S', ' SAS', ' S.A', ' SA',
  ' LIMITADA', ' LTDA', ' Y CIA', ' Y COMPAÑIA',
  ' SOCIEDAD', ' S.A.S.',
];

const PATRONES_LIMPIAR = [
  /\b\d{8,10}\b/g,
  /\b[A-Z]{2,5}\d{4,}\b/g,
  /\b\d{3,5}-\d{3,5}-\d{3,5}\b/g,
];

// ✅ Función principal
export async function parsearExtractoPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const movimientos = [];
  let textoCompleto = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    const texto = reconstruirTexto(items);
    textoCompleto += texto + '\n';
  }

  const lineas = textoCompleto.split('\n');

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia) continue;
    
    const tieneFecha = /^\d{1,2}\/\d{2}/.test(limpia);
    if (!tieneFecha) continue;

    let match = limpia.match(REGEX_FILA);
    let dia, mes, descripcion, valorStr, saldoStr;
    
    if (match) {
      [, dia, mes, descripcion, valorStr, saldoStr] = match;
    } else {
      const matchSimple = limpia.match(REGEX_FILA_SIN_SALDO);
      if (matchSimple) {
        [, dia, mes, descripcion, valorStr] = matchSimple;
        saldoStr = null;
      } else {
        continue;
      }
    }

    if (!dia || !mes || !descripcion || !valorStr) continue;

    const valor = parsearValorCOP(valorStr);
    
    // Solo ingresos (positivos)
    if (valor <= 0) continue;

    const descLimpia = limpiarDescripcion(descripcion);
    
    // Filtrar intereses pequeños
    if (descLimpia.includes('ABONO INTERESES') && valor < 1000) continue;

    const esGenerico = esMovimientoGenerico(descLimpia);
    let nombreCliente = null;
    
    if (!esGenerico) {
      nombreCliente = extraerNombreCliente(descLimpia);
    }

    if (nombreCliente && nombreCliente.length < 3) {
      nombreCliente = null;
    }

    movimientos.push({
      fecha: `${dia.padStart(2, '0')}/${mes}`,
      descripcion: descLimpia,
      descripcionOriginal: descripcion,
      valor,
      saldo: saldoStr ? parsearValorCOP(saldoStr) : null,
      nit: (descLimpia.match(REGEX_NIT) || [])[1] || null,
      nombreCliente,
      esGenerico,
      confianza: nombreCliente ? 'ALTA' : (esGenerico ? 'BAJA' : 'MEDIA'),
    });
  }

  return movimientos;
}

function parsearValorCOP(str) {
  if (!str) return 0;
  let limpio = str.replace(/\s/g, '').replace(/^\$/, '');
  let esNegativo = limpio.startsWith('-');
  if (esNegativo) limpio = limpio.substring(1);
  limpio = limpio.replace(/,/g, '');
  const valor = parseFloat(limpio);
  const resultado = isNaN(valor) ? 0 : valor;
  return esNegativo ? -resultado : resultado;
}

function limpiarDescripcion(descripcion) {
  let limpia = descripcion.trim();
  limpia = limpia.replace(/\s+/g, ' ');
  return limpia;
}

function esMovimientoGenerico(descripcion) {
  return GENERIC_PATTERNS.some(pattern => pattern.test(descripcion.trim()));
}

function extraerNombreCliente(descripcion) {
  let limpio = descripcion;

  for (const prefijo of PREFIJOS_BANCO) {
    const regex = new RegExp(`^${prefijo}`, 'i');
    if (regex.test(limpio)) {
      limpio = limpio.substring(prefijo.length);
      break;
    }
  }

  for (const sufijo of SUFIJOS) {
    if (limpio.toUpperCase().endsWith(sufijo.toUpperCase())) {
      limpio = limpio.substring(0, limpio.length - sufijo.length);
      break;
    }
  }

  for (const patron of PATRONES_LIMPIAR) {
    limpio = limpio.replace(patron, '');
  }

  limpio = limpio.replace(/\s+/g, ' ').trim();

  if (limpio.length < 2) return null;
  if (esMovimientoGenerico(limpio)) return null;

  return limpio;
}

function reconstruirTexto(items) {
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
    .map(f => f.piezas.sort((a, b) => a.x - b.x).map(p => p.text).join(' '))
    .join('\n');
}