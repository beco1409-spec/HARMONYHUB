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
  Bell,
  Users,
  Music2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  createAviso,
  deleteAviso,
  formatCultoData,
  formatHora,
  getAvatarSignedUrl,
  getCultosSemana,
  getLiveSession,
  getProximoCultoFull,
  iniciaisDe,
  listAvisos,
  tempoRelativo,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

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

function Dashboard() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [novoAviso, setNovoAviso] = useState("");

  const { data: profile } = useProfile(user);

  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar-url", profile?.avatar_url],
    queryFn: () => getAvatarSignedUrl(profile?.avatar_url ?? null),
    enabled: !!profile?.avatar_url,
  });

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

  const nomeCompleto =
    profile?.nome_completo || (user?.user_metadata?.full_name as string) || user?.email || "";
  const iniciais = iniciaisDe(nomeCompleto) || "GA";
  const primeiroNome = nomeCompleto.split(/\s+/)[0] || "";

  const hojeStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const confirmados = proximo?.integrantes_culto.filter((i) => i.status === "confirmado") ?? [];
  const pendentes = proximo?.integrantes_culto.filter((i) => i.status === "pendente") ?? [];
  const repertorio = proximo?.repertorio ?? [];
  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-2">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-1.5">
            <img src="/logo-comunidade-cristo.png" alt="" className="size-5 shrink-0" />
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Shalom
              </p>
              <p className="-mt-0.5 text-[11px] font-bold text-foreground">Adoração &amp; Vida</p>
            </div>
          </div>
          {user ? (
            <>
              <h1 className="truncate font-sans font-bold text-2xl">
                {saudacao()}, {primeiroNome || "visitante"}! 👋
              </h1>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">{hojeStr}</p>
            </>
          ) : (
            <h1 className="font-sans font-bold text-2xl">Bem-vindo</h1>
          )}
        </div>
        {user ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() =>
                document.getElementById("avisos")?.scrollIntoView({ behavior: "smooth" })
              }
              aria-label="Avisos"
              className="grid size-10 place-items-center rounded-full bg-surface text-foreground"
            >
              <Bell className="size-4" />
            </button>
            <Link to="/perfil" className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-11 rounded-full object-cover ring-2 ring-accent/20"
                />
              ) : (
                <span className="grid size-11 place-items-center rounded-full bg-primary font-semibold text-primary-foreground ring-2 ring-accent/20">
                  {iniciais}
                </span>
              )}
            </Link>
          </div>
        ) : (
          <Link
            to="/auth"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
          >
            <LogIn className="size-3.5" /> Entrar
          </Link>
        )}
      </header>

      <main className="grid grid-cols-2 gap-3 px-4 pt-4">
        {/* Hero: próximo culto */}
        <section className="col-span-2 relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-elegant">
          <img
            src="/logo-comunidade-cristo.png"
            alt=""
            className="pointer-events-none absolute -right-10 -bottom-10 size-52 opacity-[0.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40" />
          <div className="relative z-10">
            <span className="inline-block rounded-md bg-accent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              Próximo Culto
            </span>
            {loading ? (
              <p className="mt-4 text-sm text-primary-foreground/60">Carregando…</p>
            ) : !user ? (
              <>
                <h2 className="mt-4 font-sans font-bold text-2xl leading-tight">
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
                <h2 className="mt-4 font-sans font-bold text-2xl leading-tight">{proximo.nome}</h2>
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

                {/* Estatísticas do culto */}
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-primary-foreground/10 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">
                      Equipe
                    </p>
                    <p className="mt-1 font-sans font-bold text-xl font-bold">
                      {proximo.integrantes_culto.length}
                    </p>
                    <p className="text-[10px] text-primary-foreground/50">Escalados</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">
                      Músicas
                    </p>
                    <p className="mt-1 font-sans font-bold text-xl font-bold">{repertorio.length}</p>
                    <p className="text-[10px] text-primary-foreground/50">No repertório</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">
                      Status
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${
                        confirmados.length > 0 && pendentes.length === 0
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-primary-foreground/10 text-primary-foreground/70"
                      }`}
                    >
                      {confirmados.length > 0 && pendentes.length === 0
                        ? "Escala pronta"
                        : `${pendentes.length} pendentes`}
                    </span>
                  </div>
                </div>

                <Link
                  to="/culto"
                  className="mt-5 flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-xs font-bold uppercase tracking-wider text-accent-foreground"
                >
                  <Play className="size-3.5" fill="currentColor" />{" "}
                  {live ? "Entrar no Modo Culto" : "Iniciar Modo Culto"}
                </Link>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-sans font-bold text-2xl leading-tight">Nenhum culto agendado</h2>
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
        </section>

        {user && (
          <>
            {/* Visão geral */}
            <h3 className="col-span-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Visão Geral
            </h3>

            <Link
              to="/escala"
              className="col-span-1 flex flex-col items-start gap-2 rounded-3xl border border-border bg-surface p-4"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <Users className="size-4" />
              </span>
              <p className="font-sans font-bold text-xl font-bold text-foreground">
                {proximo?.integrantes_culto.length ?? 0}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Equipe
              </p>
            </Link>

            <Link
              to="/repertorio"
              className="col-span-1 flex flex-col items-start gap-2 rounded-3xl border border-border bg-surface p-4"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <Music2 className="size-4" />
              </span>
              <p className="font-sans font-bold text-xl font-bold text-foreground">{repertorio.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Músicas
              </p>
            </Link>

            <button
              onClick={() =>
                document.getElementById("avisos")?.scrollIntoView({ behavior: "smooth" })
              }
              className="col-span-1 flex flex-col items-start gap-2 rounded-3xl border border-border bg-surface p-4 text-left"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <MessageCircle className="size-4" />
              </span>
              <p className="font-sans font-bold text-xl font-bold text-foreground">{avisos.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Avisos
              </p>
            </button>

            <Link
              to="/escala"
              className="col-span-1 flex flex-col items-start gap-2 rounded-3xl border border-border bg-surface p-4"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <Calendar className="size-4" />
              </span>
              <p className="font-sans font-bold text-xl font-bold text-foreground">{semana.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Próximos
              </p>
            </Link>

            {/* Cifras (atalho) */}
            <Link
              to="/repertorio"
              className="col-span-2 flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-primary/5 text-primary">
                <FileText className="size-4" />
              </span>
              <span className="text-xs font-semibold">Ver cifras da biblioteca</span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </Link>

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

            {/* Próximos eventos */}
            <section className="col-span-2 rounded-3xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Próximos Eventos
                </h3>
                <Link
                  to="/escala"
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground"
                >
                  Ver todos <ChevronRight className="size-3" />
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
                        <p className="font-sans font-bold text-base font-bold leading-none">
                          {String(d.getDate()).padStart(2, "0")}
                        </p>
                        <p className="mt-0.5 text-[9px] uppercase tracking-wider opacity-80">
                          {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {destaque && "Hoje • "}
                          {c.nome}
                        </p>
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
          </>
        )}
      </main>
    </AppShell>
  );
}
