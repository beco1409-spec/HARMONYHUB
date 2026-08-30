import { useState } from "react";
import { X, Pencil, Youtube, FileMusic } from "lucide-react";
import { CifraView } from "@/components/CifraView";
import { transposeTom } from "@/lib/transpose";
import type { Musica } from "@/lib/db";

/**
 * Visualização somente-leitura da cifra de uma música da biblioteca.
 * Reaproveita o mesmo CifraView usado no Modo Culto Ao Vivo, permitindo
 * consultar letra, cifra e transpor o tom sem precisar entrar em nenhum
 * culto agendado.
 */
export function MusicaViewer({
  musica,
  onClose,
  onEdit,
}: {
  musica: Musica;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [offset, setOffset] = useState(0);

  const tomBase = musica.tom_original ?? "—";
  const tomExibido = tomBase !== "—" ? transposeTom(tomBase, offset) : "—";
  const conteudo = musica.cifra || musica.letra || "Cifra não cadastrada para esta música.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background pb-8 pt-4 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />

        <div className="flex items-start justify-between px-5 pb-1">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg italic">{musica.nome}</h3>
            <p className="truncate text-[12px] text-muted-foreground">
              {musica.autor || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-2">
          {musica.youtube_url && (
            <a
              href={musica.youtube_url}
              target="_blank"
              rel="noreferrer"
              className="grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Abrir no YouTube"
            >
              <Youtube className="size-3.5" />
            </a>
          )}
          {musica.cifraclub_url && (
            <a
              href={musica.cifraclub_url}
              target="_blank"
              rel="noreferrer"
              className="grid size-7 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Abrir no Cifra Club"
            >
              <FileMusic className="size-3.5" />
            </a>
          )}
          {musica.bpm && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {musica.bpm} BPM
            </span>
          )}
        </div>

        <section className="mt-4 rounded-t-3xl bg-background px-5 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-serif text-base italic">Cifra & Letra</h4>
            <div className="flex gap-1">
              <button
                onClick={() => setOffset((o) => o - 1)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold"
                aria-label="Transpor um tom abaixo"
              >
                −
              </button>
              <span className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-mono font-semibold text-accent">
                {tomExibido}
              </span>
              <button
                onClick={() => setOffset((o) => o + 1)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold"
                aria-label="Transpor um tom acima"
              >
                +
              </button>
            </div>
          </div>

          <CifraView text={conteudo} semitones={offset} />
        </section>

        <div className="px-5 pt-6">
          <button
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-xs font-bold uppercase tracking-wider text-foreground"
          >
            <Pencil className="size-3.5" /> Editar música
          </button>
        </div>
      </div>
    </div>
  );
}
