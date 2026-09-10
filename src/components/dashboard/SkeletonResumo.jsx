/**
 * Espelha a altura exata do ResumoMensal. Se divergir, a tela salta quando os
 * dados chegam — o oposto do que um skeleton existe para evitar.
 */
export default function SkeletonResumo() {
  return (
    <section aria-hidden="true" className="flex flex-col gap-3 animate-pulse">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="h-4 w-24 rounded bg-slate-800" />
        <div className="h-10 w-48 rounded bg-slate-800 mt-2" />
        <div className="h-3 w-20 rounded bg-slate-800 mt-2" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-slate-900 border border-slate-800 p-3">
            <div className="h-3 w-12 rounded bg-slate-800" />
            <div className="h-6 w-16 rounded bg-slate-800 mt-2" />
            <div className="h-3 w-8 rounded bg-slate-800 mt-1" />
          </div>
        ))}
      </div>
    </section>
  );
}
