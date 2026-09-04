import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * Aceita só a origem: https://<ref>.supabase.co
 *
 * Colar o endpoint REST completo é um erro fácil de cometer e caro de
 * diagnosticar — o cliente acrescenta `/rest/v1` por conta própria, e a URL
 * duplicada falha com `PGRST125 — Invalid path specified in request URL`, que
 * não diz nada sobre a causa. Aqui a barra final é tolerada e o caminho
 * indevido vira erro explícito na inicialização.
 */
function normalizarUrl(bruta) {
  const semBarra = bruta.trim().replace(/\/+$/, '');
  const caminho = semBarra.replace(/^https?:\/\/[^/]+/, '');

  if (caminho) {
    throw new Error(
      `VITE_SUPABASE_URL deve conter apenas a origem do projeto ` +
        `(https://<ref>.supabase.co), sem o caminho "${caminho}". ` +
        `Use o "Project URL" das configurações de API do Supabase.`
    );
  }
  return semBarra;
}

export const supabase = createClient(normalizarUrl(url), anonKey, {
  auth: { persistSession: false },
});
