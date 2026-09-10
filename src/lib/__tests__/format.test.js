import { describe, it, expect } from 'vitest';
import { formatarMoeda, intervaloDoMes, nomeDoMes } from '../format';

// O separador de milhar do pt-BR é espaço não-quebrável, não espaço comum.
const R$ = (s) => `R$ ${s}`;

describe('intervaloDoMes — PRD-06 §5', () => {
  it('janeiro', () =>
    expect(intervaloDoMes(2026, 1)).toEqual({ inicio: '2026-01-01', fim: '2026-01-31' }));

  it('fevereiro bissexto', () =>
    expect(intervaloDoMes(2024, 2)).toEqual({ inicio: '2024-02-01', fim: '2024-02-29' }));

  it('fevereiro comum', () =>
    expect(intervaloDoMes(2026, 2)).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' }));

  it('fevereiro de ano secular não bissexto', () =>
    expect(intervaloDoMes(1900, 2).fim).toBe('1900-02-28'));

  it('fevereiro de ano secular bissexto', () =>
    expect(intervaloDoMes(2000, 2).fim).toBe('2000-02-29'));

  it('dezembro', () =>
    expect(intervaloDoMes(2026, 12)).toEqual({ inicio: '2026-12-01', fim: '2026-12-31' }));

  it('meses de 30 dias', () => {
    for (const mes of [4, 6, 9, 11]) {
      expect(intervaloDoMes(2026, mes).fim.slice(-2)).toBe('30');
    }
  });

  it('preenche mês com zero à esquerda', () => {
    expect(intervaloDoMes(2026, 3).inicio).toBe('2026-03-01');
  });

  it('não desloca o dia por fuso horário', () => {
    // O bug clássico: construir a data e serializar com toISOString() levaria
    // 2026-03-01 para 2026-02-28 em fusos negativos.
    expect(intervaloDoMes(2026, 3).inicio).toBe('2026-03-01');
    expect(intervaloDoMes(2026, 1).fim).toBe('2026-01-31');
  });
});

describe('formatarMoeda', () => {
  it('formata com separador de milhar e vírgula decimal', () => {
    expect(formatarMoeda(1234.5)).toBe(R$('1.234,50'));
  });

  it('mantém duas casas em valor inteiro', () => {
    expect(formatarMoeda(8)).toBe(R$('8,00'));
  });

  it('aceita string vinda do PostgREST', () => {
    expect(formatarMoeda('31.50')).toBe(R$('31,50'));
  });

  it('trata ausência de valor como zero, sem quebrar', () => {
    expect(formatarMoeda(undefined)).toBe(R$('0,00'));
    expect(formatarMoeda(null)).toBe(R$('0,00'));
    expect(formatarMoeda(NaN)).toBe(R$('0,00'));
  });

  it('formata valores altos', () => {
    expect(formatarMoeda(1000000)).toBe(R$('1.000.000,00'));
  });
});

describe('nomeDoMes', () => {
  it('devolve o mês por extenso em português', () => {
    expect(nomeDoMes(2026, 9)).toMatch(/setembro/i);
    expect(nomeDoMes(2026, 9)).toMatch(/2026/);
  });

  it('cobre os doze meses sem repetir', () => {
    const nomes = Array.from({ length: 12 }, (_, i) => nomeDoMes(2026, i + 1));
    expect(new Set(nomes).size).toBe(12);
  });

  it('janeiro não vira dezembro do ano anterior', () => {
    expect(nomeDoMes(2026, 1)).toMatch(/janeiro/i);
    expect(nomeDoMes(2026, 1)).toMatch(/2026/);
  });
});
