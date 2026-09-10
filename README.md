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

**RLS está ativo e o acesso é autenticado** ([003_auth.sql](supabase/migrations/003_auth.sql)).
Cada lançamento tem dono, e o banco compara `auth.uid()` com `user_id`:

| Operação | `anon` (sem sessão) | Dono autenticado |
|---|---|---|
| `select` | **não** — devolve vazio | sim, só o que é seu |
| `insert` | **não** — recusado | sim |
| `update` | **não** — sem política | sim, só `valor` e `categoria` |
| `delete` | **não** — sem política | sim, só o que é seu |

A anon key vai para o bundle e é pública por natureza — é o RLS que sustenta a
segurança, não o segredo da chave. Sem uma sessão válida, ela não abre nada.

Edição e exclusão chegaram no [004_edicao.sql](supabase/migrations/004_edicao.sql).
Até então os lançamentos eram imutáveis, mas isso nunca foi princípio de produto:
era mitigação para a ausência de login, quando uma política de `delete`
significaria que qualquer um com a URL apagaria a base. O PRD-07 removeu a ameaça.

**RLS decide quais linhas; privilégio de coluna decide quais campos.** Só `valor`
e `categoria` são graváveis num update — sem essa restrição, o cliente poderia
reescrever `data` e mover um gasto de mês em silêncio, desmontando os totais. Um
gatilho restaura as colunas protegidas como segunda linha de defesa.

O `user_id` tem `default auth.uid()`, então o cliente nunca envia esse campo: o
banco o preenche a partir da sessão e o `WITH CHECK` confirma que bate.

Conta única, criada manualmente no painel. **Cadastro público desabilitado** —
uma tentativa de `signup` devolve `signup_disabled`.

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

## PWA

Instalável na tela inicial pelo Chrome Android — a própria interface oferece
**Instalar na tela inicial** quando o navegador dispara `beforeinstallprompt`.
Aberto pelo ícone, roda em tela cheia, sem barra de URL.

O app shell é precacheado pelo service worker, então o app **abre offline**. Os
dados, não: chamadas ao Supabase usam `NetworkOnly`. Um total mensal vindo do
cache seria um número errado com a mesma cara de um número certo — e, com
autenticação, o endpoint de auth em cache devolveria sessão fantasma.

Sem conexão, uma faixa avisa que **os lançamentos não estão sendo salvos**. Não
há fila offline: a decisão está registrada no [PRD-05 §7](docs/prds/PRD-05-pwa-instalacao-e-offline.md),
e o raciocínio é que um lançamento marcado como salvo que nunca sincroniza é pior
que um erro explícito.

Os ícones são gerados por [scripts/gerar-icones.mjs](scripts/gerar-icones.mjs) a
partir de uma definição vetorial única:

```bash
node scripts/gerar-icones.mjs
```

## Documentação

Especificação e PRDs de execução em [docs/prds/](docs/prds/) — comece pelo
[PRD-00](docs/prds/PRD-00-visao-geral-e-roadmap.md).
