import { useCallback, useMemo, useState } from 'react';

const mesCorrente = () => {
  const hoje = new Date();
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
};

/**
 * Mês em exibição, com navegação.
 *
 * Ano e mês vivem no mesmo objeto de estado e a travessia usa aritmética
 * absoluta de meses. A alternativa — dois estados, com `setAno` chamado dentro
 * do updater de `setMes` — quebra sob StrictMode: o React invoca updaters duas
 * vezes justamente para expor efeitos colaterais, e o ano avançaria em dobro.
 */
export function usePeriodo() {
  const [periodo, setPeriodo] = useState(mesCorrente);

  const mover = useCallback((delta) => {
    setPeriodo(({ ano, mes }) => {
      const absoluto = ano * 12 + (mes - 1) + delta;
      return { ano: Math.floor(absoluto / 12), mes: (absoluto % 12) + 1 };
    });
  }, []);

  const anterior = useCallback(() => mover(-1), [mover]);
  const proximo = useCallback(() => mover(1), [mover]);
  const irParaHoje = useCallback(() => setPeriodo(mesCorrente()), []);

  const ehMesCorrente = useMemo(() => {
    const atual = mesCorrente();
    return periodo.ano === atual.ano && periodo.mes === atual.mes;
  }, [periodo]);

  return { ...periodo, ehMesCorrente, anterior, proximo, irParaHoje };
}
