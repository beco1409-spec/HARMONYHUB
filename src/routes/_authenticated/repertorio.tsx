import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Music2,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  Star,
  Plus,
  Youtube,
  FileMusic,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, AppHeader } from "@/components/AppShell";
import { MusicaForm } from "@/components/MusicaForm";
import { MusicaPicker } from "@/components/MusicaPicker";
import { useAuth } from "@/hooks/use-auth";
import {
  addFavorito,
  addToRepertorio,
  deleteMusica,
  duracaoParaSegundos,
  getProximoCultoFull,
  listFavoritos,
  listMusicas,
  listRepertorio,
  removeFavorito,
  removeRepertorioItem,
  segundosParaMinutos,
  updateRepertorioItem,
  type Musica,
} from "@/lib/db";
import { transposeTom } from "@/lib/transpose";

export const Route = createFileRoute("/_authenticated/repertorio")({
  head: () => ({
    meta: [
      { title: "Repertório — Portal Adoração" },
      { name: "description", content: "Playlist do culto e biblioteca de músicas com tom, BPM e cifras." },
    ],
  }),
  component: RepertorioPage,
});

function RepertorioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"culto" | "biblioteca">("culto");
  const [q, setQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Musica | null>(null);

  const { data: proximo, isLoading: loadingCulto } = useQuery({
    queryKey: ["proximo-culto"],
    queryFn: getProximoCultoFull,
  });

  const { data: repertorio = [] } = useQuery({
    queryKey: ["repertorio", proximo?.id],
    queryFn: () => listRepertorio(proximo!.id),
    enabled: !!proximo?.id,
  });

  const { data: musicas = [], isLoading: loadingMusicas } = useQuery({
    queryKey: ["musicas"],
    queryFn: listMusicas,
  });

  const { data: favoritos = [] } = useQuery({
    queryKey: ["favoritos", user?.id],
    queryFn: () => listFavoritos(user!.id),
    enabled: !!user,
  });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ["repertorio", proximo?.id] });
    qc.invalidateQueries({ queryKey: ["proximo-culto"] });
  };

  const addMusica = useMutation({
    mutationFn: ({ musicaId, cantorId }: { musicaId: string; cantorId: string | null }) =>
      addToRepertorio({
        culto_id: proximo!.id,
        musica_id: musicaId,
        cantor_id: cantorId,
        ordem: repertorio.length
          ? Math.max(...repertorio.map((r) => r.ordem)) + 1
          : 0,
      }),
    onSuccess: () => {
      invalidar();
      setPickerOpen(false);
      toast.success("Música adicionada ao culto");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMusica = useMutation({
    mutationFn: (id: string) => removeRepertorioItem(id),
    onSuccess: () => {
      invalidar();
      toast.success("Música removida do culto");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mover = useMutation({
    mutationFn: async ({ idx, dir }: { idx: number; dir: -1 | 1 }) => {
      const alvo = idx + dir;
      if (alvo < 0 || alvo >= repertorio.length) return;
      const a = repertorio[idx];
      const b = repertorio[alvo];
      await updateRepertorioItem(a.id, { ordem: b.ordem });
      await updateRepertorioItem(b.id, { ordem: a.ordem });
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const mudarTom = useMutation({
    mutationFn: ({ id, tom, delta }: { id: string; tom: string; delta: 1 | -1 }) =>
      updateRepertorioItem(id, { tom_override: transposeTom(tom, delta) }),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirMusica = useMutation({
    mutationFn: (id: string) => deleteMusica(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["musicas"] });
      invalidar();
      toast.success("Música excluída da biblioteca");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFavorito = useMutation({
    mutationFn: async ({ musicaId, fav }: { musicaId: string; fav: boolean }) => {
      if (!user) return;
      if (fav) await removeFavorito(user.id, musicaId);
      else await addFavorito(user.id, musicaId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favoritos", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const biblioteca = musicas.filter((m) =>
    `${m.nome} ${m.autor ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  const duracaoTotal = segundosParaMinutos(
    repertorio.reduce((acc, r) => acc + duracaoParaSegundos(r.musica?.duracao), 0),
  );

  return (
    <AppShell>
      <AppHeader
        eyebrow="Repertório"
        title="Playlist do Culto"
        subtitle={proximo?.nome ?? "Nenhum culto agendado"}
        right={
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-glow"
          >
            <Plus className="size-3.5" /> Nova
          </button>
        }
      />

      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 rounded-xl bg-secondary p-1">
          {(["culto", "biblioteca"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg py-2 text-xs font-semibold capitalize transition ${
                tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "culto" ? "Este Culto" : "Biblioteca"}
            </button>
          ))}
        </div>
      </div>

      {tab === "biblioteca" && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou autor…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      <main className="space-y-3 px-4">
        {tab === "culto" && (
          <div className="rounded-3xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Duração estimada
                </p>
                <p className="font-serif text-xl">
                  {repertorio.length} músicas • {duracaoTotal}
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/culto" })}
                disabled={!proximo}
                className="rounded-full bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-40"
              >
                Iniciar
              </button>
            </div>
          </div>
        )}

        {tab === "culto" && loadingCulto && (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        )}

        {tab === "culto" && !loadingCulto && !proximo && (
          <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center">
            <Music2 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-serif text-lg italic">Nenhum culto agendado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um culto na aba Escala para montar o repertório.
            </p>
          </div>
        )}

        {/* Lista: repertório do culto */}
        {tab === "culto" && proximo && (
          <ul className="space-y-2">
            {repertorio.map((r, idx) => {
              const tom = r.tom_override ?? r.musica?.tom_original ?? "—";
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/5 font-serif text-sm font-bold text-primary">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.musica?.nome ?? "—"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.musica?.autor || "—"}
                      {r.cantor?.nome ? ` • ${r.cantor.nome}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() =>
                        tom !== "—" && mudarTom.mutate({ id: r.id, tom, delta: -1 })
                      }
                      className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-xs font-bold text-accent">
                      {tom}
                    </span>
                    <button
                      onClick={() =>
                        tom !== "—" && mudarTom.mutate({ id: r.id, tom, delta: 1 })
                      }
                      className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-2.5" />
                      {r.musica?.bpm ? `${r.musica.bpm} BPM` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.musica?.duracao ?? ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <button
                      onClick={() => mover.mutate({ idx, dir: -1 })}
                      disabled={idx === 0}
                      className="text-muted-foreground disabled:opacity-25"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      onClick={() => mover.mutate({ idx, dir: 1 })}
                      disabled={idx === repertorio.length - 1}
                      className="text-muted-foreground disabled:opacity-25"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeMusica.mutate(r.id)}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
            {repertorio.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">
                Repertório vazio. Adicione a primeira música.
              </li>
            )}
          </ul>
        )}

        {tab === "culto" && proximo && (
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground"
          >
            + Adicionar música
          </button>
        )}

        {/* Lista: biblioteca */}
        {tab === "biblioteca" && (
          <ul className="space-y-2">
            {loadingMusicas && (
              <li className="py-8 text-center text-sm text-muted-foreground">Carregando…</li>
            )}
            {!loadingMusicas && biblioteca.length === 0 && (
              <li className="rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center">
                <Music2 className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-serif text-lg italic">Biblioteca vazia</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre a primeira música do ministério.
                </p>
              </li>
            )}
            {biblioteca.map((m) => {
              const fav = favoritos.includes(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Music2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{m.nome}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {m.autor || "—"}
                      {m.ministerio ? ` • ${m.ministerio}` : ""}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {m.youtube_url && (
                        <a
                          href={m.youtube_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Youtube className="size-3.5" />
                        </a>
                      )}
                      {m.cifraclub_url && (
                        <a
                          href={m.cifraclub_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <FileMusic className="size-3.5" />
                        </a>
                      )}
                      {m.cifra && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                          Cifra
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs font-bold text-accent">
                      {m.tom_original ?? "—"}
                    </p>
                    <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-2.5" />
                      {m.bpm ? `${m.bpm} BPM` : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      aria-label={fav ? `Desfavoritar ${m.nome}` : `Favoritar ${m.nome}`}
                      onClick={() => toggleFavorito.mutate({ musicaId: m.id, fav })}
                      className={`grid size-7 place-items-center rounded-full ${
                        fav ? "text-accent" : "text-muted-foreground"
                      }`}
                    >
                      <Star className="size-4" fill={fav ? "currentColor" : "none"} />
                    </button>
                    <button
                      aria-label={`Editar ${m.nome}`}
                      onClick={() => {
                        setEditing(m);
                        setFormOpen(true);
                      }}
                      className="grid size-7 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      aria-label={`Excluir ${m.nome}`}
                      onClick={() => {
                        if (confirm(`Excluir "${m.nome}" da biblioteca?`)) {
                          excluirMusica.mutate(m.id);
                        }
                      }}
                      className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {pickerOpen && proximo && (
        <MusicaPicker
          excludeIds={repertorio.map((r) => r.musica_id)}
          onClose={() => setPickerOpen(false)}
          onPick={(musicaId, cantorId) => addMusica.mutate({ musicaId, cantorId })}
          onCreateNew={() => {
            setPickerOpen(false);
            setEditing(null);
            setFormOpen(true);
          }}
        />
      )}

      {formOpen && (
        <MusicaForm
          musica={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(id) => {
            if (!editing && proximo && tab === "culto") {
              addMusica.mutate({ musicaId: id, cantorId: null });
            }
          }}
        />
      )}
    </AppShell>
  );
}
