import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, ChevronRight, MapPin, Clock } from "lucide-react";
import { AppShell, AppHeader } from "@/components/AppShell";
import { listCultos, formatCultoData, formatHora } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/escala")({
  head: () => ({
    meta: [
      { title: "Escala — Portal Adoração" },
      {
        name: "description",
        content: "Gerencie a escala dos cultos: crie, edite e organize sua equipe.",
      },
    ],
  }),
  component: EscalaLayout,
});

function EscalaLayout() {
  const matchRoute = useMatchRoute();
  const emDetalhe = matchRoute({ to: "/escala/$cultoId", fuzzy: true });
  const emNovo = matchRoute({ to: "/escala/novo" });
  if (emDetalhe || emNovo) return <Outlet />;
  return <EscalaLista />;
}

function EscalaLista() {
  const { data: cultos = [], isLoading } = useQuery({
    queryKey: ["cultos"],
    queryFn: listCultos,
  });

  return (
    <AppShell>
      <AppHeader
        eyebrow="Escala"
        title="Cultos"
        subtitle="Toque em um culto para editar, ou crie um novo"
        right={
          <Link
            to="/escala/novo"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow-glow"
          >
            <Plus className="size-3.5" /> Novo
          </Link>
        }
      />

      <main className="space-y-3 px-4">
        {isLoading && (
          <div className="rounded-3xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        )}

        {!isLoading && cultos.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-border bg-surface p-8 text-center">
            <Calendar className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-serif text-lg italic">Nenhum culto cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece criando o próximo culto do ministério.
            </p>
            <Link
              to="/escala/novo"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground"
            >
              <Plus className="size-3.5" /> Criar primeiro culto
            </Link>
          </div>
        )}

        {cultos.map((c) => (
          <Link
            key={c.id}
            to="/escala/$cultoId"
            params={{ cultoId: c.id }}
            className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4"
          >
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/5 text-primary">
              <Calendar className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg leading-tight">{c.nome}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatCultoData(c.data)}
              </p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {formatHora(c.hora)}
                </span>
                {c.local && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="size-3" /> {c.local}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </main>
    </AppShell>
  );
}
