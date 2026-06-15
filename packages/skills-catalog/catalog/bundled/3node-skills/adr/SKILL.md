---
name: adr
description: Documenta **decisões não-óbvias** que seriam dolorosas de reverter
key: paperclipai/bundled/3node-skills/adr
recommendedForRoles:
- engineer
tags:
- adr
---

# Skill: ADR (Architecture Decision Records)

Documenta **decisões não-óbvias** que seriam dolorosas de reverter. Salva contexto entre sessões — em 3 meses, quando o @edu voltar ao projeto, ele entende **por que** decidiu X em vez de Y.

## Quando criar um ADR

Crie quando a decisão atende **um destes critérios**:

1. **Dolorosa de reverter** — RLS strategy, escolha de auth provider, mono vs micro
2. **Não-óbvia em retrospecto** — alguém ler o código em 3 meses não vai entender o porquê
3. **Tem alternativas viáveis** — Edge Functions vs FastAPI, Asaas vs Stripe
4. **Custou debate/pesquisa** — vale documentar pra não revisitar

**NÃO crie ADR pra:**
- "Usei `useState` em vez de `useReducer`" (microdecisão)
- "Chamei a variável `userId` em vez de `uid`" (estilo)
- "Adicionei coluna `created_at`" (convenção do projeto)

## Formato

`docs/decisions/ADR-NNN-<titulo-em-kebab>.md`:

```markdown
# ADR-001: Multi-tenant via RLS em vez de schema-per-tenant

**Status**: Accepted | Deprecated | Superseded by [ADR-XXX]
**Data**: 2026-06-08
**Autor**: @edu
**Contexto do projeto**: event-room

## Contexto

[O que tava acontecendo que forçou essa decisão?]

Estamos construindo plataforma de webinars multi-tenant. Cada organização (Academia de Pregadores, Academia Kids, etc) tem eventos, participantes, certificados isolados. Precisamos garantir que nunca vaze dado entre tenants.

Alternativas consideradas:
1. **Schema-per-tenant** (cada org tem schema próprio)
2. **Database-per-tenant** (cada org tem banco)
3. **Row-Level Security** (todos no mesmo schema, policies isolam)

## Decisão

Adotamos **Row-Level Security (RLS) via Supabase** com coluna `organization_id` em toda tabela tenant-specific.

Razão principal: Supabase oferece RLS nativo + auth integration + zero overhead operacional. Não precisamos gerenciar N schemas/bancos.

## Consequências

### Positivas
- Migração única afeta todos os tenants (mais rápido evoluir schema)
- Backup unificado
- Queries cross-tenant fáceis (analytics agregada)
- Custo Supabase fixo, não escala linearmente com tenants

### Negativas
- Performance de RLS pode degradar com tabelas grandes (>10M rows)
- Vazamento via RLS bug é catastrófico (afeta TODOS tenants)
- Bug em policy = exposição cross-tenant

### Mitigações
- Index em `organization_id` em TODA tabela tenant-specific
- Auditoria obrigatória de cada policy via `/sec`
- `er_current_org_id()` helper SECURITY DEFINER pra evitar repetição
- Testes E2E de isolation multi-tenant

## Alternativas rejeitadas

### Schema-per-tenant
- Pro: isolamento físico, performance previsível
- Contra: migration management vira pesadelo (N schemas)
- Veredito: não vale a complexidade pro tamanho atual

### Database-per-tenant
- Pro: isolamento máximo, recovery individual
- Contra: custo Supabase escala linearmente, conexão pool fragmenta
- Veredito: overkill pro nosso scale

## Referências
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Multi-tenant patterns — Stripe Engineering](https://stripe.com/blog/architecture-for-saas)
- Discussão no projeto: docs/research/multi-tenant-strategy.md
```

## Status do ADR

| Status | Significado |
|---|---|
| **Proposed** | Em discussão, não implementado |
| **Accepted** | Decidido, em uso |
| **Deprecated** | Não usar mais, mas código antigo pode existir |
| **Superseded by [ADR-XXX]** | Substituído por decisão posterior |

Nunca **deleta** ADR. Marca como deprecated/superseded e cria novo.

## Estrutura de pastas

```
docs/
  decisions/
    ADR-001-multi-tenant-rls.md
    ADR-002-asaas-vs-stripe.md
    ADR-003-broadcast-via-postgres-trigger.md
    ADR-004-edge-vs-serverless.md
    INDEX.md   ← índice navegável
    template.md
```

## INDEX.md template

```markdown
# Architecture Decision Records — [Projeto]

## Ativos
| ID | Título | Data | Status |
|---|---|---|---|
| [ADR-001](./ADR-001-multi-tenant-rls.md) | Multi-tenant via RLS | 2026-06-08 | Accepted |
| [ADR-002](./ADR-002-asaas-vs-stripe.md) | Pagamentos via Asaas (BR) | 2026-06-10 | Accepted |
| [ADR-003](./ADR-003-broadcast-via-postgres-trigger.md) | Realtime via Postgres trigger | 2026-06-08 | Accepted |

## Deprecated
| ID | Título | Razão | Substituído por |
|---|---|---|---|
| ~~ADR-005~~ | ~~Modal de oferta~~ | UX feedback | ADR-008 |

## Como criar novo
1. Copia `template.md`
2. Numera sequencial
3. Atualiza este INDEX
```

## ADRs típicos no contexto Ryan

Templates de ADR comuns:
- Multi-tenant strategy (RLS vs schema vs DB)
- Auth provider (Supabase vs Clerk vs Auth0)
- Pagamento (Asaas vs Stripe vs Mercado Pago)
- Realtime strategy (postgres_changes vs broadcast vs polling)
- Backend stack (FastAPI vs Next.js API routes)
- Deployment platform (Vercel vs Railway vs Render)
- LLM provider (OpenAI vs Anthropic vs Gemini)
- Agente framework (LangGraph vs Agno vs custom)

## Como o @edu usa

Quando produz ARCHITECTURE.md:
1. Identifica decisões não-óbvias (≥2)
2. Pra cada uma, escreve ADR em `docs/decisions/`
3. ARCHITECTURE.md linka pros ADRs: "Multi-tenant: ver [ADR-001]"
4. Atualiza INDEX.md

## Template mínimo (`template.md`)

```markdown
# ADR-NNN: [Título curto]

**Status**: Proposed
**Data**: [YYYY-MM-DD]
**Autor**: [@agente]
**Projeto**: [nome]

## Contexto
[Por que estamos decidindo isso agora?]

## Decisão
[O que decidimos?]

## Consequências

### Positivas
- ...

### Negativas
- ...

### Mitigações
- ...

## Alternativas rejeitadas
- **Opção A**: [por que não]
- **Opção B**: [por que não]

## Referências
- ...
```

## Quando revisitar um ADR

- Mudança grande de tráfego/escala
- Nova alternativa surgiu (ex: Supabase lançou feature que muda jogo)
- Bug recorrente conectado à decisão
- Time pediu pra revisitar

Revisitar = novo ADR que supersede, NÃO editar o antigo.

## Anti-patterns

- ADR pra microdecisão (ruído)
- ADR sem contexto (perde valor em 3 meses)
- ADR sem alternativas (parece dogma)
- Editar ADR existente (revisita = novo ADR)
- Esconder consequências negativas (lança problema pra futuro)
- ADR escrito DEPOIS da decisão (vira justificativa post-hoc)
- ADR sem responsável (ninguém revisa)

## Checklist do ADR

Antes de marcar Accepted:
- [ ] Contexto explica o "por quê agora"
- [ ] Decisão clara em 1-2 frases
- [ ] ≥ 2 alternativas consideradas
- [ ] Consequências negativas + mitigações
- [ ] Referências (links, papers, discussões)
- [ ] INDEX atualizado
- [ ] ARCHITECTURE.md linka pra este ADR

## Validação automática

`@eli` pode validar:
- Se ARCHITECTURE.md menciona decisão sem ADR correspondente → INCOMPLETE
- Se ADR existe sem alternativas → INCOMPLETE

## Referências
- [ADR GitHub Organization](https://adr.github.io/)
- [Michael Nygard — Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Joel Parker Henderson — ADR templates](https://github.com/joelparkerhenderson/architecture-decision-record)
- [ThoughtWorks Tech Radar — ADRs](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)

