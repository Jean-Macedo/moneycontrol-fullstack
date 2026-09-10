import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BotaoInstalar from '../../components/ui/BotaoInstalar';

/** Simula o `beforeinstallprompt`, que só o Chromium dispara. */
function dispararPrompt(escolha = 'accepted') {
  const evento = new Event('beforeinstallprompt');
  evento.prompt = vi.fn();
  evento.userChoice = Promise.resolve({ outcome: escolha });
  act(() => window.dispatchEvent(evento));
  return evento;
}

const botao = () => screen.queryByRole('button', { name: /instalar na tela inicial/i });

describe('BotaoInstalar', () => {
  it('não aparece onde o navegador não oferece instalação', () => {
    render(<BotaoInstalar />);
    expect(botao()).not.toBeInTheDocument();
  });

  it('aparece quando o navegador oferece o prompt', () => {
    render(<BotaoInstalar />);
    dispararPrompt();
    expect(botao()).toBeInTheDocument();
  });

  it('impede a barra automática do Chrome para usar o botão próprio', () => {
    render(<BotaoInstalar />);
    const evento = new Event('beforeinstallprompt');
    evento.prompt = vi.fn();
    evento.userChoice = Promise.resolve({ outcome: 'accepted' });
    const impedir = vi.spyOn(evento, 'preventDefault');
    act(() => window.dispatchEvent(evento));
    expect(impedir).toHaveBeenCalled();
  });

  it('abre o prompt nativo ao ser tocado', async () => {
    const user = userEvent.setup();
    render(<BotaoInstalar />);
    const evento = dispararPrompt();

    await user.click(botao());
    expect(evento.prompt).toHaveBeenCalled();
  });

  it('some depois de usado, porque o evento não se repete', async () => {
    const user = userEvent.setup();
    render(<BotaoInstalar />);
    dispararPrompt();

    await user.click(botao());
    expect(botao()).not.toBeInTheDocument();
  });

  it('some quando o app é instalado por fora da interface', () => {
    render(<BotaoInstalar />);
    dispararPrompt();
    expect(botao()).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event('appinstalled')));
    expect(botao()).not.toBeInTheDocument();
  });
});
