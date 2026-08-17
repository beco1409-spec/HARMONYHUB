import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, Music2, User, Play } from "lucide-react";
import { useOverlayOpen } from "@/lib/overlay-store";

type NavItem = {
  to: "/" | "/escala" | "/culto" | "/repertorio" | "/perfil";
  label: string;
  icon: typeof Home;
  center?: boolean;
};

const items: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/escala", label: "Escala", icon: CalendarDays },
  { to: "/culto", label: "Culto", icon: Play, center: true },
  { to: "/repertorio", label: "Músicas", icon: Music2 },
  { to: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const overlayOpen = useOverlayOpen();

  // Formulário em tela cheia aberto: o rodapé sai da árvore por completo.
  if (overlayOpen) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;

          if (item.center) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative -mt-8 flex flex-col items-center"
              >
                <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_12px_30px_-8px_rgb(217_119_6_/_0.55)] ring-4 ring-background transition-transform active:scale-95">
                  <Icon className="size-6" strokeWidth={2.2} />
                </span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 py-1"
            >
              <Icon
                className={`size-5 transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-tight ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
              <span
                className={`h-0.5 w-4 rounded-full ${active ? "bg-foreground" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
