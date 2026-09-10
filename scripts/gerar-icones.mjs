/**
 * Gera os ícones do PWA a partir de uma definição vetorial única.
 *
 *   node scripts/gerar-icones.mjs
 *
 * O desenho é puramente geométrico — três barras decrescentes nas cores das
 * categorias. Nada de texto: fontes não são garantidas no rasterizador, e um
 * glifo que falha vira um retângulo vazio no ícone do usuário.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const FUNDO = '#0f172a'; // slate-950, mesmo do theme_color e da splash
const BARRAS = [
  { largura: 256, cor: '#38bdf8' }, // sky-400   — Metrô
  { largura: 190, cor: '#a78bfa' }, // violet-400 — Lazer
  { largura: 120, cor: '#e2e8f0' }, // slate-200  — Uber (o grafite some no escuro)
];

const LADO = 512;
const ALTURA_BARRA = 44;
const ESPACO = 24;
const X = 128;

function svg({ raioFundo }) {
  const alturaBloco = BARRAS.length * ALTURA_BARRA + (BARRAS.length - 1) * ESPACO;
  const y0 = (LADO - alturaBloco) / 2;

  const barras = BARRAS.map((b, i) => {
    const y = y0 + i * (ALTURA_BARRA + ESPACO);
    return `<rect x="${X}" y="${y}" width="${b.largura}" height="${ALTURA_BARRA}" rx="${ALTURA_BARRA / 2}" fill="${b.cor}"/>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">
    <rect width="${LADO}" height="${LADO}" rx="${raioFundo}" fill="${FUNDO}"/>
    ${barras}
  </svg>`;
}

// Cantos arredondados no ícone comum; quadrado cheio no maskable e no da Apple,
// porque os dois são recortados pelo próprio sistema.
const ARREDONDADO = svg({ raioFundo: 112 });
const CHEIO = svg({ raioFundo: 0 });

const png = (fonte, lado, destino, { opaco = false } = {}) => {
  let img = sharp(Buffer.from(fonte)).resize(lado, lado);
  // Sem canal alfa onde o sistema recorta por conta própria: o iOS pinta preto
  // no lugar da transparência, e um maskable transparente vaza o fundo do
  // launcher pelos cantos.
  if (opaco) img = img.flatten({ background: FUNDO });
  return img.png({ compressionLevel: 9 }).toFile(destino);
};

await mkdir('public/icons', { recursive: true });

await Promise.all([
  png(ARREDONDADO, 192, 'public/icons/icon-192.png'),
  png(ARREDONDADO, 512, 'public/icons/icon-512.png'),
  // Maskable: fundo sangrando até a borda. O conteúdo já cabe no círculo seguro
  // de 80% — o bloco de barras tem meia-diagonal de ~156 px contra um raio
  // seguro de ~205 px.
  png(CHEIO, 512, 'public/icons/icon-maskable-512.png', { opaco: true }),
  // iOS aplica a própria máscara e pinta preto onde houver alfa: PNG opaco.
  png(CHEIO, 180, 'public/apple-touch-icon.png', { opaco: true }),
  writeFile('public/favicon.svg', ARREDONDADO + '\n'),
]);

console.log('ícones gerados em public/icons/, public/apple-touch-icon.png e public/favicon.svg');
