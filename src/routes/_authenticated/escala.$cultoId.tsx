import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Trash2,
  Save,
  UserPlus,
  Mic2,
  Music4,
  X,
  Check,
  Clock as ClockIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PeoplePicker } from "@/components/PeoplePicker";
import {
  addIntegrante,
  deleteCulto,
  getCultoFull,
  iniciaisDe,
  removeIntegrante,
  updateCulto,
  updateIntegrante,
  type IntegranteFull,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/escala/$cultoId")({
  component: EditarCultoPage,
});

const CANTOR_FUNCOES = ["Cantor Principal", "Back Vocal"] as const;

function EditarCultoPage() {
  const { cultoId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: culto, isLoading } = useQuery({
    queryKey: ["culto", cultoId],
    queryFn: () => getCultoFull(cultoId),
  });

  const [form, setForm] = useState({
    nome: "",
    data: "",
    hora: "",
    local: "",
    tema: "",
    pregador: "",
    responsavel: "",
  });
  const [dirty, setDirty] = useState(false);
  const [pickerTipo, setPickerTipo] = useState<null | "cantor" | "instrumentista">(null);
  const [pickerFuncao, setPickerFuncao] = useState<string>("Cantor Principal");

  useEffect(() => {
    if (!culto) return;
    setForm({
      nome: culto.nome,
      data: culto.data,
      hora: culto.hora.slice(0, 5),
      local: culto.local ?? "",
      tema: culto.tema ?? "",
      pregador: culto.pregador ?? "",
      responsavel: culto.responsavel ?? "",
    });
    setDirty(false);
  }, [culto]);

  const salvar = useMutation({
    mutationFn: () =>
      updateCulto(cultoId, {
        nome: form.nome,
        data: form.data,
        hora: form.hora,
        local: form.local || null,
        tema: form.tema || null,
        pregador: form.pregador || null,
        responsavel: form.responsavel || null,
      }),
    onSuccess: () => {
      toast.success("Culto atualizado");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["culto", cultoId] });
      qc.invalidateQueries({ queryKey: ["cultos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: () => deleteCulto(cultoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cultos"] });
      toast.success("Culto excluído");
      navigate({ to: "/escala" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addI = useMutation({
    mutationFn: async ({
      tipo,
      personId,
      funcao,
    }: {
      tipo: "cantor" | "instrumentista";
      personId: string;
      funcao: string;
    }) =>
      addIntegrante({
        culto_id: cultoId,
        tipo,
        funcao,
        cantor_id: tipo === "cantor" ? personId : null,
        instrumentista_id: tipo === "instrumentista" ? personId : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["culto", cultoId] });
      toast.success("Integrante adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeI = useMutation({
    mutationFn: (id: string) => removeIntegrante(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["culto", cultoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "confirmado" | "pendente" | "recusado" }) =>
      updateIntegrante(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["culto", cultoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setFuncao = useMutation({
    mutationFn: ({ id, funcao }: { id: string; funcao: string }) =>
      updateIntegrante(id, { funcao }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["culto", cultoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
      </AppShell>
    );
  }

  if (!culto) {
    return (
      <AppShell>
        <div className="p-8 text-center text-sm text-muted-foreground">
          Culto não encontrado.{" "}
          <Link to="/escala" className="underline">
            Voltar
          </Link>
        </div>
      </AppShell>
    );
  }

  const cantores = culto.integrantes_culto.filter((i) => i.tipo === "cantor");
  const instrumentistas = culto.integrantes_culto.filter((i) => i.tipo === "instrumentista");

  const excluidosCantoresIds = cantores
    .map((i) => i.cantor_id)
    .filter((x): x is string => !!x);
  const excluidosInstrIds = instrumentistas
    .map((i) => i.instrumentista_id)
    .filter((x): x is string => !!x);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl">
        <Link
          to="/escala"
          className="grid size-9 place-items-center rounded-full border border-border bg-surface"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <p className="truncate px-2 text-sm font-medium">{culto.nome}</p>
        <button
          onClick={() => salvar.mutate()}
          disabled={!dirty || salvar.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-40"
        >
          <Save className="size-3.5" /> Salvar
        </button>
      </header>

      <main className="space-y-4 px-4 py-4">
        {/* Dados do culto */}
        <section className="space-y-3 rounded-3xl border border-border bg-surface p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Dados do culto
          </h2>
          <Input label="Nome" value={form.nome} onChange={(v) => update("nome", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              value={form.data}
              onChange={(v) => update("data", v)}
            />
            <Input
              label="Horário"
              type="time"
              value={form.hora}
              onChange={(v) => update("hora", v)}
            />
          </div>
          <Input label="Local" value={form.local} onChange={(v) => update("local", v)} />
          <Input label="Tema" value={form.tema} onChange={(v) => update("tema", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pregador"
              value={form.pregador}
              onChange={(v) => update("pregador", v)}
            />
            <Input
              label="Responsável"
              value={form.responsavel}
              onChange={(v) => update("responsavel", v)}
            />
          </div>
        </section>

        {/* Cantores */}
        <IntegranteSection
          titulo="Vocal"
          icon={<Mic2 className="size-4" />}
          integrantes={cantores}
          funcoes={CANTOR_FUNCOES as unknown as string[]}
          onAdd={() => {
            setPickerFuncao("Cantor Principal");
            setPickerTipo("cantor");
          }}
          onRemove={(id) => removeI.mutate(id)}
          onStatus={(id, s) => setStatus.mutate({ id, status: s })}
          onFuncao={(id, f) => setFuncao.mutate({ id, funcao: f })}
        />

        {/* Instrumentistas */}
        <IntegranteSection
          titulo="Banda"
          icon={<Music4 className="size-4" />}
          integrantes={instrumentistas}
          funcoes={[]}
          onAdd={() => {
            setPickerFuncao("Instrumentista");
            setPickerTipo("instrumentista");
          }}
          onRemove={(id) => removeI.mutate(id)}
          onStatus={(id, s) => setStatus.mutate({ id, status: s })}
          onFuncao={(id, f) => setFuncao.mutate({ id, funcao: f })}
        />

        {/* Excluir */}
        <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-destructive">
            Zona de risco
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Excluir remove o culto, a escala e o repertório vinculado.
          </p>
          <button
            onClick={() => {
              if (confirm("Excluir este culto? Esta ação não pode ser desfeita.")) {
                excluir.mutate();
              }
            }}
            disabled={excluir.isPending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground disabled:opacity-60"
          >
            <Trash2 className="size-3.5" /> Excluir culto
          </button>
        </section>
      </main>

      {pickerTipo && (
        <PeoplePicker
          tipo={pickerTipo}
          excludeIds={pickerTipo === "cantor" ? excluidosCantoresIds : excluidosInstrIds}
          onClose={() => setPickerTipo(null)}
          onPick={(id) => {
            addI.mutate({ tipo: pickerTipo, personId: id, funcao: pickerFuncao });
            setPickerTipo(null);
          }}
        />
      )}
    </AppShell>
  );
}

function IntegranteSection({
  titulo,
  icon,
  integrantes,
  funcoes,
  onAdd,
  onRemove,
  onStatus,
  onFuncao,
}: {
  titulo: string;
  icon: React.ReactNode;
  integrantes: IntegranteFull[];
  funcoes: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onStatus: (id: string, status: "confirmado" | "pendente" | "recusado") => void;
  onFuncao: (id: string, funcao: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/5 text-primary">
            {icon}
          </span>
          <h3 className="font-serif text-base italic">{titulo}</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {integrantes.length}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground"
        >
          <UserPlus className="size-3" /> Adicionar
        </button>
      </div>

      {integrantes.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhum integrante ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {integrantes.map((i) => {
            const nome =
              i.cantor?.nome ?? i.instrumentista?.nome ?? "—";
            const detalhe =
              i.cantor?.voz ?? i.instrumentista?.instrumento ?? "";
            return (
              <li
                key={i.id}
                className="flex items-center gap-3 rounded-2xl bg-secondary/40 p-2.5"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {iniciaisDe(nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{nome}</p>
                  {funcoes.length > 0 ? (
                    <select
                      value={i.funcao}
                      onChange={(e) => onFuncao(i.id, e.target.value)}
                      className="mt-0.5 rounded-md bg-transparent text-[11px] text-muted-foreground outline-none"
                    >
                      {funcoes.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      defaultValue={i.funcao}
                      onBlur={(e) => {
                        if (e.target.value !== i.funcao) onFuncao(i.id, e.target.value);
                      }}
                      className="mt-0.5 w-full rounded-md bg-transparent text-[11px] text-muted-foreground outline-none focus:text-foreground"
                    />
                  )}
                  {detalhe && (
                    <p className="text-[10px] text-muted-foreground/70">{detalhe}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusPill
                    active={i.status === "confirmado"}
                    color="emerald"
                    icon={<Check className="size-3" />}
                    onClick={() => onStatus(i.id, "confirmado")}
                  />
                  <StatusPill
                    active={i.status === "pendente"}
                    color="amber"
                    icon={<ClockIcon className="size-3" />}
                    onClick={() => onStatus(i.id, "pendente")}
                  />
                  <StatusPill
                    active={i.status === "recusado"}
                    color="rose"
                    icon={<X className="size-3" />}
                    onClick={() => onStatus(i.id, "recusado")}
                  />
                  <button
                    onClick={() => onRemove(i.id)}
                    className="ml-1 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusPill({
  active,
  color,
  icon,
  onClick,
}: {
  active: boolean;
  color: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const bg = active
    ? color === "emerald"
      ? "bg-emerald-500 text-white"
      : color === "amber"
        ? "bg-amber-500 text-white"
        : "bg-rose-500 text-white"
    : "bg-secondary text-muted-foreground";
  return (
    <button
      onClick={onClick}
      className={`grid size-6 place-items-center rounded-full ${bg}`}
    >
      {icon}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
