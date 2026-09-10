import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import Toast from '../Toast';

afterEach(() => vi.useRealTimers());

describe('Toast', () => {
  it('mantém a região fixa mesmo vazia, para não empurrar o layout', () => {
    render(<Toast toast={null} onFechar={vi.fn()} />);
    // A região existe sempre; só o conteúdo aparece e some. É isso que garante
    // o critério de "nenhum layout shift" do PRD-03 §7.
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('anuncia a mensagem de sucesso', () => {
    render(<Toast toast={{ tipo: 'ok', msg: 'R$ 23,90 em Metrô' }} onFechar={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('R$ 23,90 em Metrô');
  });

  it('anuncia a mensagem de erro', () => {
    render(
      <Toast toast={{ tipo: 'erro', msg: 'Não foi possível salvar.' }} onFechar={vi.fn()} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível salvar.');
  });

  it('some sozinho depois do tempo configurado', () => {
    vi.useFakeTimers();
    const onFechar = vi.fn();
    render(<Toast toast={{ tipo: 'ok', msg: 'oi' }} onFechar={onFechar} duracaoMs={2500} />);

    act(() => vi.advanceTimersByTime(2499));
    expect(onFechar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('não agenda fechamento quando não há mensagem', () => {
    vi.useFakeTimers();
    const onFechar = vi.fn();
    render(<Toast toast={null} onFechar={onFechar} />);
    act(() => vi.advanceTimersByTime(10000));
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('reinicia a contagem quando outra mensagem chega antes do fim', () => {
    vi.useFakeTimers();
    const onFechar = vi.fn();
    const { rerender } = render(
      <Toast toast={{ tipo: 'ok', msg: 'primeira' }} onFechar={onFechar} duracaoMs={2500} />
    );

    act(() => vi.advanceTimersByTime(2000));
    rerender(
      <Toast toast={{ tipo: 'ok', msg: 'segunda' }} onFechar={onFechar} duracaoMs={2500} />
    );

    act(() => vi.advanceTimersByTime(2000));
    expect(onFechar).not.toHaveBeenCalled(); // o timer da primeira não fecha a segunda
    act(() => vi.advanceTimersByTime(500));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
