---
name: ux-motion
description: Motion é linguagem de feedback — não decoração
key: paperclipai/bundled/3node-skills/ux-motion
recommendedForRoles:
- designer
tags:
- ux
- motion
---

# Skill: UX Motion (funcional, não decorativo)

Motion é linguagem de feedback — não decoração. Cada animação deve ter propósito funcional.

## Quando animar

| Situação | Tipo | Duração |
|---|---|---|
| Transição de estado (loading → conteúdo) | Fade + skeleton dissolve | 150-200ms |
| Feedback de ação (botão pressionado) | Scale 95% + return | 100-150ms |
| Entrada de elemento novo (toast, notif) | Slide + fade in | 200-300ms |
| Modal abrindo | Scale + fade | 200ms enter, 150ms exit |
| Hover em botão/card | Subtle scale + shadow | 100-150ms |
| Drawer/sheet | Slide from edge | 250-300ms |
| Page transition | Fade with subtle Y shift | 150-200ms |
| Staggered reveal em lista | Delay incremental 30-50ms por item | total < 600ms |

## Quando NÃO animar

- Navegação entre páginas frequentes (usuário que acessa 20x/dia se irrita)
- Listas longas com scroll
- Estados de erro urgentes (mostre direto)
- Conteúdo que muda sem ação do usuário (parece glitch)
- Em `prefers-reduced-motion: reduce`

## Easing — escolha consciente

### Curvas modernas (Material 3 Expressive 2025)
```css
:root {
  /* Entrada de elementos */
  --ease-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);

  /* Saída de elementos */
  --ease-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);

  /* Movimento contínuo */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* Spring expressivo (overshoot natural) */
  --ease-expressive: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Apple spring (mais natural)
```css
--ease-spring: cubic-bezier(0.5, 1.25, 0.75, 1.25);
```

### Quando usar cada
| Tipo de movimento | Curva |
|---|---|
| Entra | ease-decelerate (rápido começo, suave fim) |
| Sai | ease-accelerate (suave começo, rápido fim) |
| Move sem entrar/sair | ease-standard ou linear-out-slow-in |
| Modal/drawer com personalidade | ease-expressive ou spring |
| **Nunca** | `linear` em UI (reservado pra progress bars) |

## Spring physics (Framer Motion)

Em vez de `duration`, usa stiffness/damping:

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
>
```

| Preset | stiffness | damping | Uso |
|---|---|---|---|
| Crisp | 500 | 35 | Toast, notification |
| Natural | 400 | 30 | Modal, drawer (padrão) |
| Bouncy | 300 | 20 | Onboarding playful |
| Stiff | 700 | 50 | Micro-interação rápida |

## Padrões funcionais essenciais

### 1. Botão pressionado
```tsx
<button className="active:scale-95 transition-transform duration-100">
```

### 2. Loading que aparece com delay (evita flash)
```tsx
const [showLoading, setShowLoading] = useState(false)

useEffect(() => {
  if (!loading) return
  const id = setTimeout(() => setShowLoading(true), 200)
  return () => clearTimeout(id)
}, [loading])
```

Sem o delay: usuário vê piscar do spinner em respostas <100ms.

### 3. Anticipation (Disney principle)
Pequeno movimento contrário antes da ação principal — sinaliza intenção.

```tsx
// Drawer abrindo com micro-rebound
<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
>
```

### 4. Follow-through
Modal/drawer não fecha instantâneo — pequeno overshoot antes de sair.

### 5. Staggered reveal
```tsx
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.04 }}
  >
    {item.name}
  </motion.div>
))}
```

Limitar delay total a **600ms** (5-15 items max em cascata).

### 6. Page transition
```tsx
// app/layout.tsx
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.15 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### 7. Skeleton dissolve em conteúdo
```tsx
<AnimatePresence mode="wait">
  {loading ? (
    <motion.div key="skel" exit={{ opacity: 0 }}>
      <Skeleton />
    </motion.div>
  ) : (
    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {data}
    </motion.div>
  )}
</AnimatePresence>
```

## Reduced motion — obrigatório

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Em Framer Motion:
```tsx
import { useReducedMotion } from 'framer-motion'

const shouldReduceMotion = useReducedMotion()

<motion.div
  animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
>
```

## CSS nativo emergente (2025)

### `@starting-style` — animar entrada sem JS
```css
dialog[open] {
  opacity: 1;
  transition: opacity 200ms;
}

@starting-style {
  dialog[open] {
    opacity: 0;
  }
}
```
Suporte: Chrome 117+, Firefox 129+, Safari 17.5+.

### `transition-behavior: allow-discrete`
```css
.toast {
  display: none;
  transition: display 200ms, opacity 200ms;
  transition-behavior: allow-discrete;
}
.toast.visible {
  display: block;
  opacity: 1;
}
```

### Scroll-driven animations
```css
.header {
  animation: shrink linear;
  animation-timeline: scroll();
  animation-range: 0 200px;
}
```
Suporte: Chrome 115+, Firefox 110+.

## Performance

- `will-change: transform` SÓ em elemento que vai animar (não em tudo)
- Prefira `transform` e `opacity` (compositor-only, sem reflow)
- Evite animar `width`, `height`, `top`, `left` (causa layout)
- `transform: translateZ(0)` força GPU mas custa memória — use com critério

## Anti-patterns que `@ux` bloqueia

- Animação >500ms em interação direta (usuário percebe lento)
- Loop infinito sem propósito (pulsa, flutua, gira)
- Easing `linear` em UI (parece mecânico)
- Animação obrigatória ignorando `prefers-reduced-motion`
- `outline: none` removido sem substituto
- Page transition >300ms (irrita em uso frequente)
- Parallax em mobile (causa enjoo)

## Checklist

- [ ] Cada animação tem propósito funcional
- [ ] Duração apropriada (100-300ms pra UI)
- [ ] Easing escolhido consciente (não default)
- [ ] `prefers-reduced-motion` respeitado
- [ ] Loading aparece após 200ms (sem flash)
- [ ] Sem loops infinitos sem motivo
- [ ] Performance: anima só `transform`/`opacity` quando possível

## Referências
- [Material 3 Expressive](https://m3.material.io/blog/material-3-expressive)
- [Framer Motion docs](https://www.framer.com/motion/)
- [Easing functions cheatsheet](https://easings.net/)
- [Disney's 12 principles aplicadas a UI](https://www.smashingmagazine.com/2021/01/animation-pixar-disney-principles/)

