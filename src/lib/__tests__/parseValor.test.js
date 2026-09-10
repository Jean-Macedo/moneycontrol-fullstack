import { describe, it, expect } from 'vitest';
import { parseValor } from '../parseValor';

describe('parseValor — tabela do PRD-03 §5', () => {
  const casos = [
    ['23,90', 23.9, 'vírgula decimal — caso mais comum no Gboard pt-BR'],
    ['23.90', 23.9, 'ponto decimal'],
    ['1.234,56', 1234.56, 'ponto de milhar + vírgula decimal'],
    ['1.234', 1234, 'ponto de milhar isolado'],
    ['R$ 15,00', 15, 'prefixo removido'],
    ['  8  ', 8, 'espaços aparados'],
    ['23,905', 23.91, 'arredondado a 2 casas'],
    ['0', null, 'rejeitado — banco exige > 0'],
    ['-5', null, 'caractere inválido'],
    ['abc', null, 'rejeitado'],
    ['', null, 'vazio rejeitado'],
    [',', null, 'só o separador é rejeitado'],
    ['1e5', null, 'notação científica não aceita'],
    ['9999999', null, 'acima do teto'],
  ];

  for (const [entrada, esperado, nota] of casos) {
    it(`${JSON.stringify(entrada)} -> ${esperado} (${nota})`, () => {
      expect(parseValor(entrada)).toBe(esperado);
    });
  }
});

describe('parseValor — bordas fora da tabela', () => {
  it('rejeita null e undefined sem lançar', () => {
    expect(parseValor(null)).toBe(null);
    expect(parseValor(undefined)).toBe(null);
  });

  it('rejeita vírgulas múltiplas', () => {
    expect(parseValor('23,90,50')).toBe(null);
  });

  it('aceita exatamente o teto e rejeita um centavo acima', () => {
    expect(parseValor('1000000')).toBe(1000000);
    expect(parseValor('1000000,01')).toBe(null);
  });

  it('aceita o menor valor gravável', () => {
    expect(parseValor('0,01')).toBe(0.01);
  });

  it('rejeita valor que arredonda para zero', () => {
    expect(parseValor('0,004')).toBe(null);
  });

  it('não confunde milhar sem decimal com centavos', () => {
    expect(parseValor('1.500')).toBe(1500);
    expect(parseValor('1.50')).toBe(1.5);
  });

  it('aceita número já normalizado', () => {
    expect(parseValor(42.5)).toBe(42.5);
  });
});
