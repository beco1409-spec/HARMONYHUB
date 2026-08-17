import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Music2, Plus, Search, X } from "lucide-react";
import { listCantores, listMusicas } from "@/lib/db";

export function MusicaPicker({
  excludeIds = [],
  onPick,
  onClose,
  onCreateNew,
}: {
  excludeIds?: string[];
  onPick: (musicaId: string, cantorId: string | null) => void;
  onClose: () => void;
  onCreateNew: () => void;
}) {
  const [q, setQ] = useState("");
  const [cantorId, setCantorId] = useState<string>("");

  const { data: musicas = [] } = useQuery({ queryKey: ["musicas"], queryFn: listMusicas });
  const { data: cantores = [] } = useQuery({ queryKey: ["cantores"], queryFn: listCantores });

  const filtered = musicas.filter(
    (m) =>
      !excludeIds.includes(m.id) &&
      `${m.nome} ${m.autor ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-background pb-8 pt-4 shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="font-serif text-lg italic">Adicionar música ao culto</h3>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou autor…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Cantor (opcional)
            </span>
            <select
              value={cantorId}
              onChange={(e) => setCantorId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            >
              <option value="">Sem cantor definido</option>
              {cantores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul className="max-h-[45vh] space-y-1 overflow-y-auto px-3 pb-3">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onPick(m.id, cantorId || null)}
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-secondary"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Music2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nome}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.autor || "—"}
                    {m.bpm ? ` • ${m.bpm} BPM` : ""}
                  </p>
                </div>
                {m.tom_original && (
                  <span className="font-mono text-xs font-bold text-accent">
                    {m.tom_original}
                  </span>
                )}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="p-4 text-center text-xs text-muted-foreground">
              Nenhuma música encontrada na biblioteca.
            </li>
          )}
        </ul>

        <div className="px-5 pt-2">
          <button
            onClick={onCreateNew}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            <Plus className="size-3.5" /> Cadastrar nova música
          </button>
        </div>
      </div>
    </div>
  );
}
