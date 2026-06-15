---
name: design-tokens
description: Tokens são a fonte única da verdade do design system
key: paperclipai/bundled/3node-skills/design-tokens
recommendedForRoles:
- designer
tags:
- design
- tokens
---

# Skill: Design Tokens (DTCG + Tailwind v4)

Tokens são a fonte única da verdade do design system. Usado pelo `@joao` ao criar/atualizar `DESIGN.md`.

## DTCG (Design Token Community Group) — padrão W3C

Formato JSON oficial pra design tokens. Compatível com Style Dictionary v4 e Tokens Studio for Figma.

```json
{
  "color": {
    "brand": {
      "primary": {
        "$value": "#1F8FBF",
        "$type": "color",
        "$description": "Cor primária da marca — botões e elementos de ação"
      },
      "accent": {
        "$value": "#E8A33D",
        "$type": "color"
      }
    },
    "neutral": {
      "bg": { "$value": "#0A0A0A", "$type": "color" },
      "surface": { "$value": "#1A1A1A", "$type": "color" },
      "text": { "$value": "#E5E5E5", "$type": "color" }
    }
  },
  "spacing": {
    "xs": { "$value": "4px", "$type": "dimension" },
    "sm": { "$value": "8px", "$type": "dimension" },
    "md": { "$value": "16px", "$type": "dimension" }
  },
  "radius": {
    "sm": { "$value": "4px", "$type": "dimension" },
    "md": { "$value": "8px", "$type": "dimension" },
    "full": { "$value": "9999px", "$type": "dimension" }
  }
}
```

## Tailwind CSS v4 — `@theme` nativo

Tailwind v4 elimina `tailwind.config.js`. Tokens viram CSS custom properties em `@theme`:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Cores */
  --color-bg: oklch(0.15 0 0);
  --color-surface: oklch(0.2 0 0);
  --color-text: oklch(0.93 0 0);
  --color-text-muted: oklch(0.6 0 0);
  --color-accent: oklch(0.65 0.18 220);
  --color-accent-hover: oklch(0.7 0.18 220);

  /* Tipografia */
  --font-display: 'Syne', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;

  /* Spacing — escala 4px */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Motion */
  --ease-primary: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-slow: 400ms;

  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.2);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4);

  /* Safe areas (mobile) */
  --spacing-safe-top: env(safe-area-inset-top);
  --spacing-safe-bottom: env(safe-area-inset-bottom);
}

/* Dark mode override */
@media (prefers-color-scheme: light) {
  @theme {
    --color-bg: oklch(1 0 0);
    --color-surface: oklch(0.98 0 0);
    --color-text: oklch(0.15 0 0);
    --color-text-muted: oklch(0.4 0 0);
  }
}
```

### Usar em Tailwind classes
```tsx
<div className="bg-bg text-text">
<button className="bg-accent hover:bg-accent-hover text-text">
<p className="font-display text-2xl">
```

## OKLCH em vez de HEX/RGB

Espaço de cor perceptualmente uniforme:
- L (Lightness): 0-1
- C (Chroma): 0-0.5 (saturação)
- H (Hue): 0-360°

```css
--color-primary: oklch(0.65 0.18 220);  /* blue */
--color-primary-hover: oklch(0.7 0.18 220);  /* mais claro, mesma cor */
```

**Vantagens:**
- Variar lightness preserva matiz percebido
- Calcular tons relacionados (`oklch(L * 1.1 C H)` = 10% mais claro)
- Suporte universal em 2024+

## Estrutura de pasta

```
tokens/
  brand.json          ← cores, tipografia da marca
  spacing.json        ← spacing scale
  motion.json         ← easing, durations
  components/
    button.json
    card.json
build/
  tailwind.css        ← gerado pelo Style Dictionary (ou direto @theme)
```

## Style Dictionary v4 (opcional)

Se precisar exportar pra outras plataformas (iOS, Android, Figma):

```bash
npm i -D style-dictionary
```

```javascript
// config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/",
      "files": [{ "destination": "tokens.css", "format": "css/variables" }]
    },
    "tailwind": {
      "transformGroup": "css",
      "buildPath": "build/",
      "files": [{
        "destination": "tailwind-theme.css",
        "format": "css/variables",
        "options": { "selector": "@theme" }
      }]
    }
  }
}
```

```bash
npx style-dictionary build
```

## Tokens Studio for Figma

Plugin pra Figma que:
- Edita tokens visualmente
- Exporta JSON DTCG
- Sincroniza com GitHub

Fluxo:
1. Designer edita no Figma (Tokens Studio)
2. Plugin commita JSON no repo
3. CI roda Style Dictionary (ou aplica direto)
4. Deploy com tokens atualizados

## Anti-patterns

- HEX direto em CSS class (`bg-[#1F8FBF]`) — não usa token
- Cores semânticas misturadas com primitivas (`--color-success: #10B981` direto)
- Sem dark mode (mesmo token vale pros 2)
- Spacing arbitrário (`p-[13px]`) — usa escala
- Tipografia sem escala (`text-[17px]`)
- Token sem `$description` em cores semânticas

## Pattern: primitives → semantics → components

```css
@theme {
  /* PRIMITIVES — cor real */
  --blue-50: oklch(0.97 0.02 220);
  --blue-500: oklch(0.65 0.18 220);
  --blue-900: oklch(0.3 0.18 220);

  /* SEMANTICS — papel da cor */
  --color-accent: var(--blue-500);
  --color-accent-hover: var(--blue-600);
  --color-bg: var(--gray-950);
  --color-text: var(--gray-100);

  /* COMPONENTS — uso específico */
  --color-button-primary-bg: var(--color-accent);
  --color-button-primary-text: var(--color-bg);
}
```

Vantagem: mudar `--color-accent` propaga pra todos componentes que usam.

## Tipografia tokens

```css
@theme {
  --font-display: 'Syne', serif;
  --font-body: 'Inter', sans-serif;

  /* Escala — usa contraste forte */
  --text-xs: 0.6875rem;    /* 11px — captions */
  --text-sm: 0.8125rem;    /* 13px — secondary */
  --text-base: 0.9375rem;  /* 15px — body */
  --text-lg: 1.125rem;     /* 18px — emphasis */
  --text-xl: 1.5rem;       /* 24px — headings small */
  --text-2xl: 2rem;        /* 32px — headings */
  --text-3xl: 3rem;        /* 48px — display */

  /* Line height por tamanho */
  --line-height-tight: 1.2;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.7;

  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-base: 0;
  --tracking-wide: 0.02em;
}
```

**Nunca usar fontes default:** Inter, Roboto, Arial, system-ui. Cada projeto escolhe **fonte distinta**.

## Motion tokens

```css
@theme {
  /* Easing */
  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Duration */
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-slow: 400ms;
  --duration-deliberate: 800ms;
}
```

## Checklist de tokens

- [ ] Cores em OKLCH (perceptualmente uniforme)
- [ ] Estrutura primitives → semantics → components
- [ ] Dark mode via `@media (prefers-color-scheme)`
- [ ] Tipografia com escala definida (sem arbitrary)
- [ ] Spacing scale (4px ou 8px base)
- [ ] Motion tokens (easing + duration)
- [ ] Sem fontes default (Inter/Roboto/Arial)
- [ ] Cada cor importante tem `$description` (DTCG)
- [ ] Contraste WCAG AA validado em ambos os temas

## Referências
- [Tailwind v4 — Theme variables](https://tailwindcss.com/docs/theme)
- [DTCG specification](https://tr.designtokens.org/format/)
- [Style Dictionary v4](https://styledictionary.com/)
- [Tokens Studio for Figma](https://tokens.studio/)
- [OKLCH color picker](https://oklch.com/)
- [Refactoring UI — Color](https://www.refactoringui.com/previews/building-your-color-palette)

