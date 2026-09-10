/**
 * Converte a entrada crua do usuário em número de reais.
 * Retorna null se a entrada não representar um valor válido.
 *
 * Regra do separador: se houver vírgula, ela é o decimal e pontos são milhar.
 * Se houver só pontos, um único ponto com 1-2 casas finais é decimal;
 * caso contrário, pontos são milhar.
 *
 * Este é o único ponto do código que interpreta valor digitado. O teclado
 * pt-BR entrega vírgula, e tratá-la em mais de um lugar é como `12,50` vira
 * `1250` sem ninguém perceber.
 */
export function parseValor(entrada) {
  if (entrada == null) return null;

  let s = String(entrada).trim().replace(/[R$\s]/gi, '');
  if (!s) return null;
  if (!/^[\d.,]+$/.test(s)) return null;

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const partes = s.split('.');
    if (partes.length > 2) {
      s = partes.join(''); // 1.234.567 -> milhar
    } else if (partes.length === 2) {
      const dec = partes[1];
      s =
        dec.length <= 2
          ? `${partes[0]}.${dec}` // 12.50 -> decimal
          : partes.join(''); //      1.234 -> milhar
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  const arredondado = Math.round(n * 100) / 100;
  if (arredondado <= 0) return null;
  if (arredondado > 1000000) return null; // espelha o CHECK do banco

  return arredondado;
}
