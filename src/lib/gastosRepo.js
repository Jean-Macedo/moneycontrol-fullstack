import { supabase } from './supabase';
import { intervaloDoMes } from './format';

const COLUNAS = 'id, valor, categoria, data, created_at';

// `valor` é numeric(12,2) no banco. A conversão para Number acontece aqui, na
// fronteira com o PostgREST, e em nenhum outro lugar do código.
const normalizar = (g) => ({ ...g, valor: Number(g.valor) });

export async function listarGastosDoMes(ano, mes) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  const { data, error } = await supabase
    .from('gastos')
    .select(COLUNAS)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(normalizar);
}

export async function inserirGasto({ valor, categoria }) {
  const { data, error } = await supabase
    .from('gastos')
    .insert({ valor, categoria }) // id e data ficam por conta do banco
    .select(COLUNAS)
    .single();

  if (error) throw error;
  return normalizar(data);
}
