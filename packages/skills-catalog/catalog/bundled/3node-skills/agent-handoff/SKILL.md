---
name: agent-handoff
description: Output contract por agente
key: paperclipai/bundled/3node-skills/agent-handoff
recommendedForRoles:
- engineer
tags:
- agent
- handoff
---

# Skill: Agent Handoff (contratos entre agentes do squad)

Output contract por agente. Sem isso, handoff é informal, falhas silenciosas geram retrabalho.

## Problema que resolve

Hoje `@eli` passa contexto pra cada agente via texto livre. Quando `@edu` produz `ARCHITECTURE.md` incompleto, `@sm` não sabe que falta algo. Stories saem erradas, `@felipe` implementa errado, `@qa` reprova → retrabalho.

Solução: cada agente tem **output contract** (campos obrigatórios + formato) e cada agente downstream tem **input contract** (o que aceita).

## Contracts por agente

### @nic → output: PRD.md

**Campos obrigatórios:**
- [ ] Problema (1 parágrafo)
- [ ] Job to Be Done (formato job story: "Quando [situação], quero [motivação], pra [resultado]")
- [ ] Usuários (personas + qty)
- [ ] Funcionalidades por fase (MVP / Fase 2 / Backlog)
- [ ] Fora do escopo (explícito)
- [ ] Integrações externas
- [ ] Dados sensíveis (LGPD)
- [ ] Critérios de sucesso **com baseline + target mensurável**
- [ ] Constraints (técnicos, tempo, budget)

**Validação automática**: se `Critérios de sucesso` não tem baseline+target → INCOMPLETE.

---

### @edu → output: ARCHITECTURE.md

**Campos obrigatórios:**
- [ ] Diagrama de sistema (C4 Level 2 mínimo)
- [ ] Tabelas com RLS especificada
- [ ] Indexes pra cada policy com `auth.uid()` (performance)
- [ ] Endpoints com response shape + error codes
- [ ] Componentes com responsabilidades
- [ ] Plano de fases (FASE 1, 2, ...)
- [ ] Decisões não-óbvias documentadas como ADR (`docs/decisions/`)
- [ ] Performance concerns (queries hot path, cache strategy)
- [ ] Trade-offs explícitos (build vs buy, mono vs micro)

**Validação automática**: se tem `auth.uid()` em policy sem index correspondente → INCOMPLETE.

---

### @joao → output: DESIGN.md + assets

**Campos obrigatórios:**
- [ ] Personalidade (3-5 adjetivos)
- [ ] Paleta (CSS variables)
- [ ] Tipografia (display + body com fontes específicas)
- [ ] Motion (easing + durações)
- [ ] Componentes base (botão, card, input, badge)
- [ ] Anti-patterns evitados (lista)
- [ ] Tailwind config snippet
- [ ] Screenshots de mockup (mínimo 3 telas-chave)

**Validação automática**: se palette tem Inter/Roboto/Arial → REJECT.

---

### @ux → output: UX-AUDIT-<feature>.md ou docs/ux/<feature>.md

**Campos obrigatórios (audit):**
- [ ] Status: Aprovado / Com ressalvas / Reprovado
- [ ] Categorias avaliadas (fluxo, estados, microcopy, a11y, mobile, motion, perf)
- [ ] Issues bloqueantes com arquivo:linha
- [ ] Heurísticas Nielsen passadas
- [ ] Grandma Test resultado (pra público leigo)
- [ ] Próximos passos pro @felipe

**Validação automática**: se WCAG CRITICAL/SERIOUS presente → STATUS deve ser "Reprovado".

---

### @sm → output: stories em docs/stories/active/

**Campos obrigatórios por story:**
- [ ] Objetivo (1 frase)
- [ ] Contexto (refs ao PRD/ARCHITECTURE)
- [ ] Stack/skills relevantes
- [ ] Passos numerados (concretos)
- [ ] Arquivos esperados (criar/modificar)
- [ ] Critérios de aceitação
- [ ] Notas/edge cases
- [ ] Tamanho estimado (S/M/L)
- [ ] Definition of Done aplicável

**Validação automática**: TASKS.md ter checklist por story.

---

### @felipe → output: código + commits

**Campos obrigatórios:**
- [ ] TypeScript sem `any`
- [ ] RLS validada se mexeu em tabela
- [ ] Mobile-first verificado em 375px
- [ ] Sem `console.log` em produção
- [ ] Critério de aceitação coberto
- [ ] Commits atômicos com mensagem clara
- [ ] Skills consultadas (`supabase.md`, `conventions.md`, etc)

**Validação automática**: tsc sem erro, sem `any` flag.

---

### @qa → output: QA-REPORT.md

**Campos obrigatórios:**
- [ ] Status: Aprovado / Reprovado
- [ ] Critérios PRD validados (lista)
- [ ] Edge cases testados
- [ ] Bugs encontrados com severidade
- [ ] Performance observada
- [ ] Acessibilidade (delegou pra `accessibility.md`)
- [ ] Próximos passos

---

### /sec → output: SECURITY-AUDIT.md

**Campos obrigatórios:**
- [ ] Status: Aprovado / Reprovado
- [ ] OWASP Top 10 checklist
- [ ] RLS validada
- [ ] Multi-tenant isolation
- [ ] Findings por severidade (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Cada finding com fix sugerido

**CRITICAL bloqueia deploy.**

---

### /reviewer → output: CODE-REVIEW.md

**Campos obrigatórios:**
- [ ] Findings por categoria (segurança, performance, padrões, manutenibilidade)
- [ ] Conventional Comments format: `<label> [decoration]: <subject>`
- [ ] Ações pro @felipe

---

### /devops → output: deploy + DEPLOY.md

**Campos obrigatórios:**
- [ ] Deploy configurado
- [ ] Health check funcionando
- [ ] Variáveis de ambiente documentadas
- [ ] Domínio + SSL
- [ ] Checklist de produção marcado

---

### @sre → output: PRE-FLIGHT.md / INCIDENT-XXX.md / POSTMORTEM-XXX.md

**Campos obrigatórios (pre-flight):**
- [ ] SLO targets definidos
- [ ] Observability validada
- [ ] Alertas configurados
- [ ] Runbooks prontos pra incidentes esperados
- [ ] Sign-off

---

## Como o @eli valida handoff

Antes de passar contexto pro próximo agente, `@eli` valida o output do anterior contra o contract:

```
@eli → @edu
@edu produz ARCHITECTURE.md
@eli valida:
  - [x] Diagrama presente
  - [x] Tabelas com RLS
  - [ ] Indexes pra policies → FALTANDO
  - [x] Endpoints
  - ...

Output INCOMPLETE → @eli devolve pro @edu com lista do que falta.
```

## Formato do handoff

`@eli` mantém `docs/HANDOFF-LOG.md`:

```markdown
# Handoff Log

## 2026-06-08

### @nic → @edu (10:30)
PRD.md aprovado
Faltava: critério mensurável → @nic adicionou

### @edu → @sm (11:15)
ARCHITECTURE.md aprovado
ADR criado: `docs/decisions/ADR-001-mono-vs-micro.md`

### @joao → @ux (11:45)
DESIGN.md aprovado
Mockups: 4 telas

### @ux → @felipe (12:00)
docs/ux/checkout.md aprovado
Estados completos, mobile validado
```

## Quando devolve handoff (REJECT)

Critérios pra `@eli` recusar output e devolver pro agente anterior:

| Agente | Critério REJECT |
|---|---|
| @nic | PRD sem JTBD ou sem critério mensurável |
| @edu | RLS sem index correspondente, ADR ausente em decisão grande |
| @joao | Fonte genérica (Inter/Roboto), anti-pattern presente |
| @ux | WCAG CRITICAL sem flag de "Reprovado" |
| @sm | Story sem critério de aceitação, sem tamanho estimado |
| @felipe | Build quebrado, TypeScript com `any`, sem testes onde requisitado |
| /sec | CRITICAL não bloqueia → @eli força bloqueio |

## Comunicação de REJECT

Template:
```
@<agent>: handoff devolvido.

Output produzido: <path>
Contract validado contra: ~/.claude/skills/agent-handoff.md

Faltando:
- [ ] <campo 1>
- [ ] <campo 2>

Por favor complete e me chame de novo.

@eli
```

## Fan-out paralelo (quando agentes não dependem)

Algumas fases têm paralelismo seguro. Output contract permite validação independente:

```
FASE 2 (paralelo):
  @edu (ARCHITECTURE) — não depende de @joao
  @joao (DESIGN) — não depende de @edu
  @researcher (validações técnicas) — output: docs/research/

@eli aguarda os 3 outputs → valida cada contract → handoff pra FASE 3.
```

## Anti-patterns

- Handoff sem contract (informal, falha silenciosa)
- Aceitar output incompleto "pra acelerar" (custa caro no @felipe)
- Pular validação pra fan-out (resultado: 3 agentes paralelos produzem coisas incompatíveis)
- Não logar handoffs (perde rastreio do que falhou)
- Contracts muito rígidos (criatividade morre)

## Checklist de implementação

- [ ] Cada agente sabe seu output contract (referencia esta skill)
- [ ] `@eli` valida contract antes de handoff
- [ ] REJECT documentado quando ocorre
- [ ] HANDOFF-LOG.md mantido
- [ ] Contract revisado quando agente muda

## Referências
- [AutoGen v0.4 — Handoff Pattern](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/handoffs.html)
- [Agent Protocol](https://agentprotocol.ai/)
- [LangGraph — Conditional Edges](https://langchain-ai.github.io/langgraph/concepts/low_level/#conditional-edges)

