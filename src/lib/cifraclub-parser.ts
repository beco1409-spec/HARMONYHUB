/**
 * Parser do HTML de páginas de cifra do Cifra Club.
 *
 * Extrai: nome, autor, tom original, capotraste, afinação, cifra e letra.
 * Cada campo tem fallbacks e o resultado inclui diagnósticos (`diag`)
 * indicando qual estratégia funcionou — usado nos logs do backend.
 */
import { parseCifra } from "./cifra-parser";


export interface CifraClubImport {
  nome: string | null;
  autor: string | null;
  tom: string | null;
  capotraste: string | null;
  afinacao: string | null;
  cifra: string | null;
  letra: string | null;
}

export interface CifraClubDiagnostics {
  fonte_nome: string | null;
  fonte_autor: string | null;
  tom: boolean;
  capotraste: boolean;
  afinacao: boolean;
  fonte_cifra: string | null;
  tamanho_cifra: number;
  tamanho_html: number;
}

export interface CifraClubParseResult {
  data: CifraClubImport;
  diag: CifraClubDiagnostics;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&amp;/g, "&");
}

/** Remove scripts, styles e comentários para os padrões não casarem com código. */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

interface JsonLdResult {
  nome: string | null;
  autor: string | null;
}

function extractJsonLd(html: string): JsonLdResult {
  let nome: string | null = null;
  let autor: string | null = null;

  const items: unknown[] = [];
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(block[1]);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item && typeof item === "object") {
          items.push(item);
          const graph = (item as Record<string, unknown>)["@graph"];
          if (Array.isArray(graph)) items.push(...graph);
        }
      }
    } catch {
      // bloco JSON-LD inválido — ignora
    }
  }

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const types = Array.isArray(item?.["@type"]) ? item["@type"] : [item?.["@type"]];

    if (types.includes("MusicComposition") && typeof item.name === "string") {
      nome = item.name.trim();
      const composer = item.composer;
      const first = Array.isArray(composer) ? composer[0] : composer;
      if (!autor && first && typeof (first as Record<string, unknown>).name === "string") {
        autor = ((first as Record<string, unknown>).name as string).trim();
      }
    }

    if (types.includes("MusicRecording")) {
      const artist = (item.byArtist as Record<string, unknown> | undefined)?.name;
      if (typeof artist === "string") autor = artist.trim();
      if (!nome && typeof item.name === "string" && autor && item.name.startsWith(autor)) {
        nome = item.name.slice(autor.length).replace(/^\s*-\s*/, "").trim();
      }
    }

    // Fallback: trilha de navegação (Início > Artista > Música).
    if (types.includes("BreadcrumbList") && Array.isArray(item.itemListElement)) {
      const crumbs = item.itemListElement as Array<Record<string, unknown>>;
      const names = crumbs
        .map((c) => (typeof c?.name === "string" ? c.name.trim() : null))
        .filter((n): n is string => !!n && n !== "Início");
      if (!autor && names.length >= 2) autor = names[names.length - 2];
      if (!nome && names.length >= 1) nome = names[names.length - 1];
    }
  }

  return { nome, autor };
}

/** Último fallback: <title>Música - Artista - Cifra Club</title> */
function extractFromTitle(html: string): JsonLdResult {
  const m = html.match(/<title>([^<]+)<\/title>/i) ?? html.match(/<meta property="og:title" content="([^"]+)"/i);
  if (!m) return { nome: null, autor: null };
  const clean = decodeEntities(m[1]).replace(/\s*-\s*Cifra Club\s*$/i, "");
  const parts = clean.split(/\s+-\s+/);
  return {
    nome: parts[0]?.trim() || null,
    autor: parts.length > 1 ? parts[1].trim() : null,
  };
}

function extractTom(html: string): string | null {
  // Estrutura: botão "Diminuir tom" seguido de <span><p>TOM</p></span>
  const m = html.match(
    /aria-label="Diminuir tom"[\s\S]{0,800}?<p[^>]*>\s*([A-G][#b]?(?:m|maj|min)?)\s*<\/p>/,
  );
  if (m) return m[1];
  return null;
}

/** Extrai valor de campos rotulados: >RÓTULO</p></div><span ...><p ...>VALOR</p> */
function extractLabeledValue(html: string, label: string): string | null {
  const re = new RegExp(
    `>${label}</p>\\s*</div>\\s*<span[^>]*>\\s*<p[^>]*>\\s*([^<]+?)\\s*</p>`,
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

function cleanPreText(inner: string): string {
  let text = inner
    // Blocos de tablatura não fazem parte da cifra — removemos.
    .replace(/<div class="tabs">[\s\S]*?<\/div>/g, "")
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/g, "\n")
    .replace(/<\/p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractCifra(html: string): { cifra: string | null; fonte: string | null } {
  // Estratégia 1: bloco oficial marcado pelo site.
  const oficial = html.match(/<pre\b[^>]*data-chord-content="true"[^>]*>([\s\S]*?)<\/pre>/i);
  if (oficial) {
    const cifra = cleanPreText(oficial[1]);
    if (cifra.length > 0) return { cifra, fonte: "data-chord-content" };
  }

  // Estratégia 2: maior <pre> que contenha acordes em <b>.
  let melhor: string | null = null;
  for (const pre of html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)) {
    const inner = pre[1];
    if (!/<b\b[^>]*>\s*[A-G][#b]?/.test(inner)) continue;
    if (melhor === null || inner.length > melhor.length) melhor = inner;
  }
  if (melhor) {
    const cifra = cleanPreText(melhor);
    if (cifra.length > 0) return { cifra, fonte: "pre-fallback" };
  }

  return { cifra: null, fonte: null };
}

/**
 * Deriva a letra usando o MESMO motor estrutural do app (`cifra-parser`),
 * sem regex duplicada. Linhas classificadas como "acordes" (inclui casos
 * como `F7M(2)/C`) são removidas; títulos `[Seção]` e letra permanecem.
 */
function deriveLetra(cifra: string): string | null {
  const parsed = parseCifra(cifra);
  const letra = parsed.lines
    .map((l) => (l.type === "acordes" ? "" : l.raw.replace(/\s+$/g, "")))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return letra.length > 0 ? letra : null;
}

export function parseCifraClubHtml(htmlBruto: string): CifraClubParseResult {
  const html = sanitizeHtml(htmlBruto);

  const jsonld = extractJsonLd(htmlBruto); // JSON-LD vive em <script> — usar o HTML bruto
  const titulo = extractFromTitle(html);
  const nome = jsonld.nome ?? titulo.nome;
  const autor = jsonld.autor ?? titulo.autor;

  const tom = extractTom(html);
  const capotraste = extractLabeledValue(html, "Capotraste");
  const afinacao = extractLabeledValue(html, "Afinação");
  const { cifra, fonte: fonteCifra } = extractCifra(html);
  const letra = cifra ? deriveLetra(cifra) : null;

  return {
    data: { nome, autor, tom, capotraste, afinacao, cifra, letra },
    diag: {
      fonte_nome: jsonld.nome ? "json-ld" : nome ? "titulo" : null,
      fonte_autor: jsonld.autor ? "json-ld" : autor ? "titulo" : null,
      tom: tom !== null,
      capotraste: capotraste !== null,
      afinacao: afinacao !== null,
      fonte_cifra: fonteCifra,
      tamanho_cifra: cifra?.length ?? 0,
      tamanho_html: htmlBruto.length,
    },
  };
}
