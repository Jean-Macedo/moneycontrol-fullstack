-- 002_validacao_manual.sql — NÃO é migração. Roteiro de validação do PRD-02 §7.
-- Rodar bloco a bloco no SQL Editor, conferindo o resultado de cada um.

-- 1. Deve FALHAR: categoria fora das três permitidas
insert into gastos (valor, categoria) values (10, 'Comida');

-- 2. Deve FALHAR: valor não positivo
insert into gastos (valor, categoria) values (0, 'Uber');

-- 3. Deve FALHAR: valor negativo
insert into gastos (valor, categoria) values (-10, 'Uber');

-- 4. Deve FUNCIONAR — confira se a coluna `data` veio com a data de hoje
insert into gastos (valor, categoria) values (23.90, 'Metrô') returning *;

-- 5. Deve FALHAR: update e delete não têm política (a contagem volta 0)
update gastos set valor = 1 where valor = 23.90;
delete from gastos where valor = 23.90;

-- 6. Seed para exercitar o seletor de mês do PRD-04
insert into gastos (valor, categoria, data) values
  (31.50, 'Uber',  '2026-08-05'),
  (18.00, 'Lazer', '2026-08-19'),
  ( 5.40, 'Metrô', '2026-08-31'),
  (12.00, 'Uber',  '2026-09-01');

-- 7. Conferência: agosto deve somar 54,90 e trazer 3 linhas
select count(*) as linhas, sum(valor) as total
from gastos
where data between '2026-08-01' and '2026-08-31';
