// ═══════════════════════════════════════════
// adapterContract.js
// Validación de contrato para movimientos retornados por parsers.
//
// TODO parser DEBE retornar movimientos con AMBOS:
// - Un identificador de dirección: tipo O direccion
// - Todos los campos requeridos mínimos
//
// Si falta alguno → error claro en tiempo de parseo, no en runtime posterior.
// ═══════════════════════════════════════════

/**
 * Valida que cada movimiento cumple el contrato mínimo de adapter.
 * @param {Array<Object>} movimientos - Array de movimientos del parser
 * @param {string} parserId - Identificador del parser (para mensajes de error)
 * @throws {Error} si algún movimiento incumple el contrato
 */
export function validarContratAdapterMovimientos(movimientos, parserId) {
  console.log(`🔍 [adapterContract] Validando ${movimientos?.length || 0} movimientos de parser: ${parserId}`);
  
  if (!Array.isArray(movimientos)) {
    console.error(`❌ [adapterContract] Error: Parser debe retornar array, recibió: ${typeof movimientos}`);
    throw new Error(
      `[${parserId}] Parser debe retornar array de movimientos, recibió: ${typeof movimientos}`
    );
  }

  let errores = [];
  movimientos.forEach((mov, idx) => {
    try {
      validarMovimientoIndividual(mov, parserId, idx);
    } catch (error) {
      errores.push(error.message);
    }
  });

  if (errores.length > 0) {
    console.error(`❌ [adapterContract] ${errores.length} errores en parser ${parserId}:`, errores);
    throw new Error(`[${parserId}] ${errores.length} movimientos inválidos. Primer error: ${errores[0]}`);
  }

  console.log(`✅ [adapterContract] Validación exitosa: ${movimientos.length} movimientos de ${parserId}`);
}

/**
 * Valida un movimiento individual contra el contrato de adapter.
 * @param {Object} mov - Movimiento a validar
 * @param {string} parserId - Identificador del parser
 * @param {number} idx - Índice en el array
 * @throws {Error} si no cumple contrato
 * @private
 */
function validarMovimientoIndividual(mov, parserId, idx) {
  if (!mov || typeof mov !== 'object') {
    console.error(`❌ [adapterContract] Movimiento #${idx} inválido en ${parserId}:`, mov);
    throw new Error(
      `[${parserId}] Movimiento #${idx}: debe ser un objeto, recibió ${typeof mov}`
    );
  }

  // CAMPOS REQUERIDOS SIEMPRE
  const camposRequeridos = ['fecha', 'valor', 'descripcion'];
  for (const campo of camposRequeridos) {
    if (!(campo in mov)) {
      throw new Error(
        `[${parserId}] Movimiento #${idx}: falta campo requerido "${campo}"`
      );
    }
  }

  // CONTRATO CRÍTICO: Dirección (tipo O direccion)
  // - Si tiene "tipo" → debe ser string no vacío
  // - Si no tiene "tipo" → DEBE tener "direccion" válido
  // - Si no tiene ninguno → ERROR
  const tieneExplicitTipo = 'tipo' in mov && typeof mov.tipo === 'string' && mov.tipo.length > 0;
  const tieneDireccion = 'direccion' in mov &&
    ['INGRESO', 'EGRESO', 'NEUTRO'].includes(mov.direccion);

  if (!tieneExplicitTipo && !tieneDireccion) {
    console.error(`❌ [adapterContract] Movimiento #${idx} sin tipo/dirección en ${parserId}:`, {
      tipo: mov.tipo,
      direccion: mov.direccion,
      campos: Object.keys(mov)
    });
    throw new Error(
      `[${parserId}] Movimiento #${idx}: debe incluir EITHER "tipo" (string no vacío) OR "direccion" ('INGRESO'|'EGRESO'|'NEUTRO'). ` +
      `Recibió: { tipo: ${mov.tipo ?? 'undefined'}, direccion: ${mov.direccion ?? 'undefined'} }`
    );
  }

  // Validaciones de tipo de datos básicas
  if (typeof mov.valor !== 'number' || isNaN(mov.valor)) {
    throw new Error(
      `[${parserId}] Movimiento #${idx}: "valor" debe ser número válido, recibió: ${mov.valor}`
    );
  }

  if (typeof mov.descripcion !== 'string' || mov.descripcion.trim().length === 0) {
    throw new Error(
      `[${parserId}] Movimiento #${idx}: "descripcion" debe ser string no vacío`
    );
  }

  if (typeof mov.fecha !== 'string' || mov.fecha.trim().length === 0) {
    throw new Error(
      `[${parserId}] Movimiento #${idx}: "fecha" debe ser string no vacío`
    );
  }
}

/**
 * Transforma movimiento legacy (solo con "direccion") a nuevo contrato (con "tipo").
 * Útil para mantener compatibilidad mientras se migran parsers antiguos.
 *
 * @param {Object} mov - Movimiento legacy
 * @returns {Object} Movimiento con campo "tipo" agregado
 */
export function transformarMovimientoLegacy(mov) {
  if (!mov) return mov;

  // Si ya tiene "tipo" explícito, devolver sin cambios
  if (mov.tipo) {
    return mov;
  }

  // Si tiene "direccion", usar como base para "tipo"
  if (mov.direccion === 'INGRESO') {
    return { ...mov, tipo: 'INGRESO' };
  } else if (mov.direccion === 'EGRESO') {
    return { ...mov, tipo: 'EGRESO' };
  }

  // Si no tiene ni tipo ni direccion válido, devolver sin cambios
  // (La validación central se encargará de rechazarlo si es crítico)
  return mov;
}

export default {
  validarContratAdapterMovimientos,
  transformarMovimientoLegacy,
};
