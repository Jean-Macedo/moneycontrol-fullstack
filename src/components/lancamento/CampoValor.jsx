import { forwardRef } from 'react';

const CampoValor = forwardRef(function CampoValor({ valor, onChange }, ref) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500">
        R$
      </span>
      <input
        ref={ref}
        // type="text" e não "number": o number bloqueia a vírgula em alguns
        // teclados, mostra setas de incremento no desktop e descarta entradas
        // intermediárias em silêncio. inputMode="decimal" traz o teclado
        // numérico sem abrir mão do controle da validação.
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoCorrect="off"
        placeholder="0,00"
        aria-label="Valor do gasto em reais"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-20 pl-14 pr-4 rounded-2xl bg-slate-900 border border-slate-800
                   text-4xl font-semibold tabular-nums text-right
                   focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );
});

export default CampoValor;
