# Execução dos Roteiros de QA

**Projeto:** Meus Gastos — PWA de gestão de gastos diários
**Referência:** PRD-06 — Plano de Testes e QA de Aceite
**Última atualização:** 10/09/2026

---

## 1. Ambiente de execução

| Item | Valor |
|---|---|
| Device físico | **Android, Chrome** — device de referência do projeto (PRD-00 §8) |
| iOS | **Indisponível.** Critérios de Safari/iPhone marcados N/A nos PRDs 01, 05 e 06 |
| URL testada | https://moneycontrol-fullstack.vercel.app |
| Banco | Projeto Supabase de produção, região São Paulo |
| Suíte automatizada | Vitest + Testing Library, `npm test` |

> **Desvio do PRD-06 §6:** o roteiro previa um projeto Supabase separado para os testes de integração. Foi executado contra a base real, porque não há um segundo projeto provisionado. As consequências estão registradas em §4.3.

## 2. Suíte automatizada

```
npm test    →  16 arquivos, 151 testes, todos passando
npm run lint →  oxlint, sem apontamentos
npm run build →  sem warnings
```

**Cobertura** (`vitest run --coverage`):

| Métrica | Valor |
|---|---|
| Statements | 92,2% |
| Branches | 78,0% |
| Functions | 88,2% |
| Lines | 95,1% |

`src/lib` — o núcleo de regra de negócio — está em 98,8%.

Pontos deliberadamente descobertos: `main.jsx` (entrada da aplicação) e o ramo de "há atualização pendente" de `AvisoAtualizacao`, que depende do módulo virtual do service worker, substituído por stub nos testes.

## 3. Teste 1 — Validação de entrada (PRD-06 §4)

**Automatizado.** `src/lib/__tests__/parseValor.test.js` — 25 casos.

Cobre os 21 casos da tabela do PRD-06 §4 mais bordas que o roteiro não previa:

| Caso extra | Motivo |
|---|---|
| `1000000` aceito, `1000000,01` recusado | O teto exato do `CHECK` do banco |
| `0,004` recusado | Arredonda para zero, que o banco proíbe |
| `23,90,50` recusado | Vírgulas múltiplas |
| `1.500` = 1500 vs `1.50` = 1,50 | O coração da ambiguidade ponto/vírgula |

**Componente:** `CadastroRapido.test.jsx` verifica que os botões ficam desabilitados com entrada inválida e que o valor digitado **permanece no campo** quando o salvamento falha.

**Resultado: aprovado.** Nenhuma entrada derruba a aplicação; nenhum valor inválido chega ao banco.

### Validação em teclado real

Em 10/09/2026, lançamentos feitos no Gboard pt-BR chegaram ao banco como `45,60` e `7,90`, com os centavos intactos. É a evidência que fecha o risco do PRD-00 §9 — a vírgula do teclado brasileiro não vira `4560`. Prova de ponta a ponta, não mock.

## 4. Teste 2 — Agrupamento e filtro mensal (PRD-06 §5)

**Automatizado.** `format.test.js`, `usePeriodo.test.js`, `useGastos.test.js`.

| Critério do roteiro | Resultado |
|---|---|
| Totais batem com o seed | ✅ agosto/2026 = R$ 54,90 em 3 lançamentos |
| 31/08 em agosto, não em setembro | ✅ verificado contra o banco real |
| 01/09 em setembro, não em agosto | ✅ |
| Soma dos subtotais = total | ✅ garantido por soma em centavos inteiros |
| Centavos sem dízima de ponto flutuante | ✅ `0,10 + 0,20 = R$ 0,30` |
| Mês vazio exibe R$ 0,00 sem erro | ✅ |

**Além do roteiro:** travessia de ano nos dois sentidos sob `StrictMode`, e a corrida em que a resposta lenta de um mês abandonado tentaria sobrescrever o mês em exibição.

**Manual:** troca de mês verificada no device em 10/09/2026.

## 5. Teste 3 — Integração com Supabase (PRD-06 §6)

**Executado por requisição direta à API REST e pelo app no device.**

| Passo | Resultado |
|---|---|
| Inserção válida persiste | ✅ |
| UI reflete sem reload | ✅ verificado no device |
| `categoria = 'Comida'` | ✅ recusado — HTTP 400, SQLSTATE 23514 |
| `valor = 0` e `valor = -10` | ✅ recusados |
| `valor` acima do teto | ✅ recusado |
| `update` anônimo | ✅ recusado — 42501 |
| `delete` anônimo | ✅ recusado — 42501 (após a migração 005) |
| Data automática no fuso de São Paulo | ✅ gravou a data local correta |
| Persistência entre dispositivos | ✅ mesmos lançamentos no navegador e no app instalado |

**Não medido:** o tempo de resposta do passo 3 do roteiro (meta de 800 ms). As requisições foram concluídas sem lentidão perceptível, mas o número não foi registrado.

### 5.1. Modelo de acesso, após PRD-07 e PRD-08

Verificado por requisição com a anon key e **sem sessão**:

- `select` devolve lista vazia — antes da migração, a mesma chamada devolvia os 8 lançamentos
- `insert`, `update` e `delete` recusados

Privilégios de coluna conferidos em `information_schema`: o papel `authenticated` só pode atualizar **`valor` e `categoria`**. `data`, `user_id`, `created_at` e `id` não são graváveis, o que impede mover um lançamento de mês em silêncio.

Gatilho de `updated_at` conferido: dos 9 lançamentos, exatamente os 2 corrigidos pelo app têm a coluna preenchida.

## 6. Teste 4 — PWA e mobile (PRD-06 §7)

**Executado em device físico Android/Chrome, 10/09/2026.**

| Passo | Resultado |
|---|---|
| 1. Instalar pelo Chrome | ✅ |
| 2. Abrir pelo ícone em tela cheia, com splash | ✅ |
| 3-4. iOS | N/A — sem device |
| 5. Três lançamentos com uma mão | ✅ |
| 6. Teclado numérico abre com o campo focado | ✅ |
| 7. Teclado não cobre os botões | ✅ |
| 8. Vibração ao salvar | ✅ |
| 9. Faixa "Sem conexão" em modo avião | ✅ |
| 10. Erro claro ao salvar offline, sem falso sucesso | ✅ |
| 11. App abre offline, a partir do shell em cache | ✅ |
| 12. Faixa some e lançamento salva ao voltar a rede | ✅ |
| 13-14. Aviso de nova versão | ✅ |
| 15. Lighthouse | ⏳ **pendente** — ver §8 |

Também verificado: sem rolagem horizontal em 320 px, e safe-area respeitada em modo standalone com a barra de gestos do Android.

## 7. Matriz de cobertura — requisito da especificação × verificação

| Requisito | Onde foi verificado | Estado |
|---|---|---|
| Registro rápido de gastos | §3, §6 (passo 5) | ✅ |
| Categorização fixa | §3, §5 (teste negativo no banco) | ✅ |
| Captura automática de data | §5 | ✅ |
| Filtro e seleção de mês | §4 | ✅ |
| Dashboard de resumo mensal | §4 | ✅ |
| Instalação PWA | §6 (passos 1-2) | ✅ |
| Desempenho e agilidade | §8 | ⏳ falta o Lighthouse |
| Persistência em nuvem | §5 | ✅ |
| Usabilidade mobile-first | §6 (passos 5-8) | ✅ |

**Fora da especificação original, entregues depois:** autenticação por dono (PRD-07) e edição/exclusão de lançamentos (PRD-08). Ambos nasceram de necessidade identificada em uso, não do documento inicial.

## 8. Pendências

| Item | Por quê | Como resolver |
|---|---|---|
| Auditoria Lighthouse | A API do PageSpeed exige chave; a cota anônima está esgotada | Rodar em https://pagespeed.web.dev/ com a URL de produção, ou pelo DevTools do Chrome |
| Tempo de resposta da inserção | Não foi cronometrado | Aba Network do DevTools, salvando um lançamento |
| Gasto às 22h30 do dia 31 | Exige a virada real do mês | Lançar algo tarde da noite em 30/09 e conferir a data gravada |
| Três dias de uso real (PRD-06 §9) | O app entrou em uso em 10/09/2026 | Reavaliar a partir de 13/09/2026 |

## 9. Conclusão

Dos quatro roteiros do PRD-06, **três estão integralmente executados e aprovados**. O quarto depende apenas da auditoria Lighthouse, que exige uma ferramenta externa.

Nenhum defeito funcional foi encontrado nos roteiros. Os problemas descobertos durante o desenvolvimento — e corrigidos — estão registrados nos PRDs correspondentes:

- URL do Supabase com o caminho REST embutido, que deixava o app em branco (PRD-02 §4)
- Variáveis de ambiente do tipo Secret não chegando ao build da Vercel (PRD-05)
- `usePeriodo` pulando dois anos sob `StrictMode` (PRD-04)
- Percentuais somando 99% em vez de 100% (PRD-04)
- Totais divergindo por um centavo com soma em ponto flutuante (PRD-04)
