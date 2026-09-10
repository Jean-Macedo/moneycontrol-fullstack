import { CATEGORIAS } from '../../constants/categorias';

export default function BotoesCategoria({ onSelecionar, habilitado, salvando }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIAS.map((cat) => (
        <button
          key={cat.id}
          type="button"
          disabled={!habilitado || !!salvando}
          onClick={() => onSelecionar(cat.id)}
          aria-label={`Salvar gasto na categoria ${cat.label}`}
          aria-busy={salvando === cat.id}
          className={`${cat.cor} ${cat.corTexto} h-24 rounded-2xl font-semibold text-lg
                      transition active:scale-95
                      disabled:opacity-30 disabled:active:scale-100
                      focus:outline-none focus:ring-2 focus:ring-white/60`}
        >
          {salvando === cat.id ? '···' : cat.label}
        </button>
      ))}
    </div>
  );
}
