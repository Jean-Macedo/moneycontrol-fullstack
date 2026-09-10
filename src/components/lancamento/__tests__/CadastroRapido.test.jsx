import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CadastroRapido from '../CadastroRapido';

const botao = (nome) => screen.getByRole('button', { name: new RegExp(nome, 'i') });
const campo = () => screen.getByLabelText(/valor do gasto/i);

function montar(overrides = {}) {
  const props = { adicionar: vi.fn().mockResolvedValue({}), onToast: vi.fn(), ...overrides };
  render(<CadastroRapido {...props} />);
  return props;
}

beforeEach(() => {
  // jsdom não implementa vibrate; o componente chama com optional call.
  navigator.vibrate = vi.fn();
});

describe('CadastroRapido', () => {
  it('foca o campo de valor ao montar', () => {
    montar();
    expect(campo()).toHaveFocus();
  });

  it('mantém os botões desabilitados com o campo vazio', () => {
    montar();
    for (const cat of ['Uber', 'Lazer', 'Metrô']) {
      expect(botao(cat)).toBeDisabled();
    }
  });

  it('mantém os botões desabilitados com valor inválido', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(campo(), 'abc');
    expect(botao('Uber')).toBeDisabled();

    await user.clear(campo());
    await user.type(campo(), '0');
    expect(botao('Uber')).toBeDisabled();
  });

  it('salva com o valor normalizado e limpa o campo', async () => {
    const user = userEvent.setup();
    const { adicionar, onToast } = montar();

    await user.type(campo(), '23,90');
    expect(botao('Metrô')).toBeEnabled();
    await user.click(botao('Metrô'));

    await waitFor(() =>
      expect(adicionar).toHaveBeenCalledWith({ valor: 23.9, categoria: 'Metrô' })
    );
    await waitFor(() => expect(campo()).toHaveValue(''));
    expect(onToast).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ok', msg: expect.stringContaining('Metrô') })
    );
  });

  it('grava um único registro em toque duplo rápido', async () => {
    const user = userEvent.setup();
    let liberar;
    const adicionar = vi.fn(() => new Promise((r) => { liberar = r; }));
    montar({ adicionar });

    await user.type(campo(), '10');
    await user.click(botao('Uber'));
    await user.click(botao('Uber')); // segundo toque durante o salvamento

    expect(adicionar).toHaveBeenCalledTimes(1);
    liberar({});
  });

  it('não perde o valor digitado quando o salvamento falha', async () => {
    const user = userEvent.setup();
    const adicionar = vi.fn().mockRejectedValue(new Error('rede caiu'));
    const { onToast } = montar({ adicionar });

    await user.type(campo(), '42,50');
    await user.click(botao('Lazer'));

    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'erro' }))
    );
    expect(campo()).toHaveValue('42,50');
    expect(botao('Lazer')).toBeEnabled();
  });

  it('devolve o foco ao campo depois de salvar', async () => {
    const user = userEvent.setup();
    montar();
    await user.type(campo(), '7');
    await user.click(botao('Uber'));
    await waitFor(() => expect(campo()).toHaveFocus());
  });
});
