# PRD-02 — Supabase: Schema, Segurança e Camada de Dados

**Épico:** Backend / Persistência
**Depende de:** PRD-01
**Bloqueia:** PRD-03, PRD-04
**Estimativa:** 1 dia

---

## 1. Objetivo

Criar a tabela `gastos` no Supabase com integridade garantida no próprio banco, expor uma camada de acesso única em `src/lib/` + `src/hooks/`, e provar que inserção e consulta funcionam de ponta a ponta a partir do frontend.

## 2. Requisitos atendidos

- *Persistência de Dados:* dados em nuvem, sincronizados entre dispositivos (RNF-02).
- *Captura Automática de Data:* data e hora preenchidas pelo sistema.
- *Categorização Fixa:* restrição a `Uber`, `Lazer`, `Metrô` **imposta pelo banco**, não só pela UI.

## 3. Modelo de dados

Estrutura especificada:

```
gastos
├── id          UUID, PK
├── valor       Numeric
├── categoria   Text: 'Uber' | 'Lazer' | 'Metrô'
├── data        Date  — preenchida automaticamente com a data atual
└── created_at  Timestamp automático
```

### 3.1. DDL

Executar no SQL Editor do Supabase:

```sql
create extension if not exists "pgcrypto";

create table public.gastos (
  id         uuid primary key default gen_random_uuid(),
  valor      numeric(12,2) not null,
  categoria  text not null,
  data       date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now(),

  constraint gastos_valor_positivo check (valor > 0),
  constraint gastos_valor_teto     check (valor <= 1000000),
  constraint gastos_categoria_valida
    check (categoria in ('Uber', 'Lazer', 'Metrô'))
);

-- Consulta dominante: filtro por intervalo de datas, ordenado por mais recente.
create index gastos_data_idx on public.gastos (data desc, created_at desc);
```

### 3.2. Decisões de modelagem

| Decisão | Motivo |
|---|---|
| `numeric(12,2)` e não `float` | Ponto flutuante acumula erro de arredondamento em soma de dinheiro. Numeric é exato. |
| `data` como `date`, default no fuso de São Paulo | O agrupamento é por mês do calendário do usuário. `now()::date` em UTC jogaria um gasto das 22h do dia 31 para o mês seguinte. |
| `created_at` como `timestamptz` separado | `data` é o dia do gasto (regra de negócio); `created_at` é auditoria de quando a linha entrou. Papéis distintos. |
| CHECK de categoria em vez de `enum` | Alterar CHECK é trivial; alterar tipo enum no Postgres é migração dolorosa. |
| CHECK de teto em 1.000.000 | Barreira contra dedo pesado (digitar 500 zeros) chegar ao banco. |

## 4. Segurança (RLS)

A `anon key` do Supabase vai para o bundle do frontend — ela é pública por natureza. Sem RLS, qualquer pessoa com a URL apagaria a tabela. RLS é **obrigatório**.

### V2 — app pessoal, sem autenticação

```sql
alter table public.gastos enable row level security;

create policy "anon pode ler gastos"
  on public.gastos for select
  to anon
  using (true);

create policy "anon pode inserir gastos"
  on public.gastos for insert
  to anon
  with check (true);

-- Deliberadamente NÃO existem políticas de UPDATE nem DELETE.
-- Sem política, a operação é negada. Lançamentos são imutáveis na V2.
```

> **Limitação aceita e registrada:** com essas políticas, quem obtiver a URL do app consegue ler e inserir gastos. É aceitável para um app pessoal não divulgado. **Se o app for compartilhado ou publicado**, executar antes a migração para autenticação descrita em §8.

## 5. Camada de acesso a dados

### 5.1. Cliente

`src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
```

### 5.2. Utilitários de formatação e data

`src/lib/format.js`:

```js
export const formatarMoeda = (valor) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor) || 0);

/** Primeiro e último dia do mês, em data LOCAL, no formato YYYY-MM-DD. */
export function intervaloDoMes(ano, mes /* 1-12 */) {
  const pad = (n) => String(n).padStart(2, '0');
  const ultimoDia = new Date(ano, mes, 0).getDate(); // dia 0 do mês seguinte
  return {
    inicio: `${ano}-${pad(mes)}-01`,
    fim: `${ano}-${pad(mes)}-${pad(ultimoDia)}`,
  };
}

export const nomeDoMes = (ano, mes) =>
  new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
```

> A construção das strings de data é feita com aritmética local, **nunca** com `toISOString()`, que converte para UTC e desloca o dia.

### 5.3. Repositório

`src/lib/gastosRepo.js` — único ponto do código que fala com a tabela:

```js
import { supabase } from './supabase';
import { intervaloDoMes } from './format';

export async function listarGastosDoMes(ano, mes) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  const { data, error } = await supabase
    .from('gastos')
    .select('id, valor, categoria, data, created_at')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((g) => ({ ...g, valor: Number(g.valor) }));
}

export async function inserirGasto({ valor, categoria }) {
  const { data, error } = await supabase
    .from('gastos')
    .insert({ valor, categoria })   // data e id ficam por conta do banco
    .select('id, valor, categoria, data, created_at')
    .single();

  if (error) throw error;
  return { ...data, valor: Number(data.valor) };
}
```

> `valor` volta do PostgREST como **string** (`numeric` preserva precisão em JSON). A conversão para `Number` acontece aqui, na fronteira, e em nenhum outro lugar.

### 5.4. Hook de dados

`src/hooks/useGastos.js` — consumido por PRD-03 (inserção) e PRD-04 (leitura e totais):

```js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarGastosDoMes, inserirGasto } from '../lib/gastosRepo';
import { CATEGORIA_IDS } from '../constants/categorias';

export function useGastos(ano, mes) {
  const [gastos, setGastos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setGastos(await listarGastosDoMes(ano, mes));
    } catch (e) {
      setErro(e);
    } finally {
      setCarregando(false);
    }
  }, [ano, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = useCallback(async ({ valor, categoria }) => {
    const novo = await inserirGasto({ valor, categoria });
    // Só entra na lista visível se pertencer ao mês em exibição.
    const [a, m] = novo.data.split('-').map(Number);
    if (a === ano && m === mes) setGastos((prev) => [novo, ...prev]);
    return novo;
  }, [ano, mes]);

  const totais = useMemo(() => {
    const porCategoria = Object.fromEntries(CATEGORIA_IDS.map((c) => [c, 0]));
    let total = 0;
    for (const g of gastos) {
      total += g.valor;
      if (g.categoria in porCategoria) porCategoria[g.categoria] += g.valor;
    }
    return { total, porCategoria };
  }, [gastos]);

  return { gastos, totais, carregando, erro, adicionar, recarregar: carregar };
}
```

## 6. Critérios de aceite

- [ ] Tabela `gastos` existe com todas as colunas, tipos e constraints da §3.1.
- [ ] `insert` com `categoria = 'Comida'` é **rejeitado** pelo banco.
- [ ] `insert` com `valor = -10` é **rejeitado** pelo banco.
- [ ] `insert` com `valor = 0` é **rejeitado** pelo banco.
- [ ] `insert` sem informar `data` grava a data de hoje no fuso de São Paulo.
- [ ] `delete` e `update` via anon key são **negados** por ausência de política.
- [ ] `listarGastosDoMes(2026, 1)` traz o gasto do dia 31/01 e **não** traz o do dia 01/02.
- [ ] Um gasto inserido às 22h30 (horário de Brasília) do dia 31 fica registrado no dia 31, não no dia 1º.
- [ ] `valor` chega ao componente React como `number`, não como string.
- [ ] Com `.env.local` vazio, o app falha na inicialização com mensagem clara, e não com `undefined is not a function`.

## 7. Validação manual sugerida

```sql
-- Deve falhar (categoria inválida)
insert into gastos (valor, categoria) values (10, 'Comida');

-- Deve falhar (valor não positivo)
insert into gastos (valor, categoria) values (0, 'Uber');

-- Deve funcionar; conferir a coluna data
insert into gastos (valor, categoria) values (23.90, 'Metrô') returning *;

-- Seed para testar o seletor de mês do PRD-04
insert into gastos (valor, categoria, data) values
  (31.50, 'Uber',  '2026-08-05'),
  (18.00, 'Lazer', '2026-08-19'),
  ( 5.40, 'Metrô', '2026-08-31'),
  (12.00, 'Uber',  '2026-09-01');
```

## 8. Migração futura para multiusuário (não executar na V2)

Registrado aqui para que a decisão de hoje não vire dívida silenciosa:

```sql
alter table public.gastos
  add column user_id uuid references auth.users(id) default auth.uid();

drop policy "anon pode ler gastos"     on public.gastos;
drop policy "anon pode inserir gastos" on public.gastos;

create policy "dono lê seus gastos"
  on public.gastos for select to authenticated
  using (auth.uid() = user_id);

create policy "dono insere seus gastos"
  on public.gastos for insert to authenticated
  with check (auth.uid() = user_id);
```

## 9. Entregáveis

- Script SQL de criação versionado em `supabase/migrations/001_gastos.sql`.
- `src/lib/supabase.js`, `src/lib/format.js`, `src/lib/gastosRepo.js`, `src/hooks/useGastos.js`.
- Registro no README de que RLS está ativo e qual o modelo de acesso da V2.
