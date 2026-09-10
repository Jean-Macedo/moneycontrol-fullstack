-- 004_edicao.sql — permite corrigir e excluir lançamentos (PRD-08).
--
-- Diferente do 003, este script só ADICIONA permissões: rodá-lo antes de
-- publicar o código não quebra nada, o app apenas ainda não as usa.
--
-- É idempotente: pode ser reexecutado sem erro.

begin;

-- ---------------------------------------------------------------------------
-- 1. Marca de edição
--
-- Fica nula em lançamento nunca editado — é assim que se distingue um registro
-- original de um corrigido.
-- ---------------------------------------------------------------------------

alter table public.gastos
  add column if not exists updated_at timestamptz;

create or replace function public.marcar_atualizacao()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();

  -- Rede de segurança. O privilégio de coluna do passo 3 é a defesa principal,
  -- mas um `grant update` amplo restaurado por engano numa migração futura
  -- reabriria a porta em silêncio. Aqui as colunas protegidas voltam ao valor
  -- anterior de qualquer forma.
  new.id         := old.id;
  new.user_id    := old.user_id;
  new.data       := old.data;
  new.created_at := old.created_at;

  return new;
end $$;

drop trigger if exists gastos_marcar_atualizacao on public.gastos;
create trigger gastos_marcar_atualizacao
  before update on public.gastos
  for each row execute function public.marcar_atualizacao();

-- ---------------------------------------------------------------------------
-- 2. Políticas: o dono passa a poder corrigir e remover
--
-- Só é defensável porque o PRD-07 trocou acesso anônimo por sessão. Enquanto a
-- anon key do bundle era a única credencial, uma política de delete deixaria
-- qualquer pessoa com a URL apagar a base inteira.
-- ---------------------------------------------------------------------------

drop policy if exists "dono edita seus gastos" on public.gastos;
create policy "dono edita seus gastos"
  on public.gastos for update
  to authenticated
  using (auth.uid() = user_id)
  -- Impede transferir o lançamento para outra conta: a linha resultante
  -- precisa continuar sendo do próprio usuário.
  with check (auth.uid() = user_id);

drop policy if exists "dono exclui seus gastos" on public.gastos;
create policy "dono exclui seus gastos"
  on public.gastos for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Privilégio por coluna
--
-- RLS decide QUAIS LINHAS; privilégio de coluna decide QUAIS CAMPOS. Sem isto,
-- a política de update acima permitiria reescrever `data` e mover um gasto de
-- mês em silêncio, desmontando os totais mensais do PRD-04.
-- ---------------------------------------------------------------------------

revoke update on public.gastos from authenticated;
revoke update on public.gastos from anon;

grant update (valor, categoria) on public.gastos to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Conferência (rodar depois do commit)
-- ---------------------------------------------------------------------------
-- select cmd, roles, policyname from pg_policies where tablename = 'gastos';
--   -> esperado: SELECT, INSERT, UPDATE e DELETE, todos para {authenticated}
--
-- select column_name, privilege_type
--   from information_schema.column_privileges
--  where table_name = 'gastos' and grantee = 'authenticated'
--    and privilege_type = 'UPDATE';
--   -> esperado: exatamente valor e categoria
