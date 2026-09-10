import { CATEGORIAS } from '../../constants/categorias';
import { formatarMoeda } from '../../lib/format';

const CORES = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.cor]));

/** "2026-09-10" -> "10/09". Fatiar a string evita o fuso do construtor Date. */
const diaEMes = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function ListaLancamentos({ gastos, onSelecionar }) {
  if (gastos.length === 0) return null;

  return (
    <section aria-label="Histórico de lançamentos" className="flex flex-col gap-2">
      <h2 className="text-sm text-slate-400">Histórico</h2>

      <ul className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {gastos.map((g) => (
          <li key={g.id} className="border-b border-slate-800 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelecionar(g)}
              disabled={g.pendente}
              aria-label={`Editar ${formatarMoeda(g.valor)} em ${g.categoria}, dia ${diaEMes(g.data)}`}
              className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left
                         active:bg-slate-800 disabled:opacity-50
                         focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500"
            >
              <span className={`w-2 h-2 shrink-0 rounded-full ${CORES[g.categoria] ?? 'bg-slate-500'}`} />
              <span className="text-sm text-slate-400 tabular-nums w-12 shrink-0">
                {diaEMes(g.data)}
              </span>
              <span className="text-sm truncate flex-1">{g.categoria}</span>
              <span className="font-semibold tabular-nums">{formatarMoeda(g.valor)}</span>
              <span aria-hidden="true" className="text-slate-600">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
