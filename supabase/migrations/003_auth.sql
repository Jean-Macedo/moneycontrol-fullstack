-- 003_auth.sql — troca acesso anônimo por RLS por dono (PRD-07).
--
-- ANTES DE EXECUTAR: substitua o UUID abaixo pelo da sua conta, visível em
-- Authentication > Users no painel do Supabase.
--
-- Rode o bloco inteiro de uma vez. Ele é transacional: ou tudo passa, ou nada
-- muda. A verificação no meio aborta a transação se algum lançamento ficar sem
-- dono — situação da qual não há volta pela aplicação, porque não existe
-- política de UPDATE que permita readotar linhas órfãs.

begin;

-- ---------------------------------------------------------------------------
-- 1. Coluna de dono
-- ---------------------------------------------------------------------------

alter table public.gastos
  add column if not exists user_id uuid references auth.users(id);

-- ---------------------------------------------------------------------------
-- 2. Backfill dos lançamentos existentes
--
-- Precisa vir antes do `not null` e antes das políticas novas.
-- ---------------------------------------------------------------------------

update public.gastos
   set user_id = '00000000-0000-0000-0000-000000000000'::uuid  -- <<< TROQUE AQUI
 where user_id is null;

-- Aborta se sobrou alguém sem dono (UUID errado, por exemplo).
do $$
declare
  orfas integer;
begin
  select count(*) into orfas from public.gastos where user_id is null;
  if orfas > 0 then
    raise exception
      'Backfill incompleto: % lançamento(s) sem user_id. Confira o UUID e rode de novo.',
      orfas;
  end if;
end $$;

alter table public.gastos alter column user_id set not null;

-- Com o default, o cliente nunca envia user_id: o banco preenche a partir da
-- sessão e o WITH CHECK confirma que bate. É o que mantém gastosRepo intacto.
alter table public.gastos alter column user_id set default auth.uid();

-- ---------------------------------------------------------------------------
-- 3. Políticas: de anônimo para dono
-- ---------------------------------------------------------------------------

drop policy if exists "anon pode ler gastos"     on public.gastos;
drop policy if exists "anon pode inserir gastos" on public.gastos;

drop policy if exists "dono lê seus gastos"     on public.gastos;
create policy "dono lê seus gastos"
  on public.gastos for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "dono insere seus gastos" on public.gastos;
create policy "dono insere seus gastos"
  on public.gastos for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Seguem sem política de UPDATE e DELETE: lançamentos continuam imutáveis.

-- ---------------------------------------------------------------------------
-- 4. Índice
--
-- A consulta dominante passa a filtrar por dono antes da data.
-- ---------------------------------------------------------------------------

drop index if exists gastos_data_idx;
create index if not exists gastos_user_data_idx
  on public.gastos (user_id, data desc, created_at desc);

commit;

-- ---------------------------------------------------------------------------
-- Conferência (rode depois do commit; deve devolver 8 linhas e nenhuma órfã)
-- ---------------------------------------------------------------------------
-- select count(*) as total, count(*) filter (where user_id is null) as orfas
--   from public.gastos;
--
-- select cmd, roles, policyname from pg_policies where tablename = 'gastos';
--   -> esperado: exatamente SELECT e INSERT, ambos para {authenticated}
