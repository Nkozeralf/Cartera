// Búsqueda tolerante para clientes

/**
 * Normaliza un string para búsqueda (quita tildes, mayúsculas, etc.)
 */
export function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similitud entre dos strings usando Levenshtein
 */
export function calcularSimilitud(a, b) {
  if (!a || !b) return 0;
  const s1 = normalizarTexto(a);
  const s2 = normalizarTexto(b);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 0;
  
  const distancia = levenshtein(s1, s2);
  return Math.max(0, 1 - (distancia / maxLen));
}

/**
 * Distancia Levenshtein entre dos strings
 */
function levenshtein(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Busca clientes que coinciden con el término de búsqueda
 */
export function buscarClientes(clientesData, termino, umbral = 0.4) {
  if (!termino || termino.trim() === '') {
    return clientesData;
  }
  
  const terminoNormalizado = normalizarTexto(termino);
  const palabras = terminoNormalizado.split(' ');
  
  return clientesData
    .map(cliente => {
      const nombreNormalizado = normalizarTexto(cliente.nombre);
      let maxScore = calcularSimilitud(nombreNormalizado, terminoNormalizado);
      
      // Si hay múltiples palabras, buscar coincidencia parcial
      if (palabras.length > 1) {
        const scorePalabras = palabras.reduce((s, p) => {
          return s + calcularSimilitud(nombreNormalizado, p);
        }, 0) / palabras.length;
        maxScore = Math.max(maxScore, scorePalabras);
      }
      
      return { ...cliente, _score: maxScore };
    })
    .filter(c => c._score >= umbral)
    .sort((a, b) => b._score - a._score);
}

