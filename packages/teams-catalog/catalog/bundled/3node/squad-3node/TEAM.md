---
name: Squad 3node
description: 'Squad completo do Ryan Pontes (3node): 24 agentes cobrindo executivos
  C-suite, operacionais técnicos (arquitetura, dev, design, QA, security, devops,
  SRE), produto (PM, scrum master, UX), comunicação (copywriter, brand), inteligência
  (BI, researcher, prompt engineer) e orquestração (eli). Hierarquia em 2 níveis com
  CEO no topo e diretoria suportando.'
schema: agentcompanies/v1
slug: squad-3node
category: 3node
key: paperclipai/bundled/3node/squad-3node
manager: agents/ceo/AGENTS.md
includes:
- agents/bi/AGENTS.md
- agents/cfo/AGENTS.md
- agents/cmo/AGENTS.md
- agents/copywriter/AGENTS.md
- agents/cpo/AGENTS.md
- agents/cro/AGENTS.md
- agents/cto/AGENTS.md
- agents/devops/AGENTS.md
- agents/diretoria/AGENTS.md
- agents/edu/AGENTS.md
- agents/eli/AGENTS.md
- agents/felipe/AGENTS.md
- agents/joao/AGENTS.md
- agents/ju/AGENTS.md
- agents/nic/AGENTS.md
- agents/qa/AGENTS.md
- agents/researcher/AGENTS.md
- agents/reviewer/AGENTS.md
- agents/rony/AGENTS.md
- agents/sec/AGENTS.md
- agents/sm/AGENTS.md
- agents/sre/AGENTS.md
- agents/ux/AGENTS.md
defaultInstall: false
recommendedForCompanyTypes:
- startup
- agency
- generalist
tags:
- squad
- 3node
- ryan
- full-org
- executive
- engineering
requiredSkills: []
---

# Squad 3node

Time completo da 3node + projetos do Ryan Pontes. 24 agentes pré-configurados em hierarquia:

## Executivos (C-suite)

- **CEO** — visão, posicionamento, decisões finais
- **CFO** — viabilidade financeira, pricing, unit economics
- **CMO** — aquisição, lançamentos, conteúdo
- **CRO** — receita, conversão, retenção
- **CPO** — produto, roadmap, PMF
- **CTO** — tech strategy, escalabilidade
- **Diretoria** — board meeting (todos C-levels juntos)

## Orquestração

- **eli (Pax)** — squad lead. Coordena pipeline @nic → @edu → @felipe → @qa

## Operacional técnico

- **edu** — arquitetura de software, ARCHITECTURE.md
- **felipe** — implementação (Ralph loop friendly)
- **qa** — quality gate contra PRD
- **reviewer** — code review profundo
- **sec** — security audit (OWASP, RLS, multi-tenant)
- **devops** — CI/CD, deploy, ambientes
- **sre** — SLO/SLI, observability, post-mortem

## Produto

- **nic** — PRD, stories, escopo
- **sm** — Scrum Master, quebra arquitetura em stories executáveis
- **ux** — fluxos, microcopy, acessibilidade

## Comunicação

- **joao** — design system, identidade visual
- **copywriter** — UI microcopy + landing
- **rony** — marca pessoal/empresa (Reserva framework)

## Inteligência

- **bi** — Business Intelligence, KPIs
- **researcher** — pesquisa técnica antes de codar (Context7)
- **ju** — engenharia de prompts e criação de agentes

## Instalação

```bash
paperclipai teams install paperclipai/bundled/3node/squad-3node -C <company-id>
```
