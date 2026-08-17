import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  FileText,
  MessageCircle,
  ChevronRight,
  Clock,
  MapPin,
  LogIn,
  Calendar,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, AppHeader } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import {
  createAviso,
  deleteAviso,
  formatCultoData,
  formatHora,
  getCultosSemana,
  getLiveSession,
  getProximoCultoFull,
  iniciaisDe,
  listAvisos,
  tempoRelativo,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ministério de louvor" },
      { name: "description", content: "Gerencie escalas, repertório e o Modo Culto ao vivo do seu ministério de louvor." },
      { property: "og:title", content: "Ministério de louvor" },
      { property: "og:description", content: "Gerencie escalas, repertório e o Modo Culto ao vivo do seu ministério de louvor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (diff <= 0) {
    return <p className="font-serif text-2xl italic text-accent">É hoje!</p>;
  }

  return (
    <div className="flex gap-5">
      {[
        { v: String(dias).padStart(2, "0"), l: "Dias" },
        { v: String(horas).padStart(2, "0"), l: "Horas" },
        { v: String(mins).padStart(2, "0"), l: "Min" },
      ].map((c) => (
        <div key={c.l} className="text-center">
          <p className="font-serif text-3xl font-bold text-primary-foreground">{c.v}</p>
          <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">
            {c.l}
          </p>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [novoAviso, setNovoAviso] = useState("");

  const { data: proximo } = useQuery({
    queryKey: ["proximo-culto"],
    queryFn: getProximoCultoFull,
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: live } = useQuery({
    queryKey: ["live"],
    queryFn: getLiveSession,
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: avisos = [] } = useQuery({
    queryKey: ["avisos"],
    queryFn: listAvisos,
    enabled: !!user,
  });

  const { data: semana = [] } = useQuery({
    queryKey: ["cultos-semana"],
    queryFn: getCultosSemana,
    enabled: !!user,
  });

  // Realtime: avisos novos aparecem para todos
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("avisos-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "avisos" }, () =>
        qc.invalidateQueries({ queryKey: ["avisos"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const publicarAviso = useMutation({
    mutationFn: () => createAviso(novoAviso.trim()),
    onSuccess: () => {
      setNovoAviso("");
      qc.invalidateQueries({ queryKey: ["avisos"] });
      toast.success("Aviso publicado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagarAviso = useMutation({
    mutationFn: (id: string) => deleteAviso(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avisos"] });
      toast.success("Aviso removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const iniciais = ((user?.user_metadata?.full_name as string) || user?.email || "GA")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  const confirmados = proximo?.integrantes_culto.filter((i) => i.status === "confirmado") ?? [];
  const pendentes = proximo?.integrantes_culto.filter((i) => i.status === "pendente") ?? [];
  const repertorio = proximo?.repertorio ?? [];
  const cultoDate = proximo ? new Date(`${proximo.data}T${proximo.hora}`) : null;

  const musicaLive = live?.repertorio;
  const nomeMusicaLive = musicaLive?.musica?.nome;
  const tomLive = musicaLive?.tom_override ?? musicaLive?.musica?.tom_original;

  return (
    <AppShell>
      <AppHeader
        eyebrow={user ? "Shalom" : "Bem-vindo"}
        title="Adoração & Vida"
        right={
          user ? (
            <Link
              to="/perfil"
              className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground font-semibold ring-2 ring-accent/20"
            >
              {iniciais}
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              <LogIn className="size-3.5" /> Entrar
            </Link>
          )
        }
      />

      <main className="grid grid-cols-2 gap-3 px-4">
        {/* Hero: próximo culto */}
        <section className="col-span-2 relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-elegant">
          <div className="relative z-10">
            <span className="inline-block rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              Próximo Culto
            </span>
            {loading ? (
              <p className="mt-4 text-sm text-primary-foreground/60">Carregando…</p>
            ) : !user ? (
              <>
                <h2 className="mt-4 font-serif text-2xl leading-tight">
                  Gestão completa do seu ministério
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/60">
                  Escalas, repertório e Modo Culto sincronizado em tempo real.
                </p>
                <Link
                  to="/auth"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-foreground"
                >
                  <LogIn className="size-3.5" /> Entrar para começar
                </Link>
              </>
            ) : proximo ? (
              <>
                <h2 className="mt-4 font-serif text-2xl leading-tight">{proximo.nome}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-foreground/60">
                  <span className="inline-flex items-center gap-1 capitalize">
                    <Clock className="size-3.5" /> {formatCultoData(proximo.data)} •{" "}
                    {formatHora(proximo.hora)}
                  </span>
                </div>
                {proximo.local && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary-foreground/50">
                    <MapPin className="size-3" /> {proximo.local}
                  </p>
                )}
                <div className="mt-5">
                  <Countdown target={cultoDate!} />
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-serif text-2xl leading-tight">Nenhum culto agendado</h2>
                <p className="mt-1 text-sm text-primary-foreground/60">
                  Crie o próximo culto para montar a escala e o repertório.
                </p>
                <Link
                  to="/escala/novo"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-foreground"
                >
                  <Calendar className="size-3.5" /> Criar culto
                </Link>
              </>
            )}
          </div>
          <div className="absolute -right-16 -bottom-16 size-56 rounded-full bg-accent/25 blur-3xl" />
        </section>

        {user && (
          <>
            {/* Escala resumo */}
            <Link
              to="/escala"
              className="col-span-1 flex flex-col justify-between rounded-3xl border border-border bg-surface p-4"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Escala
              </h3>
              <div className="my-3 flex -space-x-2">
                {proximo && proximo.integrantes_culto.length > 0 ? (
                  <>
                    {proximo.integrantes_culto.slice(0, 4).map((i) => (
                      <div
                        key={i.id}
                        className="grid size-8 place-items-center rounded-full border-2 border-surface bg-secondary text-[10px] font-semibold text-secondary-foreground"
                      >
                        {iniciaisDe(i.cantor?.nome ?? i.instrumentista?.nome)}
                      </div>
                    ))}
                    {proximo.integrantes_culto.length > 4 && (
                      <div className="grid size-8 place-items-center rounded-full border-2 border-surface bg-primary/10 text-[10px] font-bold text-primary">
                        +{proximo.integrantes_culto.length - 4}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem integrantes escalados</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-600">
                  {confirmados.length} confirmados
                </span>
                <br />
                {pendentes.length} pendentes
              </p>
            </Link>

            {/* Playlist preview */}
            <Link
              to="/repertorio"
              className="col-span-1 flex flex-col rounded-3xl border border-border bg-surface p-4"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Músicas
              </h3>
              {repertorio.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {repertorio.slice(0, 3).map((r, idx) => (
                    <li key={r.id} className="truncate text-[11px] font-medium text-foreground">
                      {idx + 1}. {r.musica?.nome ?? "—"}{" "}
                      <span className="text-muted-foreground">
                        ({r.tom_override ?? r.musica?.tom_original ?? "?"})
                      </span>
                    </li>
                  ))}
                  {repertorio.length > 3 && (
                    <li className="truncate text-[11px] text-muted-foreground">
                      + {repertorio.length - 3} outras
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Nenhuma música no repertório ainda.
                </p>
              )}
            </Link>

            {/* Modo Culto Live */}
            <Link
              to="/culto"
              className="col-span-2 rounded-3xl border border-accent/25 bg-accent/10 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    {live && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    )}
                    <span className="relative inline-flex size-2 rounded-full bg-accent" />
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-tight text-accent">
                    Modo Culto Live
                  </h3>
                </div>
                {musicaLive?.musica?.bpm && (
                  <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {musicaLive.musica.bpm} BPM
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  {live && nomeMusicaLive ? (
                    <>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        Em execução
                      </p>
                      <p className="truncate font-serif text-xl italic text-foreground">
                        {nomeMusicaLive}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Tom {tomLive ?? "—"}
                        {musicaLive?.cantor?.nome ? ` • ${musicaLive.cantor.nome}` : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        {proximo ? "Pronto para começar" : "Aguardando culto"}
                      </p>
                      <p className="truncate font-serif text-xl italic text-foreground">
                        {proximo ? proximo.nome : "Nenhum culto agendado"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {proximo
                          ? `${repertorio.length} músicas no repertório`
                          : "Crie um culto na aba Escala"}
                      </p>
                    </>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground">
                  {live ? "ENTRAR" : "INICIAR"}
                </span>
              </div>
            </Link>

            {/* Atalhos */}
            <Link
              to="/repertorio"
              className="col-span-1 flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <FileText className="size-4" />
              </span>
              <span className="text-xs font-semibold">Cifras</span>
            </Link>
            <button
              onClick={() =>
                document.getElementById("avisos")?.scrollIntoView({ behavior: "smooth" })
              }
              className="col-span-1 flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <MessageCircle className="size-4" />
              </span>
              <span className="text-xs font-semibold">Avisos</span>
            </button>

            {/* Avisos */}
            <section
              id="avisos"
              className="col-span-2 rounded-3xl border border-border bg-surface p-5"
            >
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Avisos da Equipe
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!novoAviso.trim()) return;
                  publicarAviso.mutate();
                }}
                className="mb-4 flex items-center gap-2"
              >
                <input
                  value={novoAviso}
                  onChange={(e) => setNovoAviso(e.target.value)}
                  maxLength={300}
                  placeholder="Escreva um aviso para a equipe…"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={publicarAviso.isPending || !novoAviso.trim()}
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Send className="size-4" />
                </button>
              </form>

              <div className="space-y-4">
                {avisos.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Nenhum aviso publicado ainda.
                  </p>
                )}
                {avisos.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/5 text-[10px] font-bold text-primary">
                      {iniciaisDe(a.autor?.nome_completo)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-semibold text-foreground">
                          {a.autor?.nome_completo || "Membro"}
                        </span>{" "}
                        <span className="text-muted-foreground">• {tempoRelativo(a.created_at)}</span>
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">
                        {a.mensagem}
                      </p>
                    </div>
                    {a.autor_id === user.id && (
                      <button
                        onClick={() => apagarAviso.mutate(a.id)}
                        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Agenda da semana */}
            <section className="col-span-2 rounded-3xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Agenda da Semana
                </h3>
                <Link
                  to="/escala"
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground"
                >
                  Ver tudo <ChevronRight className="size-3" />
                </Link>
              </div>
              <div className="space-y-4">
                {semana.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Nenhum culto nos próximos 7 dias.
                  </p>
                )}
                {semana.map((c) => {
                  const d = new Date(c.data + "T12:00:00");
                  const destaque = proximo?.id === c.id;
                  return (
                    <Link
                      key={c.id}
                      to="/escala/$cultoId"
                      params={{ cultoId: c.id }}
                      className="flex items-center gap-4"
                    >
                      <div
                        className={`w-11 shrink-0 rounded-xl px-2 py-1.5 text-center ${
                          destaque ? "bg-accent text-accent-foreground" : "bg-primary/5 text-foreground"
                        }`}
                      >
                        <p className="font-serif text-base font-bold leading-none">
                          {String(d.getDate()).padStart(2, "0")}
                        </p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-wider opacity-80">
                          {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{c.nome}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {formatHora(c.hora)}
                          {c.local ? ` • ${c.local}` : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Ação principal */}
            <Link
              to="/culto"
              className="col-span-2 mt-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 py-4 text-sm font-bold uppercase tracking-wider text-accent"
            >
              <Play className="size-4" fill="currentColor" /> Iniciar Modo Culto
            </Link>
          </>
        )}
      </main>
    </AppShell>
  );
}
