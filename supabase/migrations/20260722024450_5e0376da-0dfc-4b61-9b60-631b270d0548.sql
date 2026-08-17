
-- =========================================================
-- Trigger util
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- CANTORES
-- =========================================================
CREATE TABLE public.cantores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  foto_url TEXT,
  voz TEXT,
  extensao_vocal TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantores TO authenticated;
GRANT ALL ON public.cantores TO service_role;
ALTER TABLE public.cantores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cantores" ON public.cantores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cantores_updated BEFORE UPDATE ON public.cantores FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- INSTRUMENTISTAS
-- =========================================================
CREATE TABLE public.instrumentistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  instrumento TEXT NOT NULL,
  telefone TEXT,
  foto_url TEXT,
  disponibilidade TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instrumentistas TO authenticated;
GRANT ALL ON public.instrumentistas TO service_role;
ALTER TABLE public.instrumentistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all instrumentistas" ON public.instrumentistas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_instrumentistas_updated BEFORE UPDATE ON public.instrumentistas FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- MUSICAS (biblioteca)
-- =========================================================
CREATE TABLE public.musicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ministerio TEXT,
  autor TEXT,
  letra TEXT,
  cifra TEXT,
  tom_original TEXT,
  bpm INTEGER,
  compasso TEXT,
  duracao TEXT,
  youtube_url TEXT,
  spotify_url TEXT,
  playback_url TEXT,
  multitrack_url TEXT,
  mapa TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.musicas TO authenticated;
GRANT ALL ON public.musicas TO service_role;
ALTER TABLE public.musicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all musicas" ON public.musicas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_musicas_updated BEFORE UPDATE ON public.musicas FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- CANTOR_TONS (repertório pessoal do cantor)
-- =========================================================
CREATE TABLE public.cantor_tons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cantor_id UUID NOT NULL REFERENCES public.cantores(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  tom TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cantor_id, musica_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cantor_tons TO authenticated;
GRANT ALL ON public.cantor_tons TO service_role;
ALTER TABLE public.cantor_tons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cantor_tons" ON public.cantor_tons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cantor_tons_updated BEFORE UPDATE ON public.cantor_tons FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- CULTOS
-- =========================================================
CREATE TABLE public.cultos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT 'Culto',
  data DATE NOT NULL,
  hora TIME NOT NULL DEFAULT '19:30',
  local TEXT,
  tema TEXT,
  pregador TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cultos TO authenticated;
GRANT ALL ON public.cultos TO service_role;
ALTER TABLE public.cultos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cultos" ON public.cultos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cultos_updated BEFORE UPDATE ON public.cultos FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- INTEGRANTES DO CULTO
-- =========================================================
CREATE TABLE public.integrantes_culto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  culto_id UUID NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cantor','instrumentista')),
  cantor_id UUID REFERENCES public.cantores(id) ON DELETE CASCADE,
  instrumentista_id UUID REFERENCES public.instrumentistas(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('confirmado','pendente','recusado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((tipo = 'cantor' AND cantor_id IS NOT NULL AND instrumentista_id IS NULL)
      OR (tipo = 'instrumentista' AND instrumentista_id IS NOT NULL AND cantor_id IS NULL))
);
CREATE INDEX idx_integrantes_culto_culto ON public.integrantes_culto(culto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrantes_culto TO authenticated;
GRANT ALL ON public.integrantes_culto TO service_role;
ALTER TABLE public.integrantes_culto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all integrantes_culto" ON public.integrantes_culto FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_integrantes_culto_updated BEFORE UPDATE ON public.integrantes_culto FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- REPERTORIO DO CULTO
-- =========================================================
CREATE TABLE public.repertorio_culto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  culto_id UUID NOT NULL REFERENCES public.cultos(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  cantor_id UUID REFERENCES public.cantores(id) ON DELETE SET NULL,
  tom_override TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_repertorio_culto_culto ON public.repertorio_culto(culto_id, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repertorio_culto TO authenticated;
GRANT ALL ON public.repertorio_culto TO service_role;
ALTER TABLE public.repertorio_culto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all repertorio_culto" ON public.repertorio_culto FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_repertorio_culto_updated BEFORE UPDATE ON public.repertorio_culto FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
