import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Encadeamento do supabase-js: cada método devolve o próprio construtor de
 * consulta, e o resultado só materializa no `single()` ou ao aguardar o objeto.
 */
function construtor(resultado) {
  const chamadas = {};
  const alvo = {
    select: vi.fn(() => alvo),
    insert: vi.fn((v) => ((chamadas.insert = v), alvo)),
    update: vi.fn((v) => ((chamadas.update = v), alvo)),
    delete: vi.fn(() => alvo),
    eq: vi.fn((c, v) => ((chamadas.eq = [c, v]), alvo)),
    gte: vi.fn((c, v) => ((chamadas.gte = [c, v]), alvo)),
    lte: vi.fn((c, v) => ((chamadas.lte = [c, v]), alvo)),
    order: vi.fn((c, o) => ((chamadas.order = [...(chamadas.order ?? []), [c, o]]), alvo)),
    single: vi.fn(() => Promise.resolve(resultado)),
    then: (aceita, recusa) => Promise.resolve(resultado).then(aceita, recusa),
  };
  return { alvo, chamadas };
}

const from = vi.fn();
vi.mock('../supabase', () => ({ supabase: { from: (...a) => from(...a) } }));

const { listarGastosDoMes, inserirGasto, atualizarGasto, excluirGasto } = await import(
  '../gastosRepo'
);

beforeEach(() => vi.clearAllMocks());

describe('listarGastosDoMes', () => {
  it('filtra pelo intervalo local do mês e ordena do mais recente', async () => {
    const { alvo, chamadas } = construtor({
      data: [{ id: '1', valor: '31.50', categoria: 'Uber', data: '2026-08-05' }],
      error: null,
    });
    from.mockReturnValue(alvo);

    await listarGastosDoMes(2026, 8);

    expect(from).toHaveBeenCalledWith('gastos');
    expect(chamadas.gte).toEqual(['data', '2026-08-01']);
    expect(chamadas.lte).toEqual(['data', '2026-08-31']);
    expect(chamadas.order).toEqual([
      ['data', { ascending: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('converte valor para número na fronteira com o PostgREST', async () => {
    const { alvo } = construtor({
      data: [{ id: '1', valor: '31.50', categoria: 'Uber', data: '2026-08-05' }],
      error: null,
    });
    from.mockReturnValue(alvo);

    const [gasto] = await listarGastosDoMes(2026, 8);
    expect(gasto.valor).toBe(31.5);
    expect(typeof gasto.valor).toBe('number');
  });

  it('propaga o erro do banco', async () => {
    const { alvo } = construtor({ data: null, error: new Error('sem rede') });
    from.mockReturnValue(alvo);
    await expect(listarGastosDoMes(2026, 8)).rejects.toThrow('sem rede');
  });
});

describe('inserirGasto', () => {
  it('envia apenas valor e categoria', async () => {
    const { alvo, chamadas } = construtor({
      data: { id: '1', valor: '23.90', categoria: 'Metrô', data: '2026-09-10' },
      error: null,
    });
    from.mockReturnValue(alvo);

    await inserirGasto({ valor: 23.9, categoria: 'Metrô' });

    // id, data e user_id ficam por conta do banco — o user_id vem do
    // `default auth.uid()`, que é o que mantém este repositório intacto após
    // a migração de autenticação.
    expect(chamadas.insert).toEqual({ valor: 23.9, categoria: 'Metrô' });
  });

  it('devolve a linha com valor numérico', async () => {
    const { alvo } = construtor({
      data: { id: '1', valor: '23.90', categoria: 'Metrô', data: '2026-09-10' },
      error: null,
    });
    from.mockReturnValue(alvo);

    const salvo = await inserirGasto({ valor: 23.9, categoria: 'Metrô' });
    expect(salvo.valor).toBe(23.9);
  });

  it('propaga a recusa do CHECK', async () => {
    const { alvo } = construtor({
      data: null,
      error: new Error('violates check constraint'),
    });
    from.mockReturnValue(alvo);
    await expect(inserirGasto({ valor: 0, categoria: 'Uber' })).rejects.toThrow(
      /check constraint/
    );
  });
});

describe('atualizarGasto', () => {
  it('altera somente valor e categoria, na linha pedida', async () => {
    const { alvo, chamadas } = construtor({
      data: { id: 'a', valor: '4.60', categoria: 'Uber', data: '2026-09-10' },
      error: null,
    });
    from.mockReturnValue(alvo);

    await atualizarGasto({ id: 'a', valor: 4.6, categoria: 'Uber' });

    // Enviar `data` aqui seria recusado pelo privilégio de coluna; não enviar
    // é o que mantém o contrato do PRD-08 explícito no código.
    expect(chamadas.update).toEqual({ valor: 4.6, categoria: 'Uber' });
    expect(chamadas.eq).toEqual(['id', 'a']);
  });

  it('propaga o erro', async () => {
    const { alvo } = construtor({ data: null, error: new Error('permission denied') });
    from.mockReturnValue(alvo);
    await expect(
      atualizarGasto({ id: 'a', valor: 1, categoria: 'Uber' })
    ).rejects.toThrow(/permission denied/);
  });
});

describe('excluirGasto', () => {
  it('apaga pela chave primária', async () => {
    const { alvo, chamadas } = construtor({ data: null, error: null });
    from.mockReturnValue(alvo);

    await excluirGasto('a');

    expect(alvo.delete).toHaveBeenCalled();
    expect(chamadas.eq).toEqual(['id', 'a']);
    // Não pede representação de volta: a linha não existe mais.
    expect(alvo.select).not.toHaveBeenCalled();
  });

  it('propaga o erro', async () => {
    const { alvo } = construtor({ data: null, error: new Error('permission denied') });
    from.mockReturnValue(alvo);
    await expect(excluirGasto('a')).rejects.toThrow(/permission denied/);
  });
});
