import { useEffect, useState } from 'react';

/** Estado da conexão, a partir dos eventos do navegador. */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const sobe = () => setOnline(true);
    const cai = () => setOnline(false);
    window.addEventListener('online', sobe);
    window.addEventListener('offline', cai);
    return () => {
      window.removeEventListener('online', sobe);
      window.removeEventListener('offline', cai);
    };
  }, []);

  return online;
}
