-- Avisos da equipe
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  autor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read avisos" ON public.avisos FOR SELECT TO authenticated USING (true);
CREATE POLICY "autor cria aviso" ON public.avisos FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "autor apaga aviso" ON public.avisos FOR DELETE TO authenticated USING (auth.uid() = autor_id);

-- Sessão ao vivo do Modo Culto
CREATE TABLE public.culto_live (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  culto_id UUID NOT NULL UNIQUE REFERENCES public.cultos(id) ON DELETE CASCADE,
  repertorio_id UUID REFERENCES public.repertorio_culto(id) ON DELETE SET NULL,
  playing BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.culto_live TO authenticated;
GRANT ALL ON public.culto_live TO service_role;
ALTER TABLE public.culto_live ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all culto_live" ON public.culto_live FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_culto_live_updated BEFORE UPDATE ON public.culto_live FOR EACH ROW EXECUTE FUNCTION tg_touch_updated_at();

-- Histórico de sessões do Modo Culto
CREATE TABLE public.culto_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  culto_id UUID NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  iniciado_em TIMESTAMPTZ NOT NULL,
  encerrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_musicas INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.culto_historico TO authenticated;
GRANT ALL ON public.culto_historico TO service_role;
ALTER TABLE public.culto_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all culto_historico" ON public.culto_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Músicas favoritas por usuário
CREATE TABLE public.musica_favoritos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, musica_id)
);
GRANT SELECT, INSERT, DELETE ON public.musica_favoritos TO authenticated;
GRANT ALL ON public.musica_favoritos TO service_role;
ALTER TABLE public.musica_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario gerencia proprios favoritos" ON public.musica_favoritos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Vínculo cantor/instrumentista <-> conta de usuário
ALTER TABLE public.cantores ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.instrumentistas ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Preferência de notificações no perfil
ALTER TABLE public.profiles ADD COLUMN notificacoes_ativas BOOLEAN NOT NULL DEFAULT true;

-- Realtime para sincronização do Modo Culto e avisos
ALTER PUBLICATION supabase_realtime ADD TABLE public.culto_live;
ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;

-- Fotos de perfil (bucket privado 'avatars')
CREATE POLICY "avatars auth read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');