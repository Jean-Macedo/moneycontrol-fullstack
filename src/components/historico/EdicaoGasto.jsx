import { useEffect, useRef, useState } from 'react';
import { CATEGORIAS } from '../../constants/categorias';
import { parseValor } from '../../lib/parseValor';
import { formatarMoeda } from '../../lib/format';

/** 45.6 -> "45,60". O usuário não deveria ter que reinterpretar o próprio número. */
const paraCampo = (valor) => valor.toFixed(2).replace('.', ',');

export default function EdicaoGasto({ gasto, onSalvar, onExcluir, onFechar }) {
  const [texto, setTexto] = useState(() => paraCampo(gasto.valor));
  const [categoria, setCategoria] = useState(gasto.categoria);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === 'Escape' && !ocupado) onFechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar, ocupado]);

  const valor = parseValor(texto);
  const mudou = valor !== gasto.valor || categoria !== gasto.categoria;
  const podeSalvar = valor != null && mudou && !ocupado;

  async function executar(acao, mensagemDeErro) {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
      onFechar();
    } catch {
      setErro(mensagemDeErro);
      setOcupado(false);
    }
  }

  const salvar = () =>
    podeSalvar &&
    executar(
      () => onSalvar({ id: gasto.id, valor, categoria }),
      'Não foi possível salvar. Tente de novo.'
    );

  const excluir = () =>
    executar(() => onExcluir(gasto.id), 'Não foi possível excluir. Tente de novo.');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Toque fora fecha. É `button` para o leitor de tela anunciar a ação. */}
      <button
        type="button"
        aria-label="Fechar edição"
        onClick={() => !ocupado && onFechar()}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar lançamento"
        className="relative w-full max-w-md rounded-t-3xl bg-slate-900 border-t border-x border-slate-800
                   p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-slate-700" aria-hidden="true" />

        {confirmando ? (
          <>
            <p className="text-base font-medium mt-2">
              Excluir {formatarMoeda(gasto.valor)} em {gasto.categoria}?
            </p>
            <p className="text-sm text-slate-400 -mt-1">Não dá para desfazer.</p>

            {erro && (
              <p role="alert" className="text-sm text-red-300">
                {erro}
              </p>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={ocupado}
                className="flex-1 h-14 rounded-2xl bg-slate-800 font-medium
                           active:scale-95 disabled:opacity-40
                           focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluir}
                disabled={ocupado}
                className="flex-1 h-14 rounded-2xl bg-red-600 font-semibold
                           active:scale-95 disabled:opacity-40
                           focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {ocupado ? 'Excluindo···' : 'Excluir'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-500">
                R$
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                aria-label="Valor do gasto em reais"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && salvar()}
                className="w-full h-16 pl-12 pr-4 rounded-2xl bg-slate-950 border border-slate-800
                           text-3xl font-semibold tabular-nums text-right
                           focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CATEGORIAS.map((cat) => {
                const ativa = cat.id === categoria;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoria(cat.id)}
                    aria-pressed={ativa}
                    className={`${cat.cor} ${cat.corTexto} h-14 rounded-2xl font-semibold
                                transition active:scale-95
                                focus:outline-none focus:ring-2 focus:ring-white/60
                                ${ativa ? 'ring-2 ring-white' : 'opacity-40'}`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {erro && (
              <p role="alert" className="text-sm text-red-300">
                {erro}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onFechar}
                disabled={ocupado}
                className="flex-1 h-14 rounded-2xl bg-slate-800 font-medium
                           active:scale-95 disabled:opacity-40
                           focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={!podeSalvar}
                className="flex-1 h-14 rounded-2xl bg-sky-600 font-semibold
                           active:scale-95 disabled:opacity-30 disabled:active:scale-100
                           focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {ocupado ? 'Salvando···' : 'Salvar'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={ocupado}
              className="h-12 rounded-2xl text-red-400 text-sm font-medium
                         active:scale-95 disabled:opacity-40
                         focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Excluir lançamento
            </button>
          </>
        )}
      </div>
    </div>
  );
}
