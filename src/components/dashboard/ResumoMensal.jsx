import { CATEGORIAS } from '../../constants/categorias';
import { formatarMoeda } from '../../lib/format';
import { percentuaisInteiros } from '../../lib/percentuais';
import SkeletonResumo from './SkeletonResumo';

export default function ResumoMensal({ totais, quantidade, carregando }) {
  if (carregando) return <SkeletonResumo />;

  const valores = CATEGORIAS.map((cat) => totais.porCategoria[cat.id] ?? 0);
  const percentuais = percentuaisInteiros(valores);
  const vazio = quantidade === 0;

  return (
    <section aria-label="Resumo do mês" className="flex flex-col gap-3">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <p className="text-sm text-slate-400">Total do mês</p>
        {/* tabular-nums mantém os dígitos alinhados entre atualizações; sem
            isso os valores dançam a cada lançamento. */}
        <p className="text-4xl font-bold tabular-nums mt-1">
          {formatarMoeda(totais.total)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {quantidade} {quantidade === 1 ? 'lançamento' : 'lançamentos'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CATEGORIAS.map((cat, i) => (
          <div
            key={cat.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-3"
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 shrink-0 rounded-full ${cat.cor}`} />
              <p className="text-xs text-slate-400 truncate">{cat.label}</p>
            </div>
            <p className="text-lg font-semibold tabular-nums mt-1">
              {formatarMoeda(valores[i])}
            </p>
            <p className="text-xs text-slate-500 tabular-nums">{percentuais[i]}%</p>
          </div>
        ))}
      </div>

      {vazio && (
        <p className="text-sm text-slate-500 text-center">Nenhum gasto neste mês</p>
      )}
    </section>
  );
}
