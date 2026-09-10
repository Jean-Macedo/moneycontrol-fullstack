# PRD-08 — Histórico, Edição e Exclusão de Lançamentos

**Épico:** Feature principal
**Depende de:** PRD-04, PRD-07
**Bloqueia:** —
**Estimativa:** 1 dia

---

## 1. Objetivo

Listar os lançamentos do mês selecionado e permitir corrigir ou remover um deles. Um valor digitado errado deixa de ser permanente.

## 2. Origem

Necessidade levantada em uso real, em 10/09/2026: *"deve ser possível alterar valores digitados errados, talvez por uma seção de histórico"*.

Dois enganos acontecem de verdade com este app:

- **Valor errado.** `4,60` no lugar de `45,60`. O campo aceita, o banco aceita, e o total do mês fica errado para sempre.
- **Lançamento duplicado.** O toque não parece ter registrado, o usuário toca de novo. A guarda de duplo toque do PRD-03 cobre o toque acidental em milissegundos, não o segundo toque deliberado alguns segundos depois.

Só editar resolveria o primeiro. O segundo exigiria zerar o lançamento — e o `CHECK` do banco proíbe valor zero. Por isso o escopo inclui exclusão.

## 3. Por que a imutabilidade cai agora

O PRD-02 §4 decidiu não criar políticas de `UPDATE` e `DELETE`, com um motivo específico: **não havia autenticação**. A anon key está no bundle público, então uma política de exclusão significaria que qualquer pessoa com a URL poderia apagar a base inteira.

O PRD-07 removeu essa condição. Com RLS por dono, `delete` só alcança as linhas de quem está autenticado. O PRD-07 §12 já registrou que a mudança passaria a ser defensável.

> A imutabilidade nunca foi um princípio de produto — era uma mitigação de segurança. Removida a ameaça, ela vira apenas atrito.

## 4. Escopo

### Dentro

- Políticas de `UPDATE` e `DELETE` restritas ao dono.
- **Restrição por coluna:** só `valor` e `categoria` são alteráveis.
- Coluna `updated_at`, preenchida por gatilho.
- Lista dos lançamentos do mês, abaixo do cadastro rápido, sempre visível.
- Tela de edição com valor e categoria, reaproveitando `parseValor` e as cores das categorias.
- Exclusão com confirmação.
- Atualização otimista com rollback, coerente com o PRD-03.

### Fora

- Alterar a **data** de um lançamento (ver §10).
- Histórico de versões ou log de auditoria visível ao usuário.
- Seleção múltipla, exclusão em lote.
- Desfazer exclusão (ver §10).
- Busca ou filtro dentro da lista.

## 5. Banco de dados

`supabase/migrations/004_edicao.sql`:

```sql
begin;

alter table public.gastos
  add column if not exists updated_at timestamptz;

create or replace function public.marcar_atualizacao()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  -- Colunas que o gatilho protege mesmo se a coluna for concedida por engano.
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

create policy "dono edita seus gastos"
  on public.gastos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dono exclui seus gastos"
  on public.gastos for delete
  to authenticated
  using (auth.uid() = user_id);

-- RLS decide QUAIS linhas; privilégio de coluna decide QUAIS campos. Sem isso,
-- o cliente poderia reescrever `data` e mover um gasto de mês em silêncio,
-- desmontando os totais do PRD-04.
revoke update on public.gastos from authenticated;
grant  update (valor, categoria) on public.gastos to authenticated;

commit;
```

### Por que dois mecanismos para a mesma coisa

O `grant` por coluna é a defesa principal; o gatilho é rede de segurança. Um `grant` amplo restaurado por engano numa migração futura reabriria a porta em silêncio, e o gatilho continuaria segurando. Custa quatro linhas.

O `WITH CHECK` já impede transferir um lançamento para outro usuário: a linha resultante precisa continuar satisfazendo `auth.uid() = user_id`.

## 6. Camada de dados

`src/lib/gastosRepo.js` ganha duas funções, no mesmo formato das existentes:

```js
export async function atualizarGasto({ id, valor, categoria }) {
  const { data, error } = await supabase
    .from('gastos')
    .update({ valor, categoria })
    .eq('id', id)
    .select(COLUNAS)
    .single();

  if (error) throw error;
  return normalizar(data);
}

export async function excluirGasto(id) {
  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (error) throw error;
}
```

> O `delete` não devolve representação de propósito: pedir a linha de volta depois de apagá-la só serviria para confundir o tratamento de erro.

`src/hooks/useGastos.js` ganha `editar` e `excluir`, ambos otimistas com rollback, seguindo o que `adicionar` já faz. A guarda de mês continua valendo: uma resposta que chega depois da troca de período é descartada.

## 7. Interface

### 7.1. Lista

`src/components/historico/ListaLancamentos.jsx` — abaixo do cadastro rápido.

```
Histórico
┌────────────────────────────────┐
│ ● 10/09   Metrô        R$ 7,90 │ ›
│ ● 10/09   Uber        R$ 45,60 │ ›
│ ● 05/08   Lazer       R$ 18,00 │ ›
└────────────────────────────────┘
```

- Ordem já vem do repositório: mais recente primeiro.
- Ponto colorido da categoria, coerente com os cards do PRD-04.
- Altura de linha ≥ 56 px (RNF-03).
- Mês vazio: reaproveita a mensagem existente, sem lista.
- Linha pendente (otimista) entra com opacidade reduzida.

### 7.2. Edição

Toque na linha abre `src/components/historico/EdicaoGasto.jsx`, uma folha que sobe do rodapé — mais perto do polegar que um diálogo centralizado.

- Campo de valor pré-preenchido com o valor atual **formatado com vírgula**, para o usuário não ter que reinterpretar o próprio número.
- Os três botões de categoria, com a atual destacada.
- **Salvar** desabilitado enquanto `parseValor` devolver `null` ou nada tiver mudado.
- **Excluir** em vermelho, separado dos demais controles.
- Fechar por gesto de toque fora, botão de cancelar e tecla Esc.

### 7.3. Confirmação de exclusão

Exclusão é irreversível — não há política que traga a linha de volta. Um segundo toque explícito, com o valor e a categoria no texto:

> Excluir R$ 45,60 em Uber? Não dá para desfazer.

## 8. Critérios de aceite

**Banco**

- [x] `update` autenticado de `valor` e `categoria` na própria linha funciona. *(verificado no device)*
- [ ] `update` de `data` é **recusado** (privilégio de coluna). *(pendente: o app não oferece essa alteração, então só a consulta a `information_schema.column_privileges` confirma)*
- [ ] `update` tentando trocar o `user_id` é **recusado**.
- [ ] `updated_at` é preenchido no update e permanece nulo em linha nunca editada. *(pendente: sem interface que exiba a coluna, exige consulta no SQL Editor)*
- [x] `delete` autenticado da própria linha funciona. *(verificado no device)*
- [x] `update` e `delete` com anon key, sem sessão, seguem **recusados**. *(update: 42501 no privilégio; delete: barrado pelo RLS)*
- [ ] Depois do `005`, o `delete` anônimo falha com `42501` explícito em vez de devolver lista vazia. *(o `005` ainda não foi executado)*

**Interface**

- [x] A lista mostra os lançamentos do mês selecionado, mais recente primeiro.
- [x] Trocar de mês troca a lista.
- [x] Editar o valor atualiza o total do mês e o subtotal da categoria na hora.
- [x] Mudar a categoria move o valor entre os subtotais, sem alterar o total.
- [x] Excluir remove a linha e reduz os totais imediatamente.
- [x] Falha de rede na edição desfaz a mudança na tela e avisa. *(teste do hook + teste da folha de edição; não exercitado contra rede real)*
- [x] Falha de rede na exclusão traz a linha de volta, na posição original. *(teste do hook)*
- [x] Excluir pede confirmação nomeando valor e categoria.
- [x] O campo de edição abre com o valor formatado em vírgula.
- [x] Salvar fica desabilitado com valor inválido ou sem alteração.
- [x] Mês sem lançamentos não mostra lista nem quebra.

## 9. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Cliente alterar `data` e mover gasto de mês | Totais mensais errados, em silêncio | `grant` por coluna + gatilho que restaura o valor antigo |
| Exclusão acidental | Perda de dado sem volta | Confirmação nomeando valor e categoria |
| Rollback incompleto em falha de rede | Tela divergindo do banco | Estado otimista com reversão, coberto por teste |
| Lista longa em mês cheio | Rolagem infinita na tela de lançamento | Aceito na V2.1: um mês pessoal raramente passa de algumas dezenas. Paginar se incomodar |
| Reintroduzir `grant update` amplo numa migração futura | Colunas protegidas voltam a ser graváveis | O gatilho segura mesmo assim |
| Política de delete criada larga demais no futuro (`to public`) | Exclusão anônima passaria pelo RLS | `005`: `anon` não tem mais o privilégio de delete — a camada de baixo segura |

## 10. Backlog derivado

- **Editar a data** de um lançamento. Fica fora agora porque a data automática é premissa do PRD-00 §3, e permitir mudança pede uma regra clara sobre o que acontece com os totais dos dois meses envolvidos.
- **Desfazer exclusão** por alguns segundos, via toast. Mais amigável que a confirmação, mas exige guardar a linha apagada e reinseri-la com outro `id`.
- **Marcar visualmente lançamentos editados**, usando `updated_at` — a coluna já nasce preenchida por este PRD.
