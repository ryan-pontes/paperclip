---
name: ux-audit
description: Auditoria UX antes do `/qa`
key: paperclipai/bundled/3node-skills/ux-audit
recommendedForRoles:
- designer
tags:
- ux
- audit
---

# Skill: UX Audit (heurísticas + métricas + checklist final)

Auditoria UX antes do `/qa`. Roda heurísticas, Grandma Test e checklist. Bloqueia entrega se reprovar.

## Pipeline

```
@felipe termina UI → @ux audita → reprovado → @felipe corrige
                              ↓
                          aprovado → /qa valida PRD
```

## Heurísticas em 30 minutos

### Os 10 de Nielsen (passa cada tela rapidamente)

1. **Status visível** — usuário sabe onde tá? (breadcrumb, step, loading)
2. **Match com mundo real** — linguagem do público, não do sistema?
3. **Controle e liberdade** — tem desfazer/cancelar/voltar?
4. **Consistência** — botões iguais, padrões repetidos?
5. **Prevenção de erros** — valida inline, confirma destrutivo?
6. **Reconhecer > lembrar** — labels visíveis, opções claras?
7. **Flexibilidade** — atalho pra avançado, fácil pra leigo?
8. **Estética minimal** — sem ruído desnecessário?
9. **Recuperação de erro** — mensagem clara + ação?
10. **Ajuda inline** — tooltip, FAQ, suporte acessível?

Marca cada um como ✅/⚠️/❌ por tela.

## Testes rápidos

### Grandma Test (3 min)
Pergunta-chave: **"Uma senhora de 65 anos sem familiaridade com tecnologia conseguiria completar essa tarefa sozinha em 3 minutos?"**

Se não, simplifica:
- Reduzir decisões por tela (Hick)
- Aumentar touch targets (Fitts)
- Trocar jargão por linguagem cotidiana
- Adicionar tooltip ou ajuda inline

**Bloqueante** pra público leigo/idoso (Academia de Pregadores).

### 5-second test
Mostra a tela por 5 segundos, pergunta: "O que você pode fazer aqui?".

Se a resposta errar → hierarquia visual quebrada → volta pro `@joao`.

### Walkthrough cognitivo
Pra cada step do fluxo principal, pergunta:
1. O usuário sabe que precisa fazer essa ação?
2. Ele encontra o controle pra fazer?
3. Ele reconhece que essa é a ação correta?
4. Ele recebe feedback de que a ação foi feita?

Se algum "não", há friction.

## Métricas de UX

Não precisa ferramenta cara. Em SaaS BR com PostHog ou GA4:

| Métrica | Definição | Benchmark saudável |
|---|---|---|
| **Task Completion Rate** | % usuários que completam fluxo principal | > 80% pra fluxos críticos |
| **Time on Task** | Tempo até completar ação crítica | < 90s pra ação principal |
| **Error Rate** | Mensagens de erro por sessão | < 2 por sessão |
| **TTFV** (Time to First Value) | Quanto até usuário ver valor real | < 5min em onboarding |
| **SUS** (System Usability Scale) | Questionário 10 perguntas | > 68 aceitável, > 80 bom |
| **NPS** (Net Promoter Score) | "Recomendaria?" 0-10 | > 30 saudável |

### Para SaaS Educação Brasil
- TTFV em <5min é ouro pra retenção
- NPS qualitativo > NPS quantitativo (público religioso indica por confiança)

## Priorização: RICE pra issues

| Métrica | Definição |
|---|---|
| **R**each | % usuários afetados |
| **I**mpact | 1 (marginal) / 3 (notável) / 10 (transformador) |
| **C**onfidence | 50-100% baseado em evidência |
| **E**ffort | Pessoa-dias |

Score = (R × I × C) / E. Priorizar > 5.

## Checklist final completo (passa antes de aprovar)

### Fluxo
- [ ] JTBD claro (do PRD)
- [ ] Jornada principal mapeada
- [ ] Cada step tem feedback visual
- [ ] Cancelar/voltar sempre disponível
- [ ] Wizard com progresso visível

### Estados (os 4)
- [ ] **Loading** com texto contextual (após 200ms delay)
- [ ] **Empty** com CTA primário
- [ ] **Error** segue fórmula "O QUE + POR QUÊ + O QUE FAZER"
- [ ] **Success** com confirmação + próximo passo

### Microcopy
- [ ] Botões descrevem ação (verbo + objeto)
- [ ] Labels visíveis (não só placeholder)
- [ ] Sem jargão técnico
- [ ] Tom adequado ao público
- [ ] Confirmação destrutiva nomeia o item

### Acessibilidade WCAG 2.2
- [ ] Contraste ≥ 4.5:1 (normal) / 3:1 (large/UI)
- [ ] Foco visível em tudo focusable
- [ ] Touch targets ≥ 44×44px (56px+ pra idoso)
- [ ] HTML semântico (não `<div onClick>`)
- [ ] ARIA quando necessário
- [ ] Reduced motion respeitado
- [ ] `lang="pt-BR"` definido
- [ ] Skip link no topo

### Mobile-first
- [ ] Funciona em 375px
- [ ] Sem zoom em focus de input (font-size ≥ 16px)
- [ ] CTAs primários na thumb zone
- [ ] `100dvh` em vez de `100vh`
- [ ] Safe-area-inset respeitada
- [ ] Tipo de input semântico (`email`, `tel`)

### Motion
- [ ] Cada animação tem propósito funcional
- [ ] Duração 100-300ms (UI)
- [ ] Easing escolhido (não linear)
- [ ] `prefers-reduced-motion` respeitado
- [ ] Sem loops infinitos sem propósito

### Performance percebida
- [ ] Skeleton aparece imediato (não spinner mudo)
- [ ] Fonts com `font-display: swap`
- [ ] Imagens com `loading="lazy"` + blur
- [ ] Optimistic UI em ações sem risco

## Output: `docs/ux/UX-AUDIT-<feature>.md`

```markdown
# UX Audit — [Feature]
**Data**: [data]
**Auditado por**: @ux
**Stack**: [rotas/componentes]

## Status: ✅ Aprovado | ⚠️ Com ressalvas | ❌ Reprovado

## Resultado por categoria
| Categoria | Status | Issues |
|---|---|---|
| Fluxo | ✅/⚠️/❌ | N |
| Estados | ✅/⚠️/❌ | N |
| Microcopy | ✅/⚠️/❌ | N |
| Acessibilidade | ✅/⚠️/❌ | N |
| Mobile-first | ✅/⚠️/❌ | N |
| Motion | ✅/⚠️/❌ | N |
| Performance | ✅/⚠️/❌ | N |

## Issues BLOQUEANTES (impedem deploy)
1. [Issue] — arquivo:linha — Como corrigir
2. ...

## Issues SÉRIAS (não bloqueia, próxima sprint)
1. ...

## Quick wins (5min cada)
1. ...

## Heurísticas — passou em
- [x] H1 Visibilidade do status
- [x] H2 Match com mundo real
- ...

## Grandma Test
[Passou ✅ / Falhou ❌] — [observações]

## 5-second test
[Resultado] — [observações]

## Métricas sugeridas pra monitorar
- Task Completion Rate em [fluxo X]
- Time on Task em [ação Y]

## Próximos passos
1. @felipe corrige bloqueantes
2. @ux re-audita
3. /qa valida PRD após aprovado
```

## Anti-pattern do auditor

- **Audit sem ler PRD** — não dá pra avaliar se feature resolve o JTBD sem PRD
- **Audit sem mobile** — feature pode ser linda em desktop e quebrada em 375px
- **Aprovar com "minor warnings"** — vira "moderate" depois, vira "critical" no /qa
- **Audit sem teste cognitivo** — checklist mecânico vê estado, não fluxo

## Quando bloquear vs ressalvar

| Severidade | Critério | Ação |
|---|---|---|
| **Bloqueante** | WCAG CRITICAL/SERIOUS, Grandma Test falha (pra público leigo), missing estados, dados/segurança expostos | Volta pro @felipe corrigir |
| **Séria** | UX ruim mas funcional, microcopy ruim, falta empty state em fluxo secundário | Aprova com ressalva, registra pra próxima sprint |
| **Quick win** | Polish, easing melhor, microcopy mais quente | Sugere, não bloqueia |

## Skills relacionadas
- `~/.claude/skills/accessibility.md` — auditoria automatizada axe-core
- `~/.claude/skills/ux-principles.md` — heurísticas e laws
- `~/.claude/skills/ux-states.md` — 4 estados
- `~/.claude/skills/ux-microcopy.md` — fórmulas de texto

## Referências
- [NN/g 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [SUS Calculator](https://www.usability.gov/how-to-and-tools/methods/system-usability-scale.html)
- [Cognitive Walkthrough](https://en.wikipedia.org/wiki/Cognitive_walkthrough)

