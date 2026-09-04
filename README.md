# Meus Gastos

PWA mobile-first para registrar gastos diários em **dois toques e um número**.
Categorias fixas: `Uber`, `Lazer`, `Metrô`.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Tailwind CSS 3 |
| Build / Deploy | Vite + Vercel |
| Backend & Banco | Supabase (PostgreSQL) |

## Rodando localmente

Requer Node na versão do [.nvmrc](.nvmrc) (24.15.0).

```bash
nvm use            # opcional, se você usa nvm
npm install        # cria o ambiente isolado em node_modules/
cp .env.example .env.local
npm run dev
```

O app sobe em `http://localhost:5173`.

## Variáveis de ambiente

Preencha `.env.local` com as credenciais do seu projeto Supabase:

| Variável | Onde encontrar |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |

O prefixo `VITE_` é obrigatório — sem ele a variável não chega ao bundle.
`.env.local` **nunca** é versionado.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm run lint` | Lint com oxlint |

## Estrutura

```
src/
├── main.jsx
├── App.jsx
├── index.css
├── lib/           # supabase.js (PRD-02), format.js
├── hooks/         # useGastos.js (PRD-02/03/04)
├── components/
│   ├── layout/    # AppShell.jsx
│   ├── dashboard/ # PRD-04
│   └── lancamento/# PRD-03
└── constants/     # categorias.js — fonte única de verdade
```

## Banco de dados e segurança

Tabela única `gastos`, criada por [supabase/migrations/001_gastos.sql](supabase/migrations/001_gastos.sql).
A integridade é imposta pelo **banco**, não só pela interface: `CHECK` restringe
a categoria às três permitidas, exige valor positivo e impõe um teto.

**RLS está ativo.** O modelo de acesso da V2, deliberado:

| Operação | Permitida ao `anon`? |
|---|---|
| `select` | sim |
| `insert` | sim |
| `update` | **não** — sem política |
| `delete` | **não** — sem política |

Lançamentos são imutáveis. A anon key vai para o bundle do frontend e é pública
por natureza — é o RLS que sustenta a segurança, não o segredo da chave.

> **Limitação conhecida:** sem autenticação, quem tiver a URL do app consegue ler
> e inserir gastos. Aceitável para uso pessoal; **antes de divulgar o app**, migrar
> para autenticação conforme PRD-02 §8.

### Configurando o `VITE_SUPABASE_URL`

Use o **Project URL** — apenas a origem, `https://<ref>.supabase.co`. Colar o
endpoint REST completo (com `/rest/v1`) faz toda chamada falhar com
`PGRST125 — Invalid path specified in request URL`. O cliente valida o formato
na inicialização e avisa com mensagem clara.

## Deploy

Vercel conectado a este repositório, deploy automático a cada push em `main`.

- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: as duas `VITE_*` acima, em Production e Preview.

URL de produção: **https://moneycontrol-fullstack.vercel.app**

## Documentação

Especificação e PRDs de execução em [docs/prds/](docs/prds/) — comece pelo
[PRD-00](docs/prds/PRD-00-visao-geral-e-roadmap.md).
