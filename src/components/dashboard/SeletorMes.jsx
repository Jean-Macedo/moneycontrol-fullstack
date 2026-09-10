import { nomeDoMes } from '../../lib/format';

export default function SeletorMes({ ano, mes, ehMesCorrente, onAnterior, onProximo, onHoje }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onAnterior}
        aria-label="Mês anterior"
        className="w-12 h-12 shrink-0 rounded-full bg-slate-900 text-xl
                   active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        ‹
      </button>

      <button
        type="button"
        onClick={onHoje}
        disabled={ehMesCorrente}
        aria-label={ehMesCorrente ? undefined : 'Voltar para o mês corrente'}
        className="flex-1 h-12 text-lg font-medium capitalize rounded-xl
                   disabled:opacity-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        {nomeDoMes(ano, mes)}
      </button>

      {/* Navegar para o futuro fica bloqueado: não há gasto lançado adiante, e
          uma tela zerada sem explicação parece defeito. */}
      <button
        type="button"
        onClick={onProximo}
        disabled={ehMesCorrente}
        aria-label="Próximo mês"
        className="w-12 h-12 shrink-0 rounded-full bg-slate-900 text-xl
                   active:scale-95 disabled:opacity-30 disabled:active:scale-100
                   focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        ›
      </button>
    </div>
  );
}
