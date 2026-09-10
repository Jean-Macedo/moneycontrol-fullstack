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

  /**
   * Insere de forma otimista e desfaz se o banco recusar.
   *
   * A linha provisória aparece antes da ida à rede, para o toque na categoria
   * parecer instantâneo. Quando a resposta chega, ela é substituída pela linha
   * real — e a decisão de exibir usa a data que o **banco** atribuiu, não a que
   * chutamos aqui: perto da meia-noite as duas divergem.
   */
  const adicionar = useCallback(
    async ({ valor, categoria }) => {
      const provisorio = {
        id: `temp-${crypto.randomUUID()}`,
        valor,
        categoria,
        data: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local
        created_at: new Date().toISOString(),
        pendente: true,
      };

      const noMesExibido = (iso) => {
        const [a, m] = iso.split('-').map(Number);
        return a === ano && m === mes;
      };

      if (noMesExibido(provisorio.data)) {
        setEstado((prev) =>
          prev.chave === chave
            ? { ...prev, gastos: [provisorio, ...prev.gastos] }
            : prev
        );
      }

      try {
        const salvo = await inserirGasto({ valor, categoria });
        setEstado((prev) => {
          if (prev.chave !== chave) return prev;
          const semProvisorio = prev.gastos.filter((g) => g.id !== provisorio.id);
          return {
            ...prev,
            gastos: noMesExibido(salvo.data)
              ? [salvo, ...semProvisorio]
              : semProvisorio,
          };
        });
        return salvo;
      } catch (e) {
        setEstado((prev) =>
          prev.chave === chave
            ? { ...prev, gastos: prev.gastos.filter((g) => g.id !== provisorio.id) }
            : prev
        );
        throw e;
      }
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
