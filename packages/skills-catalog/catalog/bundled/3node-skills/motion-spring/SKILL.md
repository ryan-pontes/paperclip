---
name: motion-spring
description: Motion não é só "funcionalidade" — é parte da identidade da marca
key: paperclipai/bundled/3node-skills/motion-spring
recommendedForRoles:
- designer
tags:
- motion
- spring
---

# Skill: Motion as Brand Language (Spring physics + personality)

Motion não é só "funcionalidade" — é parte da identidade da marca. Usado pelo `@joao` ao definir motion no `DESIGN.md`. Complementa `ux-motion.md` (que cobre o "como técnico").

## Motion como linguagem

Cada marca tem personalidade de movimento:

| Marca/produto | Personalidade motion |
|---|---|
| Apple (iOS) | Spring natural, overshoot suave, sensação de objeto físico |
| Linear | Direto, rápido (200ms), zero ornamentação |
| Stripe | Editorial, transições suaves, sensação premium |
| Duolingo | Playful, bouncy, gameificado |
| Notion | Quieto, funcional, sem distrair |

**Pergunta-chave**: a marca é **calma**, **expressiva**, **séria** ou **playful**?

## Personalidades pré-definidas

### Calma (Notion-like)
- Easing: standard (`cubic-bezier(0.4, 0, 0.2, 1)`)
- Duração: rápido (150-200ms)
- Sem overshoot, sem bounce
- Transições funcionais

```css
@theme {
  --ease-primary: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-enter: 150ms;
  --duration-exit: 100ms;
}
```

### Expressiva (Apple/Material 3 Expressive)
- Easing: spring com overshoot
- Duração: média (250-350ms)
- Bounce sutil em entradas
- Sensação de objeto físico

```css
@theme {
  --ease-primary: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-enter: 300ms;
  --duration-exit: 200ms;
}
```

### Editorial (Stripe-like)
- Easing: smooth ease-out
- Duração: lenta deliberada (400-600ms)
- Movimentos elegantes
- Premium feel

```css
@theme {
  --ease-primary: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-enter: 500ms;
  --duration-exit: 300ms;
}
```

### Playful (Duolingo-like)
- Easing: spring expressivo, bounce forte
- Duração: variada com personalidade
- Reações visuais
- Reward states (confetti, bounce)

```css
@theme {
  --ease-primary: cubic-bezier(0.68, -0.55, 0.27, 1.55);
  --duration-enter: 400ms;
  --duration-exit: 250ms;
}
```

## Spring physics — stiffness/damping

Em vez de duration fixo, use forças físicas:

```typescript
// Framer Motion
const springs = {
  // Calmo
  gentle: { type: 'spring', stiffness: 200, damping: 30 },
  // Crisp (Linear-like)
  crisp: { type: 'spring', stiffness: 500, damping: 35 },
  // Natural (Apple-like)
  natural: { type: 'spring', stiffness: 400, damping: 30 },
  // Bouncy (playful)
  bouncy: { type: 'spring', stiffness: 300, damping: 20 },
  // Stiff (micro-interactions)
  stiff: { type: 'spring', stiffness: 700, damping: 50 },
}
```

| Stiffness | Damping | Resultado |
|---|---|---|
| 200 | 30 | Suave, demora ~700ms |
| 400 | 30 | Natural Apple-like |
| 500 | 35 | Linear-like, rápido |
| 300 | 20 | Bouncy, com vida |
| 700 | 50 | Stiff, sem overshoot |

## Onde aplicar cada tipo

| Elemento | Personalidade |
|---|---|
| Modal/drawer | Spring natural (entrada com presença) |
| Botão pressionado | Stiff (resposta instantânea) |
| Tooltip | Gentle (não distrai) |
| Toast | Spring crisp (entra rápido, sai suave) |
| Page transition | Standard (sem chamar atenção) |
| Onboarding/celebração | Bouncy (memorável) |
| Skeleton dissolve | Gentle (continuidade visual) |

## Princípios de motion design (Disney aplicado)

### Anticipation
Pequeno movimento contrário antes da ação principal — sinaliza intenção.

```tsx
// Botão "carrega" antes de disparar
<motion.button
  whileTap={{ scale: 0.92 }}  // antecipação
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
>
```

### Squash and stretch
Objetos deformam ao se moverem rápido. Em UI: scale ao pressionar.

```tsx
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
```

### Follow-through
Continuação do movimento após ação principal. Em UI: overshoot.

```tsx
<motion.div
  animate={{ y: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  // damping baixo = overshoot sutil
/>
```

### Slow in / slow out
Não comece nem termine bruscamente. Use easing (nunca linear em UI).

### Secondary action
Movimento de elementos relacionados. Ex: ao expandir card, ícone gira.

### Staging
Direção a atenção. Movimento de UM elemento por vez na maioria dos casos.

## Hierarquia de motion na marca

Não tudo se move igual:

| Camada | Motion |
|---|---|
| **Hero / brand moment** | Mais expressivo, demorado, memorável |
| **Componentes principais** | Personalidade definida, consistente |
| **Componentes de utilidade** | Discreto, rápido, funcional |
| **Background / decorative** | Mínimo ou nenhum |

Exemplo: modal de onboarding pode ter spring expressivo. Tooltip discreto, fade rápido.

## Como `@joao` documenta no DESIGN.md

```markdown
## Motion — Personalidade

**Vibe**: [calma / expressiva / editorial / playful]

**Princípios**:
- [3 princípios específicos do projeto]
- Ex: "Sempre suave em desktop, instantâneo em mobile"
- Ex: "Loading states têm personalidade (não spinners genéricos)"

## Easing tokens

```css
--ease-primary: [curva];
--ease-spring: [curva];
--ease-overshoot: [curva];
```

## Duration tokens

```css
--duration-instant: 50ms;
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 400ms;
```

## Padrões de movimento

### Entrada de elementos
[Descrever — fade + slide / scale + spring / etc]

### Hover em interativos
[Descrever — scale 1.02 / brightness / shadow lift]

### Press (active state)
[scale 0.95-0.98 com spring stiff]

### Page transition
[Tipo de transição]

### Loading states
[Skeleton dissolve / progress fill / spinner styled]

### Feedback positivo (success)
[Movimento de celebração ou neutro?]

### Feedback negativo (error)
[Shake horizontal / pulsing border / static?]
```

## Anti-patterns que `@joao` bloqueia

- **Loop infinito decorativo** (pulse, flutuação) — distrai, consome bateria
- **Motion em todo lugar** — sem hierarquia, tudo grita
- **Duração inconsistente** — alguns componentes 100ms, outros 600ms sem padrão
- **Easing linear em UI** — parece mecânico
- **Bounce forte em produto sério** — quebra branding
- **Sem reduced-motion** — fere a11y
- **Animação obrigatória em mobile** — performance e bateria
- **Parallax pesado** — causa enjoo

## Reduced motion — sempre

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Framer Motion:
```tsx
import { useReducedMotion } from 'framer-motion'
const reduce = useReducedMotion()
```

## Performance — anima apenas `transform` e `opacity`

| Property | Performance |
|---|---|
| `transform` (scale, translate, rotate) | ✅ GPU, sem reflow |
| `opacity` | ✅ GPU |
| `filter` | ⚠️ GPU mas custa |
| `width`, `height`, `top`, `left` | ❌ Reflow, péssimo |
| `background-color` | ⚠️ Repaint |
| `box-shadow` | ⚠️ Repaint |

Use `will-change: transform` SÓ no elemento que vai animar (não em tudo).

## Decisão rápida — animar ou não?

| Caso | Animar? |
|---|---|
| Entrada de novo elemento | ✅ Sim |
| Mudança de estado (toggle, expand) | ✅ Sim |
| Feedback de ação (botão press) | ✅ Sim |
| Hover em elemento clicável | ✅ Sutil |
| Page transition (rotas) | ⚠️ Curto e sutil |
| Conteúdo que muda sem ação | ❌ Não (parece glitch) |
| Listas longas | ❌ Não (performance) |
| Decoração de background | ❌ Não (sem propósito) |

## Cheat sheet — referências de motion premium

- **Apple** — physics-based, overshoot natural, gravidade aparente
- **Linear** — micro-interactions instantâneas, sem ornamentação
- **Stripe** — editorial, page transitions cinematográficas
- **Notion** — quieto, funcional, sem distração
- **Arc Browser** — spring forte, personalidade marcante
- **Vercel.com** — limpo, transições discretas

Observar e roubar **com critério** — adequar à marca, não copiar cego.

## Referências
- [Material 3 Expressive](https://m3.material.io/blog/material-3-expressive)
- [Apple Human Interface — Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Framer Motion docs](https://www.framer.com/motion/)
- [Animation principles for UX (12 principles)](https://uxdesign.cc/animation-in-ux-design-12-principles-with-examples-c9a3f4c9b1e0)
- [Cubic-bezier visualizer](https://cubic-bezier.com/)

