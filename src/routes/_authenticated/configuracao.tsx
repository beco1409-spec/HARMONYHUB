import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/configuracao")({
  ssr: false,
  // Proteção também no "backend": mesmo que alguém force a URL, sem perfil
  // Master a navegação é redirecionada. A escrita em si continua protegida
  // pelas policies de RLS no Supabase, independente do frontend. Essa
  // checagem vale para esta tela e para todas as telas filhas dela
  // (ex.: /configuracao/usuarios).
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    const profile = await getProfile(data.session.user.id);
    if (profile?.role !== "master") throw redirect({ to: "/perfil" });
  },
  component: () => <Outlet />,
});
