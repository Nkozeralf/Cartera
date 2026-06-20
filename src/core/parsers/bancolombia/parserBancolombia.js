// ═══════════════════════════════════════════
// parserBancolombia.js
// Parser original: extractos Bancolombia formato "texto corrido" donde
// cada fila viene como "DD/MM descripción valor saldo" en una sola línea.
// Solo captura INGRESOS (valor > 0) — pensado para identificar pagos de clientes.
// ═══════════════════════════════════════════

import { parsearValorCOP as parsearValorCOPNormalizer } from '../normalizer.js';

const TOLERANCIA_Y = 2;
const REGEX_FILA = /^(\d{1,2})\/(\d{2})\s+(.+?)\s+(-?[\d.,]+)\s+(-?[\d.,]+)$/;
const REGEX_FILA_SIN_SALDO = /^(\d{1,2})\/(\d{2})\s+(.+?)\s+(-?[\d.,]+)$/;
const REGEX_NIT = /\b(\d{8,10})\b/;

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
  // 🔄 CAMBIO: /^PAGO PSE/i removido de esta lista. Antes este parser solo
  // capturaba ingresos, y un PAGO PSE casi nunca era un ingreso real, así
  // que se marcaba genérico por descarte. Ahora que también captura
  // egresos, PAGO PSE casi siempre trae un proveedor identificable en el
  // texto (ej. "PAGO PSE MARPICO SA" → proveedor "MARPICO") y SÍ debe
  // intentar extraer el nombre, igual que PAGO INTERBANC o PAGO DE PROV.
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

/**
 * Heurística de detección: este formato se reconoce por tener MUCHAS líneas
 * que son exclusivamente una fecha corta SIN año (D/MM o DD/MM) — una por
 * cada fila de movimiento, ya que pdf.js extrae la fecha como un item de
 * texto aislado en su propia línea (igual que ocurre con el otro formato,
 * pero ahí la fecha lleva año completo).
 *
 * No se puede usar REGEX_FILA/REGEX_FILA_SIN_SALDO aquí porque esos patrones
 * esperan "fecha + descripción + valor + saldo" en una sola línea de texto
 * corrido, y el extractor de texto usado para detección (extraerTextoPrimeraPagina
 * en parseDocumento.js) entrega cada item de pdf.js en su propia línea —
 * la fecha queda sola, sin el resto de la fila pegada.
 */
function detectar(textoCompleto) {
  if (!textoCompleto) return 0;

  let puntuacion = 0;

  if (/BANCOLOMBIA/i.test(textoCompleto)) puntuacion += 10;

  const lineasFechaCorta = textoCompleto
    .split('\n')
    .filter(l => /^\d{1,2}\/\d{2}$/.test(l.trim()));

  if (lineasFechaCorta.length >= 5) puntuacion += 60;

  // Si hay muchas líneas de fecha CON año completo (AAAA/MM/DD), es casi
  // seguro el otro formato (parseBancolombiaMov.js) — penalizamos fuerte.
  const lineasFechaCompleta = textoCompleto
    .split('\n')
    .filter(l => /^\d{4}\/\d{2}\/\d{2}$/.test(l.trim()));

  if (lineasFechaCompleta.length >= 5) puntuacion -= 50;

  if (/REFERENCIA\s*1/i.test(textoCompleto) || /SUCURSAL\/CANAL/i.test(textoCompleto)) {
    puntuacion -= 30;
  }

  return Math.max(0, Math.min(100, puntuacion));
}

async function parsear(file) {
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

    // 🔄 CAMBIO: ya no se descartan egresos (valor negativo). Antes este
    // parser solo devolvía ingresos porque su único uso era identificar
    // clientes que pagaban; ahora también se usa para conciliación general,
    // así que captura todo y deja que el consumidor (ClientesDashboard)
    // filtre por dirección si lo necesita.
    if (valor === 0) continue;

    const descLimpia = limpiarDescripcion(descripcion);

    // El filtro de intereses pequeños solo aplica a abonos (valor > 0);
    // un "ABONO INTERESES" siempre es positivo así que esta condición
    // no cambia de comportamiento, solo se mantiene explícita.
    if (descLimpia.includes('ABONO INTERESES') && valor > 0 && valor < 1000) continue;

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
      // 🔄 CAMBIO: campo nuevo, requerido por el filtro Ingresos/Egresos/Todos
      // de ClientesDashboard. Antes este parser no lo tenía porque solo
      // devolvía ingresos; ahora que devuelve ambos, hace falta distinguirlos.
      direccion: valor > 0 ? 'INGRESO' : 'EGRESO',
      nit: (descLimpia.match(REGEX_NIT) || [])[1] || null,
      nombreCliente,
      esGenerico,
      confianza: nombreCliente ? 'ALTA' : (esGenerico ? 'BAJA' : 'MEDIA'),
    });
  }

  return { movimientos, metadata: null };
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

export default {
  id: 'bancolombia-ingresos',
  banco: 'Bancolombia',
  formato: 'Texto corrido (fecha DD/MM, solo ingresos) — identificación de clientes',
  detectar,
  parsear,
};