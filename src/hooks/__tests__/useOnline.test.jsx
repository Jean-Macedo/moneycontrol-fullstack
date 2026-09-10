import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook, render, screen } from '@testing-library/react';
import { useOnline } from '../useOnline';
import FaixaOffline from '../../components/ui/FaixaOffline';

function fingirRede(online) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
}

afterEach(() => vi.restoreAllMocks());

describe('useOnline', () => {
  it('parte do estado atual da conexão', () => {
    fingirRede(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it('reage aos eventos de queda e volta da rede', () => {
    fingirRede(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);

    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });

  it('remove os listeners ao desmontar', () => {
    const remover = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnline());
    unmount();

    const eventos = remover.mock.calls.map(([nome]) => nome);
    expect(eventos).toContain('online');
    expect(eventos).toContain('offline');
  });
});

describe('FaixaOffline', () => {
  it('não aparece com conexão', () => {
    render(<FaixaOffline online />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('diz o que deixa de funcionar, não só que está offline', () => {
    render(<FaixaOffline online={false} />);
    const faixa = screen.getByRole('status');
    expect(faixa).toHaveTextContent(/sem conexão/i);
    // O app não enfileira lançamentos (PRD-05 §7): o aviso precisa deixar isso
    // explícito, senão o usuário digita valores que serão recusados.
    expect(faixa).toHaveTextContent(/não estão sendo salvos/i);
  });
});
