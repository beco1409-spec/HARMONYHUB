ALTER TABLE public.musicas ADD COLUMN IF NOT EXISTS cifraclub_url text;
ALTER TABLE public.musicas DROP COLUMN IF EXISTS spotify_url;