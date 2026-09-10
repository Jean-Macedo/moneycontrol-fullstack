import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listarGastosDoMes,
  inserirGasto,
  atualizarGasto,
  excluirGasto,
} from '../lib/gastosRepo';
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

  /**
   * Corrige valor ou categoria, otimista, com reversão em falha.
   *
   * A resposta do banco substitui a linha inteira em vez de só confirmar: o
   * gatilho preenche `updated_at`, e reaproveitar o objeto local perderia isso.
   */
  const editar = useCallback(
    async ({ id, valor, categoria }) => {
      let anterior = null;

      setEstado((prev) => {
        if (prev.chave !== chave) return prev;
        anterior = prev.gastos.find((g) => g.id === id) ?? null;
        return {
          ...prev,
          gastos: prev.gastos.map((g) =>
            g.id === id ? { ...g, valor, categoria, pendente: true } : g
          ),
        };
      });

      try {
        const salvo = await atualizarGasto({ id, valor, categoria });
        setEstado((prev) =>
          prev.chave === chave
            ? { ...prev, gastos: prev.gastos.map((g) => (g.id === id ? salvo : g)) }
            : prev
        );
        return salvo;
      } catch (e) {
        setEstado((prev) =>
          prev.chave === chave && anterior
            ? { ...prev, gastos: prev.gastos.map((g) => (g.id === id ? anterior : g)) }
            : prev
        );
        throw e;
      }
    },
    [chave]
  );

  /**
   * Remove o lançamento, otimista. Em falha, a linha volta para a posição
   * original — reinseri-la no topo faria parecer um lançamento novo.
   */
  const excluir = useCallback(
    async (id) => {
      let anterior = null;
      let posicao = -1;

      setEstado((prev) => {
        if (prev.chave !== chave) return prev;
        posicao = prev.gastos.findIndex((g) => g.id === id);
        if (posicao < 0) return prev;
        anterior = prev.gastos[posicao];
        return { ...prev, gastos: prev.gastos.filter((g) => g.id !== id) };
      });

      try {
        await excluirGasto(id);
      } catch (e) {
        setEstado((prev) => {
          if (prev.chave !== chave || !anterior) return prev;
          const restaurado = [...prev.gastos];
          restaurado.splice(posicao, 0, anterior);
          return { ...prev, gastos: restaurado };
        });
        throw e;
      }
    },
    [chave]
  );

  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);

  /**
   * Soma em centavos inteiros e converte no fim.
   *
   * Acumular float dá 0.1 + 0.2 = 0.30000000000000004, e com valores suficientes
   * o total exibido deixa de bater com a soma dos três subtotais por um centavo.
   * Dinheiro não se soma em ponto flutuante.
   */
  const totais = useMemo(() => {
    const centavosPorCategoria = Object.fromEntries(CATEGORIA_IDS.map((c) => [c, 0]));
    let centavosTotal = 0;

    for (const g of gastos) {
      const centavos = Math.round(g.valor * 100);
      centavosTotal += centavos;
      if (g.categoria in centavosPorCategoria) {
        centavosPorCategoria[g.categoria] += centavos;
      }
    }

    return {
      total: centavosTotal / 100,
      porCategoria: Object.fromEntries(
        Object.entries(centavosPorCategoria).map(([c, v]) => [c, v / 100])
      ),
    };
  }, [gastos]);

  return { gastos, totais, carregando, erro, adicionar, editar, excluir, recarregar };
}
