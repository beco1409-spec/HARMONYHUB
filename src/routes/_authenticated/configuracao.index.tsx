import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Users } from "lucide-react";
import { AppShell, AppHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/configuracao/")({
  head: () => ({
    meta: [{ title: "Configuração — Portal Adoração" }],
  }),
  component: ConfiguracaoIndexPage,
});

function ConfiguracaoIndexPage() {
  return (
    <AppShell>
      <AppHeader
        eyebrow="Administração"
        title="Configuração"
        subtitle="Área restrita ao Master do ministério."
      />
      <main className="space-y-3 px-4">
        <Link
          to="/configuracao/usuarios"
          className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-5 hover:bg-secondary/40"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/5 text-primary">
            <Users className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Usuários</p>
            <p className="text-xs text-muted-foreground">
              Veja o ministério, edite funções e gerencie permissões de acesso.
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </main>
    </AppShell>
  );
}
