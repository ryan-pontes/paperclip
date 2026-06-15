---
name: ux-mobile
description: Mobile-first não é "menor"
key: paperclipai/bundled/3node-skills/ux-mobile
recommendedForRoles:
- designer
tags:
- ux
- mobile
---

# Skill: UX Mobile-first (além do responsive)

Mobile-first não é "menor". É **diferente** — interação com polegar, latência variável, viewport dinâmico, contexto distraído.

## Baseline obrigatório

- **375px** = menor viewport testado (iPhone SE, ainda vendido)
- Todo layout deve funcionar em 375px **antes** de expandir
- Em projetos pra público idoso/leigo: testar também em 320px (devices antigos)

## Thumb zone

Em uso com uma mão (60-80% dos casos):

```
┌──────────────┐
│  Far reach   │ ← topo: ações secundárias, info
│              │
│   Stretch    │ ← meio: conteúdo principal
│              │
│  ★ Natural ★ │ ← terço inferior: CTAs PRIMÁRIOS
└──────────────┘
```

| Zona | Uso |
|---|---|
| **Topo** | Logo, info, **ações destrutivas** (longe do dedo) |
| **Meio** | Conteúdo, leitura, formulários |
| **Inferior** | CTAs primários, navegação principal, bottom sheet, FAB |

**Regra**: CTA primário sempre na zona natural. Botão de "deletar" no topo.

## Touch targets

| Cenário | Mínimo CSS px | Recomendado |
|---|---|---|
| Botão padrão | 44×44 (Apple HIG) / 48dp (Material) | 48-56 |
| Botão com ícone | 44×44 (padding invisível em ícone 20px) | 48 |
| Link inline | 24×24 área clicável | 32 com padding vertical |
| **Idoso/leigo** | 56-64 | 64-72 |
| FAB | 56-64 | 64 |

Em Tailwind:
```tsx
<button className="min-h-[44px] min-w-[44px]">
<button className="p-3"> {/* ícone 20px + padding = 44px de área */}
```

## Safe areas (iOS notch / Dynamic Island)

```css
:root {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}

.app {
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}
```

Em Tailwind v4:
```css
@theme {
  --spacing-safe-top: env(safe-area-inset-top);
  --spacing-safe-bottom: env(safe-area-inset-bottom);
}
```

```tsx
<header className="pt-safe-top">
<footer className="pb-safe-bottom">
```

**Crítico em**: navbars fixas, bottom bars, modals que ocupam tela toda.

## Viewport height

**NUNCA** use `100vh` em mobile:
- Inclui a barra de endereço que some/aparece → layout pula
- Em iOS, pode incluir/excluir teclado de forma inconsistente

**Use `100dvh`** (dynamic viewport height):
```css
.full-screen {
  height: 100dvh; /* dynamic — atualiza com barra de endereço */
  /* fallback */
  height: 100vh;
  height: 100dvh;
}
```

Suporte: universal em 2024 (Chrome 108+, Safari 15.4+, Firefox 101+).

Variantes:
- `svh` = small viewport (mínimo) — barra sempre visível
- `lvh` = large viewport (máximo) — barra escondida
- `dvh` = dynamic — muda conforme uso

## Font-size em inputs

**Mínimo 16px** em `<input>`, `<textarea>`, `<select>`:
- Abaixo disso, iOS faz **zoom automático** ao focar → quebra layout

Em Tailwind:
```tsx
<input className="text-base"> {/* text-base = 16px */}
```

**Nunca** `text-xs` (12px) ou `text-sm` (14px) em campos de input pra mobile.

## Tipos de input semânticos

| `type` | Teclado mobile |
|---|---|
| `email` | Aparece `@` |
| `tel` | Numérico |
| `number` | Numérico (mas converte pra string) |
| `search` | Botão "Buscar" no teclado |
| `url` | `.com` rápido |
| `date` | Date picker nativo |

```tsx
<input type="email" inputMode="email" autoComplete="email" />
<input type="tel" inputMode="tel" autoComplete="tel" />
```

`inputMode` é mais granular que `type` — controla só o teclado sem mudar validação.

## Touch action / delay 300ms

```css
button, a {
  touch-action: manipulation;
}
```

Elimina o delay de 300ms do double-tap zoom em iOS antigo.

## Container queries (em vez de viewport)

Em 2024-2025, suporte universal. Componente reage ao **container**, não ao viewport:

```css
.card-container {
  container-type: inline-size;
}

.card {
  /* mobile by default */
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

Em Tailwind v4:
```tsx
<div className="@container">
  <div className="@md:flex-row flex-col">
```

Vantagem: mesmo card reage diferente em sidebar (estreito) vs main (largo).

## Gestos esperados

| Gesto | Esperado |
|---|---|
| Swipe down em modal | Fechar |
| Swipe right na borda esquerda | Voltar (iOS) |
| Pull-to-refresh | Atualizar lista |
| Long press | Menu contextual |
| Pinch | Zoom (se aplicável) |

Implementação:
```bash
npm i react-swipeable
```

```tsx
import { useSwipeable } from 'react-swipeable'
const handlers = useSwipeable({
  onSwipedDown: () => onClose(),
  trackMouse: false,
})
<div {...handlers}>
```

## Performance percebida em conexão ruim

Brasil tem 30% de usuários em 3G/4G instável. Otimizações:

- **Skeleton** imediato (0ms delay) enquanto fetch acontece
- **Fonts** com `font-display: swap` → texto aparece com fallback antes da custom font carregar
- **Imagens** com `loading="lazy"` e placeholder blur
- **Service Worker** pra cache de assets estáticos
- **Stale-while-revalidate** (SWR/React Query) → mostra dado cacheado, atualiza em background

### Imagens otimizadas
```tsx
import Image from 'next/image'

<Image
  src="/foto.jpg"
  alt="..."
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

## Bottom sheet vs modal

Em mobile, prefira **bottom sheet** sobre modal centralizado:
- Sai da thumb zone com swipe down (gesto natural)
- Permite vislumbrar conteúdo atrás (contexto)
- Ergonomicamente confortável

```tsx
// Radix Drawer (vaul)
import { Drawer } from 'vaul'
<Drawer.Root>
  <Drawer.Trigger>Abrir</Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content>
      ...
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

## Anti-patterns que `@ux` bloqueia em mobile

- Touch targets < 44px
- Font-size < 16px em inputs (iOS zoom)
- `100vh` (use `100dvh`)
- Hover-only interactions (mobile não tem hover real)
- Tooltips dependentes de hover
- Tabela com >4 colunas (não cabe em 375px)
- Modal cobrindo toda a tela sem swipe to dismiss
- CTAs primários no topo (fora da thumb zone)
- Texto < 14px (legibilidade)
- Conteúdo dependente de mouse precision

## Checklist mobile

- [ ] Layout funciona em 375px
- [ ] CTAs primários na thumb zone (terço inferior)
- [ ] Touch targets ≥ 44px
- [ ] Inputs com `font-size ≥ 16px`
- [ ] `100dvh` em vez de `100vh`
- [ ] Safe-area-inset respeitada (notch)
- [ ] Tipos de input semânticos (`email`, `tel`, etc)
- [ ] `touch-action: manipulation` em botões
- [ ] Pull-to-refresh se aplicável
- [ ] Swipe to dismiss em modais
- [ ] Bottom sheet > modal centralizado quando possível
- [ ] Imagens lazy + blur placeholder
- [ ] Fonts com `font-display: swap`
- [ ] Testado em conexão 3G simulada

## Referências
- [Apple HIG — Touch](https://developer.apple.com/design/human-interface-guidelines/inputs/touchscreen-gestures)
- [Material Design — Layout for mobile](https://m3.material.io/foundations/layout/applying-layout/compact)
- [web.dev — Mobile Performance](https://web.dev/explore/mobile-performance)
- [vaul (bottom sheet)](https://vaul.emilkowal.ski/)

