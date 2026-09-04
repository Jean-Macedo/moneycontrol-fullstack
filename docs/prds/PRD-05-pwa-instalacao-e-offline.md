# PRD-05 — PWA: Instalação, Offline e Identidade Visual

**Épico:** Experiência mobile
**Depende de:** PRD-01, PRD-03, PRD-04
**Bloqueia:** PRD-06
**Estimativa:** 1 dia

---

## 1. Objetivo

Transformar a aplicação web em um app instalável na tela inicial do celular, que abre em tela cheia, com ícone próprio, e que não quebra quando a rede oscila.

## 2. Requisitos de origem

> *Instalação PWA:* o app deve possuir suporte para ser adicionado à tela inicial do celular, funcionando com comportamento semelhante a um aplicativo nativo.
> *Experiência de Uso PWA:* o usuário acessa o link via navegador móvel, clica em "Adicionar à Tela Inicial". Um ícone personalizado é criado na gaveta de aplicativos. A partir daí, o app é aberto em tela cheia, ocultando as barras de navegação do navegador e proporcionando uma experiência fluida, idêntica à de um aplicativo nativo instalado por loja.

## 3. Escopo

### Dentro

- `manifest.webmanifest` completo.
- Conjunto de ícones (192, 512, maskable, apple-touch-icon).
- Service worker via `vite-plugin-pwa` com `registerType: 'autoUpdate'`.
- Estratégia de cache: app shell precached, chamadas ao Supabase sempre na rede.
- Detecção de offline com aviso visível ao usuário.
- Fila de lançamentos offline (opcional, ver §7 — decidir antes de implementar).
- Prompt de atualização quando há nova versão publicada.
- Meta tags específicas do iOS.

### Fora

- Notificações push.
- Background sync via Periodic Sync API.
- Publicação em lojas de aplicativos (TWA/Capacitor).
- Cache de dados históricos para leitura offline completa.

## 4. Implementação

### 4.1. Plugin

```bash
npm install -D vite-plugin-pwa
```

`vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Meus Gastos',
        short_name: 'Gastos',
        description: 'Registro rápido de gastos diários',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512',
            type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Dados nunca vêm do cache: saldo errado é pior que tela vazia.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
```

> **Decisão registrada:** `NetworkOnly` para o Supabase. Um total mensal servido do cache é um número errado apresentado com a mesma confiança de um número certo — o pior resultado possível num app de finanças. Melhor mostrar o aviso de offline.

### 4.2. Ícones

Gerar a partir de um SVG de origem (símbolo simples: cifrão ou seta, alto contraste, legível a 48 px):

| Arquivo | Tamanho | Uso |
|---|---|---|
| `public/icons/icon-192.png` | 192×192 | Android, gaveta de apps |
| `public/icons/icon-512.png` | 512×512 | Splash screen |
| `public/icons/icon-maskable-512.png` | 512×512 | Android adaptativo — conteúdo dentro do círculo seguro de 80% |
| `public/apple-touch-icon.png` | 180×180 | iOS — **sem transparência**, o iOS renderiza fundo preto no lugar do alfa |
| `public/favicon.svg` | — | Aba do navegador |

O ícone maskable precisa de margem: o Android recorta as bordas em círculo, losango ou squircle conforme o launcher. Conteúdo colado na borda some.

### 4.3. Meta tags do iOS

O Safari ignora parte do manifest. Adicionar em `index.html`:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Gastos" />
<meta name="mobile-web-app-capable" content="yes" />
```

Com `black-translucent`, o conteúdo passa por baixo da barra de status — daí a `safe-area-inset` já aplicada no `AppShell` (PRD-01 §4.5).

### 4.4. Indicador de offline

`src/hooks/useOnline.js`:

```js
import { useEffect, useState } from 'react';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const sobe = () => setOnline(true);
    const cai  = () => setOnline(false);
    window.addEventListener('online', sobe);
    window.addEventListener('offline', cai);
    return () => {
      window.removeEventListener('online', sobe);
      window.removeEventListener('offline', cai);
    };
  }, []);
  return online;
}
```

Renderizar uma faixa fixa no topo quando `!online`: *"Sem conexão — seus lançamentos não estão sendo salvos"*. A honestidade aqui importa mais que a estética.

### 4.5. Prompt de atualização

```jsx
import { useRegisterSW } from 'virtual:pwa-register/react';

export function AvisoAtualizacao() {
  const { needRefresh: [precisa], updateServiceWorker } = useRegisterSW();
  if (!precisa) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 z-50 rounded-xl bg-sky-600 p-3
                    flex items-center justify-between gap-3">
      <span className="text-sm">Nova versão disponível</span>
      <button onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 rounded-lg bg-white text-sky-700 text-sm font-medium">
        Atualizar
      </button>
    </div>
  );
}
```

## 5. Critérios de aceite

**Instalação**

- [ ] No Chrome Android, o menu oferece "Instalar app" ou "Adicionar à tela inicial".
- [ ] ~~No Safari iOS, "Compartilhar → Adicionar à Tela de Início" cria o atalho com o ícone personalizado.~~ — **N/A, sem device iOS** (PRD-00 §8)
- [ ] No Chrome Android, o prompt `beforeinstallprompt` dispara e o botão "Instalar" da própria interface conclui a instalação.
- [ ] O ícone na tela inicial é o do app, não uma miniatura da página.
- [ ] Aberto pelo ícone, o app roda em tela cheia, sem barra de URL.
- [ ] A splash screen usa `background_color` e o ícone 512.
- [ ] O nome exibido sob o ícone é "Gastos".
- [ ] O Lighthouse (categoria PWA) passa em "Installable" sem erros.

**Comportamento**

- [ ] Com o app instalado e o avião ligado, abrir o app carrega a interface (shell em cache) em vez de tela de erro do navegador.
- [ ] Offline, a faixa de aviso aparece.
- [ ] Offline, tentar salvar exibe erro claro — e não trava a interface nem finge sucesso.
- [ ] Voltando a conexão, a faixa some e um novo lançamento salva normalmente.
- [ ] Após um deploy novo, o app oferece atualizar; aceitar carrega a versão nova.
- [ ] O conteúdo respeita a safe-area em modo standalone no **Android** (barra de gestos).
- [ ] ~~O conteúdo respeita a safe-area no iPhone com notch, em modo standalone.~~ — **N/A, sem device iOS** (PRD-00 §8)
- [ ] Nenhum recurso do Supabase é servido do cache (verificar na aba Network do DevTools).

## 6. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Service worker servindo bundle antigo | Usuário reporta bug já corrigido | `autoUpdate` + prompt explícito de atualização |
| Cache de resposta do Supabase | Total mensal errado | `NetworkOnly` para o domínio, verificado em teste |
| Ícone maskable cortado | Ícone feio ou ilegível | Conteúdo dentro do círculo seguro de 80% |
| `apple-touch-icon` com transparência | Fundo preto no iOS | PNG opaco — **não validável**, sem device iOS |
| Safari limpando dados do site | Perda de cache (não de dados — estão na nuvem) | Aceito: a fonte de verdade é o Supabase |

## 7. Fila offline — decisão pendente

Persistir lançamentos feitos offline em IndexedDB e sincronizar ao voltar a conexão.

**A favor:** metrô sem sinal é exatamente onde se lança um gasto de Metrô.
**Contra:** dobra a complexidade da camada de escrita, exige resolução de conflito e desduplicação, e um lançamento "salvo" que nunca sincroniza é pior que um erro explícito.

**Recomendação:** ficar fora da V2, com o erro honesto do §4.4. Reavaliar depois de duas semanas de uso real — se o usuário perder lançamentos com frequência, implementar como primeira feature da V3.

## 8. Entregáveis

- `vite.config.js` com `VitePWA` configurado.
- Conjunto de ícones em `public/icons/` + `apple-touch-icon.png` + `favicon.svg`.
- Meta tags do iOS em `index.html`.
- `src/hooks/useOnline.js` e a faixa de aviso.
- Componente `AvisoAtualizacao`.
- Relatório Lighthouse da categoria PWA anexado ao PR.
