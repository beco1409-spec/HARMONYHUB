import { useState } from "react";
import { ArrowLeft, CaseSensitive, Pencil, Star } from "lucide-react";
import { CifraView } from "@/components/CifraView";
import { transposeTom } from "@/lib/transpose";
import type { Musica } from "@/lib/db";

const TAMANHOS = ["text-[12px]", "text-[14px]", "text-[16px]"] as const;

/**
 * Leitor de cifra em tela cheia, no estilo de um app de cifras: seta de
 * voltar, título, tamanho de fonte e favorito no topo; tom em destaque com
 * seletor circular (−/tom/+); cifra renderizada linha do acorde acima da
 * linha da letra, com editar música ao final. Acessível a partir da
 * Biblioteca sem precisar entrar em nenhum culto agendado.
 */
export function MusicaViewer({
  musica,
  favorito = false,
  onToggleFavorito,
  onClose,
  onEdit,
}: {
  musica: Musica;
  favorito?: boolean;
  onToggleFavorito?: () => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [tamanho, setTamanho] = useState(1);

  const tomBase = musica.tom_original ?? "—";
  const tomExibido = tomBase !== "—" ? transposeTom(tomBase, offset) : "—";
  const conteudo = musica.cifra || musica.letra || "Cifra não cadastrada para esta música.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="grid size-9 place-items-center rounded-full text-foreground hover:bg-secondary"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-serif text-lg italic">Cifras</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTamanho((t) => (t + 1) % TAMANHOS.length)}
            aria-label="Alterar tamanho da letra"
            className="grid size-9 place-items-center rounded-full text-foreground hover:bg-secondary"
          >
            <CaseSensitive className="size-5" />
          </button>
          {onToggleFavorito && (
            <button
              onClick={onToggleFavorito}
              aria-label={favorito ? "Desfavoritar" : "Favoritar"}
              className={`grid size-9 place-items-center rounded-full hover:bg-secondary ${
                favorito ? "text-accent" : "text-foreground"
              }`}
            >
              <Star className="size-5" fill={favorito ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-5">
        <h2 className="font-serif text-2xl italic">{musica.nome}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tom {tomBase}</p>
        {musica.autor && (
          <p className="text-sm text-muted-foreground">{musica.autor}</p>
        )}

        <div className="my-5 flex items-center justify-center gap-3">
          <button
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Transpor um tom abaixo"
            className="grid size-11 place-items-center rounded-full border border-border text-lg font-semibold"
          >
            −
          </button>
          <span className="grid size-11 place-items-center rounded-full border border-border font-mono text-base font-bold text-accent">
            {tomExibido}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Transpor um tom acima"
            className="grid size-11 place-items-center rounded-full border border-border text-lg font-semibold"
          >
            +
          </button>
        </div>

        <CifraView text={conteudo} semitones={offset} sizeClass={TAMANHOS[tamanho]} />
      </div>

      <div className="shrink-0 border-t border-border bg-background px-5 py-3">
        <button
          onClick={onEdit}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-xs font-bold uppercase tracking-wider text-foreground"
        >
          <Pencil className="size-3.5" /> Editar música
        </button>
      </div>
    </div>
  );
}
