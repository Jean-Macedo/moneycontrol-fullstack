import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../../lib/gastosRepo', () => ({
  listarGastosDoMes: vi.fn(),
  inserirGasto: vi.fn(),
}));

import { listarGastosDoMes, inserirGasto } from '../../lib/gastosRepo';
import { useGastos } from '../useGastos';

const gasto = (valor, categoria, data = '2026-09-05') => ({
  id: `${valor}-${categoria}-${data}`,
  valor,
  categoria,
  data,
  created_at: `${data}T12:00:00Z`,
});

beforeEach(() => vi.clearAllMocks());

describe('useGastos — totais', () => {
  it('soma centavos sem erro de ponto flutuante', async () => {
    listarGastosDoMes.mockResolvedValue([
      gasto(0.1, 'Uber'),
      gasto(0.2, 'Uber'),
    ]);
    const { result } = renderHook(() => useGastos(2026, 9));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.totais.total).toBe(0.3);
    expect(result.current.totais.porCategoria.Uber).toBe(0.3);
  });

  it('a soma dos subtotais é exatamente igual ao total', async () => {
    listarGastosDoMes.mockResolvedValue([
      gasto(10.07, 'Uber'),
      gasto(20.11, 'Lazer'),
      gasto(0.03, 'Metrô'),
      gasto(5.99, 'Uber'),
    ]);
    const { result } = renderHook(() => useGastos(2026, 9));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    const { total, porCategoria } = result.current.totais;
    const somaSubtotais = Object.values(porCategoria).reduce((s, v) => s + v, 0);
    expect(somaSubtotais).toBe(total);
    expect(total).toBe(36.2);
  });

  it('mês sem lançamentos zera tudo sem erro', async () => {
    listarGastosDoMes.mockResolvedValue([]);
    const { result } = renderHook(() => useGastos(2020, 3));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.erro).toBe(null);
    expect(result.current.totais.total).toBe(0);
    expect(result.current.gastos).toEqual([]);
  });
});

describe('useGastos — inserção', () => {
  it('atualiza os totais na hora ao salvar no mês exibido', async () => {
    const hoje = new Date().toLocaleDateString('en-CA');
    const [ano, mes] = hoje.split('-').map(Number);
    listarGastosDoMes.mockResolvedValue([]);
    inserirGasto.mockResolvedValue(gasto(15.5, 'Lazer', hoje));

    const { result } = renderHook(() => useGastos(ano, mes));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(() => result.current.adicionar({ valor: 15.5, categoria: 'Lazer' }));

    expect(result.current.totais.total).toBe(15.5);
    expect(result.current.totais.porCategoria.Lazer).toBe(15.5);
  });

  it('salvar com um mês passado selecionado não altera os totais exibidos', async () => {
    listarGastosDoMes.mockResolvedValue([gasto(31.5, 'Uber', '2026-08-05')]);
    // O banco grava com a data de hoje, que não pertence a agosto/2026.
    inserirGasto.mockResolvedValue(
      gasto(99, 'Uber', new Date().toLocaleDateString('en-CA'))
    );

    const { result } = renderHook(() => useGastos(2026, 8));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.totais.total).toBe(31.5);

    await act(() => result.current.adicionar({ valor: 99, categoria: 'Uber' }));

    expect(result.current.totais.total).toBe(31.5);
    expect(result.current.gastos).toHaveLength(1);
  });

  it('desfaz a linha otimista quando o banco recusa', async () => {
    const hoje = new Date().toLocaleDateString('en-CA');
    const [ano, mes] = hoje.split('-').map(Number);
    listarGastosDoMes.mockResolvedValue([]);
    inserirGasto.mockRejectedValue(new Error('sem rede'));

    const { result } = renderHook(() => useGastos(ano, mes));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await expect(
      act(() => result.current.adicionar({ valor: 10, categoria: 'Uber' }))
    ).rejects.toThrow('sem rede');

    expect(result.current.gastos).toEqual([]);
    expect(result.current.totais.total).toBe(0);
  });
});

describe('useGastos — corrida entre meses', () => {
  it('descarta a resposta de um mês já abandonado', async () => {
    let resolverAgosto;
    listarGastosDoMes.mockImplementation((ano, mes) =>
      mes === 8
        ? new Promise((r) => { resolverAgosto = r; })
        : Promise.resolve([gasto(12, 'Uber', '2026-09-01')])
    );

    const { result, rerender } = renderHook(({ mes }) => useGastos(2026, mes), {
      initialProps: { mes: 8 },
    });

    rerender({ mes: 9 }); // troca antes de agosto responder
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.totais.total).toBe(12);

    // Agosto responde atrasado e não pode sobrescrever setembro.
    await act(async () => {
      resolverAgosto([gasto(999, 'Uber', '2026-08-10')]);
    });

    expect(result.current.totais.total).toBe(12);
  });
});
