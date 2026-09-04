// Convenções de exibição definidas no PRD-00 §8.
const moedaBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const mesAnoLongo = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

/** Formata um número em reais: 1234.5 -> "R$ 1.234,50". */
export function formatarMoeda(valor) {
  return moedaBRL.format(Number.isFinite(valor) ? valor : 0);
}

/** Rótulo do período no dashboard: "setembro de 2026". */
export function formatarMesAno(data) {
  return mesAnoLongo.format(data);
}
