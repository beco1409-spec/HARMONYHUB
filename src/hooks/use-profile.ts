import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getProfile } from "@/lib/db";

/**
 * Perfil do usuário logado (nome, funções musicais, timbre, permissão e se
 * já passou pelo popup obrigatório de configuração inicial).
 *
 * Usa a mesma queryKey (["profile", user?.id]) já usada em `perfil.tsx`, de
 * forma que ambos compartilham o cache do React Query.
 */
export function useProfile(user: User | null | undefined) {
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
  });
}

export function useIsMaster(user: User | null | undefined) {
  const { data: profile } = useProfile(user);
  return profile?.role === "master";
}
