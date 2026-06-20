// src/core/parsers/bbva/parserBBVA.js - VERSIÓN CORREGIDA

/**
 * Parser para extractos BBVA - formato tabla con columnas:
 * Movimiento | Fecha operación | Fecha valor | Concepto | Cargos | Abonos | Saldo
 */

// Palabras clave para detección
const PALABRAS_CLAVE_BBVA = [
  'BBVA',
  'CUENTA DIGITAL',
  'Extracto de Cuenta',
  'NÚMERO DE CUENTA',
];

// Patrones para clasificar movimientos
const PATRONES_TIPO = [
  { patron: /ABONO POR INTERESES/i, tipo: 'INTERES' },
  { patron: /CARGO POR IMPUESTO 4X1.000/i, tipo: 'IMPUESTO_4X1000' },
  { patron: /IMPUESTO 4X1.000/i, tipo: 'IMPUESTO_4X1000' },
  { patron: /CARGO POR IVA/i, tipo: 'IVA_SERVICIO' },
  { patron: /COMISION/i, tipo: 'COMISION_MANEJO' },
  { patron: /PAGO POR PSE/i, tipo: 'PAGO_PSE' },
  { patron: /COMPRA EN/i, tipo: 'PAGO_PROVEEDOR' },
  { patron: /PAGO A/i, tipo: 'PAGO_RECIBIDO' },
  { patron: /TRANSFERENCIA/i, tipo: 'TRANSFERENCIA' },
  { patron: /ABONO POR BRE-B/i, tipo: 'PAGO_RECIBIDO' },
];

/**
 * Función de detección
 */
function detectar(textoCompleto) {
  if (!textoCompleto) return 0;
  
  let puntuacion = 0;
  
  for (const palabra of PALABRAS_CLAVE_BBVA) {
    if (textoCompleto.includes(palabra)) {
      puntuacion += 15;
    }
  }
  
  if (/Movimiento\s*Fecha operación\s*Fecha valor\s*Concepto\s*Cargos\s*Abonos\s*Saldo/i.test(textoCompleto)) {
    puntuacion += 50;
  }
  
  const lineasFecha = textoCompleto
    .split('\n')
    .filter(l => /\d{2}-\d{2}-\d{4}/.test(l));
  
  if (lineasFecha.length >= 5) {
    puntuacion += 20;
  }
  
  return Math.max(0, Math.min(100, puntuacion));
}

/**
 * Función principal de parseo
 */
async function parsear(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const movimientos = [];
  let metadata = null;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    const filas = reconstruirFilas(items);

    if (i === 1) {
      metadata = extraerMetadata(filas);
    }

    for (const fila of filas) {
      const mov = parsearFila(fila);
      if (mov) movimientos.push(mov);
    }
  }

  return { movimientos, metadata };
}

/**
 * Reconstruye filas del PDF
 */
function reconstruirFilas(items) {
  const TOLERANCIA_Y = 2;
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

/**
 * Extrae metadata de la primera página
 */
function extraerMetadata(filas) {
  const texto = filas.map(f => f.piezas.map(p => p.text).join(' ')).join(' | ');
  
  const cuenta = (texto.match(/NÚMERO DE CUENTA:\s*(\d+)/i) || [])[1] || null;
  const cliente = (texto.match(/NOMBRE DEL CLIENTE:\s*([^|]+)/i) || [])[1]?.trim() || null;
  
  return {
    cuenta,
    nit: null,
    cliente,
    saldoActual: null,
  };
}

/**
 * 🔥 Parser mejorado: detecta correctamente cargos y abonos
 */
function parsearFila(fila) {
  const { piezas } = fila;
  if (piezas.length < 6) return null;

  const textos = piezas.map(p => p.text.trim());
  
  // Buscar fechas en formato DD-MM-AAAA
  const fechaIndex = textos.findIndex(t => /\d{2}-\d{2}-\d{4}/.test(t));
  if (fechaIndex === -1) return null;
  
  const fechaOp = textos[fechaIndex] || '';
  const fechaVal = textos[fechaIndex + 1] || '';
  
  // 🔥 Buscar el concepto
  let conceptoIndex = fechaIndex + 2;
  let concepto = '';
  
  for (let i = conceptoIndex; i < textos.length - 2; i++) {
    const texto = textos[i];
    if (/[a-zA-Z]/.test(texto) && !/\d{2}-\d{2}-\d{4}/.test(texto)) {
      concepto += texto + ' ';
    } else {
      break;
    }
  }
  
  concepto = concepto.trim();
  if (!concepto) return null;

  // 🔥 Buscar valores: cargo, abono y saldo
  const valores = textos.filter(t => /[\d.,]+/.test(t) && !/\d{2}-\d{2}-\d{4}/.test(t));
  
  let cargo = 0;
  let abono = 0;
  let saldo = 0;
  
  if (valores.length >= 3) {
    // El último es el saldo
    saldo = parsearValorBBVA(valores[valores.length - 1]);
    
    // El penúltimo es el valor del movimiento (cargo o abono)
    const valorMovimiento = parsearValorBBVA(valores[valores.length - 2]);
    
    // 🔥 DETECCIÓN MEJORADA:
    // - Si el concepto contiene palabras de CARGO/COMPRA/PAGO/IMPUESTO → es EGRESO
    // - Si contiene ABONO/INTERESES → es INGRESO
    // - Si el saldo disminuyó → es EGRESO
    // - Si el saldo aumentó → es INGRESO
    
    const esCargoPorConcepto = /CARGO|COMPRA|PAGO|IMPUESTO|IVA|COMISION|SEGURO|RETIRO|TRANSFERENCIA ENVIADA/i.test(concepto);
    const esAbonoPorConcepto = /ABONO|INTERESES|BRE-B|TRANSFERENCIA RECIBIDA|DEPOSITO/i.test(concepto);
    
    // 🔥 Usar el concepto para determinar dirección
    if (esCargoPorConcepto) {
      cargo = Math.abs(valorMovimiento);
      abono = 0;
    } else if (esAbonoPorConcepto) {
      abono = Math.abs(valorMovimiento);
      cargo = 0;
    } else {
      // Fallback: si el valor es positivo → abono, si es negativo → cargo
      if (valorMovimiento > 0) {
        // Pero si el concepto sugiere cargo, invertir
        if (/PAGO|COMPRA|CARGO/i.test(concepto)) {
          cargo = Math.abs(valorMovimiento);
          abono = 0;
        } else {
          abono = Math.abs(valorMovimiento);
          cargo = 0;
        }
      } else {
        cargo = Math.abs(valorMovimiento);
        abono = 0;
      }
    }
  }

  // Determinar valor y dirección
  let valor = 0;
  let direccion = '';
  
  if (abono > 0) {
    valor = abono;
    direccion = 'INGRESO';
  } else if (cargo > 0) {
    valor = -cargo;
    direccion = 'EGRESO';
  } else {
    return null;
  }

  // Clasificar tipo
  const tipo = clasificarPorConcepto(concepto);

  // Extraer nombre del cliente
  let nombreCliente = null;
  let esGenerico = false;

  if (tipo === 'PAGO_PSE') {
    const match = concepto.match(/PAGO POR PSE A\s+(.+?)(?:\s+REF|$)/i);
    if (match) {
      nombreCliente = match[1].trim();
    }
  }
  
  if (tipo === 'PAGO_PROVEEDOR') {
    const match = concepto.match(/COMPRA EN\s+(.+?)(?:\s+REF|$)/i);
    if (match) {
      nombreCliente = match[1].trim();
    }
  }

  // 🔥 Mejorar detección para ABONO POR BRE-B
  if (/ABONO POR BRE-B/i.test(concepto)) {
    nombreCliente = 'BRE-B - Transferencia recibida';
    // Si hay un cargo asociado (comisión), crear un movimiento separado
    // pero esto ya se maneja porque el cargo es un concepto diferente
  }

  if (/ABONO POR INTERESES/i.test(concepto)) {
    nombreCliente = 'Intereses de cuenta';
  }

  if (!nombreCliente) {
    esGenerico = true;
  }

  const fechaParseada = parsearFechaBBVA(fechaOp);

  return {
    fecha: fechaParseada ? fechaParseada.fecha : null,
    fechaISO: fechaParseada ? fechaParseada.fechaISO : null,
    descripcion: concepto,
    descripcionOriginal: concepto,
    sucursal: null,
    referencia1: null,
    referencia2: null,
    documento: null,
    valor,
    direccion,
    tipo,
    nit: null,
    nombreCliente,
    esGenerico,
    confianza: nombreCliente ? 'ALTA' : (esGenerico ? 'BAJA' : 'MEDIA'),
    saldo: saldo || null,
  };
}

/**
 * Parsea fecha en formato DD-MM-AAAA
 */
function parsearFechaBBVA(fechaStr) {
  if (!fechaStr) return null;
  
  let match = fechaStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match) {
    const [, dia, mes, anio] = match;
    return {
      fecha: `${dia}/${mes}/${anio}`,
      fechaISO: `${anio}-${mes}-${dia}`,
    };
  }
  
  match = fechaStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, dia, mes, anio] = match;
    return {
      fecha: `${dia}/${mes}/${anio}`,
      fechaISO: `${anio}-${mes}-${dia}`,
    };
  }
  
  return null;
}

/**
 * Parsea valor en formato BBVA
 */
function parsearValorBBVA(valorStr) {
  if (!valorStr) return 0;
  
  let limpio = valorStr.replace(/\s/g, '');
  limpio = limpio.replace(/,/g, '');
  
  const valor = parseFloat(limpio);
  return isNaN(valor) ? 0 : valor;
}

/**
 * Clasifica el movimiento por tipo según el concepto
 */
function clasificarPorConcepto(concepto) {
  const desc = concepto;
  
  for (const { patron, tipo } of PATRONES_TIPO) {
    if (patron.test(desc)) {
      return tipo;
    }
  }
  
  return 'OTRO';
}

export default {
  id: 'bbva-digital',
  banco: 'BBVA',
  formato: 'Cuenta Digital - Tabla con columnas (cargos/abonos)',
  detectar,
  parsear,
};