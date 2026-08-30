import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading } = useProfile(user);

  // Enquanto carregamos o perfil, evita piscar o app ou o popup à toa.
  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Carregando…
        </p>
      </div>
    );
  }

  // Popup obrigatório de primeiro acesso: o app só é liberado depois que o
  // perfil (nome, função musical e timbre quando aplicável) é salvo.
  if (profile && !profile.perfil_configurado) {
    return (
      <ProfileSetupModal
        userId={user.id}
        nomeSugerido={profile.nome_completo || user.user_metadata?.full_name || user.user_metadata?.name}
      />
    );
  }

  return <Outlet />;
}
