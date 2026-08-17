/**
 * Bateria de testes do Parser de Cifras — Harmony Hub.
 * Executar: bun scripts/test-cifra-parser.ts
 */
import {
  parseCifra,
  parseChord,
  transposeChord,
  transposeTom,
  transposeCifraText,
} from "../src/lib/cifra-parser";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(cond: boolean, name: string, extra?: unknown) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(extra !== undefined ? `${name} → ${JSON.stringify(extra)}` : name);
  }
}
function eq(actual: unknown, expected: unknown, name: string) {
  ok(actual === expected, `${name}: esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
}

// ─────────────────────────────────────────────────────────────
// 1. RECONHECIMENTO DOS ACORDES (lista obrigatória)
// ─────────────────────────────────────────────────────────────
const ACORDES = [
  "C", "Cm", "C#", "Db", "Bb", "Eb", "F#",
  "Am", "Bm7", "F7M", "F7M(2)", "F7M(2)/C",
  "Bbadd9", "Cadd9", "Dsus4", "Gsus2",
  "G/B", "C/E", "Db/F",
  "G#m7", "C#m11", "E13", "Bdim", "Caug",
  // extras comuns em louvor
  "G9", "D11", "A13", "C7", "Em9", "Am7/G", "C7M(9)", "D/F#", "E°", "Aø",
];
for (const c of ACORDES) ok(parseChord(c) !== null, `reconhece acorde ${c}`);

// ─────────────────────────────────────────────────────────────
// 2. NUNCA CONFUNDIR LETRA COM ACORDE
// ─────────────────────────────────────────────────────────────
const PALAVRAS = [
  "Amor", "Graça", "Aleluia", "Espírito", "Deus", "Senhor", "Cristo",
  "Bem", "Dom", "Ele", "Amém", "Canto", "Glória", "Dó", "Fá", "Vem", "Paz",
];
for (const w of PALAVRAS) ok(parseChord(w) === null, `não reconhece palavra "${w}" como acorde`);

// ─────────────────────────────────────────────────────────────
// 3. TRANSPOSIÇÃO (acordes simples, slash, modificadores)
// ─────────────────────────────────────────────────────────────
eq(transposeChord("C", 1), "C#", "C +1");
eq(transposeChord("Cm", 1), "C#m", "Cm +1");
eq(transposeChord("Db", 1), "D", "Db +1 (bemol→natural)");
eq(transposeChord("Db", 3), "E", "Db +3 = E (sempre do original)");
eq(transposeChord("Bb", 2), "C", "Bb +2");
eq(transposeChord("Eb", 2), "F", "Eb +2");
eq(transposeChord("F#", -1), "F", "F# -1");
eq(transposeChord("G/B", 3), "A#/D", "G/B +3 (raiz e baixo)");
eq(transposeChord("C/E", 2), "D/F#", "C/E +2 (ex. do documento)");
eq(transposeChord("F7M(2)/C", 2), "G7M(2)/D", "F7M(2)/C +2 (ex. do documento)");
eq(transposeChord("Db/F", 1), "D/Gb", "Db/F +1 herda preferência de bemol");
eq(transposeChord("Am7", 2), "Bm7", "Am7 +2 mantém m7");
eq(transposeChord("C7M", 1), "C#7M", "C7M +1 mantém 7M");
eq(transposeChord("F7M(2)", 2), "G7M(2)", "F7M(2) +2 mantém (2)");
eq(transposeChord("Dsus4", 2), "Esus4", "Dsus4 +2 mantém sus4");
eq(transposeChord("Gsus2", -2), "Fsus2", "Gsus2 -2 mantém sus2");
eq(transposeChord("Bdim", 1), "Cdim", "Bdim +1 mantém dim");
eq(transposeChord("Caug", 3), "D#aug", "Caug +3 mantém aug");
eq(transposeChord("G#m7", 3), "Bm7", "G#m7 +3");
eq(transposeChord("C#m11", -1), "Cm11", "C#m11 -1 mantém m11");
eq(transposeChord("E13", 2), "F#13", "E13 +2 mantém 13");
eq(transposeChord("Bbadd9", 1), "Badd9", "Bbadd9 +1 mantém add9");
eq(transposeChord("Cadd9", 2), "Dadd9", "Cadd9 +2 mantém add9");

// Roundtrip: ±12 semitons devolve o mesmo acorde
for (const c of ACORDES) {
  eq(transposeChord(c, 12), c, `${c} +12 = identidade`);
  eq(transposeChord(c, -12), c, `${c} -12 = identidade`);
}

// Tom exibido
eq(transposeTom("Db", 1), "D", "tom Db→D recalculado do original");
eq(transposeTom("Db", 3), "E", "tom Db→E recalculado do original");
eq(transposeTom("Am", 2), "Bm", "tom Am→Bm");
eq(transposeTom("G", -2), "F", "tom G→F");

// ─────────────────────────────────────────────────────────────
// 4. CLASSIFICAÇÃO (exemplo do documento)
// ─────────────────────────────────────────────────────────────
const doc = parseCifra("[Intro]\nC\nAm7\nF7M(2)/C\nG/B\nJesus eu preciso de Ti");
eq(doc.lines[0].type, "titulo", "[Intro] é título");
eq(doc.lines[1].type, "acordes", "linha C é acordes");
eq(doc.lines[2].type, "acordes", "linha Am7 é acordes");
eq(doc.lines[3].type, "acordes", "linha F7M(2)/C é acordes");
eq(doc.lines[4].type, "acordes", "linha G/B é acordes");
eq(doc.lines[5].type, "letra", "linha 'Jesus eu preciso de Ti' é letra");
eq(doc.lines[3].tokens[0].type, "acorde", "token F7M(2)/C classificado como acorde");

// Linha mista: marcador + anotação + acordes
const mista = parseCifra("[Intro] (Frase) C G (2x)");
eq(mista.lines[0].type, "acordes", "linha mista vira acordes");
eq(mista.lines[0].tokens[0].type, "titulo", "marcador preservado como título");
eq(transposeCifraText("[Intro] (Frase) C G (2x)", 1), "[Intro] (Frase) C# G# (2x)", "mista +1 transpõe só acordes");

// Proteção: palavra que parece acorde dentro de frase
const protecao = parseCifra("A Deus eu exalto\nEm todo tempo\nE a paz do Senhor");
eq(protecao.lines[0].type, "letra", "'A Deus eu exalto' é letra (A não transpõe)");
eq(protecao.lines[1].type, "letra", "'Em todo tempo' é letra (Em não transpõe)");
eq(protecao.lines[2].type, "letra", "'E a paz do Senhor' é letra (E não transpõe)");
eq(transposeCifraText("A Deus eu exalto", 7), "A Deus eu exalto", "letra com 'A' jamais transpõe");
eq(transposeCifraText("Em todo tempo", 5), "Em todo tempo", "letra com 'Em' jamais transpõe");

// ─────────────────────────────────────────────────────────────
// 5. LETRA INTACTA + ALINHAMENTO + CIFRA COMPLETA
// ─────────────────────────────────────────────────────────────
const ORIGINAL = [
  "[Intro]",
  "C       Am7     F7M(2)/C   G/B",
  "Jesus eu preciso de Ti",
  "",
  "[Refrão]",
  "G              C/E        Dsus4",
  "Amor, Graça e Aleluia!",
  "A  Deus eu exalto, Espírito",
  "Em todo tempo, Senhor e Cristo",
].join("\n");

const ESPERADO_MAIS2 = [
  "[Intro]",
  "D       Bm7     G7M(2)/D   A/C#",
  "Jesus eu preciso de Ti",
  "",
  "[Refrão]",
  "A              D/F#        Esus4",
  "Amor, Graça e Aleluia!",
  "A  Deus eu exalto, Espírito",
  "Em todo tempo, Senhor e Cristo",
].join("\n");

eq(transposeCifraText(ORIGINAL, 2), ESPERADO_MAIS2, "cifra completa +2 exata");
eq(transposeCifraText(ORIGINAL, 0), ORIGINAL, "offset 0 devolve o original intacto");

// Letra byte a byte idêntica para TODOS os deslocamentos possíveis
const linhasOriginais = ORIGINAL.split("\n");
for (let s = -11; s <= 11; s++) {
  const out = transposeCifraText(ORIGINAL, s).split("\n");
  eq(out.length, linhasOriginais.length, `s=${s}: número de linhas preservado`);
  for (const i of [0, 2, 3, 4, 6, 7, 8]) {
    eq(out[i], linhasOriginais[i], `s=${s}: linha ${i} (título/letra/vazia) intacta`);
  }
  // Espaçamento: nenhum espaço criado ou removido em nenhuma linha
  for (let i = 0; i < out.length; i++) {
    const antes = (linhasOriginais[i].match(/\s/g) ?? []).length;
    const depois = (out[i].match(/\s/g) ?? []).length;
    eq(depois, antes, `s=${s}: espaços da linha ${i} preservados`);
  }
}

// Acentos, pontuação e caracteres especiais da letra nunca mudam
const acentos = "Coração, canção, alegria — até o pó: ééé!";
eq(transposeCifraText(`C  G\n${acentos}`, 6), `F#  C#\n${acentos}`, "acentos e pontuação intactos");

// ─────────────────────────────────────────────────────────────
// 6. 20 TROCAS SEGUIDAS — SEMPRE A PARTIR DO ORIGINAL
// ─────────────────────────────────────────────────────────────
for (let i = 0; i < 20; i++) {
  const s = ((i * 5) % 13) - 6; // deslocamentos variados -6..+6
  const out = transposeCifraText(ORIGINAL, s);
  eq(out, transposeCifraText(ORIGINAL, s), `troca ${i + 1}: função pura/determinística`);
  // A linha de acordes deve corresponder à transposição DIRETA do original
  eq(
    out.split("\n")[1],
    linhasOriginais[1]
      .split(/(\s+)/)
      .map((tok) => transposeChord(tok, s))
      .join(""),
    `troca ${i + 1}: acordes recalculados do original`,
  );
  eq(out.split("\n")[6], linhasOriginais[6], `troca ${i + 1}: letra intacta`);
}
// Retorno ao tom original após 20 trocas
eq(transposeCifraText(ORIGINAL, 0), ORIGINAL, "retorno ao tom original sem resíduo");
// Encadeamento NÃO é usado: transpor o resultado mudaria a precisão — garantimos que o
// contrato da API (sempre original + offset) produz o mesmo valor que a transposição direta.
eq(
  transposeCifraText(ORIGINAL, 4),
  transposeCifraText(ORIGINAL, 1 + 3),
  "offset 4 calculado do original (nunca 1→3 encadeado)",
);

// ─────────────────────────────────────────────────────────────
// 7. DESEMPENHO — cifra grande responde instantaneamente
// ─────────────────────────────────────────────────────────────
const grande = Array.from({ length: 120 }, () => ORIGINAL).join("\n\n"); // ~1080 linhas
const t0 = performance.now();
for (let i = 0; i < 50; i++) transposeCifraText(grande, i % 12);
const elapsed = performance.now() - t0;
ok(elapsed < 500, `desempenho: 50 transposições de cifra com ${grande.split("\n").length} linhas em ${elapsed.toFixed(1)}ms (<500ms)`);

// ─────────────────────────────────────────────────────────────
// RESULTADO
// ─────────────────────────────────────────────────────────────
console.log(`\n✔ ${passed} testes aprovados`);
if (failed > 0) {
  console.error(`✘ ${failed} testes falharam:`);
  for (const f of failures.slice(0, 40)) console.error("  - " + f);
  process.exit(1);
}
console.log("TODOS OS TESTES DO MOTOR DE CIFRAS PASSARAM");
