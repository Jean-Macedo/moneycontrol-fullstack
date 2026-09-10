import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../../lib/gastosRepo', () => ({
  listarGastosDoMes: vi.fn(),
  inserirGasto: vi.fn(),
  atualizarGasto: vi.fn(),
  excluirGasto: vi.fn(),
}));

import {
  listarGastosDoMes,
  atualizarGasto,
  excluirGasto,
} from '../../lib/gastosRepo';
import { useGastos } from '../useGastos';

const gasto = (id, valor, categoria, data = '2026-09-05') => ({
  id,
  valor,
  categoria,
  data,
  created_at: `${data}T12:00:00Z`,
});

const TRES = [
  gasto('a', 45.6, 'Uber', '2026-09-10'),
  gasto('b', 18.0, 'Lazer', '2026-09-08'),
  gasto('c', 7.9, 'Metrô', '2026-09-05'),
];

async function montar() {
  listarGastosDoMes.mockResolvedValue([...TRES]);
  const hook = renderHook(() => useGastos(2026, 9));
  await waitFor(() => expect(hook.result.current.carregando).toBe(false));
  return hook;
}

beforeEach(() => vi.clearAllMocks());

describe('useGastos — editar', () => {
  it('corrigir o valor recalcula os totais', async () => {
    const { result } = await montar();
    expect(result.current.totais.total).toBe(71.5);

    atualizarGasto.mockResolvedValue(gasto('a', 4.6, 'Uber', '2026-09-10'));
    await act(() => result.current.editar({ id: 'a', valor: 4.6, categoria: 'Uber' }));

    expect(result.current.totais.total).toBe(30.5);
    expect(result.current.totais.porCategoria.Uber).toBe(4.6);
  });

  it('mudar de categoria move o valor entre subtotais sem alterar o total', async () => {
    const { result } = await montar();

    atualizarGasto.mockResolvedValue(gasto('a', 45.6, 'Lazer', '2026-09-10'));
    await act(() => result.current.editar({ id: 'a', valor: 45.6, categoria: 'Lazer' }));

    expect(result.current.totais.total).toBe(71.5);
    expect(result.current.totais.porCategoria.Uber).toBe(0);
    expect(result.current.totais.porCategoria.Lazer).toBe(63.6);
  });

  it('mostra o valor novo antes da resposta do banco', async () => {
    const { result } = await montar();

    let liberar;
    atualizarGasto.mockReturnValue(new Promise((r) => { liberar = r; }));
    act(() => {
      result.current.editar({ id: 'a', valor: 4.6, categoria: 'Uber' });
    });

    await waitFor(() => expect(result.current.totais.total).toBe(30.5));
    expect(result.current.gastos.find((g) => g.id === 'a').pendente).toBe(true);

    await act(async () => liberar(gasto('a', 4.6, 'Uber', '2026-09-10')));
  });

  it('desfaz a mudança quando o banco recusa', async () => {
    const { result } = await montar();

    atualizarGasto.mockRejectedValue(new Error('sem rede'));
    await expect(
      act(() => result.current.editar({ id: 'a', valor: 4.6, categoria: 'Uber' }))
    ).rejects.toThrow('sem rede');

    expect(result.current.totais.total).toBe(71.5);
    expect(result.current.gastos.find((g) => g.id === 'a').valor).toBe(45.6);
  });
});

describe('useGastos — excluir', () => {
  it('remove a linha e reduz os totais', async () => {
    const { result } = await montar();

    excluirGasto.mockResolvedValue(undefined);
    await act(() => result.current.excluir('b'));

    expect(result.current.gastos).toHaveLength(2);
    expect(result.current.totais.total).toBe(53.5);
    expect(result.current.totais.porCategoria.Lazer).toBe(0);
  });

  it('em falha, devolve a linha à posição original', async () => {
    const { result } = await montar();

    excluirGasto.mockRejectedValue(new Error('sem rede'));
    await expect(act(() => result.current.excluir('b'))).rejects.toThrow('sem rede');

    expect(result.current.gastos.map((g) => g.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.totais.total).toBe(71.5);
  });

  it('não deixa a lista inconsistente ao excluir a primeira linha', async () => {
    const { result } = await montar();

    excluirGasto.mockRejectedValue(new Error('sem rede'));
    await expect(act(() => result.current.excluir('a'))).rejects.toThrow();

    expect(result.current.gastos.map((g) => g.id)).toEqual(['a', 'b', 'c']);
  });
});
