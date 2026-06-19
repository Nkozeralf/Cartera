// Parsea el extracto Bancolombia y retorna solo ingresos (valores positivos)
// ✅ VERSIÓN CORREGIDA - Maneja correctamente signos negativos
// ✅ VERSIÓN CON AUDITORÍA COMPLETA Y COMPATIBILIDAD HACIA ATRÁS

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

// Patrones de movimientos genéricos (sin nombre de cliente)
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

// Sufijos para limpiar nombres de clientes
const SUFIJOS = [
  ' S.A.S', ' SAS', ' S.A', ' SA',
  ' LIMITADA', ' LTDA', ' Y CIA', ' Y COMPAÑIA',
  ' SOCIEDAD', ' S.A.S.',
];

// Patrones para limpiar NIT, referencias y códigos
const PATRONES_LIMPIAR = [
  /\b\d{8,10}\b/g, // NIT
  /\b[A-Z]{2,5}\d{4,}\b/g, // Códigos de referencia
  /\b\d{3,5}-\d{3,5}-\d{3,5}\b/g, // Formatos de referencia
];

// ✅ Función principal con auditoría completa
export async function parsearExtractoPDFConAuditoria(file, options = {}) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const movimientos = [];
  const movimientosRechazados = [];
  let totalAbonosPDF = 0;
  let estadisticas = {
    lineasTotales: 0,
    lineasConFecha: 0,
    lineasAceptadas: 0,
    lineasRechazadas: 0,
    totalAbonosExtraido: 0,
    totalAbonosPDF: 0,
    diferenciaPorcentual: 0,
    estadoExtraccion: 'PENDIENTE',
  };

  let textoCompleto = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    const texto = reconstruirTexto(items);
    textoCompleto += texto + '\n';
    
    const abonosMatch = texto.match(REGEX_TOTAL_ABONOS);
    if (abonosMatch) {
      totalAbonosPDF = parsearValorCOP(abonosMatch[1]);
    }
  }

  const result = extraerMovimientosConAuditoria(textoCompleto, estadisticas, options);
  movimientos.push(...result.movimientos);
  movimientosRechazados.push(...result.rechazados);
  estadisticas = result.estadisticas;

  const totalExtraido = movimientos.reduce((s, m) => s + m.valor, 0);
  estadisticas.totalAbonosExtraido = totalExtraido;
  estadisticas.totalAbonosPDF = totalAbonosPDF;

  if (totalAbonosPDF > 0) {
    estadisticas.diferenciaPorcentual = ((totalAbonosPDF - totalExtraido) / totalAbonosPDF) * 100;
    
    if (estadisticas.diferenciaPorcentual > 5) {
      estadisticas.estadoExtraccion = 'ERROR';
    } else if (estadisticas.diferenciaPorcentual > 1) {
      estadisticas.estadoExtraccion = 'ADVERTENCIA';
    } else {
      estadisticas.estadoExtraccion = 'OK';
    }
  }

  console.log('📊 === AUDITORÍA DE EXTRACCIÓN ===');
  console.log(`📄 Líneas totales en PDF: ${estadisticas.lineasTotales}`);
  console.log(`📄 Líneas con formato de fecha: ${estadisticas.lineasConFecha}`);
  console.log(`✅ Líneas aceptadas: ${estadisticas.lineasAceptadas}`);
  console.log(`❌ Líneas rechazadas: ${estadisticas.lineasRechazadas}`);
  console.log(`💰 TOTAL ABONOS PDF: $${totalAbonosPDF.toLocaleString()}`);
  console.log(`💰 Total extraído: $${totalExtraido.toLocaleString()}`);
  console.log(`📊 Diferencia: ${estadisticas.diferenciaPorcentual.toFixed(2)}%`);
  console.log(`📌 Estado extracción: ${estadisticas.estadoExtraccion}`);

  if (estadisticas.estadoExtraccion !== 'OK') {
    console.warn(`⚠️ ALERTA: La extracción no es confiable (${estadisticas.estadoExtraccion})`);
    console.log(`🔍 ${movimientosRechazados.length} movimientos rechazados:`);
    movimientosRechazados.slice(0, 10).forEach(r => {
      console.log(`  • "${r.linea.substring(0, 60)}..." → ${r.motivo}`);
    });
    if (movimientosRechazados.length > 10) {
      console.log(`  ... y ${movimientosRechazados.length - 10} más`);
    }
  }
  console.log('📊 === FIN AUDITORÍA ===');

  return { 
    movimientos, 
    rechazados: movimientosRechazados, 
    estadisticas,
    totalAbonosPDF,
    totalExtraido,
    estadoExtraccion: estadisticas.estadoExtraccion,
  };
}

// ✅ Función original (compatible) - DEVUELVE SOLO EL ARRAY DE MOVIMIENTOS
export async function parsearExtractoPDF(file) {
  const result = await parsearExtractoPDFConAuditoria(file);
  return result.movimientos;
}

// ✅ Función para obtener solo auditoría (sin movimientos)
export async function parsearExtractoPDFConAuditoriaSolo(file) {
  const result = await parsearExtractoPDFConAuditoria(file);
  return {
    estadisticas: result.estadisticas,
    rechazados: result.rechazados,
    totalAbonosPDF: result.totalAbonosPDF,
    totalExtraido: result.totalExtraido,
    estadoExtraccion: result.estadoExtraccion,
  };
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

function extraerMovimientosConAuditoria(texto, estadisticas, options = {}) {
  const lineas = texto.split('\n');
  const movimientos = [];
  const rechazados = [];

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia) continue;

    estadisticas.lineasTotales++;
    
    const tieneFecha = /^\d{1,2}\/\d{2}/.test(limpia);
    if (tieneFecha) {
      estadisticas.lineasConFecha++;
    }

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
        if (tieneFecha) {
          estadisticas.lineasRechazadas++;
          rechazados.push({
            linea: limpia,
            motivo: 'regex_invalido',
            tieneFecha: true,
          });
        }
        continue;
      }
    }

    if (!dia || !mes || !descripcion || !valorStr) {
      estadisticas.lineasRechazadas++;
      rechazados.push({
        linea: limpia,
        motivo: 'datos_incompletos',
        tieneFecha: !!tieneFecha,
      });
      continue;
    }

    const valor = parsearValorCOP(valorStr);
    
    // ✅ SOLO ACEPTAR VALORES POSITIVOS (ingresos) a menos que options.includeNegativos === true
    if (!options.includeNegativos && valor <= 0) {
      estadisticas.lineasRechazadas++;
      rechazados.push({
        linea: limpia,
        motivo: 'valor_negativo_o_cero',
        tieneFecha: true,
        valor: valor,
      });
      continue;
    }

    const descLimpia = limpiarDescripcion(descripcion);
    
    // Filtrar intereses (ruido)
    if (descLimpia.includes('ABONO INTERESES') && valor < 1000) {
      estadisticas.lineasRechazadas++;
      rechazados.push({
        linea: limpia,
        motivo: 'interes_bancario',
        tieneFecha: true,
      });
      continue;
    }

    // Detectar movimientos genéricos (sin nombre de cliente)
    const esGenerico = esMovimientoGenerico(descLimpia);
    
    // Extraer nombre del cliente
    let nombreCliente = null;
    if (!esGenerico) {
      nombreCliente = extraerNombreCliente(descLimpia);
    }

    if (nombreCliente && nombreCliente.length < 3) {
      nombreCliente = null;
    }

    // Si es genérico y no tiene nombre, registrar como genérico
    if (esGenerico && !nombreCliente) {
      rechazados.push({
        linea: limpia,
        motivo: 'movimiento_generico',
        tieneFecha: true,
      });
    }

    estadisticas.lineasAceptadas++;

    movimientos.push({
      fecha: `${dia.padStart(2, '0')}/${mes}`,
      descripcion: descLimpia,
      descripcionOriginal: descripcion,
      lineaOriginal: limpia,
      valor,
      saldo: saldoStr ? parsearValorCOP(saldoStr) : null,
      nit: (descLimpia.match(REGEX_NIT) || [])[1] || null,
      nombreCliente,
      esGenerico,
      confianza: nombreCliente ? 'ALTA' : (esGenerico ? 'BAJA' : 'MEDIA'),
    });
  }

  return { movimientos, rechazados, estadisticas };
}

// ✅ FUNCIÓN CORREGIDA - Maneja correctamente signos negativos
function parsearValorCOP(str) {
  if (!str) return 0;
  let limpio = str.replace(/\s/g, '').replace(/^\$/, '');
  let esNegativo = limpio.startsWith('-');
  if (esNegativo) {
    limpio = limpio.substring(1);
  }
  limpio = limpio.replace(/,/g, '');
  const valor = parseFloat(limpio);
  const resultado = isNaN(valor) ? 0 : valor;
  return esNegativo ? -resultado : resultado;
}

function limpiarDescripcion(descripcion) {
  let limpia = descripcion.trim();
  limpia = limpia.replace(/\s+/g, ' ');
  limpia = limpia.replace(/[^\w\s\-.,&]/g, '');
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

  if (limpio.length < 2) {
    return null;
  }

  if (esMovimientoGenerico(limpio)) {
    return null;
  }

  return limpio;
}

export function debugExtracto(movimientos) {
  console.log('📊 === EXTRACTO BANCARIO ===');
  console.log(`📄 Total movimientos encontrados: ${movimientos.length}`);
  
  if (movimientos.length === 0) {
    console.log('⚠️ No se encontraron movimientos');
    return;
  }
  
  const total = movimientos.reduce((s, m) => s + m.valor, 0);
  const promedio = total / movimientos.length;
  const maximo = Math.max(...movimientos.map(m => m.valor));
  const minimo = Math.min(...movimientos.map(m => m.valor));
  
  console.log(`💰 Total ingresos: ${formatCOP(total)}`);
  console.log(`📊 Promedio: ${formatCOP(promedio)}`);
  console.log(`⬆️ Máximo: ${formatCOP(maximo)}`);
  console.log(`⬇️ Mínimo: ${formatCOP(minimo)}`);
  
  const movimientosConCliente = movimientos.filter(m => m.nombreCliente);
  const movimientosGenericos = movimientos.filter(m => m.esGenerico || !m.nombreCliente);
  
  console.log(`👤 Con cliente identificado: ${movimientosConCliente.length}`);
  console.log(`🔍 Genéricos (sin cliente): ${movimientosGenericos.length}`);
  
  const clientes = movimientosConCliente.reduce((acc, m) => {
    const cliente = m.nombreCliente || 'Sin identificar';
    acc[cliente] = (acc[cliente] || 0) + 1;
    return acc;
  }, {});
  
  const topClientes = Object.entries(clientes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  console.log('🏆 Top 5 clientes por movimientos:');
  topClientes.forEach(([cliente, count]) => {
    console.log(`  ${cliente}: ${count} movimientos`);
  });
  
  console.log('📋 Primeros 5 movimientos:');
  movimientos.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i+1}. ${m.fecha} | ${m.descripcion.substring(0, 50)}${m.descripcion.length > 50 ? '...' : ''} | ${formatCOP(m.valor)} | Cliente: ${m.nombreCliente || 'N/A'} | Confianza: ${m.confianza || 'N/A'}`);
  });
  
  if (movimientos.length > 5) {
    console.log(`  ... y ${movimientos.length - 5} movimientos más`);
  }
  
  console.log('📊 === FIN EXTRACTO ===');
}

function formatCOP(valor) {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(valor);
}

