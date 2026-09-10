import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// O App monta a árvore inteira; isolamos o que fala com a rede.
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('../lib/gastosRepo', () => ({
  listarGastosDoMes: vi.fn().mockResolvedValue([]),
  inserirGasto: vi.fn(),
}));

import { supabase } from '../lib/supabase';
import { listarGastosDoMes } from '../lib/gastosRepo';
import App from '../App';

const sessaoValida = { user: { id: 'dono-1' } };

beforeEach(() => vi.clearAllMocks());

describe('guarda de sessão', () => {
  it('sem sessão, mostra o login e nunca o dashboard', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<App />);

    expect(await screen.findByLabelText('Senha')).toBeInTheDocument();
    expect(screen.queryByLabelText('Resumo do mês')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cadastro rápido/i)).not.toBeInTheDocument();
  });

  it('sem sessão, não busca dado nenhum', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<App />);

    await screen.findByLabelText('Senha');
    expect(listarGastosDoMes).not.toHaveBeenCalled();
  });

  it('com sessão, mostra o dashboard e carrega os lançamentos', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: sessaoValida } });
    render(<App />);

    expect(await screen.findByLabelText('Resumo do mês')).toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
    await waitFor(() => expect(listarGastosDoMes).toHaveBeenCalled());
  });

  it('não pisca o login enquanto a sessão gravada é lida', async () => {
    let liberar;
    supabase.auth.getSession.mockReturnValue(
      new Promise((r) => { liberar = r; })
    );
    render(<App />);

    // Durante a leitura, nem login nem dashboard.
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Resumo do mês')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    liberar({ data: { session: sessaoValida } });
    expect(await screen.findByLabelText('Resumo do mês')).toBeInTheDocument();
  });

  it('o botão sair encerra a sessão', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    supabase.auth.getSession.mockResolvedValue({ data: { session: sessaoValida } });
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /sair/i }));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
