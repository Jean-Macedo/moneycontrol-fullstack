import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarGastosDoMes, inserirGasto } from '../lib/gastosRepo';
import { CATEGORIA_IDS } from '../constants/categorias';

const VAZIO = [];

/**
 * Lançamentos do mês, com totais derivados.
 *
 * O estado guarda a chave `ano-mes` a que os dados pertencem. Isso resolve
 * duas coisas de uma vez: `carregando` é derivado durante o render, em vez de
 * um setState síncrono dentro do efeito; e uma resposta atrasada de um mês já
 * abandonado é descartada em vez de sobrescrever o mês em exibição — corrida
 * fácil de provocar batendo nas setas do seletor do PRD-04.
 */
export function useGastos(ano, mes) {
  const chave = `${ano}-${mes}`;
  const [estado, setEstado] = useState({ chave: null, gastos: VAZIO, erro: null });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    listarGastosDoMes(ano, mes)
      .then((gastos) => {
        if (!cancelado) setEstado({ chave, gastos, erro: null });
      })
      .catch((erro) => {
        if (!cancelado) setEstado({ chave, gastos: VAZIO, erro });
      });

    return () => {
      cancelado = true;
    };
  }, [ano, mes, chave, recarga]);

  const atual = estado.chave === chave;
  const gastos = atual ? estado.gastos : VAZIO;
  const erro = atual ? estado.erro : null;
  const carregando = !atual;

  const adicionar = useCallback(
    async ({ valor, categoria }) => {
      const novo = await inserirGasto({ valor, categoria });
      // Só entra na lista visível se pertencer ao mês em exibição.
      const [a, m] = novo.data.split('-').map(Number);
      if (a === ano && m === mes) {
        setEstado((prev) =>
          prev.chave === chave ? { ...prev, gastos: [novo, ...prev.gastos] } : prev
        );
      }
      return novo;
    },
    [ano, mes, chave]
  );

  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);

  const totais = useMemo(() => {
    const porCategoria = Object.fromEntries(CATEGORIA_IDS.map((c) => [c, 0]));
    let total = 0;
    for (const g of gastos) {
      total += g.valor;
      if (g.categoria in porCategoria) porCategoria[g.categoria] += g.valor;
    }
    return { total, porCategoria };
  }, [gastos]);

  return { gastos, totais, carregando, erro, adicionar, recarregar };
}
