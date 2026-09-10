import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Sessão do usuário, sincronizada com o storage e com os eventos do Supabase.
 *
 * O `carregando` inicial não é detalhe de polimento: a leitura da sessão
 * gravada é assíncrona, e sem ele a tela de login apareceria por um instante
 * em toda abertura do app, mesmo com sessão válida.
 */
export function useSessao() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      if (ativo) setSessao(nova);
    });

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { sessao, carregando };
}
