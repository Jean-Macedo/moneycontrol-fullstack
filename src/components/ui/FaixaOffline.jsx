/**
 * Aviso de que a rede caiu.
 *
 * O texto diz o que deixa de funcionar, não apenas que está offline. O app não
 * enfileira lançamentos (decisão do PRD-05 §7), então esconder isso levaria o
 * usuário a digitar valores que serão recusados.
 */
export default function FaixaOffline({ online }) {
  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 -mx-4 mb-1 px-4 py-2 bg-amber-600 text-amber-50
                 text-sm text-center font-medium"
    >
      Sem conexão — seus lançamentos não estão sendo salvos
    </div>
  );
}
