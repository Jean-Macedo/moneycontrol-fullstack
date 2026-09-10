import { useInstalacao } from '../../hooks/useInstalacao';

export default function BotaoInstalar() {
  const { podeInstalar, instalar } = useInstalacao();
  if (!podeInstalar) return null;

  return (
    <button
      type="button"
      onClick={instalar}
      className="w-full h-12 rounded-2xl border border-sky-800 bg-sky-950/60
                 text-sm text-sky-200 font-medium active:scale-95 transition
                 focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      Instalar na tela inicial
    </button>
  );
}
