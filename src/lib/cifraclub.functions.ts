import { createServerFn } from "@tanstack/react-start";
import { normalizeCifraClubUrl } from "./cifraclub-url";
import { parseCifraClubHtml, type CifraClubImport } from "./cifraclub-parser";
import { fetchCifraClubHtml } from "./cifraclub-fetch.server";

export const importCifraClub = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    const norm = data?.url ? normalizeCifraClubUrl(String(data.url)) : null;
    if (!norm) {
      throw new Error(
        "Link inválido. Cole o link de uma música do Cifra Club (ex.: https://www.cifraclub.com.br/artista/musica/).",
      );
    }
    return { url: norm.canonical };
  })
  .handler(async ({ data }): Promise<CifraClubImport> => {
    console.log("[cifraclub] 1/3 URL normalizada:", data.url);

    const page = await fetchCifraClubHtml(data.url);
    console.log(`[cifraclub] 2/3 página lida: HTTP ${page.status}, ${page.html.length} bytes`);

    const { data: parsed, diag } = parseCifraClubHtml(page.html);
    console.log("[cifraclub] 3/3 extração:", JSON.stringify(diag));

    if (!parsed.cifra && !parsed.nome) {
      throw new Error(
        "A página foi carregada, mas a estrutura da cifra não foi reconhecida. Tente outra versão da música no Cifra Club.",
      );
    }
    return parsed;
  });
