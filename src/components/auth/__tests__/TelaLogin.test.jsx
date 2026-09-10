import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn() } },
}));

import { supabase } from '../../../lib/supabase';
import TelaLogin from '../TelaLogin';

const email = () => screen.getByLabelText('E-mail');
const senha = () => screen.getByLabelText('Senha');
const entrar = () => screen.getByRole('button', { name: /entrar/i });

beforeEach(() => vi.clearAllMocks());

describe('TelaLogin', () => {
  it('mantém o botão desabilitado até os dois campos estarem preenchidos', async () => {
    const user = userEvent.setup();
    render(<TelaLogin />);

    expect(entrar()).toBeDisabled();
    await user.type(email(), 'dono@exemplo.com');
    expect(entrar()).toBeDisabled();
    await user.type(senha(), 'segredo');
    expect(entrar()).toBeEnabled();
  });

  it('envia as credenciais ao Supabase', async () => {
    const user = userEvent.setup();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    render(<TelaLogin />);

    await user.type(email(), 'dono@exemplo.com');
    await user.type(senha(), 'segredo');
    await user.click(entrar());

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'dono@exemplo.com',
        password: 'segredo',
      })
    );
  });

  it('não revela qual dos dois campos falhou', async () => {
    const user = userEvent.setup();
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    render(<TelaLogin />);

    await user.type(email(), 'naoexiste@exemplo.com');
    await user.type(senha(), 'errada');
    await user.click(entrar());

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('E-mail ou senha inválidos.');
    // Nada na mensagem deve permitir enumerar contas existentes.
    expect(alerta.textContent).not.toMatch(/e-mail não|usuário|não existe|senha errada/i);
  });

  it('libera o botão depois de um erro, para permitir nova tentativa', async () => {
    const user = userEvent.setup();
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    render(<TelaLogin />);

    await user.type(email(), 'dono@exemplo.com');
    await user.type(senha(), 'errada');
    await user.click(entrar());

    await screen.findByRole('alert');
    expect(entrar()).toBeEnabled();
  });

  it('distingue falha de rede de credencial inválida', async () => {
    const user = userEvent.setup();
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Failed to fetch' },
    });
    render(<TelaLogin />);

    await user.type(email(), 'dono@exemplo.com');
    await user.type(senha(), 'segredo');
    await user.click(entrar());

    expect(await screen.findByRole('alert')).toHaveTextContent(/sem conexão/i);
  });

  it('expõe os campos ao gerenciador de senhas', () => {
    render(<TelaLogin />);
    expect(email()).toHaveAttribute('autocomplete', 'email');
    expect(senha()).toHaveAttribute('autocomplete', 'current-password');
    expect(senha()).toHaveAttribute('type', 'password');
  });
});
