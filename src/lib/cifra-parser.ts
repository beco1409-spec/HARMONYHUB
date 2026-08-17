/**
 * Parser de Cifras — motor central de interpretação de cifras do Harmony Hub.
 *
 * Responsabilidades:
 * - classificar cada LINHA da cifra: título, acordes, letra ou vazio;
 * - classificar cada TOKEN: título, acorde, anotação ou palavra;
 * - transpor somente acordes (raiz + baixo invertido), preservando
 *   todos os modificadores (m, 7, 7M, sus, add, dim, aug, parênteses…);
 * - preservar 100% dos espaços, quebras de linha, acentos e pontuação.
 *
 * Regras de ouro:
 * 1. A classificação é ESTRUTURAL — nunca depende de cor ou formatação.
 * 2. Uma linha só é de acordes se TODOS os tokens forem acordes/anotações.
 *    Se houver qualquer palavra (ex.: "A Deus eu exalto"), a linha inteira
 *    é letra e nada nela pode ser transposto.
 * 3. A transposição é sempre calculada a partir do TEXTO ORIGINAL.
 *    Nunca se transpõe o resultado de uma transposição anterior.
 */

// ---------------------------------------------------------------------------
// Tabela cromática
// ---------------------------------------------------------------------------

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const NOTE_INDEX: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

// ---------------------------------------------------------------------------
// Gramática de acordes (notação brasileira)
// ---------------------------------------------------------------------------
// raiz:        A–G com # ou b
// qualidade:   m, maj, min, dim, aug, °, ø, +
// extensão:    dígitos com M opcional → 7, 7M, 9, 11, 13, 6, 2, 4
// sus/add:     sus, sus2, sus4, add9, add11…
// parênteses:  (2), (4), (9), (7M), (b9), (11)… — repetíveis
// baixo:       /E, /F#, /C … (qualquer parte também é um acorde válido)

const NOTE = "[A-G](?:#|b)?";
const QUALITY = "(?:m(?!aj)|maj|min|dim|aug|°|ø|\\+)?";
const EXT = String.raw`(?:\d+M?)?`;
const SUS = "(?:sus[24]?)?";
const ADD = String.raw`(?:add\d+)?`;
const PAREN = String.raw`(?:\([0-9#bBMm,°ø+\s-]*\))*`;

const CHORD_PART_RE = new RegExp(
  `^(${NOTE})(${QUALITY}${EXT}${SUS}${ADD}${PAREN})$`,
);

export interface ParsedChord {
  root: string;
  body: string;
  /** Partes do baixo invertido (sem a barra), ou null. */
  bass: string[] | null;
}

/** Reconhece um token como acorde. Retorna null para palavras comuns. */
export function parseChord(token: string): ParsedChord | null {
  if (!/^[A-G]/.test(token)) return null;
  const parts = token.split("/");
  const main = parts[0].match(CHORD_PART_RE);
  if (!main) return null;
  const bass: string[] = [];
  for (const p of parts.slice(1)) {
    const b = p.match(CHORD_PART_RE);
    if (!b) return null;
    bass.push(b[1] + b[2]);
  }
  return { root: main[1], body: main[2], bass: bass.length ? bass : null };
}

// ---------------------------------------------------------------------------
// Classificação de tokens e linhas
// ---------------------------------------------------------------------------

/** Marcadores de seção: "[Intro]", "[Primeira Parte]", "[Refrão]" */
const SECTION_RE = /^\[[^\]]*\]$/;
/** Anotações rítmicas/estruturais: "4x", "(2x)", "%", "|", "…" */
const NOTATION_RE = /^[\d()[\].,;:%xX…*+\-|]+$/;
/** Anotações entre parênteses com texto: "(Frase)", "(Solo)" */
const PAREN_NOTE_RE = /^\([^)]*\)$/;

export type TokenType = "titulo" | "acorde" | "anotacao" | "palavra";

export interface CifraToken {
  type: TokenType;
  /** Espaços exatos que antecedem o token — nunca modificados. */
  leading: string;
  text: string;
}

export type LineType = "titulo" | "acordes" | "letra" | "vazio";

export interface CifraLine {
  type: LineType;
  raw: string;
  tokens: CifraToken[];
  /** Espaços residuais no fim da linha. */
  trailing: string;
}

export interface ParsedCifra {
  lines: CifraLine[];
}

function classifyToken(text: string): TokenType {
  if (SECTION_RE.test(text)) return "titulo";
  if (parseChord(text)) return "acorde";
  if (NOTATION_RE.test(text) || PAREN_NOTE_RE.test(text)) return "anotacao";
  return "palavra";
}

function classifyLine(tokens: CifraToken[]): LineType {
  if (tokens.length === 0) return "vazio";
  if (tokens.every((t) => t.type === "titulo")) return "titulo";
  // Linha de acordes: só acordes/anotações/marcadores E ao menos um acorde.
  // Qualquer palavra ("Deus", "Amor", "e"…) rebaixa a linha inteira para letra.
  const hasChord = tokens.some((t) => t.type === "acorde");
  if (hasChord && tokens.every((t) => t.type !== "palavra")) return "acordes";
  return "letra";
}

function tokenizeLine(raw: string): { tokens: CifraToken[]; trailing: string } {
  const tokens: CifraToken[] = [];
  const re = /(\s*)(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    tokens.push({ type: classifyToken(m[2]), leading: m[1], text: m[2] });
  }
  const consumed = tokens.reduce((acc, t) => acc + t.leading.length + t.text.length, 0);
  return { tokens, trailing: raw.slice(consumed) };
}

/** Interpreta a cifra completa, classificando linhas e tokens. */
export function parseCifra(text: string): ParsedCifra {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((raw): CifraLine => {
      const { tokens, trailing } = tokenizeLine(raw);
      return { type: classifyLine(tokens), raw, tokens, trailing };
    });
  return { lines };
}

// ---------------------------------------------------------------------------
// Transposição
// ---------------------------------------------------------------------------

function transposeRootWith(root: string, semitones: number, table: string[]): string {
  const idx = NOTE_INDEX[root];
  if (idx === undefined) return root;
  return table[(((idx + semitones) % 12) + 12) % 12];
}

/**
 * Transpõe um acorde completo (raiz + baixo), mantendo todos os
 * modificadores intactos. A preferência por bemol é herdada do acorde
 * inteiro: se qualquer nota original usa bemol, o resultado usa bemóis.
 */
export function transposeChord(token: string, semitones: number): string {
  if (!semitones) return token;
  if (!parseChord(token)) return token;
  const table = token.includes("b") ? FLAT : SHARP;
  return token
    .split("/")
    .map((part) => {
      const m = part.match(CHORD_PART_RE)!;
      return transposeRootWith(m[1], semitones, table) + m[2];
    })
    .join("/");
}

/** Transpõe um tom ("Db" → "D", "Am" → "Bm"). */
export function transposeTom(tom: string, semitones: number): string {
  return transposeChord(tom.trim(), semitones);
}

/**
 * Transpõe uma cifra JÁ PARSEADA. Apenas tokens de acorde em linhas de
 * acordes são alterados; letra, títulos, anotações e espaços saem intactos.
 */
export function transposeParsedCifra(parsed: ParsedCifra, semitones: number): string {
  if (!semitones) {
    return parsed.lines.map((l) => l.raw).join("\n");
  }
  return parsed.lines
    .map((line) => {
      if (line.type !== "acordes") return line.raw;
      return (
        line.tokens
          .map((t) =>
            t.leading + (t.type === "acorde" ? transposeChord(t.text, semitones) : t.text),
          )
          .join("") + line.trailing
      );
    })
    .join("\n");
}

/**
 * Atalho: parseia o TEXTO ORIGINAL e transpõe em uma única passada.
 * Chamadas repetidas sempre partem do original — sem perda de precisão.
 */
export function transposeCifraText(text: string, semitones: number): string {
  return transposeParsedCifra(parseCifra(text), semitones);
}
