import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { createCulto } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/escala/novo")({
  component: NovoCultoPage,
});

function NovoCultoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nome: "Culto de Celebração",
    data: today,
    hora: "19:30",
    local: "",
    tema: "",
    pregador: "",
    responsavel: "",
  });

  const mut = useMutation({
    mutationFn: () => createCulto(form),
    onSuccess: (culto) => {
      qc.invalidateQueries({ queryKey: ["cultos"] });
      toast.success("Culto criado");
      navigate({ to: "/escala/$cultoId", params: { cultoId: culto.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-5 pt-8 pb-4">
        <Link
          to="/escala"
          className="grid size-9 place-items-center rounded-full border border-border bg-surface"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Nova escala
          </p>
          <h1 className="font-serif text-2xl italic">Novo culto</h1>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="space-y-3 px-4"
      >
        <Field label="Nome do culto">
          <input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input
              required
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label="Horário">
            <input
              required
              type="time"
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
        </div>
        <Field label="Local">
          <input
            value={form.local}
            onChange={(e) => setForm({ ...form, local: e.target.value })}
            placeholder="Templo principal"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>
        <Field label="Tema">
          <input
            value={form.tema}
            onChange={(e) => setForm({ ...form, tema: e.target.value })}
            placeholder="A bondade que nos alcança"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pregador">
            <input
              value={form.pregador}
              onChange={(e) => setForm({ ...form, pregador: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
          <Field label="Responsável">
            <input
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={mut.isPending}
          className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Criando…" : "Criar culto"}
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
