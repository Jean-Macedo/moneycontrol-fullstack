import AppShell from './components/layout/AppShell';
import { CATEGORIAS } from './constants/categorias';
import { formatarMoeda } from './lib/format';

// Placeholder da fundação (PRD-01). O dashboard entra no PRD-04 e o
// cadastro rápido no PRD-03 — este conteúdo existe apenas para validar
// que o Tailwind, a estrutura de pastas e o safe-area estão corretos.
export default function App() {
  return (
    <AppShell>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Meus Gastos</h1>
        <p className="text-sm text-slate-400">Fundação do projeto — PRD-01</p>
      </header>

      <section className="rounded-2xl bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Gasto total do mês</p>
        <p className="text-4xl font-bold tabular-nums">{formatarMoeda(0)}</p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {CATEGORIAS.map((categoria) => (
          <div
            key={categoria.id}
            className={`${categoria.cor} ${categoria.corTexto} rounded-2xl p-4 min-h-14`}
          >
            <p className="text-xs opacity-80">{categoria.label}</p>
            <p className="text-lg font-semibold tabular-nums">{formatarMoeda(0)}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
