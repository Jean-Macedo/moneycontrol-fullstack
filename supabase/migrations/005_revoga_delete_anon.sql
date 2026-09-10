-- 005_revoga_delete_anon.sql — defesa em profundidade na exclusão (PRD-08 §9).
--
-- Só remove um privilégio que ninguém usa. Não afeta o app, que só exclui
-- autenticado, e é idempotente.

begin;

-- Hoje o RLS já barra a exclusão anônima, mas em silêncio: sem política que
-- case, o PostgREST devolve 200 com lista vazia, indistinguível de "nenhuma
-- linha encontrada". Sem o privilégio, a recusa vira 42501 explícito — como já
-- acontece no update desde o 004.
--
-- O ganho real, porém, é de camada. Se um dia uma política de delete for criada
-- larga demais (`to public` em vez de `to authenticated`, por exemplo), o RLS
-- deixaria passar e só o privilégio ausente seguraria.
revoke delete on public.gastos from anon;

commit;

-- ---------------------------------------------------------------------------
-- Conferência: `anon` não deve aparecer com DELETE
-- ---------------------------------------------------------------------------
-- select grantee, privilege_type
--   from information_schema.role_table_grants
--  where table_name = 'gastos' and grantee in ('anon', 'authenticated')
--  order by grantee, privilege_type;
--   -> esperado para anon: apenas INSERT, SELECT, e os demais que o Supabase
--      concede por padrão — mas NUNCA UPDATE nem DELETE.
