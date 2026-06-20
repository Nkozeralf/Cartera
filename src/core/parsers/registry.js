// ═══════════════════════════════════════════
// registry.js
// Registro central de parsers de extractos bancarios.
//
// Para agregar un banco o formato nuevo:
//   1. Crea tu archivo en parsers/<banco>/tuParser.js siguiendo el contrato
//      de parserContract.js (id, banco, formato, detectar, parsear).
//   2. Impórtalo aquí abajo y agrégalo al array PARSERS_REGISTRADOS.
// No hay que tocar parseDocumento.js para que el nuevo parser entre en juego.
// ═══════════════════════════════════════════

import { validarContratoParser } from './parserContract.js';

// ─────────────────────────────────────────────
// IMPORTS DE PARSERS EXISTENTES
// ─────────────────────────────────────────────
import parserBancolombiaIngresos from './bancolombia/parserBancolombia.js';
import parserBancolombiaMovimientos from './bancolombia/parseBancolombiaMov.js';

// ─────────────────────────────────────────────
// IMPORTS DE NUEVOS PARSERS
// ─────────────────────────────────────────────
// 👇 IMPORTAR EL PARSER DE BBVA
import parserBBVA from './bbva/parserBBVA.js';

// ─────────────────────────────────────────────
// REGISTRO DE PARSERS
// ─────────────────────────────────────────────
// El orden NO importa: parseDocumento.js los evalúa a todos y elige
// el que reporte mayor confianza (puntaje de detección).
//
// Para agregar un nuevo parser:
//   1. Crea tu archivo siguiendo el contrato en parserContract.js
//   2. Haz el import arriba
//   3. Agrega el parser importado a este array
// ─────────────────────────────────────────────
const PARSERS_REGISTRADOS = [
  // Bancolombia
  parserBancolombiaIngresos,      // viejo: solo ingresos, formato texto corrido
  parserBancolombiaMovimientos,    // nuevo: ingresos+egresos, formato columnas
  
  // BBVA
  parserBBVA,                      // 👈 NUEVO: Cuenta Digital BBVA
  
  // ─────────────────────────────────────────────
  // FUTUROS PARSERS (ejemplos comentados)
  // ─────────────────────────────────────────────
  // parserDavivienda,              // Davivienda
  // parserBancoDeBogota,           // Banco de Bogotá
  // parserBancoPopular,            // Banco Popular
  // parserBancoOccidente,          // Banco de Occidente
  // parserBancoCajaSocial,         // Caja Social
  // parserBancoColpatria,          // Colpatria
  // parserScotiabank,              // Scotiabank Colpatria
  // parserBancoItau,               // Itaú
  // parserBancoAvVillas,           // AV Villas
  // parserBancoFalabella,          // Falabella
  // parserBancoCiti,               // Citibank
  // parserBancoGNB,                // GNB Sudameris
  // parserBancoProcredit,          // Procredit
  // parserBancoCorficolombiana,    // Corficolombiana
  // parserBancoPichincha,          // Pichincha
  // parserBancoSantander,          // Santander
  // parserBancoBCSC,               // BCSC
  // parserBancoCooperativo,        // Cooperativo
  // parserBancoomeva,              // Bancoomeva
  // parserBancoMultiBank,          // MultiBank
  // parserBancoFinandina,          // Finandina
  // parserBancoGeadas,             // Geadas
  // parserBancoCompartamos,        // Compartamos
  // parserBancoFindeter,           // Findeter
  // parserBancoBancamia,           // Bancamia
  // parserBancoAgrario,            // Banco Agrario
  // parserBancoCajaAgraria,        // Caja Agraria
];

// ─────────────────────────────────────────────
// VALIDACIÓN DE CONTRATO
// ─────────────────────────────────────────────
// Valida el contrato de cada parser al cargar el módulo (falla rápido y claro
// en desarrollo si alguien crea un parser incompleto).
PARSERS_REGISTRADOS.forEach(validarContratoParser);

export default PARSERS_REGISTRADOS;