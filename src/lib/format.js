// Convenções de exibição definidas no PRD-00 §8.
const moedaBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata um número em reais: 1234.5 -> "R$ 1.234,50". */
export const formatarMoeda = (valor) => moedaBRL.format(Number(valor) || 0);

const pad = (n) => String(n).padStart(2, '0');

/**
 * Primeiro e último dia do mês, em data LOCAL, no formato YYYY-MM-DD.
 *
 * A aritmética é local de propósito: `toISOString()` converte para UTC e
 * desloca o dia, jogando o gasto das 22h do dia 31 para o mês seguinte.
 */
export function intervaloDoMes(ano, mes /* 1-12 */) {
  const ultimoDia = new Date(ano, mes, 0).getDate(); // dia 0 do mês seguinte
  return {
    inicio: `${ano}-${pad(mes)}-01`,
    fim: `${ano}-${pad(mes)}-${pad(ultimoDia)}`,
  };
}

/** Rótulo do período no dashboard: "setembro de 2026". */
export const nomeDoMes = (ano, mes) =>
  new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
