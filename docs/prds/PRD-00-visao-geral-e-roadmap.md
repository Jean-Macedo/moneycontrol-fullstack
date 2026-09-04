# PRD-00 — Visão Geral e Roadmap de Execução

**Produto:** App de Gestão de Gastos Diários (Mobile PWA)
**Origem:** Especificação Técnica — App de Gestão de Gastos Pessoais V2
**Versão:** 1.0
**Status:** Aprovado para execução

---

## 1. Contexto e problema

Registrar um gasto cotidiano hoje custa mais atrito do que o próprio gasto: abrir planilha, achar linha, digitar data, categoria, valor. Isso faz o registro simplesmente não acontecer. O produto existe para reduzir o lançamento de uma despesa a **dois toques e um número**.

## 2. Objetivo do produto

Um aplicativo web progressivo (PWA) mobile-first que permite:

1. Lançar uma despesa informando **apenas o valor** e tocando na **categoria**.
2. Ver, na mesma tela, o **total do mês** e o **subtotal por categoria**.
3. Navegar entre meses para consultar histórico.
4. Ser instalado na tela inicial do celular e comportar-se como app nativo.

## 3. Escopo fixo (V2)

- Categorias **fixas e fechadas**: `Uber`, `Lazer`, `Metrô`. Não há CRUD de categorias.
- Data preenchida **automaticamente** no momento do lançamento.
- Persistência **em nuvem** (Supabase/PostgreSQL) para sincronizar entre dispositivos.

### Fora de escopo na V2

- Login social, múltiplos usuários com perfis, compartilhamento.
- Edição/exclusão de lançamentos passados (avaliar em V3 — ver PRD-03 §Backlog).
- Orçamentos, metas, alertas, gráficos de série temporal.
- Exportação para CSV/Excel, anexos de comprovante, câmera/OCR.
- Multi-moeda, conversão cambial.

## 4. Tech stack (definida na especificação, não renegociável)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React + Tailwind CSS | Interfaces reativas e responsivas com estilização utilitária |
| Build / Deploy | Vite + Vercel | Empacotamento otimizado, hospedagem gratuita, entrega contínua |
| Backend & Banco | Supabase (PostgreSQL) | Banco relacional em nuvem com APIs prontas de inserção e consulta |

## 5. Decomposição em PRDs

| # | PRD | Entrega | Depende de |
|---|---|---|---|
| 01 | Fundação do projeto e pipeline de deploy | Repositório rodando local + URL pública na Vercel | — |
| 02 | Supabase: schema, segurança e camada de dados | Tabela `gastos` + funções de leitura/escrita testadas | 01 |
| 03 | Cadastro rápido de gastos | Fluxo valor → categoria → salvo, com validação | 01, 02 |
| 04 | Dashboard mensal e seletor de mês | Total e subtotais corretos por período | 01, 02 |
| 05 | PWA: instalação, offline e identidade visual | App instalável em tela cheia | 01, 03, 04 |
| 06 | Plano de testes e QA de aceite | Suíte automatizada + roteiro manual em device real | 03, 04, 05 |

### Ordem de execução recomendada

```
PRD-01 ──> PRD-02 ──┬──> PRD-03 ──┐
                    └──> PRD-04 ──┴──> PRD-05 ──> PRD-06
```

PRD-03 e PRD-04 podem ser executados em paralelo assim que PRD-02 estiver concluído, desde que ambos consumam a mesma camada de dados definida em PRD-02 §5.

## 6. Requisitos não funcionais globais

Aplicam-se a **todos** os PRDs; cada um os detalha no seu contexto.

| ID | Requisito | Métrica de aceite |
|---|---|---|
| RNF-01 | Desempenho e agilidade | First Contentful Paint < 1,5 s em 4G simulada; bundle JS inicial < 200 KB gzip |
| RNF-02 | Persistência em nuvem | Nenhum dado vive apenas no dispositivo; abrir em outro aparelho mostra os mesmos lançamentos |
| RNF-03 | Usabilidade mobile-first | Alvos de toque ≥ 56 px de altura; fluxo de lançamento operável com o polegar de uma mão só |
| RNF-04 | Resiliência de entrada | Nenhuma entrada do usuário pode quebrar a aplicação ou gravar valor corrompido |
| RNF-05 | Acessibilidade básica | Contraste AA, `aria-label` em todos os botões de ícone, foco visível |

## 7. Definição de Pronto (global)

Um PRD só é considerado concluído quando:

- [ ] Todos os critérios de aceite do próprio PRD estão verificados.
- [ ] O código está na branch principal e o deploy automático na Vercel passou.
- [ ] Nenhum erro no console do navegador em uso normal.
- [ ] Testado em um dispositivo móvel real, não só no emulador do DevTools.
- [ ] `npm run build` conclui sem warnings novos.

## 8. Convenções compartilhadas

- **Moeda:** BRL. Exibição sempre `R$ 1.234,56` via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Armazenamento de valor:** `numeric(12,2)` no banco; em JS trafega como `number` já normalizado (ponto decimal).
- **Fuso horário:** `America/Sao_Paulo`. O agrupamento mensal usa a data **local**, nunca UTC crua — ver PRD-02 §4 e PRD-04 §5.
- **Idioma da interface:** português do Brasil.
- **Nomenclatura:** componentes em `PascalCase`, hooks em `camelCase` com prefixo `use`, colunas do banco em `snake_case`.

## 9. Riscos conhecidos

| Risco | Impacto | Mitigação | PRD |
|---|---|---|---|
| Deslocamento de fuso faz gasto do dia 1 cair no mês anterior | Totais mensais errados | Armazenar `data` como `date` local e filtrar por intervalo local | 02, 04 |
| Chave anônima do Supabase exposta no bundle | Escrita/leitura indevida | RLS obrigatório; anon key só com as políticas mínimas | 02 |
| Service worker servindo bundle velho após deploy | Usuário vê versão antiga | `autoUpdate` + prompt de recarregar | 05 |
| Vírgula decimal do teclado brasileiro | Valor salvo errado (12,50 → 1250) | Normalização única e centralizada, com testes | 03 |

---

*Cada PRD subsequente é autocontido: pode ser entregue a um executor sem contexto adicional além deste documento.*
