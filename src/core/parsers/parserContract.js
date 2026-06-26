// ═══════════════════════════════════════════
// parserContract.js
// Contrato que debe cumplir todo parser de extracto bancario.
//
// Esto NO es una clase abstracta de verdad (este proyecto es JS, no TS),
// es documentación ejecutable + un validador para detectar en desarrollo
// si un parser nuevo olvidó implementar algo. No se importa en producción.
// ═══════════════════════════════════════════

/**
 * @typedef {Object} ParserBancario
 * @property {string} id - identificador único, kebab-case (ej. 'bancolombia-ingresos')
 * @property {string} banco - nombre legible del banco (ej. 'Bancolombia')
 * @property {string} formato - descripción corta del formato/cuenta (ej. 'Cuenta de ahorros - solo ingresos')
 * @property {(textoCompleto: string) => number} detectar
 *   Recibe el texto completo extraído de la página 1 del PDF (antes de parsear filas).
 *   Devuelve un puntaje de confianza 0-100. El orquestador elige el parser con mayor puntaje
 *   (por encima de un umbral mínimo). Debe ser rápido y barato: solo regex/includes, sin async.
 * @property {(file: File) => Promise<{movimientos: object[], metadata: object}>} parsear
 *   Hace el trabajo real de extracción. Mismo contrato de salida para todos los parsers,
 *   para que el resto de la app (ClientesDashboard, conciliación, etc.) no necesite saber
 *   qué parser corrió.
 */

/**
 * Valida en desarrollo que un objeto parser cumple el contrato mínimo.
 * Lanza error temprano (al registrar) en vez de fallar silenciosamente en producción.
 * @param {ParserBancario} parser
 */
export function validarContratoParser(parser) {
  console.log(`🔍 [parserContract] Validando parser:`, {
    id: parser.id,
    banco: parser.banco,
    formato: parser.formato,
    tieneDetectar: typeof parser.detectar === 'function',
    tieneParsear: typeof parser.parsear === 'function',
  });
  
  const camposRequeridos = ['id', 'banco', 'formato', 'detectar', 'parsear'];
  const faltantes = camposRequeridos.filter(campo => !(campo in parser));

  if (faltantes.length > 0) {
    console.error(`❌ [parserContract] Parser inválido, faltan campos:`, faltantes);
    console.error(`📄 [parserContract] Objeto parser recibido:`, parser);
    throw new Error(
      `Parser inválido: faltan campos [${faltantes.join(', ')}]. ` +
      `Revisa el objeto exportado en el archivo del parser.`
    );
  }

  if (typeof parser.detectar !== 'function') {
    console.error(`❌ [parserContract] Parser "${parser.id}": "detectar" no es una función`);
    throw new Error(`Parser "${parser.id}": "detectar" debe ser una función.`);
  }

  if (typeof parser.parsear !== 'function') {
    console.error(`❌ [parserContract] Parser "${parser.id}": "parsear" no es una función`);
    throw new Error(`Parser "${parser.id}": "parsear" debe ser una función.`);
  }
  
  console.log(`✅ [parserContract] Parser válido: ${parser.id} (${parser.banco})`);
}
