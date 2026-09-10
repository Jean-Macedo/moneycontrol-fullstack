import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumoMensal from '../ResumoMensal';
import ErroCarregamento from '../ErroCarregamento';
import SeletorMes from '../SeletorMes';

const totais = (total, uber = 0, lazer = 0, metro = 0) => ({
  total,
  porCategoria: { Uber: uber, Lazer: lazer, 'Metrô': metro },
});

describe('ResumoMensal', () => {
  it('exibe o total formatado e a contagem de lançamentos', () => {
    render(<ResumoMensal totais={totais(54.9, 31.5, 18, 5.4)} quantidade={3} />);
    expect(screen.getByText('R$ 54,90')).toBeInTheDocument();
    expect(screen.getByText('3 lançamentos')).toBeInTheDocument();
  });

  it('usa o singular com um lançamento só', () => {
    render(<ResumoMensal totais={totais(12, 12)} quantidade={1} />);
    expect(screen.getByText('1 lançamento')).toBeInTheDocument();
  });

  it('mostra os três subtotais do período', () => {
    render(<ResumoMensal totais={totais(54.9, 31.5, 18, 5.4)} quantidade={3} />);
    expect(screen.getByText('R$ 31,50')).toBeInTheDocument();
    expect(screen.getByText('R$ 18,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 5,40')).toBeInTheDocument();
  });

  it('os percentuais exibidos somam 100', () => {
    render(<ResumoMensal totais={totais(30, 10, 10, 10)} quantidade={3} />);
    const pcts = screen
      .getAllByText(/^\d+%$/)
      .map((n) => Number(n.textContent.replace('%', '')));
    expect(pcts.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it('mês vazio mostra zeros e a mensagem, sem quebrar', () => {
    render(<ResumoMensal totais={totais(0)} quantidade={0} />);
    expect(screen.getByText('0 lançamentos')).toBeInTheDocument();
    expect(screen.getByText(/nenhum gasto neste mês/i)).toBeInTheDocument();
    expect(screen.getAllByText('R$ 0,00')).toHaveLength(4); // total + 3 categorias
  });

  it('mês com lançamentos não mostra a mensagem de vazio', () => {
    render(<ResumoMensal totais={totais(12, 12)} quantidade={1} />);
    expect(screen.queryByText(/nenhum gasto neste mês/i)).not.toBeInTheDocument();
  });

  it('carregando mostra o esqueleto em vez dos valores', () => {
    render(<ResumoMensal totais={totais(0)} quantidade={0} carregando />);
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Resumo do mês')).not.toBeInTheDocument();
  });
});

describe('ErroCarregamento', () => {
  it('anuncia o erro e oferece nova tentativa', async () => {
    const user = userEvent.setup();
    const onTentarNovamente = vi.fn();
    render(<ErroCarregamento onTentarNovamente={onTentarNovamente} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});

describe('SeletorMes', () => {
  const props = {
    ano: 2026,
    mes: 9,
    onAnterior: vi.fn(),
    onProximo: vi.fn(),
    onHoje: vi.fn(),
  };

  it('mostra o mês por extenso em português', () => {
    render(<SeletorMes {...props} ehMesCorrente />);
    expect(screen.getByText(/setembro de 2026/i)).toBeInTheDocument();
  });

  it('bloqueia avançar e voltar-para-hoje no mês corrente', () => {
    render(<SeletorMes {...props} ehMesCorrente />);
    expect(screen.getByRole('button', { name: /próximo mês/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /setembro de 2026/i })).toBeDisabled();
  });

  it('libera avançar quando um mês passado está selecionado', async () => {
    const user = userEvent.setup();
    const onProximo = vi.fn();
    render(<SeletorMes {...props} mes={8} onProximo={onProximo} ehMesCorrente={false} />);

    const proximo = screen.getByRole('button', { name: /próximo mês/i });
    expect(proximo).toBeEnabled();
    await user.click(proximo);
    expect(onProximo).toHaveBeenCalled();
  });

  it('voltar um mês é sempre possível', async () => {
    const user = userEvent.setup();
    const onAnterior = vi.fn();
    render(<SeletorMes {...props} ehMesCorrente onAnterior={onAnterior} />);

    await user.click(screen.getByRole('button', { name: /mês anterior/i }));
    expect(onAnterior).toHaveBeenCalled();
  });

  it('tocar no nome do mês volta ao corrente', async () => {
    const user = userEvent.setup();
    const onHoje = vi.fn();
    render(<SeletorMes {...props} mes={8} ehMesCorrente={false} onHoje={onHoje} />);

    await user.click(screen.getByRole('button', { name: /voltar para o mês corrente/i }));
    expect(onHoje).toHaveBeenCalled();
  });
});
