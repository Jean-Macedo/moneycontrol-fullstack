import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Oferece recarregar quando um deploy novo já está em cache.
 *
 * Com `autoUpdate`, o service worker baixa a versão nova sozinho, mas só a
 * aplica na próxima inicialização. Sem este aviso, o usuário continuaria vendo
 * a versão antiga sem entender por quê — inclusive depois de um bug corrigido.
 */
export default function AvisoAtualizacao() {
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  if (!precisaAtualizar) return null;

  return (
    <div
      role="status"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] inset-x-4 z-50
                 mx-auto max-w-md rounded-xl bg-sky-600 p-3 shadow-lg
                 flex items-center justify-between gap-3"
    >
      <span className="text-sm">Nova versão disponível</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1.5 rounded-lg bg-white text-sky-700 text-sm font-medium
                   active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Atualizar
      </button>
    </div>
  );
}
