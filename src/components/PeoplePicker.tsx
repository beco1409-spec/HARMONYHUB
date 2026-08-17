import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listCantores,
  listInstrumentistas,
  createCantor,
  createInstrumentista,
} from "@/lib/db";

type Tipo = "cantor" | "instrumentista";

export function PeoplePicker({
  tipo,
  onPick,
  onClose,
  excludeIds = [],
}: {
  tipo: Tipo;
  onPick: (id: string, nome: string) => void;
  onClose: () => void;
  excludeIds?: string[];
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [novo, setNovo] = useState({ nome: "", extra: "" });

  const key = tipo === "cantor" ? ["cantores"] : ["instrumentistas"];
  const { data = [] } = useQuery<Array<{ id: string; nome: string; voz?: string | null; instrumento?: string | null }>>({
    queryKey: key,
    queryFn: async () =>
      tipo === "cantor" ? await listCantores() : await listInstrumentistas(),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (tipo === "cantor") {
        return createCantor({ nome: novo.nome, voz: novo.extra || null });
      }
      return createInstrumentista({ nome: novo.nome, instrumento: novo.extra || "—" });
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(`${tipo === "cantor" ? "Cantor" : "Instrumentista"} criado`);
      onPick(row.id, row.nome);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = data.filter(
    (p) =>
      !excludeIds.includes(p.id) && p.nome.toLowerCase().includes(q.toLowerCase()),
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
          <h3 className="font-serif text-lg italic">
            {tipo === "cantor" ? "Selecionar cantor" : "Selecionar instrumentista"}
          </h3>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>

        {!creating ? (
          <>
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <ul className="max-h-[45vh] space-y-1 overflow-y-auto px-3 pb-3">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onPick(p.id, p.nome)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-secondary"
                  >
                    <div className="grid size-9 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {p.nome
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tipo === "cantor"
                          ? (p as { voz?: string | null }).voz || "—"
                          : (p as { instrumento?: string }).instrumento || "—"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="p-4 text-center text-xs text-muted-foreground">
                  Nenhum {tipo} encontrado.
                </li>
              )}
            </ul>
            <div className="px-5 pt-2">
              <button
                onClick={() => {
                  setCreating(true);
                  setNovo({ nome: q, extra: "" });
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                <Plus className="size-3.5" /> Cadastrar novo {tipo}
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!novo.nome.trim()) return;
              create.mutate();
            }}
            className="space-y-3 px-5"
          >
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Nome
              </span>
              <input
                autoFocus
                required
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {tipo === "cantor" ? "Voz (soprano, tenor…)" : "Instrumento"}
              </span>
              <input
                value={novo.extra}
                onChange={(e) => setNovo({ ...novo, extra: e.target.value })}
                placeholder={tipo === "cantor" ? "Ex.: Soprano" : "Ex.: Guitarra"}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-xl border border-border bg-surface py-3 text-xs font-bold uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
              >
                {create.isPending ? "Salvando…" : "Cadastrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
