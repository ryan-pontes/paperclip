---
name: ux-accessibility
description: Versão UX-focada do `accessibility.md` (que cobre auditoria axe-core)
key: paperclipai/bundled/3node-skills/ux-accessibility
recommendedForRoles:
- designer
tags:
- ux
- accessibility
---

# Skill: UX Accessibility (WCAG 2.2 prática)

Versão UX-focada do `accessibility.md` (que cobre auditoria axe-core). Aqui foca em **decisão de design** que evita problema antes do código.

## WCAG 2.2 — novos critérios AA (2023)

| Critério | O que exige | Implementação Tailwind/shadcn |
|---|---|---|
| **2.4.11 Focus Not Obscured** | Elemento focado não pode ser totalmente coberto por sticky header/banner | `scroll-margin-top: 80px` em todos focusables OU `scroll-padding-top` no container |
| **2.5.7 Dragging Movements** | Drag-and-drop precisa alternativa sem arrastar | Botões "↑/↓" pra reordenar lista além do drag |
| **2.5.8 Target Size Minimum** | Alvos clicáveis ≥ 24×24px CSS (recomendado 44×44px) | `min-h-[44px] min-w-[44px]` ou padding generoso |
| **3.2.6 Consistent Help** | Link de ajuda/suporte na mesma posição em todas as páginas | `SupportLink` no canto superior direito em todo layout |
| **3.3.7 Redundant Entry** | Não pedir informação já fornecida no mesmo fluxo | Pré-preencher form com dados do user logado |
| **3.3.8 Accessible Authentication** | Sem CAPTCHAs cognitivos; permitir paste de senha | Não bloquear paste; usar passkeys quando possível |

## Contraste — quick wins

| Tipo | Mínimo WCAG AA | Recomendado |
|---|---|---|
| Texto normal (<18pt) | 4.5:1 | 7:1 |
| Texto grande (≥18pt ou ≥14pt bold) | 3:1 | 4.5:1 |
| UI components, gráficos | 3:1 | 4.5:1 |
| Focus indicator | 3:1 contra fundo desfocado | 4.5:1 |

### Dark mode — atenção
- Não usar **branco puro** (`#fff`) sobre **preto puro** (`#000`) — causa halação em astigmatismo
- Use off-white: `#E8E8E8`, `oklch(0.93 0 0)` ou `text-zinc-200`
- Use off-black: `#0a0a0a`, `#111827` ou `bg-zinc-950`
- Borda ghost em dark precisa contraste 3:1 → `border-white/30` falha, use `border-white/40`

### Validar contraste
- DevTools Chrome → Inspect → Elements → Computed → "Contrast ratio"
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Plugin Stark no Figma

## Foco visível — regra inegociável

```css
/* NUNCA */
button:focus { outline: none; }

/* SIM */
button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

Em Tailwind:
```tsx
<button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
```

shadcn/ui já vem com foco correto. **Não sobrescrever**.

## Keyboard navigation

| Tecla | Comportamento esperado |
|---|---|
| `Tab` / `Shift+Tab` | Move foco em ordem lógica (= ordem visual) |
| `Enter` | Ativa botão/link focado |
| `Space` | Ativa botão; toggle checkbox; pause/play |
| `Esc` | Fecha modal/dropdown; cancela operação |
| `Arrow keys` | Navega listas, radio groups, tabs |
| `Home` / `End` | Topo/fim de lista |

### Modais (Radix Dialog)
- Foco trap automático
- **Confirme**: foco volta ao trigger ao fechar
- Esc fecha (Radix default)

### Listas/tabelas longas
- Implementar arrow key navigation pra evitar Tab × 50

## ARIA — quando usar

**Regra de ouro: HTML semântico primeiro, ARIA só quando não dá.**

### Usar quando
- Custom widget (combobox, tab panel) sem equivalente HTML
- Live regions pra updates dinâmicos (chat, toast)
- Estado expandido/colapsado (accordion, dropdown)

### Atributos essenciais
```tsx
// Toast / notificação
<div role="status" aria-live="polite">
  {/* updates de baixa prioridade */}
</div>

<div role="alert" aria-live="assertive">
  {/* updates urgentes (erro) */}
</div>

// Modal
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">

// Ícone sem texto
<button aria-label="Fechar">
  <XIcon />
</button>

// Botão de toggle
<button aria-pressed={liked} aria-label="Curtir">

// Loading state
<button aria-busy={loading}>
```

### NUNCA usar
- `role="button"` em `<div>` → use `<button>` mesmo
- `tabindex="100"` → use ordem natural do DOM
- ARIA pra suprimir conteúdo visual sem motivo

## Reduced motion

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

Em Tailwind v4:
```tsx
<div className="motion-safe:animate-bounce motion-reduce:animate-none">
```

Crítico pra:
- Usuários com epilepsia/enxaqueca
- Movimento parasita em VR/AR

## Touch targets

| Cenário | Mínimo |
|---|---|
| Botão padrão | 44×44px |
| Link inline em texto | Padding vertical 8px → 32px de área clicável |
| Ícone clicável | 44×44px (use padding invisível: `p-3` num ícone de 20px) |
| Itens de lista clicáveis | 56-60px altura recomendada (Apple HIG) |
| Público idoso | 56-64px |

## Mobile-specific a11y

- `<input type="email">` → teclado @ aparece
- `<input type="tel">` → teclado numérico
- `<input type="search">` → botão "Buscar" no teclado
- `font-size: 16px` mínimo em inputs (evita zoom iOS)
- `autocomplete="email"`, `autocomplete="given-name"` etc → autofill

## Screen readers — checklist rápido

- [ ] `<html lang="pt-BR">` definido
- [ ] Headings em ordem (`h1` → `h2` → `h3`, sem pular)
- [ ] Imagens com `alt` descritivo; decorativas com `alt=""`
- [ ] Botões têm label (texto ou `aria-label`)
- [ ] Forms têm `<label>` associado (`for` + `id`)
- [ ] Erros conectados ao input (`aria-describedby`)
- [ ] Live regions pra updates dinâmicos
- [ ] Landmarks (`<nav>`, `<main>`, `<footer>`)

### Testar com VoiceOver (Mac)
- `Cmd + F5` → ativa
- `Ctrl + Option + →` → próximo elemento
- `Ctrl + Option + Space` → ativar

## Quick wins (5 minutos, alto impacto)

1. **Skip link** no topo
   ```tsx
   <a href="#main" className="sr-only focus:not-sr-only">Pular pro conteúdo</a>
   ```

2. **Reduced motion** no CSS global

3. **Focus visible** garantido em todos botões/links

4. **`lang="pt-BR"`** no `<html>`

5. **Touch targets ≥ 44px** em mobile

6. **Sem `outline: none`** sem substituto

7. **Modais** com `aria-modal` + Esc + foco trap

8. **Toasts** com `role="status"` ou `role="alert"`

## Validação automática

Rodar `~/.claude/skills/accessibility.md` (axe-core via Playwright) antes do `/qa`. CRITICAL/SERIOUS bloqueiam entrega.

## Referências
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM](https://webaim.org/)
- [Inclusive Components](https://inclusive-components.design/)
- [a11y-101](https://a11y-101.com/)

