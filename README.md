# ApplyHub

MVP completo em Next.js 14 + Supabase para acompanhar candidaturas, empresas e certificacoes.

## Stack

- Next.js 14 (App Router)
- TypeScript
- React
- TailwindCSS
- Supabase Auth + PostgreSQL
- Deploy na Vercel

## Estrutura de pastas

```txt
src/
  app/
    api/
      applications/
        route.ts
        [id]/route.ts
      companies/
        route.ts
        [id]/route.ts
      certifications/
        route.ts
        [id]/route.ts
      dashboard/
        route.ts
    app/
      layout.tsx
      page.tsx
      applications/page.tsx
      dashboard/page.tsx
      companies/page.tsx
      certifications/page.tsx
    login/page.tsx
    signup/page.tsx
    layout.tsx
    globals.css
  components/
    app-sidebar.tsx
    logout-button.tsx
  lib/
    constants.ts
    supabase/
      client.ts
      server.ts
  types/
    database.ts
supabase/
  migrations/
    001_initial.sql
```

## Funcionalidades implementadas

- Auth com email/senha (`/login`, `/signup`, logout)
- Rotas protegidas por middleware e layout protegido
- Applications:
  - Criacao de candidatura
  - Tabela ordenada por `applied_date` desc
  - Edicao inline de `status` e `category`
  - Exclusao com confirmacao
- Dashboard:
  - Total applications, interviews, rejected, offers
  - Referral vs no_referral
  - Grafico de applications por mes
- Companies: CRUD simples em tabela
- Certifications: CRUD simples em tabela
- APIs com validacao basica no backend
- RLS via Supabase (cada usuario acessa apenas seus dados)

## Variaveis de ambiente

Arquivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

Arquivo `.env.example` ja incluso.

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse: `http://localhost:3000`

## Setup Supabase (passo a passo)

1. Criar projeto no Supabase:
   - Abra `https://supabase.com/dashboard`
   - Clique em `New project`
   - Guarde `Project URL` e `anon/public key` em `Settings > API`

2. Rodar SQL das migrations:
   - No Supabase, entre em `SQL Editor`
   - Execute o arquivo [`supabase/migrations/001_initial.sql`](./supabase/migrations/001_initial.sql)
   - Isso cria tabelas, enums, indices, RLS e policies

3. Configurar Auth:
   - Em `Authentication > Providers`
   - Garanta que `Email` esteja habilitado
   - Use email/senha nas telas de signup/login

4. Atualizar variaveis no projeto:
   - Preencha `.env.local` com URL e anon key

## Deploy na Vercel

1. Suba o codigo no GitHub.
2. Na Vercel, clique em `Add New > Project`.
3. Importe o repositorio.
4. Em `Environment Variables`, configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique em `Deploy`.
6. Apos deploy, valide login e CRUDs no ambiente publicado.

## Limites de free tier

- Vercel Hobby:
  - Limite de build/minutos e recursos por projeto
- Supabase Free:
  - Limites de banco, armazenamento e atividade mensal
  - Possivel pausa de projeto em inatividade prolongada

Para MVP e portfolio, os planos gratuitos sao suficientes.
