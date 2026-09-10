import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePeriodo } from '../usePeriodo';

function fixarHoje(iso) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => vi.useRealTimers());

describe('usePeriodo', () => {
  it('inicia no mês corrente', () => {
    fixarHoje('2026-09-10T12:00:00');
    const { result } = renderHook(() => usePeriodo());
    expect(result.current).toMatchObject({ ano: 2026, mes: 9, ehMesCorrente: true });
  });

  it('de janeiro recua para dezembro do ano anterior', () => {
    fixarHoje('2026-01-15T12:00:00');
    const { result } = renderHook(() => usePeriodo());
    act(() => result.current.anterior());
    expect(result.current).toMatchObject({ ano: 2025, mes: 12 });
  });

  it('de dezembro avança para janeiro do ano seguinte', () => {
    fixarHoje('2026-11-15T12:00:00');
    const { result } = renderHook(() => usePeriodo());
    act(() => result.current.proximo()); // dezembro/2026
    act(() => result.current.proximo()); // janeiro/2027
    expect(result.current).toMatchObject({ ano: 2027, mes: 1 });
  });

  it('não pula ano em dobro sob StrictMode', () => {
    // O updater é puro, então a dupla invocação do StrictMode não duplica o efeito.
    fixarHoje('2026-01-15T12:00:00');
    const { result } = renderHook(() => usePeriodo(), { reactStrictMode: true });
    act(() => result.current.anterior());
    expect(result.current.ano).toBe(2025);
    expect(result.current.mes).toBe(12);
  });

  it('atravessa vários anos para trás', () => {
    fixarHoje('2026-03-15T12:00:00');
    const { result } = renderHook(() => usePeriodo());
    for (let i = 0; i < 15; i++) act(() => result.current.anterior());
    expect(result.current).toMatchObject({ ano: 2024, mes: 12 });
  });

  it('irParaHoje volta ao mês corrente', () => {
    fixarHoje('2026-09-10T12:00:00');
    const { result } = renderHook(() => usePeriodo());
    act(() => result.current.anterior());
    act(() => result.current.anterior());
    expect(result.current.ehMesCorrente).toBe(false);
    act(() => result.current.irParaHoje());
    expect(result.current).toMatchObject({ ano: 2026, mes: 9, ehMesCorrente: true });
  });
});
