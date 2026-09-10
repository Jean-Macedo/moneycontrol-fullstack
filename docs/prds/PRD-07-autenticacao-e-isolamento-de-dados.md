# PRD-07 — Autenticação e Isolamento de Dados

**Épico:** Segurança
**Depende de:** PRD-02, PRD-03, PRD-04
**Bloqueia:** PRD-05 (o app instalado precisa nascer já com sessão persistente)
**Estimativa:** 1 dia

---

## 1. Objetivo

Trocar o acesso anônimo por autenticação real, de modo que cada lançamento pertença a um usuário e o banco recuse qualquer leitura ou escrita fora do dono. Ao final, abrir a URL do app sem credencial não revela gasto nenhum.

## 2. Por que agora

O PRD-02 §4 aceitou RLS aberto — `anon` lê e insere — com uma justificativa explícita: *"aceitável para um app pessoal **não divulgado**"*. Essa premissa não se sustenta mais:

- o repositório é **público** e o README traz a URL de produção;
- a URL `moneycontrol-fullstack.vercel.app` é adivinhável;
- a anon key vai para o bundle, que qualquer pessoa baixa;
- desde 10/09/2026 existem **lançamentos reais** na tabela, não mais seed de teste.

Hoje, quem chegar ao app lê os gastos e insere lançamentos falsos. Apagar e editar seguem bloqueados por ausência de política, então não há perda de dados — mas há exposição e poluição.

O PRD-02 §8 já registrou a migração para não deixar isso virar dívida silenciosa. Este PRD a executa.

## 3. Decisão: e-mail e senha, não magic link

| | E-mail + senha | Magic link |
|---|---|---|
| Fricção no primeiro acesso | digita senha | abre e-mail, volta |
| Fricção recorrente | nenhuma (sessão persiste) | nenhuma (sessão persiste) |
| Comportamento no PWA instalado | tudo dentro do app | **o link abre no navegador, não no app instalado** |
| Senha para gerenciar | sim | não |

A linha decisiva é a terceira. Com o app instalado na tela inicial (PRD-05), o link do e-mail abre uma sessão no navegador enquanto o app instalado continua deslogado. É uma limitação conhecida de PWA no Android, e contorná-la custa mais do que a senha economiza.

**Decisão:** e-mail e senha, conta única, criada manualmente. Sem cadastro público.

## 4. Escopo

### Dentro

- Coluna `user_id` em `gastos`, com backfill dos 8 lançamentos existentes.
- Políticas de RLS por dono, substituindo as de `anon`.
- Sessão persistente no cliente (`persistSession: true`).
- Tela de login com e-mail e senha.
- Guarda de sessão: nada da aplicação renderiza sem sessão válida.
- Botão de sair.
- Cadastro público **desabilitado** no painel do Supabase.

### Fora

- Recuperação de senha por e-mail (conta única; o dono usa gerenciador de senhas).
- Cadastro pela interface, login social, múltiplos usuários convidados.
- Perfis, avatar, preferências por usuário.
- Compartilhamento de gastos entre contas.

## 5. Ordem de execução

A ordem importa: **a conta precisa existir antes do backfill**, porque o `user_id` de destino é o `id` dessa conta.

```
1. Criar a conta no painel do Supabase        (manual)
2. Desabilitar cadastro público                (manual)
3. Rodar 003_auth.sql com o UUID da conta      (manual, SQL Editor)
4. persistSession: true + tela de login        (código)
5. Verificar que anon não lê mais nada         (verificação)
```

Entre os passos 3 e 4 o app publicado fica quebrado: o RLS já recusa `anon` e o cliente ainda não autentica. Se isso incomodar, faça os dois na mesma janela de tempo.

## 6. Banco de dados

### 6.1. Criar a conta

Painel do Supabase → **Authentication → Users → Add user → Create new user**.

- E-mail e senha do dono.
- Marcar **Auto Confirm User**. Sem isso, o Supabase exige confirmação por e-mail usando um serviço de envio com limite baixo, e a conta fica inutilizável esperando uma mensagem que pode não chegar.

Copiar o **UUID** da linha criada — ele entra no script do §6.2.

### 6.2. Migração

`supabase/migrations/003_auth.sql`:

```sql
-- Substituir pelo UUID copiado em §6.1 antes de executar.
\set dono '00000000-0000-0000-0000-000000000000'

begin;

alter table public.gastos
  add column if not exists user_id uuid references auth.users(id);

-- Backfill: adota os lançamentos órfãos. Precisa acontecer ANTES do not null
-- e ANTES das políticas novas. Sem isso, as 8 linhas existentes ficam
-- invisíveis para todo mundo — inclusive para o dono — e não há política de
-- UPDATE que permita adotá-las depois pela aplicação.
update public.gastos set user_id = :'dono' where user_id is null;

alter table public.gastos alter column user_id set not null;
alter table public.gastos alter column user_id set default auth.uid();

drop policy if exists "anon pode ler gastos"     on public.gastos;
drop policy if exists "anon pode inserir gastos" on public.gastos;

create policy "dono lê seus gastos"
  on public.gastos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dono insere seus gastos"
  on public.gastos for insert
  to authenticated
  with check (auth.uid() = user_id);

-- A consulta dominante passa a filtrar por dono antes da data.
drop index if exists gastos_data_idx;
create index gastos_user_data_idx
  on public.gastos (user_id, data desc, created_at desc);

commit;
```

> **`default auth.uid()` não é conveniência, é o que mantém `gastosRepo` intacto.**
> O `inserirGasto` continua enviando apenas `valor` e `categoria`; o banco preenche
> o dono e o `WITH CHECK` confirma que bate com a sessão. Nenhuma mudança no
> repositório de dados.

### 6.3. Desabilitar cadastro público

Painel → **Authentication → Providers → Email** → desligar **Enable sign ups**.

Com RLS por dono, um estranho que se cadastrasse veria um app vazio — inofensivo do ponto de vista dos seus dados, mas consumiria a cota do projeto e encheria a tabela de usuários. Conta única, cadastro fechado.

## 7. Cliente

### 7.1. Sessão persistente

`src/lib/supabase.js` — hoje em `persistSession: false`, correto para acesso anônimo e **errado** a partir daqui: sem isso o usuário reloga a cada abertura do app.

```js
export const supabase = createClient(normalizarUrl(url), anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // não usamos magic link nem OAuth
  },
});
```

### 7.2. Hook de sessão

`src/hooks/useSessao.js`:

```js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSessao() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { sessao, carregando };
}
```

> O `carregando` inicial não é detalhe: sem ele, a tela de login pisca por um
> instante em toda abertura, antes de a sessão do storage ser lida.

### 7.3. Tela de login

`src/components/auth/TelaLogin.jsx` — campos de e-mail e senha, um botão, mensagem de erro. Requisitos:

- `type="email"` e `type="password"`, com `autoComplete="email"` e `"current-password"`, para o gerenciador de senhas do Android preencher.
- Alvos de toque de 56 px, coerentes com o RNF-03.
- Erro genérico: **"E-mail ou senha inválidos"**, sem distinguir qual dos dois falhou.
- Botão desabilitado enquanto a requisição está em curso.

### 7.4. Guarda na composição

`src/App.jsx` passa a decidir entre três estados: carregando sessão, sem sessão, com sessão. Nenhum dado é buscado sem sessão — o `useGastos` só monta no terceiro caso.

### 7.5. Sair

Botão discreto no cabeçalho, chamando `supabase.auth.signOut()`. Confirmação não é necessária: a ação é reversível com um login.

## 8. Critérios de aceite

**Banco**

- [ ] Os 8 lançamentos existentes continuam visíveis para o dono depois da migração.
- [ ] `user_id` é `not null` e nenhuma linha ficou órfã.
- [ ] Uma requisição REST com a anon key, **sem** token de sessão, devolve lista vazia no `select`.
- [ ] Um `insert` com anon key e sem sessão é **recusado**.
- [ ] Um `insert` autenticado grava `user_id` igual ao `auth.uid()` sem o cliente informar o campo.
- [ ] `update` e `delete` seguem negados, mesmo autenticado.

**Cliente**

- [ ] Abrir o app sem sessão mostra a tela de login, nunca o dashboard.
- [ ] Login com credencial correta leva ao dashboard com os dados carregados.
- [ ] Login com senha errada exibe "E-mail ou senha inválidos" e não trava o botão.
- [ ] Fechar e reabrir o app **não** pede login de novo.
- [ ] O gerenciador de senhas do Android oferece preencher os campos.
- [ ] Sair volta para a tela de login e uma nova abertura continua deslogada.
- [ ] A tela de login não pisca ao abrir com sessão válida.

**Regressão**

- [ ] Os 47 testes existentes seguem passando.
- [ ] Lançar um gasto continua funcionando ponta a ponta.
- [ ] O seletor de mês continua funcionando.

## 9. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Backfill esquecido ou com UUID errado | Os 8 lançamentos somem e **não há política de UPDATE para readotá-los** pela aplicação | Rodar em transação; conferir `select count(*) where user_id is null` = 0 antes do `commit` |
| Confirmação de e-mail ligada | Conta criada mas inutilizável | Marcar *Auto Confirm User* na criação |
| `persistSession` esquecido em `false` | Login a cada abertura; inviável como PWA | Está no §7.1 e tem critério de aceite próprio |
| Sessão expirada e app offline | Não há como renovar o token sem rede | Refresh token do Supabase é longevo; a tela de login offline deve dizer que precisa de conexão (detalhar no PRD-05) |
| Cadastro público esquecido aberto | Estranhos criam contas e consomem cota | §6.3, com verificação |

## 10. Plano de reversão

Se algo der errado entre os passos 3 e 5, o caminho de volta é recriar as políticas antigas:

```sql
drop policy if exists "dono lê seus gastos"     on public.gastos;
drop policy if exists "dono insere seus gastos" on public.gastos;

create policy "anon pode ler gastos"
  on public.gastos for select to anon using (true);
create policy "anon pode inserir gastos"
  on public.gastos for insert to anon with check (true);

alter table public.gastos alter column user_id drop not null;
```

A coluna `user_id` pode permanecer: ela não atrapalha o modo anônimo e evita refazer o backfill numa segunda tentativa.

## 11. Entregáveis

- `supabase/migrations/003_auth.sql`.
- `src/hooks/useSessao.js`.
- `src/components/auth/TelaLogin.jsx`.
- `src/lib/supabase.js` com `persistSession: true`.
- `src/App.jsx` com a guarda de sessão e o botão de sair.
- Testes de `TelaLogin` e da guarda de sessão.
- README atualizado: o modelo de acesso deixa de ser anônimo.

## 12. Backlog derivado

- Recuperação de senha (exige SMTP próprio para não depender do limite do Supabase).
- Segundo usuário com gastos compartilhados — mudaria o modelo de `user_id` único para um conceito de espaço compartilhado.
- Desfazer o último lançamento: agora que existe dono, uma política de DELETE restrita ao próprio usuário e a uma janela de tempo passa a ser defensável.
