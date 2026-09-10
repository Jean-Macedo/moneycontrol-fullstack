import { useCallback, useState } from 'react';
import AppShell from './components/layout/AppShell';
import CadastroRapido from './components/lancamento/CadastroRapido';
import Toast from './components/ui/Toast';
import { useGastos } from './hooks/useGastos';
import { CATEGORIAS } from './constants/categorias';
import { formatarMoeda, nomeDoMes } from './lib/format';

export default function App() {
  // Mês corrente fixo. O seletor com navegação entre meses é o PRD-04.
  const [periodo] = useState(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  });

  const [toast, setToast] = useState(null);
  const fecharToast = useCallback(() => setToast(null), []);

  const { totais, carregando, erro, adicionar } = useGastos(periodo.ano, periodo.mes);

  return (
    <>
      <AppShell>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Meus Gastos</h1>
          <p className="text-sm text-slate-400 first-letter:uppercase">
            {nomeDoMes(periodo.ano, periodo.mes)}
          </p>
        </header>

        {erro && (
          <p role="alert" className="rounded-xl bg-red-950 text-red-200 px-4 py-3 text-sm">
            Não foi possível carregar os lançamentos. Verifique a conexão.
          </p>
        )}

        <section className="rounded-2xl bg-slate-900 p-5" aria-label="Resumo do mês">
          <p className="text-sm text-slate-400">Gasto total do mês</p>
          <p className="text-4xl font-bold tabular-nums">
            {carregando ? '—' : formatarMoeda(totais.total)}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-3" aria-label="Totais por categoria">
          {CATEGORIAS.map((categoria) => (
            <div
              key={categoria.id}
              className={`${categoria.cor} ${categoria.corTexto} rounded-2xl p-4`}
            >
              <p className="text-xs opacity-80">{categoria.label}</p>
              <p className="text-lg font-semibold tabular-nums">
                {carregando ? '—' : formatarMoeda(totais.porCategoria[categoria.id])}
              </p>
            </div>
          ))}
        </section>

        <CadastroRapido adicionar={adicionar} onToast={setToast} />
      </AppShell>

      <Toast toast={toast} onFechar={fecharToast} />
    </>
  );
}
