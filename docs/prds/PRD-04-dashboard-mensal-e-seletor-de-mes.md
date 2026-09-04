# PRD-04 — Dashboard Mensal e Seletor de Mês

**Épico:** Feature principal
**Depende de:** PRD-01, PRD-02
**Bloqueia:** PRD-05, PRD-06
**Estimativa:** 1,5 dia

---

## 1. Objetivo

Mostrar, no topo da tela e sem nenhuma interação, quanto foi gasto no mês selecionado — total e quebra por categoria — e permitir alternar entre meses para consultar o histórico.

## 2. Requisitos de origem

> *Filtro e Seleção de Mês:* o usuário deve poder alternar entre diferentes meses para consultar o histórico financeiro retroativo ou atual.
> *Dashboard de Resumo Mensal:* exibição do valor total gasto no mês selecionado e o subtotal detalhado de cada categoria (Uber, Lazer e Metrô).
> *Seção de Resumo Mensal (Topo):* um seletor de mês/ano (por padrão, exibe o mês corrente); um card principal destacando o Gasto Total do Mês; três cards menores exibindo individualmente os gastos acumulados em Uber, Lazer e Metrô no período selecionado.

## 3. Layout

```
┌──────────────────────────────────────┐
│  ‹   setembro de 2026   ›            │  seletor
├──────────────────────────────────────┤
│                                      │
│   Total do mês                       │  card principal
│   R$ 1.284,50                        │
│   12 lançamentos                     │
│                                      │
├───────────┬───────────┬──────────────┤
│   Uber    │   Lazer   │    Metrô     │  três cards
│ R$ 890,00 │ R$ 320,00 │   R$ 74,50   │
│    69%    │    25%    │      6%      │
└───────────┴───────────┴──────────────┘
```

O dashboard ocupa a metade superior da tela; o cadastro rápido (PRD-03), a inferior — mais perto do polegar, porque é a ação executada dezenas de vezes por mês, enquanto o dashboard é lido.

## 4. Escopo

### Dentro

- Seletor de mês/ano com navegação anterior/próximo, iniciando no mês corrente.
- Card de total do mês, com contagem de lançamentos.
- Três cards de categoria com valor e percentual do total.
- Estados de carregamento (skeleton), vazio e erro.
- Recálculo imediato após novo lançamento (PRD-03).

### Fora

- Gráficos (pizza, barras, linha de tendência).
- Comparação entre meses, médias, projeções.
- Lista detalhada de lançamentos (avaliar em V3 — ver §9).
- Filtro por categoria ou por intervalo customizado.

## 5. Regra de agrupamento mensal

Um mês é o intervalo `[primeiro dia, último dia]` em **data local**, aplicado sobre a coluna `data` — não sobre `created_at`.

- A consulta usa `gte(data, inicio)` e `lte(data, fim)`, com as strings produzidas por `intervaloDoMes` (PRD-02 §5.2).
- Fevereiro bissexto sai correto porque `new Date(ano, mes, 0).getDate()` calcula o último dia real.
- Um gasto de 31/01 às 22h **não** pode aparecer em fevereiro. Esse é o caso de teste que pega o bug de fuso.

## 6. Implementação

### 6.1. Estado do período

`src/hooks/usePeriodo.js`:

```js
import { useCallback, useState } from 'react';

export function usePeriodo() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1-12

  const mover = useCallback((delta) => {
    setMes((m) => {
      const total = m - 1 + delta;
      setAno((a) => a + Math.floor(total / 12));
      return ((total % 12) + 12) % 12 + 1;
    });
  }, []);

  const irParaHoje = useCallback(() => {
    const d = new Date();
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  }, []);

  return { ano, mes, anterior: () => mover(-1), proximo: () => mover(1), irParaHoje };
}
```

> A travessia de ano é a armadilha aqui: dezembro → janeiro precisa incrementar o ano. O `Math.floor` com módulo positivo cobre os dois sentidos.

### 6.2. Seletor de mês

`src/components/dashboard/SeletorMes.jsx`:

```jsx
import { nomeDoMes } from '../../lib/format';

export default function SeletorMes({ ano, mes, onAnterior, onProximo, onHoje }) {
  const agora = new Date();
  const ehMesCorrente = ano === agora.getFullYear() && mes === agora.getMonth() + 1;

  return (
    <div className="flex items-center justify-between">
      <button onClick={onAnterior} aria-label="Mês anterior"
        className="w-12 h-12 rounded-full bg-slate-900 active:scale-95">‹</button>

      <button onClick={onHoje} disabled={ehMesCorrente}
        className="text-lg font-medium capitalize disabled:opacity-100">
        {nomeDoMes(ano, mes)}
      </button>

      <button onClick={onProximo} disabled={ehMesCorrente}
        aria-label="Próximo mês"
        className="w-12 h-12 rounded-full bg-slate-900 active:scale-95
                   disabled:opacity-30">›</button>
    </div>
  );
}
```

Navegar para o futuro fica bloqueado: não há gasto lançado adiante, e uma tela zerada sem explicação parece defeito. Tocar no nome do mês volta ao mês corrente.

### 6.3. Cards de resumo

`src/components/dashboard/ResumoMensal.jsx`:

```jsx
import { CATEGORIAS } from '../../constants/categorias';
import { formatarMoeda } from '../../lib/format';

export default function ResumoMensal({ totais, quantidade, carregando }) {
  if (carregando) return <SkeletonResumo />;

  const pct = (v) => (totais.total > 0 ? Math.round((v / totais.total) * 100) : 0);

  return (
    <section aria-label="Resumo do mês" className="flex flex-col gap-3">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <p className="text-sm text-slate-400">Total do mês</p>
        <p className="text-4xl font-bold tabular-nums mt-1">
          {formatarMoeda(totais.total)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {quantidade} {quantidade === 1 ? 'lançamento' : 'lançamentos'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIAS.map((cat) => {
          const v = totais.porCategoria[cat.id] ?? 0;
          return (
            <div key={cat.id}
                 className="rounded-2xl bg-slate-900 border border-slate-800 p-3">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cat.cor}`} />
                <p className="text-xs text-slate-400">{cat.label}</p>
              </div>
              <p className="text-lg font-semibold tabular-nums mt-1">
                {formatarMoeda(v)}
              </p>
              <p className="text-xs text-slate-500">{pct(v)}%</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

`tabular-nums` mantém os dígitos alinhados entre os três cards — sem isso, os valores dançam ao atualizar.

### 6.4. Composição

`src/App.jsx`:

```jsx
import AppShell from './components/layout/AppShell';
import SeletorMes from './components/dashboard/SeletorMes';
import ResumoMensal from './components/dashboard/ResumoMensal';
import CadastroRapido from './components/lancamento/CadastroRapido';
import { usePeriodo } from './hooks/usePeriodo';
import { useGastos } from './hooks/useGastos';
import { useState } from 'react';

export default function App() {
  const { ano, mes, anterior, proximo, irParaHoje } = usePeriodo();
  const { gastos, totais, carregando, erro, adicionar, recarregar } = useGastos(ano, mes);
  const [toast, setToast] = useState(null);

  return (
    <AppShell>
      <SeletorMes ano={ano} mes={mes}
        onAnterior={anterior} onProximo={proximo} onHoje={irParaHoje} />

      {erro
        ? <ErroCarregamento onTentarNovamente={recarregar} />
        : <ResumoMensal totais={totais} quantidade={gastos.length}
                        carregando={carregando} />}

      <CadastroRapido adicionar={adicionar} onToast={setToast} />
      {toast && <Toast {...toast} onFechar={() => setToast(null)} />}
    </AppShell>
  );
}
```

## 7. Estados da interface

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton com a mesma altura dos cards reais — sem salto de layout |
| Vazio (mês sem gastos) | Cards exibem `R$ 0,00` e `0%`; abaixo, texto discreto "Nenhum gasto neste mês" |
| Erro de rede | Mensagem clara + botão "Tentar novamente" chamando `recarregar` |
| Mês corrente | Botão "próximo" desabilitado; nome do mês não clicável |

## 8. Critérios de aceite

- [ ] Ao abrir, o seletor mostra o mês corrente por extenso, em português.
- [ ] O card principal exibe o total do mês formatado como `R$ 1.234,56`.
- [ ] Os três cards exibem os subtotais de Uber, Lazer e Metrô do período selecionado.
- [ ] A soma dos três subtotais é exatamente igual ao total exibido.
- [ ] Os percentuais somam 100% (ou 0% quando não há gastos).
- [ ] Tocar em "‹" volta um mês e os valores mudam para o período correto.
- [ ] Em janeiro, "‹" leva a dezembro do **ano anterior**.
- [ ] Em dezembro, "›" leva a janeiro do **ano seguinte** — quando não for mês futuro.
- [ ] O botão "próximo" está desabilitado no mês corrente.
- [ ] Um gasto de 31/01 aparece em janeiro e **não** em fevereiro.
- [ ] Fevereiro de ano bissexto inclui o dia 29.
- [ ] Salvar um novo gasto (PRD-03) atualiza total e subtotal na hora, sem recarregar.
- [ ] Salvar um gasto enquanto um mês passado está selecionado **não** altera os totais exibidos.
- [ ] Mês sem lançamentos mostra `R$ 0,00` e a mensagem de vazio, sem erro.
- [ ] Valores com centavos somam corretamente: `0,10 + 0,20 = R$ 0,30` (e não `0,30000000000000004`).

## 9. Backlog derivado (V3)

- Lista de lançamentos do mês, abaixo dos cards, com data e valor.
- Comparativo com o mês anterior (seta de variação percentual).
- Gráfico de barras de gastos por dia.

## 10. Entregáveis

- `src/hooks/usePeriodo.js`.
- `src/components/dashboard/{SeletorMes,ResumoMensal,SkeletonResumo,ErroCarregamento}.jsx`.
- `App.jsx` compondo dashboard + cadastro.
