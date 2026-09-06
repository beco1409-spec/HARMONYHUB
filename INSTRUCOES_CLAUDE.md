# INSTRUCOES PARA CLAUDE — DEFINICAO DO PROJETO HARMONYHUB

## Contexto
- Repo: https://github.com/beco1409-spec/HARMONYHUB
- Nome: Harmony Hub / Portal Adoração
- Stack: TanStack Start (React 19 + SSR), Vite, Cloudflare Workers, Supabase (Postgres + Auth + RLS)
- Design: Material Design 3, modo claro/escuro, premium (Spotify/Notion/Apple Music)
- Último commit: 2b83e9a fix: adiciona Outlet em configuracao para renderizar rotas filhas (38 min atrás em 05/09/2026)

## Funcionalidades já implementadas (não apagar)
1. Dashboard
2. Escala (criar, confirmar presença, recusas, substituição)
3. Repertório do culto (playlist, tom por cantor, ordem, BPM, duração)
4. Cantores (perfil, repertório pessoal, class. vocal, extensão)
5. Instrumentistas (perfil, instrumentos, nível, disponibilidade, cifras no culto)
6. Letras e Cifras Inteligentes (CifraView, transposição, rolagem, zoom, modo apresentação)
7. Biblioteca de Músicas (cadastro completo + anexos PDF/Cifra/Playback/MP3/Multitrack/Vídeo)
8. Agenda (calendário mensal, cultos/ensaios/congressos, lembretes)
9. Comunicação (chat interno, avisos, enquetes, pedidos de oração, arquivos, fotos, áudios)
10. Notificações (nova escala, alteração repertório, troca tom, alteração horário, confirmação, <24h)
11. Administração (Admin/Líder/Ministro/Instrumentista/Back vocal/Visitante — permissões RLS)
12. Modo Culto (sincronização em tempo real via supabase channel `culto-live-rt`, presença `culto-live-presenca-${id}`, metrônomo visual, controle play/pause, avançar/voltar música, transposição por `offset`, registro histórico, encerramento automático)

## Arquivos chave (não modificar sem instrução)
- src/routes/_authenticated/configuracao.tsx (já tem Outlet — NÃO MOVER)
- src/routes/_authenticated/culto.tsx (Modo Culto completo — NÃO APAGAR)
- src/components/CifraView.tsx (parser de cifras — manter)
- src/lib/db.ts (funções Supabase — não quebrar)
- src/integrations/supabase/client.server.ts / auth-middleware.ts (auth RLS)

## Objetivo deste pacote
O usuário (beco1409-spec) pediu para fazer o ESQUELETO das melhorias aqui e enviar tudo para o Claude como arquivo ZIPADO detalhado. 
O usuário usa fluxo: ele edita localmente em C:\HarmonyHub → usa Claude para zipar correções → sobe.

## Melhorias propostas (lista detalhada para o Claude)
1. Refinar UI do Modo Culto (culto.tsx): melhor responsividade, animações suaves, contraste premium do header live.
2. Adicionar rolagem automática (auto-scroll) no CifraView quando `playing=true`.
3. Melhorar a componente Badge do modo culto com animação de pulsação conforme BPM.
4. Corrigir possível loop de `getSession` em beforeLoad de rotas protegidas (já corrigido em 49391d8 — verificar se não regressou).
5. Adicionar página de edição de música com preview de áudio e transposição instantânea.
6. Refinar paginação/ScrollArea no repertório.
7. Ajustar cores da logo da igreja (já feito em b316bc7 — manter consistente).

## Regras para o Claude gerar o ZIP
- Gerar arquivo `HARMONYHUB-MELHORIAS.zip` contendo TODO o conteúdo da pasta `src/` (e apenas as alterações + arquivo MUDANCAS.md) para o usuário extrair diretamente em C:\HarmonyHub.
- Incluir arquivo `MUDANCAS.md` na raiz do ZIP explicando arquivo por arquivo o que mudou.
- NÃO apagar rotas existentes (culto, escala, repertorio, configuracao, perfil).
- Manter todas as importações `@/` funcionando.
- Verificar que `.env.example` e `.dev.vars.example` permanecem intactos.

## Status atual do workspace
Clonado em: /home/user/HARMONYHUB
Último commit analisado: 2b83e9a (fix Outlet configuracao)
Data do WORKSPACE: 2026-09-05
