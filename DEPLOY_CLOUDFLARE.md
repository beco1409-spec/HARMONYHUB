# Migração: Lovable → Cloudflare + Supabase próprio

Este documento é o passo a passo completo para tirar o **Harmony Hub** do
Lovable e colocá-lo no ar com infraestrutura 100% sua: **Cloudflare Workers**
para o app e um **projeto Supabase na sua própria conta** para banco de dados
e autenticação.

O que já foi feito no código (neste ZIP):

- Removidos os pacotes `@lovable.dev/cloud-auth-js` e `@lovable.dev/vite-tanstack-config`.
- `vite.config.ts` reescrito para usar `@cloudflare/vite-plugin` diretamente (padrão oficial do time do Cloudflare/TanStack).
- Adicionado `wrangler.jsonc` (config do Cloudflare Workers).
- Login com Google trocado do proxy da Lovable para `supabase.auth.signInWithOAuth` nativo.
- Removidos `.lovable/`, `AGENTS.md` e `README.md` com referências à Lovable.
- Mensagens de erro e telemetria que citavam "Lovable Cloud" generalizadas.
- `.env` removido do zip (continha a chave do projeto Supabase antigo) — use `.env.example` como modelo.

O que **não dá pra automatizar por código** e você precisa fazer manualmente:
criar a conta/projeto na Cloudflare, criar o novo projeto Supabase, migrar os
dados, e autenticar o `wrangler` — nenhuma ferramenta de IA tem acesso às suas
contas para fazer isso por você. Os passos abaixo cobrem tudo isso.

---

## Parte 1 — Migrar o Supabase para a sua conta

O app atualmente aponta para um projeto Supabase provisionado pela Lovable
Cloud (`ntamgwfucddxeooqcuxa`). O Supabase **não tem** um botão de "transferir
projeto para outra organização" quando o projeto foi criado por um parceiro
como a Lovable — então o caminho é criar um projeto novo na sua conta e
migrar schema + dados para ele.

### 1.1 Criar o novo projeto

1. Crie uma conta em [supabase.com](https://supabase.com) (ou entre na sua).
2. **New project** → escolha organização, nome (ex.: `harmony-hub`), senha do
   banco (guarde-a) e a região mais próxima dos seus usuários (ex.: `South
   America (São Paulo)`).
3. Aguarde o projeto provisionar (1–2 min).

### 1.2 Aplicar o schema (as migrações já estão no repo)

Este projeto já traz o histórico completo de migrações SQL em
`supabase/migrations/`. Com a [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) instalada:

```sh
npm install -g supabase
supabase login
cd sync-worship-flow-main
supabase link --project-ref <REF_DO_SEU_NOVO_PROJETO>
supabase db push
```

- `<REF_DO_SEU_NOVO_PROJETO>` fica em **Project Settings → General → Reference ID**.
- `supabase link` atualiza automaticamente `supabase/config.toml` com o novo `project_id`.
- `supabase db push` aplica, em ordem, todas as migrações de `supabase/migrations/` no banco novo — recriando tabelas, policies de RLS, functions e triggers exatamente como estão hoje.

Se preferir não instalar a CLI, dá para colar o conteúdo de cada arquivo
`.sql` de `supabase/migrations/` (na ordem dos nomes, que já são
cronológicos) no **SQL Editor** do painel do novo projeto e executar um por
um.

### 1.3 Migrar os dados existentes

O passo acima recria a estrutura, mas não copia as linhas que já existem
(cultos, cifras, escalas etc.) no projeto antigo. Para copiar os dados:

1. No projeto **antigo** (Lovable): **Database → Backups**, ou via CLI:
   ```sh
   supabase link --project-ref ntamgwfucddxeooqcuxa
   supabase db dump --data-only -f dados.sql
   ```
2. No projeto **novo**, com o dump em mãos:
   ```sh
   supabase link --project-ref <REF_DO_SEU_NOVO_PROJETO>
   psql "postgresql://postgres:<SENHA>@db.<REF_DO_SEU_NOVO_PROJETO>.supabase.co:5432/postgres" -f dados.sql
   ```
   (a senha e a connection string completas ficam em **Project Settings → Database**).
3. Se o app tiver arquivos no **Storage** (fotos de perfil, PDFs, etc.),
   baixe os buckets do projeto antigo e reenvie no novo — o dump SQL não
   copia arquivos binários.

### 1.4 Recriar autenticação

- **Authentication → Providers → Email**: já vem habilitado por padrão.
- **Authentication → Providers → Google**: se você usa login com Google, crie
  suas próprias credenciais OAuth no [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  (Client ID + Client Secret) e cole-as aqui. Antes, no Lovable, isso era
  resolvido pelo proxy de OAuth deles — agora é o Supabase quem cuida disso
  diretamente, com as suas próprias credenciais.
- Em **Authentication → URL Configuration**, defina o **Site URL** e as
  **Redirect URLs** com o domínio final do seu Worker (ex.:
  `https://harmony-hub.<seu-subdomínio>.workers.dev` e/ou seu domínio próprio).
- Os usuários que já existem no projeto antigo (tabela `auth.users`) também
  precisam ser migrados — a forma mais simples é exportar/importar via
  `supabase db dump`/`psql` como no passo 1.3 (o dump padrão inclui o schema
  `auth` se você não passar `--data-only` restrito ao schema `public`; use
  `supabase db dump --data-only --schema auth,public -f dados.sql` para
  incluir os usuários).

### 1.5 Coletar as novas credenciais

Em **Project Settings → API** do projeto novo, anote:

- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **Project ID** (o subdomínio da URL) → `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID`
- **anon / publishable key** → `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- **service_role key** (em "Reveal") → `SUPABASE_SERVICE_ROLE_KEY` (fica só no servidor, nunca no cliente)

---

## Parte 2 — Configurar o projeto localmente

```sh
cd sync-worship-flow-main
npm install
cp .env.example .env
```

Edite `.env` com as credenciais coletadas no passo 1.5. Também copie
`.dev.vars.example` para `.dev.vars` (mesmas credenciais) — é o arquivo que o
`wrangler dev` usa para simular as variáveis de ambiente do Worker
localmente.

Teste local:

```sh
npm run dev
```

Abra `http://localhost:3000` e confirme que login, escalas e cifras
funcionam apontando para o novo Supabase.

---

## Parte 3 — Build e deploy no Cloudflare Workers

### 3.1 Pré-requisitos

- Conta na [Cloudflare](https://dash.cloudflare.com/sign-up) (plano gratuito já serve para começar).
- Node.js 20+ instalado.

### 3.2 Autenticar o Wrangler

```sh
npx wrangler login
```

Isso abre o navegador para autorizar a CLI na sua conta Cloudflare. Confirme com:

```sh
npx wrangler whoami
```

### 3.3 Ajustar `wrangler.jsonc`

Abra `wrangler.jsonc` na raiz do projeto e:

1. Troque `"name"` se quiser um nome diferente para o Worker (ele vira parte
   da URL padrão: `https://<name>.<seu-subdomínio>.workers.dev`).
2. Preencha `vars.SUPABASE_URL`, `vars.SUPABASE_PROJECT_ID` e
   `vars.SUPABASE_PUBLISHABLE_KEY` com os valores do passo 1.5 (essas três
   não são segredas — são as mesmas usadas no cliente).

### 3.4 Configurar o segredo (service role key)

**Nunca** coloque a `service_role key` no `wrangler.jsonc` nem no `.env`
commitado — ela ignora todas as regras de RLS do banco. Registre-a como
*secret* do Worker:

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

(vai pedir para colar o valor no terminal; fica criptografado na Cloudflare, nunca aparece nos logs).

### 3.5 Build

```sh
npm run build
```

Isso roda `vite build` (gera o bundle do Worker + assets estáticos) e
`tsc --noEmit` (checagem de tipos). Corrija qualquer erro de TypeScript antes
de seguir.

### 3.6 Deploy

```sh
npm run deploy
```

Esse script builda de novo e roda `wrangler deploy`. Ao final, o terminal
mostra a URL pública, algo como:

```
https://harmony-hub.<seu-subdomínio>.workers.dev
```

### 3.7 Domínio próprio (opcional)

No painel da Cloudflare: **Workers & Pages → harmony-hub → Settings →
Domains & Routes → Add → Custom Domain**, e siga o assistente (o domínio
precisa estar com o DNS gerenciado pela Cloudflare).

### 3.8 Deploys seguintes

Sempre que alterar o código:

```sh
npm run deploy
```

Se quiser deploy automático a cada push, conecte o repositório GitHub em
**Workers & Pages → Create → Connect to Git** — a Cloudflare passa a rodar
`npm run build` + deploy a cada push na branch escolhida, sem precisar rodar
`wrangler` manualmente.

---

## Checklist rápido

- [ ] Novo projeto Supabase criado, `supabase db push` aplicado
- [ ] Dados do projeto antigo migrados (`db dump` / `psql`)
- [ ] Provider Google (se usado) reconfigurado com credenciais próprias
- [ ] Redirect URLs do Supabase Auth apontando para o domínio do Worker
- [ ] `.env` local preenchido e funcionando com `npm run dev`
- [ ] `wrangler login` feito
- [ ] `vars` em `wrangler.jsonc` preenchidas
- [ ] `SUPABASE_SERVICE_ROLE_KEY` registrada com `wrangler secret put`
- [ ] `npm run build` sem erros
- [ ] `npm run deploy` publicado e testado na URL `*.workers.dev`

---

## Atualização: Sistema de Perfis, Cadastro e Permissões (Master/Padrão)

Esta seção documenta a nova camada de perfil obrigatório, funções musicais e
permissões (Master/Padrão) adicionada por cima do sistema já existente — nada
do que já funcionava foi removido.

### O que foi adicionado

- **Migração** `supabase/migrations/20260819120000_perfil_funcoes_permissoes.sql`:
  - Colunas novas em `profiles`: `funcoes` (lista de funções musicais),
    `role` (`master` ou `padrao`), `perfil_configurado` (bool) e `email`.
  - Reaproveita a coluna `funcao_vocal` já existente como "classificação de
    timbre de voz" — não duplica campo.
  - Função `is_master()` e um trigger que impede um usuário Padrão de alterar
    sua própria permissão (ou a de outros) e impede remover o último Master
    do sistema — a proteção fica no banco, não só na tela.
- **Popup obrigatório** no primeiro acesso (`ProfileSetupModal`), disparado em
  `src/routes/_authenticated/route.tsx`: o app só libera o conteúdo depois
  que a pessoa preenche nome, função(ões) musical(is) e timbre (quando
  aplicável).
- **`/configuracao`** e **`/configuracao/usuarios`**: área administrativa,
  visível apenas para quem tem `role = master` — tanto escondida do menu
  quanto bloqueada por rota (`beforeLoad`) se alguém tentar acessar a URL
  diretamente.
- Perfis já existentes (de antes desta migração) são marcados como
  "configurados" automaticamente, para não travar quem já usa o app.

### Passo a passo para aplicar

1. **Substitua os arquivos no seu repositório** pelos deste pacote (ou faça o
   merge manual, se você já alterou algo local).

2. **Aplique a nova migração no Supabase**:
   ```powershell
   cd C:\HARMONYHUB
   npx supabase link --project-ref <SEU_PROJECT_REF>
   npx supabase db push
   ```
   Isso roda só a migração nova (`20260819120000_...sql`); as anteriores já
   aplicadas são puladas automaticamente.

   **Alternativa sem CLI:** cole o conteúdo do arquivo
   `supabase/migrations/20260819120000_perfil_funcoes_permissoes.sql` no
   **SQL Editor** do Supabase e execute.

3. **Defina o primeiro Master.** Ninguém consegue virar Master pela
   interface (é proposital — só um Master promove outro usuário). No
   **SQL Editor** do Supabase, rode uma vez, trocando pelo e-mail da pessoa
   responsável:
   ```sql
   UPDATE public.profiles
   SET role = 'master'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');
   ```
   Depois disso, essa pessoa já consegue promover/rebaixar os demais pela
   tela **Perfil → Configuração → Usuários**.

4. **Build e deploy** (igual ao processo já usado):
   ```powershell
   npm install
   npm run build
   npm run deploy
   ```

5. **Teste**: faça login com uma conta nova — o popup de configuração de
   perfil deve aparecer antes de liberar o app. Faça login com a conta que
   você promoveu a Master — o item **Configuração** deve aparecer no menu do
   Perfil.
