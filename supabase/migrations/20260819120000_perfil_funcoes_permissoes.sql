-- Sistema de perfis, cadastro e permissões
-- Adiciona: função musical (múltipla), permissão (role master/padrao),
-- flag de perfil configurado, e-mail no perfil (para a tela de administração)
-- e as proteções de autorização no próprio banco (não só na interface).

-- 1) Novas colunas em profiles ---------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS funcoes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS perfil_configurado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('master', 'padrao'));
  END IF;
END $$;

-- funcao_vocal já existia (usado como "classificação de timbre de voz");
-- reaproveitamos a mesma coluna em vez de criar uma nova, para não duplicar
-- o campo. Nenhuma migração de dado é necessária aqui.

-- Preenche o e-mail para os perfis que já existiam antes desta migração.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- Usuários que já tinham nome preenchido (cadastro anterior a este recurso)
-- são considerados "configurados" para não travar o acesso deles com o
-- popup obrigatório. Ajuste manualmente no banco se preferir forçar todos
-- a passar pelo popup.
UPDATE public.profiles
SET perfil_configurado = true
WHERE perfil_configurado = false
  AND nome_completo IS NOT NULL
  AND btrim(nome_completo) <> '';

-- 2) handle_new_user passa a gravar também o e-mail -------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'membro');
  RETURN NEW;
END;
$$;

-- 3) Função auxiliar para checar permissão sem recursão de RLS --------------
CREATE OR REPLACE FUNCTION public.is_master(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'master' FROM public.profiles WHERE id = uid), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_master(UUID) TO authenticated;

-- 4) Master pode editar qualquer perfil (além da policy já existente de
--    "usuário edita o próprio perfil"). Policies permissivas se somam (OR).
DROP POLICY IF EXISTS "Master edita qualquer perfil" ON public.profiles;
CREATE POLICY "Master edita qualquer perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

-- 5) Proteção de integridade do campo "role" ---------------------------------
-- - Só um Master pode alterar a permissão de qualquer perfil (inclusive a
--   própria). Uma requisição autenticada não-Master que tentar mudar o role
--   é silenciosamente revertida para o valor anterior.
-- - Consultas feitas fora do contexto autenticado do PostgREST (SQL Editor,
--   psql, service role) têm auth.uid() nulo e são tratadas como confiáveis —
--   é o caminho para promover manualmente o primeiro Master (ver
--   DEPLOY_CLOUDFLARE.md).
-- - Nunca permite remover o último Master do sistema.
CREATE OR REPLACE FUNCTION public.enforce_profile_role_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acting_is_master BOOLEAN;
  remaining_masters INT;
BEGIN
  acting_is_master := public.is_master(auth.uid());

  IF NEW.role IS DISTINCT FROM OLD.role AND auth.uid() IS NOT NULL AND NOT acting_is_master THEN
    NEW.role := OLD.role;
  END IF;

  IF OLD.role = 'master' AND NEW.role <> 'master' THEN
    SELECT count(*) INTO remaining_masters
    FROM public.profiles
    WHERE role = 'master' AND id <> OLD.id;

    IF remaining_masters = 0 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador (Master) do sistema.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_role_integrity ON public.profiles;
CREATE TRIGGER profiles_enforce_role_integrity
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_integrity();
