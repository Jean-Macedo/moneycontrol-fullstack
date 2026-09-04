-- 001_gastos.sql — schema e segurança da tabela de lançamentos (PRD-02).
-- Executar no SQL Editor do Supabase. É idempotente: pode rodar de novo sem erro.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------

create table if not exists public.gastos (
  id         uuid primary key default gen_random_uuid(),
  valor      numeric(12,2) not null,
  categoria  text not null,
  -- Dia do gasto no calendário do usuário. O fuso é explícito: now()::date em
  -- UTC jogaria um lançamento das 22h do dia 31 para o mês seguinte.
  data       date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now(),

  constraint gastos_valor_positivo check (valor > 0),
  constraint gastos_valor_teto     check (valor <= 1000000),
  constraint gastos_categoria_valida
    check (categoria in ('Uber', 'Lazer', 'Metrô'))
);

-- Consulta dominante: filtro por intervalo de datas, ordenado por mais recente.
create index if not exists gastos_data_idx
  on public.gastos (data desc, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- A anon key vai para o bundle do frontend — é pública por natureza. Sem RLS,
-- qualquer pessoa com a URL apagaria a tabela. RLS é obrigatório.
-- ---------------------------------------------------------------------------

alter table public.gastos enable row level security;

drop policy if exists "anon pode ler gastos" on public.gastos;
create policy "anon pode ler gastos"
  on public.gastos for select
  to anon
  using (true);

drop policy if exists "anon pode inserir gastos" on public.gastos;
create policy "anon pode inserir gastos"
  on public.gastos for insert
  to anon
  with check (true);

-- Deliberadamente NÃO existem políticas de UPDATE nem DELETE.
-- Sem política, a operação é negada. Lançamentos são imutáveis na V2.
