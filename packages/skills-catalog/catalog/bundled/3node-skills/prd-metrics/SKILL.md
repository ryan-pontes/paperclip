---
name: prd-metrics
description: 'Todo critério de sucesso no PRD precisa ser **mensurável**: baseline atual + target esperado'
key: paperclipai/bundled/3node-skills/prd-metrics
recommendedForRoles:
- product-manager
tags:
- prd
- metrics
---

# Skill: PRD Metrics (baseline + target mensurável)

Todo critério de sucesso no PRD precisa ser **mensurável**: baseline atual + target esperado. Usado pelo `@nic` ao escrever PRDs.

## Por que existe

PRD sem métrica = sem definição de "pronto":
- ❌ "Usuário consegue criar conta" → tecnicamente OK qualquer fluxo
- ✅ "Taxa de ativação D1 sobe de 0% pra 40% em 30 dias" → mensurável

Sem métrica:
- `@eli` não sabe quando o produto está "pronto de negócio"
- `@felipe` implementa coisa que técnicamente funciona mas não move ponteiro
- Ryan gasta esforço em feature que não muda nada

## Estrutura de métrica no PRD

Pra cada feature, defina:

```markdown
### Critério de sucesso — [Feature]

**Métrica primária**: [nome da métrica]
**Como medir**: [PostHog / Supabase query / análise manual]
**Baseline atual**: [valor hoje OU "novo, sem baseline"]
**Target em [prazo]**: [valor esperado]
**Considerado sucesso se**: [threshold mínimo]
**Failure mode**: [o que indica que feature falhou]
```

Exemplo:

```markdown
### Critério de sucesso — Marcadores de capítulo em aulas

**Métrica primária**: Taxa de revisão (rewatch) de aulas
**Como medir**: PostHog event `video.chapter.clicked` / `video.start`
**Baseline atual**: 8% das aulas têm rewatch
**Target em 30 dias**: 25% das aulas têm rewatch
**Considerado sucesso se**: ≥ 18% (gain de 10pp)
**Failure mode**: <12% após 30 dias → remover feature, custo de manutenção não vale
```

## Tipos de métrica

### Métrica primária (1 por feature)
A que move sozinha sem ambiguidade. Ex: taxa de ativação.

### Métricas secundárias (1-3)
Garantem que primária não é gaming do número. Ex: retenção D7.

### Guardrails (1-2)
Indicadores de degradação. Se piorarem, suspender feature.
Ex: tempo de página, taxa de erro.

```markdown
**Primária**: Taxa de ativação D1: 0% → 40%
**Secundária**: Retenção D7: 30% (não cai)
**Guardrail**: Bounce rate: <60% (não sobe)
```

## North Star Metric (NSM)

A métrica que indica saúde do produto inteiro. Cada feature contribui pra essa.

Exemplos por contexto:
- **SaaS B2B**: ARR (Annual Recurring Revenue)
- **Educação**: % alunos que terminam curso
- **Webinar**: % participantes que assistem > 80% do evento
- **Marketplace**: GMV (Gross Merchandise Value)

Pra Academia de Pregadores:
- NSM possível: "% de alunos que validam todos os códigos do curso"

Todo PRD deve mencionar como a feature contribui pra NSM.

## Input metrics — tree

NSM é hard to move directly. Decompõe em **input metrics**:

```
NSM: % alunos que terminam curso
  ├─ Onboarding rate (terminar cadastro)
  ├─ Activation rate (assistir 1ª aula)
  ├─ Engagement rate (assistir aulas semanais)
  └─ Completion rate (terminar todas aulas)
```

Feature movimenta input metric → input metric movimenta NSM.

## Métricas comuns em SaaS/educação

| Métrica | Definição | Benchmark saudável |
|---|---|---|
| **Activation rate** | % usuários que completam ação chave de valor | > 40% |
| **D1 retention** | % usuários que voltam 1 dia depois | > 30% |
| **D7 retention** | 7 dias depois | > 15% |
| **D30 retention** | 30 dias depois | > 8% |
| **Time to First Value** | Tempo até primeira ação de valor | < 5min |
| **Net Promoter Score** | "Recomendaria?" 0-10, % promoters - detractors | > 30 |
| **Churn rate (mensal)** | % usuários que cancelam | < 5% saudável BR |
| **Course completion rate** | % alunos que terminam | > 25% (edu BR) |

## Frameworks de medição

### AARRR (Pirate Metrics)
- **A**cquisition: como chegam
- **A**ctivation: primeira experiência boa
- **R**etention: voltam
- **R**eferral: indicam
- **R**evenue: pagam

Pra cada A/R, defina métrica + target no PRD.

### HEART (Google)
- **H**appiness: NPS, CSAT
- **E**ngagement: tempo, frequência
- **A**doption: novos usuários ativos
- **R**etention: voltam
- **T**ask success: completam tarefa

Útil pra UX-focused PRDs.

## Como medir (stack Ryan)

| Ferramenta | O que mede |
|---|---|
| **PostHog** | Eventos, funis, retenção, NPS surveys |
| **Supabase** | Queries diretas em tabelas, métricas custom |
| **Vercel Analytics** | Tráfego, conversão por rota |
| **Stripe/Asaas** | MRR, churn, expansion |
| **Manual / Sheets** | Métricas qualitativas, surveys |

Exemplo de query pra activation rate (Supabase):

```sql
WITH first_access AS (
  SELECT participant_id, MIN(occurred_at) AS first_at
  FROM er_engagement_events
  WHERE type = 'room.heartbeat'
  GROUP BY participant_id
),
activated AS (
  SELECT DISTINCT participant_id
  FROM er_engagement_events
  WHERE type = 'keyword.validated'
)
SELECT
  COUNT(DISTINCT f.participant_id) AS total_users,
  COUNT(DISTINCT a.participant_id) AS activated_users,
  (COUNT(DISTINCT a.participant_id)::float / COUNT(DISTINCT f.participant_id)) * 100 AS activation_rate
FROM first_access f
LEFT JOIN activated a ON a.participant_id = f.participant_id;
```

## Definindo target realista

### Sem baseline (feature nova)
- Olhar benchmark do nicho (educação BR: ~30% completion)
- Começar conservador (50% do benchmark)
- Ajustar após 30 dias de dados

### Com baseline
- **Quick win**: target = baseline + 10pp
- **Ambicioso**: target = baseline × 2
- **Realista**: target = baseline + (gap até benchmark) × 30%

### Pra evento ao vivo
- Métrica de presença: % inscritos que entram
- Pra Academia: 30-40% é saudável (evento gratuito)
- Pra evento pago: 60-70%

## Anti-patterns

### Métrica vaga
- ❌ "Mais engajamento"
- ✅ "Aulas assistidas por usuário/semana: 0.8 → 1.5"

### Métrica de output em vez de outcome
- ❌ "Feature shipped" (output)
- ✅ "Taxa de uso da feature > 30% dos usuários ativos" (outcome)

### Vanity metrics
- ❌ Total de usuários cadastrados (não diz nada sozinho)
- ✅ Usuários ativos semanais / Activation rate

### Métrica sem prazo
- ❌ "Aumentar conversão"
- ✅ "Conversão sobe de 2% pra 4% em 60 dias"

### Métrica sem como medir
- ❌ "Satisfação do usuário"
- ✅ "NPS via PostHog Survey após 7 dias de uso"

### Múltiplas métricas primárias
- ❌ "Aumentar conversão E retenção E engajamento"
- ✅ 1 primária + 2-3 secundárias

## Quando revisitar métrica

- 30 dias após lançamento (feature alcançou target?)
- Quando feature ainda não bateu target após 60-90 dias
- Quando guardrail acende
- Quando NSM muda (estratégia)

## Decisão: continuar / iterar / matar

| Cenário | Ação |
|---|---|
| Bateu target | Mantém, otimiza |
| 50-90% do target | Itera (analisa onde fala) |
| < 50% do target | Mata ou pivot radical |
| Bateu primária mas degradou guardrail | Reverter, redesenhar |

## Checklist do `@nic`

Antes de fechar PRD, cada feature tem:

- [ ] Métrica primária nomeada
- [ ] Como medir definido (ferramenta + query)
- [ ] Baseline atual (ou marca "sem baseline")
- [ ] Target em prazo específico
- [ ] Threshold de sucesso/falha
- [ ] Relação com NSM mapeada
- [ ] Métricas secundárias (≥1)
- [ ] Guardrails (≥1)
- [ ] Failure mode definido

## Exemplo PRD section completo

```markdown
## Critérios de sucesso

### Feature 1: Validação de códigos no chat

**JTBD**: Quando assisto a aula ao vivo, quero validar minha presença sem sair do chat, pra não perder contexto do conteúdo.

**Métricas**:
| Tipo | Métrica | Baseline | Target (30d) | Sucesso se |
|---|---|---|---|---|
| Primária | Taxa de validação durante aula | N/A (nova) | 60% | ≥ 45% |
| Secundária | Tempo médio até validar | N/A | < 30s | < 60s |
| Secundária | % aulas com >50% validados | N/A | 70% | ≥ 50% |
| Guardrail | Engajamento no chat | 12 msgs/usuário | mantém | não cai >15% |

**Como medir**: queries Supabase em `er_validated_keywords` + `er_engagement_events`.

**Failure mode**: se taxa < 30% após 30 dias → readicionar fricção pra forçar engajamento OU remover feature.

**Contribuição pra NSM**: validação é input pra "completion rate" — pessoa que valida cada código tem 3x mais chance de terminar o curso.
```

## Referências
- [Lenny Rachitsky — Defining Product Metrics](https://www.lennysnewsletter.com/p/the-ultimate-guide-to-okrs)
- [Reforge — North Star Metric](https://www.reforge.com/blog/north-star-metric)
- [Google HEART Framework](https://library.gv.com/how-to-choose-the-right-ux-metrics-for-your-product-5f46359ab5be)
- [Pirate Metrics — Dave McClure](https://www.slideshare.net/dmc500hats/startup-metrics-for-pirates-long-version)

