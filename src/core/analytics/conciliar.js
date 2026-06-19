import { distance } from 'fastest-levenshtein';

// Prefijos operativos del banco que no son parte del nombre del cliente.
const PREFIJOS_BANCO = [
  'PAGO INTERBANC', 'PAGO PSE', 'PAGO DE PROV', 'PAGO DE TERC',
  'TRANSFERENCIA CTA SUC VIRTUAL', 'TRANSFERENCIA VIRTUAL',
  'PAGO', 'TRANSFERENCIA', 'ABONO', 'REV',
];

const VENTANA_DIAS_MAX = 180; // ✅ Aumentado de 120 a 180 para capturar pagos de meses anteriores
const PESO_NIT = 100;
const PESO_NOMBRE_MAX = 60;
const PESO_VALOR = 30;
const PESO_FECHA = 10;
const PESO_EXCEDENTE = 15; // ✅ Nuevo: peso para pagos en exceso

const UMBRAL_AUTOCONCILIA = 75; // ✅ Bajado de 80 a 75
const UMBRAL_REVISAR = 40;      // ✅ Bajado de 50 a 40
const UMBRAL_SIMILITUD_MIN = 30; // ✅ Nuevo: umbral mínimo para considerar un candidato

export function conciliar(facturas, movimientos) {
  // ✅ Clonar movimientos y agregar propiedad usado
  const movsLibres = movimientos.map(m => ({ 
    ...m, 
    usado: false,
    facturasAsociadas: []
  }));

  return facturas.map(factura => {
    const candidatos = puntuarCandidatos(factura, movsLibres.filter(m => !m.usado));

    if (candidatos.length === 0) {
      return resultadoFactura(factura, 'PENDIENTE', 0, [], []);
    }

    const mejor = candidatos[0];

    // ✅ Si el mejor candidato tiene alta confianza
    if (mejor.score >= UMBRAL_AUTOCONCILIA) {
      const movsUsados = combinacionDelMejorCandidato(factura, mejor, movsLibres);
      movsUsados.forEach(m => { 
        m.usado = true; 
        m.facturasAsociadas.push(factura.consecutivo);
      });
      return resultadoFactura(factura, 'CONCILIADO', mejor.score, movsUsados, []);
    }

    // ✅ Si el mejor candidato tiene confianza media (REVISAR)
    if (mejor.score >= UMBRAL_REVISAR) {
      // ✅ Si el pago es en exceso (ratio > 1.05), mostrar como REVISAR con nota
      if (mejor.ratioValor > 1.05) {
        return resultadoFactura(
          factura, 
          'REVISAR', 
          mejor.score, 
          [mejor.movimiento], 
          candidatos.slice(0, 3),
          `Pago en exceso (${Math.round(mejor.ratioValor * 100)}% del valor)`
        );
      }
      return resultadoFactura(factura, 'REVISAR', mejor.score, [], candidatos.slice(0, 3));
    }

    // ✅ Si hay sugerencias con confianza baja, mostrarlas
    return resultadoFactura(factura, 'PENDIENTE', mejor.score, [], candidatos.slice(0, 3));
  });
}

function puntuarCandidatos(factura, movimientos) {
  const nombreFactura = normalizarNombre(factura.nombreTercero);
  const fechaFactura = parsearFechaFactura(factura.fechaCreacion);

  const puntuados = movimientos
    .map(mov => {
      // Usar nombreCliente si existe, si no limpiar descripción
      const descLimpia = mov.nombreCliente || limpiarDescripcionBanco(mov.descripcion);
      const scoreNombre = similitudNombre(nombreFactura, normalizarNombre(descLimpia));
      const coincideNit = mov.nit && mov.nit === factura.identificacion;

      const dias = fechaFactura ? diasEntre(fechaFactura, mov.fecha) : null;
      const dentroVentana = dias === null || (dias >= -5 && dias <= VENTANA_DIAS_MAX);

      // ✅ UMBRAL REDUCIDO: ahora permite más candidatos (30 en vez de 40)
      if (scoreNombre < UMBRAL_SIMILITUD_MIN && !coincideNit) return null;

      const ratioValor = mov.valor / factura.total;
      const valorPlausible = ratioValor >= 0.6 && ratioValor <= 1.05;
      const esExcedente = ratioValor > 1.05 && ratioValor < 3.0; // ✅ Nuevo: detecta pagos en exceso

      let score = 0;
      
      // 1. NIT - peso máximo
      if (coincideNit) {
        score += PESO_NIT;
      }
      
      // 2. Nombre - con ajuste para nombres truncados
      if (scoreNombre > 0) {
        // ✅ Bonus para nombres que coinciden parcialmente
        const bonusTruncado = scoreNombre >= 60 ? 10 : 0;
        score += (scoreNombre / 100) * PESO_NOMBRE_MAX + bonusTruncado;
      }
      
      // 3. Valor - con ajuste para excedentes
      if (valorPlausible) {
        score += PESO_VALOR * Math.min(ratioValor, 1);
      } else if (esExcedente) {
        // ✅ Pago en exceso: dar puntaje parcial para que aparezca en REVISAR
        score += PESO_VALOR * 0.6;
        score += PESO_EXCEDENTE;
      }
      
      // 4. Fecha - si está dentro de la ventana
      if (dentroVentana && fechaFactura) {
        score += PESO_FECHA;
      }

      // 5. ✅ Penalización por movimientos genéricos (sin nombre de cliente)
      if (!mov.nombreCliente) {
        score = Math.max(0, score - 10);
      }

      return { 
        movimiento: mov, 
        score: Math.round(score), 
        scoreNombre, 
        ratioValor,
        esExcedente,
        coincideNit,
        dentroVentana
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return puntuados;
}

function combinacionDelMejorCandidato(factura, mejor, movsLibres) {
  // ✅ Si el pago es suficiente (>=95% del valor), usar solo ese
  if (mejor.ratioValor >= 0.95 && mejor.ratioValor <= 1.05) {
    return [mejor.movimiento];
  }

  // ✅ Si es excedente, devolver solo el movimiento (se marcará como REVISAR)
  if (mejor.ratioValor > 1.05) {
    return [mejor.movimiento];
  }

  const nombreFactura = normalizarNombre(factura.nombreTercero);
  const delMismoTercero = movsLibres
    .filter(m => !m.usado)
    .filter(m => {
      const nombreMov = m.nombreCliente || limpiarDescripcionBanco(m.descripcion);
      return similitudNombre(nombreFactura, normalizarNombre(nombreMov)) >= 60; // ✅ Bajado de 70 a 60
    });

  let suma = 0;
  const seleccionados = [];
  for (const mov of delMismoTercero.sort((a, b) => b.valor - a.valor)) {
    if (suma / factura.total >= 0.95) break;
    seleccionados.push(mov);
    suma += mov.valor;
  }
  return seleccionados.length > 0 ? seleccionados : [mejor.movimiento];
}

function resultadoFactura(factura, estado, confianza, pagos, sugerencias, nota = '') {
  const totalPagado = pagos.reduce((s, p) => s + p.valor, 0);
  return {
    ...factura,
    estado,
    confianza,
    pagos,
    sugerencias,
    diferencia: factura.total - totalPagado,
    totalPagado,
    nota, // ✅ Nuevo campo para notas adicionales
    ratioPago: factura.total > 0 ? totalPagado / factura.total : 0
  };
}

function limpiarDescripcionBanco(descripcion) {
  let limpia = descripcion;
  for (const prefijo of PREFIJOS_BANCO) {
    limpia = limpia.replace(new RegExp(prefijo, 'gi'), '');
  }
  return limpia.trim();
}

function similitudNombre(a, b) {
  if (!a || !b) return 0;
  const [corto, largo] = a.length <= b.length ? [a, b] : [b, a];

  // ✅ Si el corto está contenido en el largo, dar buen score
  if (largo.includes(corto) && corto.length >= 4) {
    return Math.round(70 + 30 * (corto.length / largo.length));
  }

  // ✅ Si el largo está contenido en el corto (caso de nombre truncado)
  if (corto.includes(largo) && largo.length >= 4) {
    return Math.round(70 + 30 * (largo.length / corto.length));
  }

  // ✅ Si empiezan igual (ej: "BOYDORR" vs "BOYDORR SAS")
  const prefijoComun = encontrarPrefijoComun(a, b);
  if (prefijoComun.length >= 4) {
    const maxLen = Math.max(a.length, b.length);
    return Math.round(60 + 40 * (prefijoComun.length / maxLen));
  }

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const dist = distance(a, b);
  return Math.round(100 * (1 - dist / maxLen));
}

// ✅ Nueva función para encontrar prefijo común entre dos strings
function encontrarPrefijoComun(a, b) {
  let i = 0;
  const minLen = Math.min(a.length, b.length);
  while (i < minLen && a[i].toUpperCase() === b[i].toUpperCase()) {
    i++;
  }
  return a.substring(0, i);
}

function parsearFechaFactura(str) {
  const m = str?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]);
}

function diasEntre(fechaFactura, fechaMovDDMM) {
  const [dia, mes] = fechaMovDDMM.split('/').map(Number);
  const fechaMov = new Date(fechaFactura.getFullYear(), mes - 1, dia);
  if (fechaMov < fechaFactura) fechaMov.setFullYear(fechaMov.getFullYear() + 1);
  return Math.round((fechaMov - fechaFactura) / 86400000);
}

export function normalizarNombre(str) {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\bS\.?A\.?S\.?\b/g, 'SAS')
    .replace(/\bS\.?A\.?\b/g, 'SA')
    .replace(/\bLTDA?\b/g, 'LTDA')
    .replace(/\bLIMITADA\b/g, 'LTDA')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCOP(valor) {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(valor);
}

export function debugConciliacion(resultados) {
  console.log('📊 === RESULTADO DE CONCILIACIÓN ===');
  console.log(`📄 Total facturas: ${resultados.length}`);
  
  const conciliadas = resultados.filter(r => r.estado === 'CONCILIADO');
  const revisar = resultados.filter(r => r.estado === 'REVISAR');
  const pendientes = resultados.filter(r => r.estado === 'PENDIENTE');
  
  console.log(`✅ Conciliadas: ${conciliadas.length}`);
  console.log(`⚠️ Revisar: ${revisar.length}`);
  console.log(`❌ Pendientes: ${pendientes.length}`);
  
  const confianzas = resultados.map(r => r.confianza || 0);
  const avgConfianza = confianzas.reduce((s, c) => s + c, 0) / confianzas.length || 0;
  console.log(`📊 Confianza promedio: ${Math.round(avgConfianza)}%`);
  
  // ✅ Mostrar casos de excedentes
  const excedentes = resultados.filter(r => r.ratioPago > 1.05 && r.pagos.length > 0);
  if (excedentes.length > 0) {
    console.log(`💰 Pagos en exceso (${excedentes.length}):`);
    excedentes.forEach(r => {
      console.log(`  • ${r.consecutivo} - ${r.nombreTercero}: ${formatCOP(r.totalPagado)} (${Math.round(r.ratioPago * 100)}%)`);
    });
  }
  
  console.log('📊 === FIN CONCILIACIÓN ===');
}

