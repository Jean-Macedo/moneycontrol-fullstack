# PRD-01 — Fundação do Projeto e Pipeline de Deploy

**Épico:** Infraestrutura
**Depende de:** —
**Bloqueia:** PRD-02, PRD-03, PRD-04, PRD-05
**Estimativa:** 0,5 a 1 dia

---

## 1. Objetivo

Ter um projeto React + Vite + Tailwind rodando localmente e publicado automaticamente na Vercel, com estrutura de pastas e variáveis de ambiente prontas para receber as features. Ao final, existe uma URL pública que abre no celular.

## 2. Por que isso primeiro

Todo o resto assume um build funcionando e um deploy contínuo. Sem isso não há como validar comportamento PWA (que exige HTTPS) nem testar em device real.

## 3. Escopo

### Dentro

- Scaffold Vite + React (JavaScript, não TypeScript — decisão de simplicidade para V2; ver §8).
- Tailwind CSS configurado com tema base (cores, espaçamentos, fonte).
- Estrutura de pastas do projeto.
- Variáveis de ambiente (`.env.local` + `.env.example`).
- Repositório Git com `.gitignore` correto.
- Projeto na Vercel conectado ao repositório, com deploy automático a cada push.
- Layout shell mobile-first: container centralizado, largura máxima, safe-area (barra de navegação por gestos do Android; notch do iPhone).

### Fora

- Qualquer lógica de negócio, chamada ao Supabase ou componente de gasto.
- Manifest e service worker (PRD-05).

## 4. Passos de implementação

### 4.1. Scaffold

```bash
npm create vite@latest gastos-app -- --template react
cd gastos-app
npm install
npm install @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 4.2. Tailwind

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        uber:  '#111827', // grafite
        lazer: '#7c3aed', // roxo
        metro: '#0ea5e9', // azul
        surface: '#0f172a',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body {
  @apply bg-slate-950 text-slate-100 antialiased;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: contain;
}
```

### 4.3. Estrutura de pastas

```
src/
├── main.jsx
├── App.jsx
├── index.css
├── lib/
│   ├── supabase.js        # cliente (PRD-02)
│   └── format.js          # moeda, datas, normalização de valor
├── hooks/
│   └── useGastos.js       # (PRD-02/03/04)
├── components/
│   ├── layout/
│   │   └── AppShell.jsx
│   ├── dashboard/         # (PRD-04)
│   └── lancamento/        # (PRD-03)
└── constants/
    └── categorias.js
```

`src/constants/categorias.js` — fonte única de verdade das categorias, consumida por PRD-03 e PRD-04:

```js
export const CATEGORIAS = [
  { id: 'Uber',  label: 'Uber',  cor: 'bg-uber',  corTexto: 'text-white' },
  { id: 'Lazer', label: 'Lazer', cor: 'bg-lazer', corTexto: 'text-white' },
  { id: 'Metrô', label: 'Metrô', cor: 'bg-metro', corTexto: 'text-white' },
];

export const CATEGORIA_IDS = CATEGORIAS.map((c) => c.id);
```

> **Atenção:** o valor gravado no banco é exatamente a string do `id`, incluindo o acento em `Metrô`. Não normalizar, não remover acento — o CHECK constraint do PRD-02 usa essa grafia.

### 4.4. Variáveis de ambiente

`.env.example` (versionado):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env.local` (nunca versionado) recebe os valores reais. Confirmar que `.gitignore` contém `.env.local`, `.env*.local`, `node_modules`, `dist`.

### 4.5. AppShell mobile-first

`src/components/layout/AppShell.jsx`:

```jsx
export default function AppShell({ children }) {
  return (
    <div className="min-h-full flex justify-center">
      <main className="w-full max-w-md px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
```

`index.html` — viewport correta para PWA:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
<meta name="theme-color" content="#0f172a" />
<title>Meus Gastos</title>
```

### 4.6. Deploy Vercel

1. Push do repositório para o GitHub.
2. Import do repositório na Vercel (framework detectado: Vite).
3. Configurar em *Settings → Environment Variables* as duas variáveis `VITE_*` para os ambientes Production e Preview.
4. Confirmar `Build Command: npm run build`, `Output Directory: dist`.
5. Validar que um push na branch principal gera deploy automático.

## 5. Critérios de aceite

- [x] `npm run dev` sobe a aplicação sem erros e o hot reload funciona. *(servidor sobe em ~250 ms e serve o cliente HMR; recarga a quente não exercitada com edição real)*
- [x] `npm run build` gera `dist/` sem warnings. *(191 KB / 60,5 KB gzip)*
- [x] Classes do Tailwind aplicam estilo. *(tema custom confirmado no CSS de saída: `bg-lazer` compila para `rgb(124 58 237)`)*
- [x] A URL de produção da Vercel abre no navegador do celular via HTTPS.
- [x] `.env.local` **não** aparece em `git status`.
- [x] Um push na branch principal dispara deploy e a mudança aparece na URL pública em menos de 2 minutos. *(5 deploys de produção confirmados via `vercel ls`, todos `Ready` em 4–7 s — bem abaixo do teto de 2 min)*
- [x] No **Android**, o conteúdo não fica escondido atrás da barra de navegação por gestos (safe-area respeitada). *(verificado em device real)*
- [ ] ~~No iPhone, o conteúdo não fica escondido atrás da barra inferior do Safari.~~ — **N/A, sem device iOS** (PRD-00 §8)
- [x] Não há barra de rolagem horizontal em viewport de 320 px de largura. *(verificado em device real)*

## 6. Riscos e cuidados

- **Variável de ambiente esquecida na Vercel:** o build passa mas o app quebra em runtime. Mitigação: em `src/lib/supabase.js` (PRD-02), lançar erro explícito na inicialização se a variável faltar.
- **Prefixo `VITE_`:** variáveis sem esse prefixo não chegam ao bundle. Não renomear.
- **Purge do Tailwind:** classes montadas por concatenação de string (`` `bg-${cor}` ``) são removidas no build. Sempre usar classes completas, como já feito em `categorias.js`.

## 7. Entregáveis

- Repositório Git com o scaffold e a estrutura de pastas acima.
- `.env.example` documentado.
- URL de produção na Vercel.
- README curto com: como rodar local, como configurar env, link do deploy.

## 8. Decisões registradas

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| JavaScript, não TypeScript | TypeScript | Escopo pequeno e fechado; velocidade de entrega. Se o projeto crescer, migrar é barato nesse tamanho. |
| Sem biblioteca de estado global | Redux, Zustand | Um único hook de dados atende toda a aplicação. |
| Sem router | React Router | A aplicação é uma tela só. |
