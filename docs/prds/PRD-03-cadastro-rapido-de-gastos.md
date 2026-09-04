# PRD-03 — Cadastro Rápido de Gastos

**Épico:** Feature principal
**Depende de:** PRD-01, PRD-02
**Bloqueia:** PRD-05, PRD-06
**Estimativa:** 1,5 dia

---

## 1. Objetivo

Entregar o fluxo que justifica o produto: **digitar o valor e tocar na categoria salva o gasto instantaneamente**. Nenhum campo a mais, nenhuma tela intermediária, nenhuma confirmação obrigatória.

## 2. Requisito de origem

> *Registro Rápido de Gastos:* o usuário deve conseguir inserir uma nova despesa informando apenas o valor e selecionando a categoria correspondente de forma intuitiva.
> *Seção de Cadastro Rápido:* um campo numérico otimizado para o teclado do celular (foco automático no valor) e três botões grandes de categoria (Uber, Lazer, Metrô). O usuário digita o valor e toca no botão da categoria para salvar instantaneamente.

## 3. Fluxo do usuário

```
Abre o app
   └─> cursor já está no campo de valor, teclado numérico aberto
        └─> digita "23,90"
             └─> toca em [ Metrô ]
                  ├─> gasto salvo
                  ├─> dashboard atualiza na hora (total e subtotal de Metrô)
                  ├─> campo limpa e volta a receber foco
                  └─> feedback: vibração curta + toast "R$ 23,90 em Metrô"
```

Tempo alvo do fluxo completo: **menos de 5 segundos**, uma mão só.

## 4. Escopo

### Dentro

- Campo numérico com foco automático e teclado decimal.
- Três botões de categoria em linha, com alvo de toque grande.
- Normalização e validação do valor digitado.
- Persistência via `useGastos().adicionar` (PRD-02).
- Atualização otimista da UI com rollback em caso de erro.
- Feedback: háptico, visual (toast) e estado de carregamento.
- Bloqueio de duplo envio.

### Fora

- Edição e exclusão de lançamentos (não há política de UPDATE/DELETE no banco — ver PRD-02 §4).
- Lançamento com data retroativa.
- Descrição, observação, anexo.
- Categoria fora das três fixas.

## 5. Regras de validação e normalização

O teclado brasileiro produz vírgula. Um usuário apressado produz espaços, `R$`, pontos de milhar. A normalização é **uma função só**, testada, e nenhum outro trecho do código interpreta valor.

`src/lib/parseValor.js`:

```js
/**
 * Converte a entrada crua do usuário em número de reais.
 * Retorna null se a entrada não representar um valor válido.
 *
 * Regra do separador: se houver vírgula, ela é o decimal e pontos são milhar.
 * Se houver só pontos, um único ponto com 1-2 casas finais é decimal;
 * caso contrário, pontos são milhar.
 */
export function parseValor(entrada) {
  if (entrada == null) return null;

  let s = String(entrada).trim().replace(/[R$\s ]/gi, '');
  if (!s) return null;
  if (!/^[\d.,]+$/.test(s)) return null;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const partes = s.split('.');
    if (partes.length > 2) {
      s = partes.join('');                       // 1.234.567 -> milhar
    } else if (partes.length === 2) {
      const dec = partes[1];
      s = dec.length <= 2 ? `${partes[0]}.${dec}` // 12.50 -> decimal
                          : partes.join('');      // 1.234  -> milhar
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  const arredondado = Math.round(n * 100) / 100;
  if (arredondado <= 0) return null;
  if (arredondado > 1000000) return null;        // espelha o CHECK do banco

  return arredondado;
}
```

### Tabela de comportamento esperado

| Entrada | Resultado | Observação |
|---|---|---|
| `23,90` | `23.90` | Vírgula decimal — caso mais comum |
| `23.90` | `23.90` | Ponto decimal |
| `1.234,56` | `1234.56` | Ponto de milhar + vírgula decimal |
| `1.234` | `1234` | Ponto de milhar isolado |
| `R$ 15,00` | `15` | Prefixo removido |
| `  8  ` | `8` | Espaços aparados |
| `23,905` | `23.91` | Arredondado a 2 casas |
| `0` | `null` | Rejeitado — banco exige > 0 |
| `-5` | `null` | Caractere inválido |
| `abc` | `null` | Rejeitado |
| `` (vazio) | `null` | Rejeitado |
| `,` | `null` | Rejeitado |
| `1e5` | `null` | Notação científica não aceita |
| `9999999` | `null` | Acima do teto |

Quando `parseValor` devolve `null`, o botão de categoria permanece **desabilitado**. O usuário não recebe erro — recebe ausência de ação, o que é menos ruidoso e igualmente claro.

## 6. Implementação

### 6.1. Campo de valor

`src/components/lancamento/CampoValor.jsx`:

```jsx
import { forwardRef } from 'react';

const CampoValor = forwardRef(function CampoValor({ valor, onChange }, ref) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500">
        R$
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        placeholder="0,00"
        aria-label="Valor do gasto em reais"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-20 pl-14 pr-4 rounded-2xl bg-slate-900 border border-slate-800
                   text-4xl font-semibold tabular-nums text-right
                   focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );
});

export default CampoValor;
```

Pontos não negociáveis:

- `inputMode="decimal"` — abre o teclado numérico com vírgula no iOS e no Android. **Não usar `type="number"`**: ele bloqueia a vírgula em alguns teclados, exibe setas de incremento no desktop e rejeita silenciosamente entradas intermediárias.
- `type="text"` mantém o controle da máscara e da validação no nosso código.
- Altura de 80 px: alvo de toque confortável e valor legível a distância de braço.

### 6.2. Botões de categoria

`src/components/lancamento/BotoesCategoria.jsx`:

```jsx
import { CATEGORIAS } from '../../constants/categorias';

export default function BotoesCategoria({ onSelecionar, habilitado, salvando }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIAS.map((cat) => (
        <button
          key={cat.id}
          type="button"
          disabled={!habilitado || !!salvando}
          onClick={() => onSelecionar(cat.id)}
          aria-label={`Salvar gasto na categoria ${cat.label}`}
          className={`${cat.cor} ${cat.corTexto} h-24 rounded-2xl font-semibold text-lg
                      transition active:scale-95
                      disabled:opacity-30 disabled:active:scale-100
                      focus:outline-none focus:ring-2 focus:ring-white/60`}
        >
          {salvando === cat.id ? '···' : cat.label}
        </button>
      ))}
    </div>
  );
}
```

### 6.3. Orquestração

`src/components/lancamento/CadastroRapido.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import CampoValor from './CampoValor';
import BotoesCategoria from './BotoesCategoria';
import { parseValor } from '../../lib/parseValor';
import { formatarMoeda } from '../../lib/format';

export default function CadastroRapido({ adicionar, onToast }) {
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const valor = parseValor(texto);

  async function salvar(categoria) {
    if (valor == null || salvando) return;   // guarda contra duplo toque
    setSalvando(categoria);
    try {
      await adicionar({ valor, categoria });
      setTexto('');
      navigator.vibrate?.(30);
      onToast({ tipo: 'ok', msg: `${formatarMoeda(valor)} em ${categoria}` });
    } catch (e) {
      console.error(e);
      onToast({ tipo: 'erro', msg: 'Não foi possível salvar. Tente de novo.' });
    } finally {
      setSalvando(null);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Cadastro rápido de gasto">
      <CampoValor ref={inputRef} valor={texto} onChange={setTexto} />
      <BotoesCategoria
        onSelecionar={salvar}
        habilitado={valor != null}
        salvando={salvando}
      />
    </section>
  );
}
```

### 6.4. Atualização otimista

O `adicionar` do `useGastos` (PRD-02 §5.4) já insere o registro retornado pelo banco no topo da lista, o que faz o dashboard recalcular via `useMemo`. Para percepção de instantaneidade em rede lenta, a variação otimista é aceitável desde que faça rollback:

```js
// dentro de useGastos, versão otimista opcional
const adicionarOtimista = useCallback(async ({ valor, categoria }) => {
  const temp = {
    id: `temp-${crypto.randomUUID()}`,
    valor, categoria,
    data: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local
    pendente: true,
  };
  setGastos((prev) => [temp, ...prev]);
  try {
    const salvo = await inserirGasto({ valor, categoria });
    setGastos((prev) => prev.map((g) => (g.id === temp.id ? salvo : g)));
    return salvo;
  } catch (e) {
    setGastos((prev) => prev.filter((g) => g.id !== temp.id)); // rollback
    throw e;
  }
}, []);
```

> `toLocaleDateString('en-CA')` devolve `YYYY-MM-DD` no fuso local — sem o deslocamento de `toISOString()`.

### 6.5. Toast

Componente simples, sem dependência externa: caixa fixa acima da área de cadastro, some em 2,5 s, `role="status"` e `aria-live="polite"`. Verde para sucesso, vermelho para erro.

## 7. Critérios de aceite

**Funcionais**

- [ ] Ao abrir o app no celular, o campo de valor já está focado e o teclado numérico aparece.
- [ ] Digitar `23,90` e tocar em **Metrô** salva o gasto e limpa o campo.
- [ ] Com o campo vazio, os três botões estão desabilitados e não disparam nada.
- [ ] Com valor inválido (`abc`, `0`, `,`), os botões continuam desabilitados.
- [ ] Todos os casos da tabela §5 se comportam como especificado.
- [ ] Após salvar, o total do mês e o subtotal da categoria aumentam imediatamente, sem recarregar a página.
- [ ] Tocar duas vezes rápido na mesma categoria grava **um** registro, não dois.
- [ ] Falha de rede exibe toast de erro e o valor digitado **não** se perde.
- [ ] O foco volta para o campo de valor após salvar.

**Não funcionais**

- [ ] Botões com pelo menos 56 px de altura (implementação usa 96 px).
- [ ] Fluxo completo executável com o polegar de uma mão só em tela de 6".
- [ ] Nenhum layout shift quando o toast aparece.
- [ ] `aria-label` presente em campo e botões; leitor de tela anuncia o toast.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| `type="number"` bloqueando vírgula | Já resolvido: `type="text"` + `inputMode="decimal"` |
| Duplo envio em toque trêmulo | Guarda `salvando` desabilita os três botões durante a operação |
| Valor perdido em erro de rede | O campo só é limpo **depois** do `await` bem-sucedido |
| Teclado cobrindo os botões | Botões ficam acima do teclado no layout mobile-first; validar em device real |

## 9. Backlog derivado (V3)

- Desfazer o último lançamento (exige política de DELETE no banco).
- Lançamento com data retroativa.
- Repetir o último valor com um toque.

## 10. Entregáveis

- `src/lib/parseValor.js` com testes unitários cobrindo a tabela §5.
- `src/components/lancamento/{CampoValor,BotoesCategoria,CadastroRapido}.jsx`.
- Componente de toast.
- Integração no `App.jsx` junto ao dashboard do PRD-04.
