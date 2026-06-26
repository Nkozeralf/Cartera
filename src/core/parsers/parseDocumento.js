// ═══════════════════════════════════════════
// parseDocumento.js
// Orquestador: recibe un archivo PDF, detecta automáticamente qué banco/formato
// es (consultando el registro de parsers), y delega el parseo real al parser
// que reporte mayor confianza.
//
// Este archivo NO conoce los detalles de ningún banco específico — solo sabe
// cómo extraer texto crudo para detección y cómo preguntarle a cada parser
// registrado si puede manejarlo. Agregar un banco nuevo no requiere tocar
// este archivo, solo registry.js.
// ═══════════════════════════════════════════

import PARSERS_REGISTRADOS from './registry.js';
import { validarContratAdapterMovimientos } from './adapterContract.js';

// Por debajo de este puntaje, ningún parser se considera una detección válida.
const UMBRAL_CONFIANZA_MINIMO = 30;

/**
 * @typedef {Object} ResultadoDeteccion
 * @property {string} parserId
 * @property {string} banco
 * @property {string} formato
 * @property {number} confianza
 */

/**
 * Punto de entrada principal. Detecta el formato y parsea el documento.
 * @param {File} file - PDF subido por el usuario
 * @returns {Promise<{
 *   movimientos: object[],
 *   metadata: object|null,
 *   deteccion: ResultadoDeteccion
 * }>}
 * @throws {Error} si ningún parser registrado reconoce el formato del documento
 * @throws {Error} si los movimientos retornados no cumplen el contrato de adapter
 *   (falta "tipo" Y "direccion", o faltan campos requeridos)
 */
export async function parseDocumento(file) {
  console.log(`🔍 [parseDocumento] Iniciando parseo de archivo: ${file.name}`);
  
  const textoMuestra = await extraerTextoPrimeraPagina(file);
  console.log(`📄 [parseDocumento] Texto extraído (primeros 200 chars):`, textoMuestra?.slice(0, 200));
  
  const deteccion = detectarParser(textoMuestra);
  console.log(`🎯 [parseDocumento] Detección:`, deteccion ? {
    parserId: deteccion.parser.id,
    banco: deteccion.parser.banco,
    confianza: deteccion.confianza
  } : 'NINGUNA');

  if (!deteccion) {
    console.error(`❌ [parseDocumento] Ningún parser reconoció el formato`);
    throw new ErrorFormatoNoReconocido(textoMuestra); 
  }

  console.log(`⚙️ [parseDocumento] Ejecutando parser: ${deteccion.parser.id}`);
  const { movimientos, metadata } = await deteccion.parser.parsear(file);
  console.log(`📊 [parseDocumento] Parser retornó ${movimientos?.length || 0} movimientos`);
  console.log(`📋 [parseDocumento] Metadata:`, metadata);

  // FASE 1: Validar contrato de adapter
  // Asegura que TODOS los movimientos cumplen el contrato mínimo:
  // - Debe haber un identificador de dirección: "tipo" O "direccion"
  // - Todos los campos requeridos deben estar presentes
  validarContratAdapterMovimientos(movimientos, deteccion.parser.id);

  return {
    movimientos,
    metadata,
    deteccion: {
      parserId: deteccion.parser.id,
      banco: deteccion.parser.banco,
      formato: deteccion.parser.formato,
      confianza: deteccion.confianza,
    },
  };
}

/**
 * Error específico para cuando ningún parser reconoce el documento.
 * Permite a la UI mostrar un mensaje útil ("no reconocemos este formato")
 * en vez de un error genérico, y adjunta los candidatos evaluados para debug.
 */
export class ErrorFormatoNoReconocido extends Error {
  constructor(textoMuestra) {
    console.error(`❌ [parseDocumento] ErrorFormatoNoReconocido`);
    console.error(`📄 [parseDocumento] Texto muestra (primeros 500 chars):`, textoMuestra?.slice(0, 500));
    
    super('No se reconoció el formato del extracto bancario. Ningún parser registrado superó el umbral de confianza mínimo.');
    this.name = 'ErrorFormatoNoReconocido';
    this.textoMuestra = textoMuestra?.slice(0, 500) ?? null;
  }
}

/**
 * Recorre todos los parsers registrados, les pide su puntaje de confianza
 * para el texto dado, y devuelve el de mayor puntaje (si supera el umbral).
 * @param {string} textoMuestra
 * @returns {{parser: object, confianza: number}|null}
 */
function detectarParser(textoMuestra) {
  const candidatos = PARSERS_REGISTRADOS
    .map(parser => ({ parser, confianza: parser.detectar(textoMuestra) }))
    .sort((a, b) => b.confianza - a.confianza);

  const ganador = candidatos[0];

  if (!ganador || ganador.confianza < UMBRAL_CONFIANZA_MINIMO) {
    return null;
  }

  return ganador;
}

/**
 * Extrae el texto de la primera página del PDF, solo para fines de detección.
 * Es deliberadamente más simple/barato que la reconstrucción completa por
 * filas que hace cada parser — aquí solo necesitamos texto corrido para
 * correr regex de detección, no estructura de columnas.
 */
async function extraerTextoPrimeraPagina(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const page = await pdf.getPage(1);
  const { items } = await page.getTextContent();

  return items.map(it => it.str).join('\n');
}

export default parseDocumento;
// ─────────────────────────────────────────────
// Export de compatibilidad temporal.
// PasoExtracto.jsx (flujo de conciliación, en desuso) importa esta función
// con el nombre antiguo. No se está usando activamente, pero se mantiene
// este wrapper para no romper la compilación del proyecto.
// TODO: eliminar cuando se retire PasoExtracto.jsx definitivamente.
// ─────────────────────────────────────────────
export async function parsearExtractoPDF(file) {
  const { movimientos } = await parseDocumento(file);
  return movimientos;
}
