import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Radio,
  ChevronDown,
  Users,
  Music2,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CifraView } from "@/components/CifraView";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  endLive,
  getLiveSession,
  getProximoCultoFull,
  listRepertorio,
  startLive,
  updateLive,
} from "@/lib/db";
import { transposeTom } from "@/lib/transpose";

export const Route = createFileRoute("/_authenticated/culto")({
  head: () => ({
    meta: [
      { title: "Modo Culto Ao Vivo — Portal Adoração" },
      { name: "description", content: "Modo Culto sincronizado: toda a equipe na mesma música, cifra, tom e BPM em tempo real." },
    ],
  }),
  component: ModoCultoPage,
});

function ModoCultoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [beat, setBeat] = useState(0);
  const [encerrou, setEncerrou] = useState(false);
  const [presentes, setPresentes] = useState<string[]>([]);
  const [showPresenca, setShowPresenca] = useState(false);

  const { data: live, isLoading } = useQuery({
    queryKey: ["live"],
    queryFn: getLiveSession,
  });

  const { data: proximo } = useQuery({
    queryKey: ["proximo-culto"],
    queryFn: getProximoCultoFull,
    enabled: !live,
  });

  const cultoId = live?.culto_id ?? proximo?.id ?? null;

  const { data: repertorio = [] } = useQuery({
    queryKey: ["repertorio", cultoId],
    queryFn: () => listRepertorio(cultoId!),
    enabled: !!cultoId,
  });

  // Sincronização em tempo real da sessão
  useEffect(() => {
    if (!live) return;
    const ch = supabase
      .channel("culto-live-rt")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "culto_live", filter: `id=eq.${live.id}` },
        (payload) => {
          if ((payload.new as { ended_at?: string | null }).ended_at) {
            setEncerrou(true);
          }
          qc.invalidateQueries({ queryKey: ["live"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [live?.id, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Presença: quem está no Modo Culto agora
  const nomeUsuario =
    (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Músico";
  useEffect(() => {
    if (!live || !user) return;
    const ch = supabase.channel(`culto-live-presenca-${live.id}`, {
      config: { presence: { key: user.id } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ nome: string }>();
      setPresentes(Object.values(state).flat().map((p) => p.nome));
    }).subscribe(async (st) => {
      if (st === "SUBSCRIBED") await ch.track({ nome: nomeUsuario });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [live?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = useMemo(() => {
    if (!live?.repertorio_id) return 0;
    const i = repertorio.findIndex((r) => r.id === live.repertorio_id);
    return i >= 0 ? i : 0;
  }, [live?.repertorio_id, repertorio]);

  const item = repertorio[idx] ?? null;
  const musica = item?.musica ?? live?.repertorio?.musica ?? null;
  const tomBase = item?.tom_override ?? musica?.tom_original ?? "—";
  const tomExibido = tomBase !== "—" ? transposeTom(tomBase, offset) : "—";
  const bpm = musica?.bpm ?? 72;
  const playing = live?.playing ?? false;

  // Metrônomo visual
  useEffect(() => {
    if (!playing || !live) return;
    const ms = 60000 / bpm;
    const t = setInterval(() => setBeat((b) => (b + 1) % 4), ms);
    return () => clearInterval(t);
  }, [playing, bpm, live]);

  useEffect(() => setOffset(0), [live?.repertorio_id]);

  const iniciar = useMutation({
    mutationFn: () => startLive(cultoId!, repertorio[0]?.id ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live"] });
      toast.success("Culto iniciado — equipe sincronizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const irPara = useMutation({
    mutationFn: (novoIdx: number) =>
      updateLive(live!.id, { repertorio_id: repertorio[novoIdx]?.id ?? null }),
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePlay = useMutation({
    mutationFn: () => updateLive(live!.id, { playing: !playing }),
    onError: (e: Error) => toast.error(e.message),
  });

  const encerrar = useMutation({
    mutationFn: () => endLive(live!, repertorio.length),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live"] });
      toast.success("Culto encerrado e registrado no histórico");
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      </AppShell>
    );
  }

  // Tela: culto encerrado
  if (encerrou && !live) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <Music2 className="size-10 text-accent" />
          <h1 className="mt-4 font-serif text-2xl italic">Culto encerrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A sessão ao vivo foi finalizada e registrada no histórico.
          </p>
          <Link
            to="/"
            className="mt-6 rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </AppShell>
    );
  }

  // Tela: iniciar culto
  if (!live) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-accent/10 text-accent">
            <Radio className="size-8" />
          </div>
          <h1 className="mt-5 font-serif text-2xl italic">Modo Culto</h1>
          {proximo ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {proximo.nome} • {repertorio.length} músicas no repertório
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ao iniciar, toda a equipe sincroniza música, cifra, tom e BPM em tempo real.
              </p>
              <button
                onClick={() => iniciar.mutate()}
                disabled={iniciar.isPending}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-glow disabled:opacity-60"
              >
                <Play className="size-4" fill="currentColor" />
                {iniciar.isPending ? "Iniciando…" : "Iniciar culto"}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum culto agendado. Crie um culto para iniciar o modo ao vivo.
              </p>
              <Link
                to="/escala/novo"
                className="mt-6 rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
              >
                Criar culto
              </Link>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  const conteudo = musica?.cifra || musica?.letra || "Cifra não cadastrada para esta música.";
  const proxima = repertorio[idx + 1] ?? null;

  return (
    <AppShell>
      <div className="bg-primary text-primary-foreground">
        {/* Header live */}
        <header className="flex items-center justify-between px-5 pt-8 pb-4">
          <button
            onClick={() => navigate({ to: "/" })}
            className="grid size-9 place-items-center rounded-full bg-primary-foreground/10"
          >
            <ChevronDown className="size-4" />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Modo Culto Ao Vivo
            </span>
          </div>
          <button
            onClick={() => setShowPresenca((s) => !s)}
            className="relative grid size-9 place-items-center rounded-full bg-primary-foreground/10"
          >
            <Users className="size-4" />
            {presentes.length > 0 && (
              <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                {presentes.length}
              </span>
            )}
          </button>
        </header>

        {showPresenca && (
          <div className="mx-5 mb-4 rounded-2xl bg-primary-foreground/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50">
              Conectados agora
            </p>
            <p className="mt-1 text-xs text-primary-foreground/80">
              {presentes.length ? presentes.join(", ") : "Somente você"}
            </p>
          </div>
        )}

        {/* Now playing */}
        <div className="px-5 pt-2 pb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/50">
            Música {idx + 1} de {repertorio.length}
          </p>
          <h1 className="mt-2 font-serif text-3xl italic leading-tight">
            {musica?.nome ?? "Repertório vazio"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/60">{musica?.autor ?? ""}</p>

          <div className="mt-5 flex items-center justify-center gap-4">
            <Badge label="Tom" value={tomExibido} />
            <Badge label="BPM" value={String(bpm)} />
            <Badge label="Cantor" value={(item?.cantor?.nome ?? "—").split(" ")[0]} />
          </div>

          {/* Metrônomo */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {[0, 1, 2, 3].map((b) => (
              <span
                key={b}
                className={`size-2 rounded-full transition-all duration-100 ${
                  beat === b && playing ? "bg-accent scale-150" : "bg-primary-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-8 pb-6">
          <button
            onClick={() => irPara.mutate(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="text-primary-foreground/80 disabled:opacity-30"
          >
            <SkipBack className="size-6" fill="currentColor" />
          </button>
          <button
            onClick={() => togglePlay.mutate()}
            className="grid size-16 place-items-center rounded-full bg-accent text-accent-foreground shadow-glow"
          >
            {playing ? (
              <Pause className="size-7" fill="currentColor" />
            ) : (
              <Play className="size-7 ml-0.5" fill="currentColor" />
            )}
          </button>
          <button
            onClick={() => irPara.mutate(Math.min(repertorio.length - 1, idx + 1))}
            disabled={idx >= repertorio.length - 1}
            className="text-primary-foreground/80 disabled:opacity-30"
          >
            <SkipForward className="size-6" fill="currentColor" />
          </button>
        </div>

        {/* Sync status */}
        <div className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-primary-foreground/5 p-3 text-xs">
          <Radio className="size-4 shrink-0 text-accent" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">
              {presentes.length} {presentes.length === 1 ? "músico sincronizado" : "músicos sincronizados"}
            </span>
            <span className="block text-primary-foreground/50">
              Todos vendo cifra em {tomBase} • {bpm} BPM
            </span>
          </p>
          <Volume2 className="size-4 text-primary-foreground/60" />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => {
              if (confirm("Encerrar o culto para toda a equipe?")) encerrar.mutate();
            }}
            disabled={encerrar.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-foreground/10 py-3 text-[11px] font-bold uppercase tracking-wider text-primary-foreground/80 disabled:opacity-60"
          >
            <Square className="size-3.5" fill="currentColor" />
            {encerrar.isPending ? "Encerrando…" : "Encerrar culto"}
          </button>
        </div>
      </div>

      {/* Cifra */}
      <section className="rounded-t-3xl bg-background px-5 pt-6 pb-8 -mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg italic">Cifra & Letra</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setOffset((o) => o - 1)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold"
            >
              −
            </button>
            <span className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-mono font-semibold text-accent">
              {tomExibido}
            </span>
            <button
              onClick={() => setOffset((o) => o + 1)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold"
            >
              +
            </button>
          </div>
        </div>

        {/* Cifra renderizada pelo Parser de Cifras — transposição sempre a partir do original */}
        <CifraView text={conteudo} semitones={offset} />

        <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Próxima
          </p>
          {proxima ? (
            <button onClick={() => irPara.mutate(idx + 1)} className="mt-1 text-left">
              <p className="font-serif text-lg italic">
                {proxima.musica?.nome ?? "—"}
                <span className="ml-2 font-mono text-sm text-accent">
                  {proxima.tom_override ?? proxima.musica?.tom_original ?? ""}
                </span>
              </p>
            </button>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Última música do culto</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-foreground/5 px-3 py-2 text-center min-w-[64px]">
      <p className="text-[9px] uppercase tracking-widest text-primary-foreground/50">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-bold text-accent">{value}</p>
    </div>
  );
}
