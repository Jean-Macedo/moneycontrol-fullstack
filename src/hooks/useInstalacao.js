import { useCallback, useEffect, useState } from 'react';

/**
 * Instalação do PWA pelo prompt nativo do Chrome.
 *
 * O `beforeinstallprompt` só existe em navegadores baseados em Chromium, e o
 * evento precisa ser capturado no momento em que dispara — depois não há como
 * pedi-lo de volta. Onde não existe (Safari, ou app já instalado), `podeInstalar`
 * fica falso e a interface simplesmente não oferece o botão.
 */
export function useInstalacao() {
  const [evento, setEvento] = useState(null);

  useEffect(() => {
    const capturar = (e) => {
      e.preventDefault(); // impede a barra automática do Chrome
      setEvento(e);
    };
    const instalado = () => setEvento(null);

    window.addEventListener('beforeinstallprompt', capturar);
    window.addEventListener('appinstalled', instalado);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturar);
      window.removeEventListener('appinstalled', instalado);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return false;
    evento.prompt();
    const { outcome } = await evento.userChoice;
    // O evento é de uso único: aceito ou recusado, não serve de novo.
    setEvento(null);
    return outcome === 'accepted';
  }, [evento]);

  return { podeInstalar: evento !== null, instalar };
}
