-- Atualiza os valores possíveis de "funcoes" (profiles.funcoes) para a nova
-- lista com ícones definida pelo ministério, remapeando os valores antigos
-- já salvos nos perfis existentes para os novos nomes equivalentes.
--
-- Lista antiga -> nova:
--   Vocalista, Backing Vocal -> Vocal
--   Guitarrista              -> Guitarra
--   Baixista                 -> Contrabaixo
--   Baterista                -> Bateria
--   Tecladista                -> Teclado/Piano
--   Violinista                -> (sem equivalente direto; mantido como está)
-- Novos valores sem equivalente antigo: Violão, Som/Técnico.

UPDATE public.profiles
SET funcoes = (
  SELECT array_agg(DISTINCT valor)
  FROM unnest(
    array_replace(
      array_replace(
        array_replace(
          array_replace(
            array_replace(funcoes, 'Backing Vocal', 'Vocal'),
            'Vocalista', 'Vocal'
          ),
          'Guitarrista', 'Guitarra'
        ),
        'Baixista', 'Contrabaixo'
      ),
      'Baterista', 'Bateria'
    ) AS valor
  )
)
WHERE funcoes && ARRAY['Vocalista','Backing Vocal','Guitarrista','Baixista','Baterista']::text[];

-- "Tecladista" isolado (array_replace acima já tratou o resto).
UPDATE public.profiles
SET funcoes = (
  SELECT array_agg(DISTINCT CASE WHEN valor = 'Tecladista' THEN 'Teclado/Piano' ELSE valor END)
  FROM unnest(funcoes) AS valor
)
WHERE 'Tecladista' = ANY(funcoes);
