# PRD-06 — Plano de Testes e QA de Aceite

**Épico:** Qualidade
**Depende de:** PRD-03, PRD-04, PRD-05
**Bloqueia:** —
**Estimativa:** 1 dia

---

## 1. Objetivo

Executar os quatro tipos de teste previstos na especificação, automatizando o que é automatizável e deixando um roteiro manual reprodutível para o que exige device real.

## 2. Origem — plano de testes essenciais da especificação

| Tipo de teste | Foco / cenário principal | Objetivo |
|---|---|---|
| Validação de Entrada | Inserir valores com vírgula, ponto, letras ou campos vazios no campo de preço | Garantir que o sistema trate corretamente os dados numéricos sem quebrar a aplicação ou salvar valores corrompidos |
| Agrupamento e Filtro Mensal | Cadastrar lançamentos em meses diferentes e alternar o seletor de meses no dashboard | Verificar se o cálculo do total mensal e o subtotal por categoria refletem exatamente o período filtrado |
| Integração (Supabase) | Salvar um gasto novo e verificar a persistência imediata na tabela do banco e a atualização do estado na UI | Assegurar a comunicação correta entre o frontend React e o banco na nuvem, medindo a velocidade de resposta |
| Comportamento PWA / Mobile | Acessar via dispositivo móvel, acionar o modo offline e testar a usabilidade com uma mão nos botões | Garantir que o layout é responsivo, os botões têm tamanho adequado para toque e que o app instala corretamente na tela inicial |

## 3. Ferramentas

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`vite.config.js` — bloco de teste:

```js
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.js',
},
```

E2E fica fora do escopo da V2: para uma tela só, o custo de manter Playwright supera o ganho sobre testes de componente + roteiro manual.

---

## 4. Teste 1 — Validação de entrada

**Alvo:** `parseValor` (PRD-03 §5) e o estado de habilitação dos botões.

`src/lib/parseValor.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseValor } from './parseValor';

describe('parseValor', () => {
  it.each([
    ['23,90',    23.9,   'vírgula decimal'],
    ['23.90',    23.9,   'ponto decimal'],
    ['1.234,56', 1234.56,'milhar + decimal'],
    ['1.234',    1234,   'ponto de milhar'],
    ['R$ 15,00', 15,     'prefixo de moeda'],
    ['  8  ',    8,      'espaços'],
    ['23,905',   23.91,  'arredondamento a 2 casas'],
    ['0,01',     0.01,   'menor valor válido'],
  ])('aceita %s -> %s (%s)', (entrada, esperado) => {
    expect(parseValor(entrada)).toBe(esperado);
  });

  it.each([
    ['',        'vazio'],
    ['   ',     'só espaços'],
    ['abc',     'letras'],
    ['12abc',   'misto'],
    ['0',       'zero'],
    ['0,00',    'zero com centavos'],
    ['-5',      'negativo'],
    [',',       'só vírgula'],
    ['.',       'só ponto'],
    ['1e5',     'notação científica'],
    ['9999999', 'acima do teto'],
    [null,      'null'],
    [undefined, 'undefined'],
  ])('rejeita %s (%s)', (entrada) => {
    expect(parseValor(entrada)).toBeNull();
  });
});
```

**Teste de componente:**

```js
it('mantém os botões desabilitados com valor inválido', async () => {
  render(<CadastroRapido adicionar={vi.fn()} onToast={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/valor do gasto/i), 'abc');
  for (const cat of ['Uber', 'Lazer', 'Metrô']) {
    expect(screen.getByRole('button', { name: new RegExp(cat) })).toBeDisabled();
  }
});

it('não perde o valor digitado quando o salvamento falha', async () => {
  const adicionar = vi.fn().mockRejectedValue(new Error('rede'));
  render(<CadastroRapido adicionar={adicionar} onToast={vi.fn()} />);
  const campo = screen.getByLabelText(/valor do gasto/i);
  await userEvent.type(campo, '20,00');
  await userEvent.click(screen.getByRole('button', { name: /Uber/ }));
  expect(campo).toHaveValue('20,00');
});
```

**Aprovado quando:** nenhuma entrada da tabela derruba a aplicação; nenhum valor inválido chega ao banco; o campo preserva o conteúdo em caso de erro.

---

## 5. Teste 2 — Agrupamento e filtro mensal

**Alvo:** `intervaloDoMes`, `usePeriodo`, e o cálculo de totais.

```js
import { intervaloDoMes } from '../lib/format';

describe('intervaloDoMes', () => {
  it('janeiro', () => expect(intervaloDoMes(2026, 1))
    .toEqual({ inicio: '2026-01-01', fim: '2026-01-31' }));

  it('fevereiro bissexto', () => expect(intervaloDoMes(2024, 2))
    .toEqual({ inicio: '2024-02-01', fim: '2024-02-29' }));

  it('fevereiro comum', () => expect(intervaloDoMes(2026, 2))
    .toEqual({ inicio: '2026-02-01', fim: '2026-02-28' }));

  it('dezembro', () => expect(intervaloDoMes(2026, 12))
    .toEqual({ inicio: '2026-12-01', fim: '2026-12-31' }));
});

describe('usePeriodo', () => {
  it('de janeiro recua para dezembro do ano anterior', () => {
    // partindo de 2026-01, anterior() -> { ano: 2025, mes: 12 }
  });
  it('de dezembro avança para janeiro do ano seguinte', () => {
    // partindo de 2025-12, proximo() -> { ano: 2026, mes: 1 }
  });
});
```

**Cenário de dados (seed do PRD-02 §7):**

| Data | Categoria | Valor |
|---|---|---|
| 2026-08-05 | Uber | 31,50 |
| 2026-08-19 | Lazer | 18,00 |
| 2026-08-31 | Metrô | 5,40 |
| 2026-09-01 | Uber | 12,00 |

Esperado em agosto/2026: total `R$ 54,90` — Uber `31,50`, Lazer `18,00`, Metrô `5,40`.
Esperado em setembro/2026: total `R$ 12,00` — Uber `12,00`, demais `0,00`.

**Aprovado quando:**

- [ ] Os totais de cada mês batem exatamente com a tabela acima.
- [ ] O lançamento de 31/08 aparece em agosto e **não** em setembro.
- [ ] O lançamento de 01/09 aparece em setembro e **não** em agosto.
- [ ] A soma dos três subtotais é igual ao total, em todos os meses testados.
- [ ] Somar centavos não produz dízima de ponto flutuante na exibição.
- [ ] Mês sem lançamentos exibe `R$ 0,00`, sem erro.

---

## 6. Teste 3 — Integração com Supabase

Executado contra um projeto Supabase de teste (ou schema separado), nunca contra a base de uso real.

**Roteiro:**

1. Com a aba Network aberta, salvar `R$ 42,00` em Lazer.
2. Confirmar o `POST` para `/rest/v1/gastos` com status `201`.
3. Medir o tempo de resposta — registrar o valor.
4. Conferir no Table Editor do Supabase que a linha existe, com `data` = hoje e `created_at` preenchido.
5. Confirmar que o card de Lazer e o total subiram `R$ 42,00` **sem** recarregar a página.
6. Recarregar a página (F5) e confirmar que o valor persiste.
7. Abrir a URL em outro dispositivo e confirmar que o mesmo lançamento aparece (RNF-02).

**Testes negativos, via SQL Editor com a anon key:**

```sql
insert into gastos (valor, categoria) values (10, 'Comida');  -- deve falhar
insert into gastos (valor, categoria) values (-1, 'Uber');    -- deve falhar
insert into gastos (valor, categoria) values (0,  'Uber');    -- deve falhar
delete from gastos where id = '<algum-id>';                   -- deve ser negado
update gastos set valor = 999 where id = '<algum-id>';        -- deve ser negado
```

**Aprovado quando:**

- [ ] Inserção válida retorna 201 em menos de 800 ms em conexão normal.
- [ ] A UI reflete a inserção sem reload.
- [ ] Os cinco comandos negativos falham como esperado.
- [ ] Perda de rede durante o salvamento exibe toast de erro e não deixa registro fantasma na tela.
- [ ] Nenhum erro não tratado no console.

---

## 7. Teste 4 — PWA e mobile

Executado em **device físico** — Android e iOS, se disponíveis. O emulador do DevTools não reproduz teclado, área de toque real nem instalação.

**Roteiro de instalação:**

1. Abrir a URL de produção no Chrome Android → "Instalar app" → confirmar ícone na gaveta.
2. Abrir pelo ícone → confirmar tela cheia, sem barra de URL, com splash screen.
3. Abrir a URL no Safari iOS → Compartilhar → "Adicionar à Tela de Início" → confirmar ícone e nome "Gastos".
4. Abrir pelo ícone no iOS → confirmar tela cheia e respeito à safe-area (notch).

**Roteiro de uso com uma mão:**

5. Segurar o aparelho com uma mão só; lançar três gastos seguidos (um por categoria) usando apenas o polegar. Cronometrar. **Alvo: menos de 20 segundos para os três.**
6. Confirmar que o teclado numérico abre automaticamente com o campo já focado.
7. Confirmar que o teclado não cobre os botões de categoria.
8. Confirmar a vibração curta ao salvar (Android).

**Roteiro offline:**

9. Ativar o modo avião com o app aberto → confirmar a faixa "Sem conexão".
10. Tentar salvar → confirmar mensagem de erro clara, sem travamento e sem falso sucesso.
11. Fechar e reabrir o app ainda em modo avião → confirmar que a interface carrega (shell em cache), em vez do erro de página não encontrada do navegador.
12. Desativar o modo avião → confirmar que a faixa some e um novo lançamento salva normalmente.

**Roteiro de atualização:**

13. Publicar uma alteração visível na Vercel.
14. Reabrir o app instalado → confirmar o aviso "Nova versão disponível" e que atualizar carrega a mudança.

**Auditoria automatizada:**

15. Rodar Lighthouse (mobile) na URL de produção. Metas: **Performance ≥ 90**, **Accessibility ≥ 90**, **Best Practices ≥ 90**, **PWA: instalável sem erros**.

**Aprovado quando:**

- [ ] Instala e abre em tela cheia nos dois sistemas testados.
- [ ] Todos os alvos de toque medem ao menos 56 px de altura.
- [ ] Os três lançamentos com uma mão levam menos de 20 s.
- [ ] Nenhuma rolagem horizontal em viewport de 320 px.
- [ ] Comportamento offline conforme os passos 9 a 12.
- [ ] Lighthouse dentro das metas.

---

## 8. Matriz de cobertura — requisito × teste

| Requisito da especificação | Onde é verificado |
|---|---|
| Registro rápido de gastos | §4, §7 (passo 5) |
| Categorização fixa | §4 (componente), §6 (teste negativo no banco) |
| Captura automática de data | §6 (passo 4) |
| Filtro e seleção de mês | §5 |
| Dashboard de resumo mensal | §5 |
| Instalação PWA | §7 (passos 1 a 4) |
| Desempenho e agilidade | §6 (passo 3), §7 (passo 15) |
| Persistência de dados em nuvem | §6 (passos 6 e 7) |
| Usabilidade mobile-first | §7 (passos 5 a 8) |

## 9. Critério de liberação

A V2 está pronta para uso quando:

- [ ] `npm test` passa integralmente.
- [ ] Os quatro roteiros dos §4 a §7 foram executados e registrados.
- [ ] Nenhum item de aceite dos PRDs 01 a 05 está pendente.
- [ ] O app rodou por três dias de uso real sem lançamento perdido ou valor incorreto.

## 10. Entregáveis

- `src/lib/parseValor.test.js`, `src/lib/format.test.js`, `src/hooks/usePeriodo.test.js`.
- Testes de componente de `CadastroRapido` e `ResumoMensal`.
- Documento de execução dos roteiros manuais, com resultado e device usado.
- Relatório Lighthouse.
