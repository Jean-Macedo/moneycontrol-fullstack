// Fonte única de verdade das categorias (PRD-00 §3: escopo fixo e fechado).
// O `id` é gravado literalmente no banco, acento incluso — o CHECK constraint
// do PRD-02 usa exatamente esta grafia. Não normalizar, não remover acento.
export const CATEGORIAS = [
  { id: 'Uber', label: 'Uber', cor: 'bg-uber', corTexto: 'text-white' },
  { id: 'Lazer', label: 'Lazer', cor: 'bg-lazer', corTexto: 'text-white' },
  { id: 'Metrô', label: 'Metrô', cor: 'bg-metro', corTexto: 'text-white' },
];

export const CATEGORIA_IDS = CATEGORIAS.map((c) => c.id);
