/**
 * Converte valores em percentuais inteiros que somam exatamente 100.
 *
 * Arredondar cada fatia isoladamente não fecha a conta: três categorias iguais
 * viram 33 + 33 + 33 = 99. Aqui o piso é distribuído e as sobras vão para as
 * maiores frações — o método do maior resto. Categorias zeradas nunca recebem
 * sobra, para não exibir "1%" ao lado de R$ 0,00.
 */
export function percentuaisInteiros(valores) {
  const total = valores.reduce((s, v) => s + v, 0);
  if (total <= 0) return valores.map(() => 0);

  const exatos = valores.map((v) => (v / total) * 100);
  const saida = exatos.map(Math.floor);
  const sobra = 100 - saida.reduce((s, v) => s + v, 0);

  const candidatos = exatos
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .filter(({ i }) => valores[i] > 0)
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < sobra && candidatos.length > 0; k++) {
    saida[candidatos[k % candidatos.length].i] += 1;
  }
  return saida;
}
