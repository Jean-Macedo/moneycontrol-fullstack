/**
 * Stub de `virtual:pwa-register/react` para os testes.
 *
 * O módulo virtual é criado pelo vite-plugin-pwa durante dev e build, e não
 * existe no ambiente do Vitest. O stub devolve o formato que o componente
 * espera, com o estado de "sem atualização pendente".
 */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: () => {},
  };
}
