import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, chave, opcoes) => ({ url, chave, opcoes })),
}));

import { createClient } from '@supabase/supabase-js';

const CHAVE = 'chave-anon-de-teste';

/** Importa o módulo do zero com as variáveis de ambiente pedidas. */
async function carregar({ url, chave = CHAVE }) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', url);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', chave);
  return import('../supabase');
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('supabase — validação de configuração', () => {
  it('falha com mensagem clara quando a URL falta', async () => {
    await expect(carregar({ url: '' })).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('falha com mensagem clara quando a chave falta', async () => {
    await expect(carregar({ url: 'https://abc.supabase.co', chave: '' })).rejects.toThrow(
      /VITE_SUPABASE_ANON_KEY/
    );
  });

  it('não falha com "undefined is not a function"', async () => {
    // O guard existe para transformar configuração ausente em erro legível.
    await expect(carregar({ url: '' })).rejects.toThrow(/Supabase não configurado/);
  });
});

describe('supabase — normalização da URL', () => {
  it('aceita a origem pura', async () => {
    await carregar({ url: 'https://abc.supabase.co' });
    expect(createClient).toHaveBeenCalledWith(
      'https://abc.supabase.co',
      CHAVE,
      expect.anything()
    );
  });

  it('tolera barra final', async () => {
    await carregar({ url: 'https://abc.supabase.co/' });
    expect(createClient.mock.calls[0][0]).toBe('https://abc.supabase.co');
  });

  it('tolera espaços em volta', async () => {
    await carregar({ url: '  https://abc.supabase.co  ' });
    expect(createClient.mock.calls[0][0]).toBe('https://abc.supabase.co');
  });

  it('recusa o endpoint REST completo, apontando a causa', async () => {
    // O erro real de setembro/2026: colar o endpoint REST em vez do Project
    // URL fazia o cliente montar /rest/v1/rest/v1/... e toda chamada falhava
    // com PGRST125, cuja mensagem não diz nada sobre a causa.
    await expect(carregar({ url: 'https://abc.supabase.co/rest/v1' })).rejects.toThrow(
      /apenas a origem/
    );
  });

  it('recusa o endpoint REST com barra final', async () => {
    await expect(carregar({ url: 'https://abc.supabase.co/rest/v1/' })).rejects.toThrow(
      /apenas a origem/
    );
  });

  it('nomeia o caminho indevido na mensagem', async () => {
    await expect(carregar({ url: 'https://abc.supabase.co/auth/v1' })).rejects.toThrow(
      /\/auth\/v1/
    );
  });

  it('orienta a usar o Project URL', async () => {
    await expect(carregar({ url: 'https://abc.supabase.co/rest/v1' })).rejects.toThrow(
      /Project URL/
    );
  });
});

describe('supabase — sessão', () => {
  it('persiste a sessão e renova o token', async () => {
    await carregar({ url: 'https://abc.supabase.co' });
    const { auth } = createClient.mock.calls[0][2];

    // Sem persistência o login se repetiria a cada abertura do app instalado.
    expect(auth.persistSession).toBe(true);
    expect(auth.autoRefreshToken).toBe(true);
    // Não usamos magic link nem OAuth: nada a detectar na URL.
    expect(auth.detectSessionInUrl).toBe(false);
  });
});
