/**
 * Fetch da página do Cifra Club — somente servidor.
 *
 * O scrape roda no backend para evitar CORS e para aplicar cabeçalhos
 * de navegador. Cada causa de falha vira um erro com mensagem específica
 * em português, que chega ao usuário no formulário.
 */

const TIMEOUT_MS = 15000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.google.com/",
  "Upgrade-Insecure-Requests": "1",
};

export interface CifraClubPage {
  html: string;
  status: number;
}

async function attemptFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: BROWSER_HEADERS,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCifraClubHtml(url: string): Promise<CifraClubPage> {
  let res: Response;
  try {
    res = await attemptFetch(url);
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      throw new Error("O Cifra Club demorou demais para responder. Tente novamente.");
    }
    throw new Error("Falha de conexão ao acessar o Cifra Club. Tente novamente.");
  }

  if (res.status === 404) {
    throw new Error("Música não encontrada no Cifra Club (HTTP 404). Confira o link.");
  }

  if (res.status === 403 || res.status === 503 || res.status === 429) {
    const body = await res.text().catch(() => "");
    const cloudflare = /cloudflare|cf-ray|just a moment/i.test(body);
    throw new Error(
      cloudflare
        ? `O Cifra Club bloqueou temporariamente o acesso automatizado (HTTP ${res.status}). Aguarde alguns segundos e tente novamente.`
        : `O Cifra Club recusou o acesso (HTTP ${res.status}). Tente novamente em instantes.`,
    );
  }

  if (!res.ok) {
    throw new Error(`O Cifra Club respondeu com um erro inesperado (HTTP ${res.status}).`);
  }

  const html = await res.text();
  if (html.length < 1000) {
    throw new Error("A página retornada pelo Cifra Club veio vazia. Tente novamente.");
  }
  return { html, status: res.status };
}
