import { describe, it, expect } from 'vitest';
import { percentuaisInteiros } from '../percentuais';

const soma = (a) => a.reduce((s, v) => s + v, 0);

describe('percentuaisInteiros', () => {
  it('três valores iguais somam 100, não 99', () => {
    const p = percentuaisInteiros([10, 10, 10]);
    expect(soma(p)).toBe(100);
    expect(p).toEqual([34, 33, 33]);
  });

  it('devolve zeros quando não há gastos', () => {
    expect(percentuaisInteiros([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('não dá percentual a categoria zerada', () => {
    const p = percentuaisInteiros([10, 0, 20]);
    expect(p[1]).toBe(0);
    expect(soma(p)).toBe(100);
  });

  it('valor único leva 100%', () => {
    expect(percentuaisInteiros([42, 0, 0])).toEqual([100, 0, 0]);
  });

  it('soma 100 em uma bateria de casos aleatórios', () => {
    for (let i = 0; i < 200; i++) {
      const v = [0, 0, 0].map(() => Math.round(Math.random() * 10000) / 100);
      if (soma(v) === 0) continue;
      expect(soma(percentuaisInteiros(v))).toBe(100);
    }
  });

  it('percentuais refletem a proporção', () => {
    expect(percentuaisInteiros([50, 30, 20])).toEqual([50, 30, 20]);
  });
});
