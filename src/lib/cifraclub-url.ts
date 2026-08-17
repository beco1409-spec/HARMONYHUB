/**
 * Validação e normalização de URLs do Cifra Club.
 *
 * Aceita qualquer formato que o usuário possa colar/compartilhar:
 *  - https://www.cifraclub.com.br/artista/musica/
 *  - https://www.cifraclub.com.br/artista/musica/?key=3&instrument=keyboard
 *  - https://m.cifraclub.com.br/artista/musica/   (versão mobile)
 *  - https://cifraclub.com.br/artista/musica#tabs=false
 *  - cifraclub.com.br/artista/musica              (sem protocolo)
 *
 * Produz sempre a URL canônica https://www.cifraclub.com.br/artista/musica/
 */

export interface CifraClubUrlNormalizada {
  /** URL canônica pronta para o fetch (sem query params nem âncoras). */
  canonical: string;
  artista: string;
  slug: string;
}

// Primeiro segmento de páginas que existem no domínio mas NÃO são cifras de música.
const SEGMENTOS_RESERVADOS = new Set([
  "tags",
  "page",
  "busca",
  "search",
  "artistas",
  "estilos",
  "mais-acessadas",
  "lancamentos",
  "minhas-cifras",
  "envie-sua-cifra",
  "afinador",
  "app",
  "blog",
  "forum",
  "videos",
  "login",
  "cadastro",
  "sobre",
  "contato",
]);

export function normalizeCifraClubUrl(raw: string): CifraClubUrlNormalizada | null {
  let s = raw.trim();
  if (!s) return null;

  // Aceita colar sem protocolo (ex.: "cifraclub.com.br/artista/musica").
  if (!/^https?:\/\//i.test(s)) {
    if (/^(www\.|m\.)?cifraclub\.com\.br(\/|$)/i.test(s)) {
      s = `https://${s}`;
    } else {
      return null;
    }
  }

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

  // Aceita www, m e qualquer outro subdomínio de cifraclub.com.br.
  const host = url.hostname.toLowerCase();
  if (host !== "cifraclub.com.br" && !host.endsWith(".cifraclub.com.br")) return null;

  // Query params (?key=, ?instrument=, utm_*) e âncoras (#tabs=...) são descartados.
  const segmentos = url.pathname
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });

  // Página de cifra é sempre /artista/musica — exatamente 2 segmentos.
  if (segmentos.length !== 2) return null;
  const [artista, slug] = segmentos;
  if (!/^[\w-]+$/i.test(artista) || !/^[\w-]+$/i.test(slug)) return null;
  if (SEGMENTOS_RESERVADOS.has(artista.toLowerCase())) return null;

  return {
    canonical: `https://www.cifraclub.com.br/${artista}/${slug}/`,
    artista,
    slug,
  };
}

export function isCifraClubUrl(raw: string): boolean {
  return normalizeCifraClubUrl(raw) !== null;
}
