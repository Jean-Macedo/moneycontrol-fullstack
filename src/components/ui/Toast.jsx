import { useEffect } from 'react';

const ESTILO = {
  ok: 'bg-emerald-600 text-white',
  erro: 'bg-red-600 text-white',
};

/**
 * Aviso efêmero. Fica em `fixed` de propósito: sair do fluxo do documento é o
 * que garante o critério de "nenhum layout shift" do PRD-03 §7.
 */
export default function Toast({ toast, onFechar, duracaoMs = 2500 }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onFechar, duracaoMs);
    return () => clearTimeout(id);
  }, [toast, onFechar, duracaoMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))]
                 flex justify-center px-4 pointer-events-none z-50"
    >
      {toast && (
        <div
          className={`${ESTILO[toast.tipo] ?? ESTILO.ok} max-w-md w-full
                      rounded-xl px-4 py-3 text-center font-medium shadow-lg`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
