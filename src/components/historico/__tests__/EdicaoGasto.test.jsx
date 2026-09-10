import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EdicaoGasto from '../EdicaoGasto';
import ListaLancamentos from '../ListaLancamentos';

const GASTO = {
  id: 'a',
  valor: 45.6,
  categoria: 'Uber',
  data: '2026-09-10',
  created_at: '2026-09-10T12:00:00Z',
};

const campo = () => screen.getByLabelText(/valor do gasto/i);
const botao = (nome) => screen.getByRole('button', { name: new RegExp(nome, 'i') });

function montar(overrides = {}) {
  const props = {
    gasto: GASTO,
    onSalvar: vi.fn().mockResolvedValue({}),
    onExcluir: vi.fn().mockResolvedValue(undefined),
    onFechar: vi.fn(),
    ...overrides,
  };
  render(<EdicaoGasto {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('EdicaoGasto', () => {
  it('abre com o valor formatado em vírgula', () => {
    montar();
    expect(campo()).toHaveValue('45,60');
  });

  it('mantém Salvar desabilitado enquanto nada muda', () => {
    montar();
    expect(botao('^salvar')).toBeDisabled();
  });

  it('mantém Salvar desabilitado com valor inválido', async () => {
    const user = userEvent.setup();
    montar();
    await user.clear(campo());
    await user.type(campo(), 'abc');
    expect(botao('^salvar')).toBeDisabled();
  });

  it('salva o valor normalizado', async () => {
    const user = userEvent.setup();
    const { onSalvar, onFechar } = montar();

    await user.clear(campo());
    await user.type(campo(), '4,60');
    await user.click(botao('^salvar'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({ id: 'a', valor: 4.6, categoria: 'Uber' })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('permite trocar apenas a categoria', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.click(botao('^lazer'));
    await user.click(botao('^salvar'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({ id: 'a', valor: 45.6, categoria: 'Lazer' })
    );
  });

  it('mantém a folha aberta e avisa quando salvar falha', async () => {
    const user = userEvent.setup();
    const { onFechar } = montar({ onSalvar: vi.fn().mockRejectedValue(new Error('x')) });

    await user.clear(campo());
    await user.type(campo(), '4,60');
    await user.click(botao('^salvar'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível salvar/i);
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('exige confirmação nomeando valor e categoria antes de excluir', async () => {
    const user = userEvent.setup();
    const { onExcluir } = montar();

    await user.click(botao('excluir lançamento'));
    expect(onExcluir).not.toHaveBeenCalled();
    expect(screen.getByText(/excluir R\$\s?45,60 em Uber\?/i)).toBeInTheDocument();
    expect(screen.getByText(/não dá para desfazer/i)).toBeInTheDocument();

    await user.click(botao('^excluir$'));
    await waitFor(() => expect(onExcluir).toHaveBeenCalledWith('a'));
  });

  it('cancelar a confirmação não exclui', async () => {
    const user = userEvent.setup();
    const { onExcluir } = montar();

    await user.click(botao('excluir lançamento'));
    await user.click(botao('cancelar'));

    expect(onExcluir).not.toHaveBeenCalled();
    expect(campo()).toBeInTheDocument();
  });

  it('fecha com Esc', async () => {
    const user = userEvent.setup();
    const { onFechar } = montar();
    await user.keyboard('{Escape}');
    expect(onFechar).toHaveBeenCalled();
  });
});

describe('ListaLancamentos', () => {
  const TRES = [
    GASTO,
    { ...GASTO, id: 'b', valor: 18, categoria: 'Lazer', data: '2026-09-08' },
    { ...GASTO, id: 'c', valor: 7.9, categoria: 'Metrô', data: '2026-08-31' },
  ];

  it('não renderiza nada em mês vazio', () => {
    const { container } = render(<ListaLancamentos gastos={[]} onSelecionar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra dia, categoria e valor de cada lançamento', () => {
    render(<ListaLancamentos gastos={TRES} onSelecionar={vi.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('10/09')).toBeInTheDocument();
    expect(screen.getByText('R$ 45,60')).toBeInTheDocument();
  });

  it('formata a data sem deslocamento de fuso', () => {
    // "2026-08-31" via `new Date()` vira 30/08 em fusos negativos.
    render(<ListaLancamentos gastos={TRES} onSelecionar={vi.fn()} />);
    expect(screen.getByText('31/08')).toBeInTheDocument();
  });

  it('entrega o lançamento tocado', async () => {
    const user = userEvent.setup();
    const onSelecionar = vi.fn();
    render(<ListaLancamentos gastos={TRES} onSelecionar={onSelecionar} />);

    await user.click(screen.getByRole('button', { name: /45,60 em Uber/i }));
    expect(onSelecionar).toHaveBeenCalledWith(TRES[0]);
  });

  it('não deixa abrir linha ainda pendente', () => {
    render(
      <ListaLancamentos gastos={[{ ...GASTO, pendente: true }]} onSelecionar={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /45,60 em Uber/i })).toBeDisabled();
  });
});
