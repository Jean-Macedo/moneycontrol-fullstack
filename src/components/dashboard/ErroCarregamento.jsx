export default function ErroCarregamento({ onTentarNovamente }) {
  return (
    <section
      role="alert"
      className="rounded-2xl bg-slate-900 border border-red-900 p-5 flex flex-col gap-3"
    >
      <div>
        <p className="font-medium text-red-200">Não foi possível carregar os gastos</p>
        <p className="text-sm text-slate-400 mt-1">
          Verifique sua conexão e tente novamente.
        </p>
      </div>
      <button
        type="button"
        onClick={onTentarNovamente}
        className="h-12 rounded-xl bg-slate-800 font-medium active:scale-95
                   focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        Tentar novamente
      </button>
    </section>
  );
}
