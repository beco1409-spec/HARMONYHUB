/**
 * Compatibilidade: o motor de cifras vive em `@/lib/cifra-parser`.
 * Este módulo apenas reexporta a API usada pelas telas existentes.
 */
export {
  transposeChord,
  transposeTom,
  transposeCifraText as transposeCifra,
} from "./cifra-parser";
