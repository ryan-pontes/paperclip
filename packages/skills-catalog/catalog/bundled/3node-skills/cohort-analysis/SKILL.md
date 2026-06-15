---
name: cohort-analysis
description: Foco em **revenue cohorts** pro `@cro`
key: paperclipai/bundled/3node-skills/cohort-analysis
recommendedForRoles:
- product-manager
tags:
- cohort
- analysis
---

# Skill: Cohort Analysis para Revenue Operations

Foco em **revenue cohorts** pro `@cro`. Complementa `cohort-funnel.md` (que foca em engagement/retention). Aqui: como cohorts revelam saúde de receita, churn, expansion.

## Revenue cohort vs Activity cohort

| Tipo | O que mede | Pro |
|---|---|---|
| **Activity cohort** | Usuários ativos por período desde signup | @bi, @cpo |
| **Revenue cohort** | Receita acumulada por cohort | @cro, @cfo |

Aqui foco em revenue.

## Revenue cohort table

```
Cohort   M1    M2    M3    M6    M12
Jan 24   100   105   108   115   125
Feb 24   100   110   115   125   140  ← cohort melhor
Mar 24   100   108   112   122   ?
```

Valores: % do MRR original do cohort.

| Cenário | Significado |
|---|---|
| 100 → 100 | Sem churn nem expansion (raro) |
| 100 → < 100 | Net churn (perdendo receita) |
| 100 → > 100 | Net expansion (NRR > 100%) ⭐ |

### Top SaaS atinge 130%+
Significa: $100 de MRR de cohort vira $130 ano depois sem aquisição.

## NRR (Net Revenue Retention)

Métrica única que resume saúde:

```
NRR = (Start MRR + Expansion - Contraction - Churn) / Start MRR × 100%
```

Componentes:
- **Start MRR**: receita do cohort no início
- **Expansion**: upgrades, add-ons, usage adicional
- **Contraction**: downgrades
- **Churn**: cancelamentos

### Benchmarks (SaaS B2B)
| NRR | Saúde |
|---|---|
| < 90% | Crítico (leak baddo) |
| 90-100% | Aceitável |
| 100-110% | Saudável |
| 110-120% | Excelente |
| > 120% | World-class |

### Pro contexto Ryan (educação BR, mais consumer-ish)
- Mais difícil atingir > 100% (sem upsell natural recorrente)
- Meta realista: > 90%
- Pra subir: introduzir cursos avançados como upsell

## GRR (Gross Revenue Retention)

Sem contar expansion:
```
GRR = (Start MRR - Contraction - Churn) / Start MRR × 100%
```

Mede quão bem **segura** receita atual (sem ajuda de upsell).

### Benchmarks
| GRR | Saúde |
|---|---|
| < 80% | Churn alto |
| 80-90% | Aceitável |
| > 90% | Excelente |

**NRR > 100% mas GRR < 80%** = expansão tampando furo de churn. Insustentável.

## Logo retention vs Revenue retention

- **Logo (customer) retention**: % de clientes que ficam
- **Revenue retention**: % de receita que fica

Pode divergir:
- Logo 70%, Revenue 110% = perdeu pequenos, manteve grandes (e cresceu)
- Logo 95%, Revenue 85% = manteve clientes mas downgradou

## Cálculo prático no Supabase

```sql
-- Cohort de janeiro: receita por mês
WITH cohort AS (
  SELECT
    s.customer_id,
    DATE_TRUNC('month', s.created_at)::date AS cohort_month
  FROM subscriptions s
  WHERE DATE_TRUNC('month', s.created_at) = '2026-01-01'
),
monthly_revenue AS (
  SELECT
    c.cohort_month,
    DATE_TRUNC('month', p.paid_at)::date AS revenue_month,
    SUM(p.amount_cents) AS revenue_cents
  FROM cohort c
  JOIN payments p ON p.customer_id = c.customer_id
  GROUP BY c.cohort_month, revenue_month
),
nrr AS (
  SELECT
    revenue_month,
    revenue_cents,
    FIRST_VALUE(revenue_cents) OVER (ORDER BY revenue_month) AS m0_revenue,
    ROUND(100.0 * revenue_cents / FIRST_VALUE(revenue_cents) OVER (ORDER BY revenue_month), 1) AS nrr_pct
  FROM monthly_revenue
  ORDER BY revenue_month
)
SELECT * FROM nrr;
```

## Churn analysis

### Voluntary vs involuntary
- **Voluntary**: cliente cancelou ativamente
- **Involuntary**: cartão recusado, não atualizou

### Involuntary é fixable
- Dunning emails (sequência de cobrança)
- Update card flow
- Tentar de novo X dias

Geralmente 30-40% do churn é involuntary — recuperável.

### Por segmento
| Segmento | Churn mensal | Ação |
|---|---|---|
| Free → paid | 0% (não convertem) | Activation focus |
| Tier 1 | 8% | Onboarding, suporte |
| Tier 2 | 4% | Account management |
| Tier 3 | 1% | White-glove |

### Identifica predictors de churn

Comportamentos no D30 que predizem churn no D60:
- Login < 3x na 1ª semana
- Não usou feature X
- Não atingiu "aha moment"
- Suporte ticket negativo

Pra cada predictor → playbook de **save** (intervenção).

## Customer Health Score

Combine sinais em score 0-100:

| Sinal | Peso |
|---|---|
| Login frequency últimos 30d | 30% |
| Feature adoption | 20% |
| NPS / feedback recente | 15% |
| Payment status | 15% |
| Suporte tickets | 10% |
| Tempo desde último engagement | 10% |

```
Health < 30: Red (intervir urgente)
Health 30-60: Yellow (atenção)
Health > 60: Green
```

### Implementação
```sql
WITH metrics AS (
  SELECT
    p.participant_id,
    COUNT(DISTINCT DATE_TRUNC('day', e.occurred_at)) AS active_days_30d,
    COUNT(DISTINCT e.type) AS unique_features_used,
    MAX(e.occurred_at) AS last_active
  FROM er_event_participants p
  LEFT JOIN er_engagement_events e ON e.participant_id = p.participant_id
    AND e.occurred_at > NOW() - INTERVAL '30 days'
  GROUP BY p.participant_id
)
SELECT
  participant_id,
  active_days_30d,
  unique_features_used,
  LEAST(100, active_days_30d * 3 + unique_features_used * 5) AS health_score
FROM metrics
ORDER BY health_score ASC;  -- piores primeiro (intervir)
```

## Win-back campaigns

Pra cohort churned:

### Sequência
1. **Dia +7 após churn**: "Sentimos sua falta. O que poderíamos melhorar?"
2. **Dia +14**: oferta de desconto pra voltar
3. **Dia +30**: feature nova relevante
4. **Dia +60**: última oferta

### Taxa de sucesso típica
- 5-10% volta com oferta direta
- 15-20% volta dentro de 6 meses se feature relevante

## Expansion playbook

### Onde upsell vem
1. **Usage hit limit** → upgrade tier (UBP)
2. **Mais usuários** (seats) → quantidade
3. **Add-ons** → módulo X premium
4. **Cross-sell** → outro produto do portfólio

### Triggers automatizados
- 80% do limite → email "upgrade"
- 100% do limite → modal forçando decisão
- Aniversário de cliente → oferta especial

### Pra Academia
- Curso de Daniel → curso de Apocalipse (cross-sell)
- E-book → curso completo (upsell)
- Único curso → assinatura ano (upsell)

## Cohort por canal de aquisição

Compara LTV por canal:

| Canal | CAC | LTV | LTV/CAC | Decisão |
|---|---|---|---|---|
| Orgânico | R$ 0 | R$ 200 | ∞ | Investir SEO |
| Indicação | R$ 5 | R$ 280 | 56x | Programa de embaixadores |
| WhatsApp ads | R$ 35 | R$ 180 | 5x | Manter |
| Facebook | R$ 50 | R$ 100 | 2x | Cortar ou otimizar |

**Saudável**: LTV/CAC > 3 e payback < 12 meses.

## Anti-patterns

- NRR só (sem GRR) — esconde leak de churn
- Logo retention só (sem revenue) — não vê expansion
- Não segmentar por canal/persona
- Win-back sem entender por que saiu
- Health score sem intervenção (vira métrica decorativa)
- Não acompanhar revenue cohort mensalmente

## Checklist `@cro` mensal

- [ ] Revenue cohort atualizado
- [ ] NRR e GRR calculados
- [ ] Logo vs revenue retention comparados
- [ ] Churn breakdown (voluntary vs involuntary)
- [ ] Predictors de churn revisados
- [ ] Health scores recalculados
- [ ] Intervenções pra Red customers documentadas
- [ ] Win-back campaign tracking
- [ ] Expansion revenue por trigger

## Referências
- [Lenny — NRR](https://www.lennysnewsletter.com/p/net-revenue-retention-the-best-saas)
- [ChartMogul — Cohorts](https://chartmogul.com/blog/cohort-analysis/)
- [SaaS Capital — Benchmarks](https://www.saas-capital.com/research/)
- [OpenView — Expansion benchmarks](https://openviewpartners.com/)

