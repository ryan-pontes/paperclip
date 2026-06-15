---
name: accessibility
description: Gate de acessibilidade antes de qualquer UI ir para produção
key: paperclipai/bundled/3node-skills/accessibility
recommendedForRoles:
- engineer
tags:
- accessibility
---

# Skill: Accessibility (WCAG 2.1 AA)

Gate de acessibilidade antes de qualquer UI ir para produção. Análogo ao `/sec` para segurança: roda automático, issues CRITICAL/SERIOUS bloqueiam entrega.

## Quando rodar

- **Automático** ao entregar qualquer UI nova ou alterada (antes do `/qa`)
- **Manual** via `@felipe` quando pedir "rodar accessibility" ou "validar a11y"
- **Bloqueante** antes do deploy — `/devops` não sobe com violações CRITICAL/SERIOUS

## Stack

- **axe-core** via `@axe-core/playwright` — auditoria automatizada WCAG 2.1 AA
- **Playwright MCP** — navegação e screenshots das violações
- **Lighthouse CI** (opcional) — score de acessibilidade por rota

## Setup (uma vez por projeto)

```bash
npm install -D @axe-core/playwright
```

```typescript
// tests/a11y/axe.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/', '/dashboard', '/settings']

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${route}`)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const critical = results.violations.filter(v =>
      v.impact === 'critical' || v.impact === 'serious'
    )
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([])
  })
}
```

## Checklist obrigatório (WCAG 2.1 AA)

### Perceivable
- [ ] Contraste texto ≥ 4.5:1 (normal) / ≥ 3:1 (large ≥18pt ou ≥14pt bold)
- [ ] Contraste UI components e gráficos ≥ 3:1
- [ ] `<img>` com `alt` descritivo; decorativos com `alt=""`
- [ ] `<video>` com legendas; `<audio>` com transcrição
- [ ] Zoom 200% sem quebrar layout, sem scroll horizontal

### Operable
- [ ] Navegação por teclado completa (Tab, Shift+Tab, Enter, Esc, Arrow keys)
- [ ] Focus visível em TODOS elementos interativos (nunca `outline: none` sem alternativa)
- [ ] Skip link "Pular para conteúdo" no topo
- [ ] Sem keyboard traps (modal fecha com Esc, foco volta ao trigger)
- [ ] Timeouts ajustáveis ou desligáveis
- [ ] Nada pisca >3x/segundo

### Understandable
- [ ] `<html lang="pt-BR">` definido
- [ ] Labels em todo input (`<label>` ou `aria-label`)
- [ ] Erros identificados por texto + ícone (nunca só cor)
- [ ] Mensagens de erro específicas ("Email inválido", não "Erro")
- [ ] Ordem de foco lógica (matches visual order)

### Robust
- [ ] HTML semântico (`<nav>`, `<main>`, `<button>`, não `<div onClick>`)
- [ ] ARIA apenas quando HTML semântico não resolve
- [ ] `aria-label`, `aria-describedby`, `aria-expanded` corretos em custom widgets
- [ ] Roles ARIA válidos (`role="dialog"`, `role="alert"`)
- [ ] Live regions (`aria-live="polite"`) em toasts e updates dinâmicos

## Gotchas do stack (Next.js + shadcn + Tailwind)

- **shadcn/ui** já vem acessível — não quebrar com overrides. Ex: nunca remover `sr-only` de icon buttons.
- **Dark mode** — validar contraste nos DOIS temas. Paleta do `design.md` precisa passar no AA dark e light.
- **Motion** — respeitar `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- **Modais (Radix Dialog)** — foco trap automático, mas confirme que o trigger recebe foco ao fechar.
- **Toasts** — usar `role="status"` ou `aria-live="polite"`. Nunca só visual.
- **Dropdowns customizados** — preferir `<select>` nativo ou Radix/shadcn Select (já acessível).
- **Ícones sem label** — sempre `<span className="sr-only">Descrição</span>` ou `aria-label`.

## Severidade e gate

| Impact | Ação |
|---|---|
| **critical** | Bloqueia entrega. `@felipe` corrige antes de chamar `/qa` |
| **serious** | Bloqueia entrega. Mesma regra |
| **moderate** | Não bloqueia, mas reporta no `QA-REPORT.md` para correção na próxima sprint |
| **minor** | Reporta, não bloqueia |

## Relatório

Após rodar, gerar `docs/A11Y-REPORT.md`:

```markdown
# Accessibility Report — [Projeto]
**Data**: [data]
**Rotas testadas**: [lista]

## Status: ✅ Aprovado | ⚠️ Com ressalvas | ❌ Reprovado

## Violações CRITICAL (bloqueantes)
- [ ] [regra axe] em [rota] — [seletor] — [como corrigir]

## Violações SERIOUS (bloqueantes)
- [ ] ...

## MODERATE (não bloqueia)
- [ ] ...

## Checklist manual
- [ ] Teste com teclado sem mouse
- [ ] Teste com screen reader (VoiceOver: Cmd+F5)
- [ ] Teste em 200% zoom
- [ ] Teste com `prefers-reduced-motion: reduce`
- [ ] Contraste validado em dark + light

## Ações para @felipe
1. [correção específica com arquivo e linha]
```

## Fluxo integrado no squad

1. `@felipe` termina UI
2. **Auto:** skill accessibility roda → gera `A11Y-REPORT.md`
3. Se CRITICAL/SERIOUS → volta para `@felipe` corrigir
4. Se aprovado → `/qa` valida PRD + UX
5. `/sec` valida segurança
6. `/devops` deploya

## Referências

- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Radix Primitives A11y](https://www.radix-ui.com/primitives/docs/overview/accessibility)

