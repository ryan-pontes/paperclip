---
name: cohort-funnel
description: Skill complementar ao `product-analytics.md`
key: paperclipai/bundled/3node-skills/cohort-funnel
recommendedForRoles:
- product-manager
tags:
- cohort
- funnel
---

# Skill: Cohort + Funnel analysis (técnicas práticas)

Skill complementar ao `product-analytics.md`. Foco em **técnica** de cohort e funnel — como montar, ler, agir.

## Cohort retention — como montar

### Estrutura
- **Cohort**: grupo de usuários que entraram no mesmo período (semana/mês)
- **Coluna**: período desde entrada (D0, D1, D7, D14, D30, D60, D90)
- **Célula**: % do cohort que estava ativo no período

### Padrão saudável (curve shape)

```
Bad smile (declínio constante):    Good smile (estabiliza):
100% ↓                              100% ↓
 40%                                 40% ↓
 20% ↓                               20% ↓
 10% ↓                               18% → estabiliza
  5% ↓                               17% → estabiliza
  2% → mort                          16% → estabiliza
```

PMF claro: curva **estabiliza** após D30 (chama "smile curve" se sobe um pouco depois).

### Implementação no Supabase

```sql
-- Retention cohort por semana
WITH cohorts AS (
  SELECT
    participant_id,
    DATE_TRUNC('week', first_access_at)::date AS cohort_week,
    first_access_at::date AS join_date
  FROM er_event_participants
  WHERE first_access_at IS NOT NULL
),
activity AS (
  SELECT
    participant_id,
    DATE_TRUNC('day', occurred_at)::date AS active_day
  FROM er_engagement_events
  WHERE type IN ('room.heartbeat', 'video.heartbeat', 'chat.message')
  GROUP BY 1, 2
),
retention AS (
  SELECT
    c.cohort_week,
    COUNT(DISTINCT c.participant_id) AS cohort_size,
    COUNT(DISTINCT CASE WHEN a.active_day = c.join_date + 0 THEN c.participant_id END) AS d0,
    COUNT(DISTINCT CASE WHEN a.active_day = c.join_date + 1 THEN c.participant_id END) AS d1,
    COUNT(DISTINCT CASE WHEN a.active_day = c.join_date + 7 THEN c.participant_id END) AS d7,
    COUNT(DISTINCT CASE WHEN a.active_day = c.join_date + 14 THEN c.participant_id END) AS d14,
    COUNT(DISTINCT CASE WHEN a.active_day = c.join_date + 30 THEN c.participant_id END) AS d30
  FROM cohorts c
  LEFT JOIN activity a ON a.participant_id = c.participant_id
  GROUP BY c.cohort_week
)
SELECT
  cohort_week,
  cohort_size,
  ROUND(100.0 * d0 / cohort_size, 1) AS d0_pct,
  ROUND(100.0 * d1 / cohort_size, 1) AS d1_pct,
  ROUND(100.0 * d7 / cohort_size, 1) AS d7_pct,
  ROUND(100.0 * d14 / cohort_size, 1) AS d14_pct,
  ROUND(100.0 * d30 / cohort_size, 1) AS d30_pct
FROM retention
ORDER BY cohort_week DESC;
```

### Como ler

| Padrão | Significado | Ação |
|---|---|---|
| Cohort recente > antiga | Produto melhorando | Continua |
| Cohort recente < antiga | Regressão | Investigar mudanças |
| D7 saudável mas D30 cai | Retenção curto-prazo OK, falta valor recorrente | Foco engagement loop |
| D0 baixo (<60%) | Onboarding ruim | Activation focus |

## Behavioral cohorts

Em vez de "todos da semana X", segmenta por **comportamento**:

| Cohort | Definição |
|---|---|
| **Power users** | Logaram ≥ 5x na 1ª semana |
| **Lurkers** | Logaram 1x, viram conteúdo, não interagiram |
| **Highly engaged** | Validaram ≥ 1 código no D0 |
| **Almost-converted** | Iniciaram checkout mas não pagaram |

### Por que importa
- Power users D30 retention de 50% vs média 15% revela perfil de usuário ideal (ICP refinado)
- Lurkers D30 retention de 2% → não vale aquisição desse perfil

### Query exemplo
```sql
-- Compara retention de quem validou código no D0 vs quem não
WITH cohort AS (
  SELECT
    p.participant_id,
    p.first_access_at::date AS join_date,
    EXISTS (
      SELECT 1 FROM er_validated_keywords v
      WHERE v.participant_id = p.participant_id
        AND v.validated_at::date = p.first_access_at::date
    ) AS validated_d0
  FROM er_event_participants p
  WHERE first_access_at IS NOT NULL
),
d30 AS (
  SELECT DISTINCT participant_id,
    EXISTS (
      SELECT 1 FROM er_engagement_events e
      WHERE e.participant_id = c.participant_id
        AND e.occurred_at::date = c.join_date + 30
    ) AS active_d30
  FROM cohort c
)
SELECT
  validated_d0,
  COUNT(*) AS cohort_size,
  COUNT(*) FILTER (WHERE active_d30) AS retained_d30,
  ROUND(100.0 * COUNT(*) FILTER (WHERE active_d30) / COUNT(*), 1) AS retention_pct
FROM cohort c
JOIN d30 d ON d.participant_id = c.participant_id
GROUP BY validated_d0;
```

## Funnel analysis

### Estrutura
Sequência de steps, mede conversão entre cada um.

```
1000 visit       100%
 400 signup       40%  ← drop 60%
 320 confirm      80%
 240 1st class    75%
 180 validation   75%
```

### Implementação no Supabase

```sql
-- Funil: signup → 1ª aula → 1º código → curso completo
WITH steps AS (
  SELECT
    participant_id,
    MIN(occurred_at) FILTER (WHERE type = 'account.signup') AS signup_at,
    MIN(occurred_at) FILTER (WHERE type = 'video.heartbeat') AS first_class_at,
    MIN(occurred_at) FILTER (WHERE type = 'keyword.validated') AS first_code_at,
    MAX(occurred_at) FILTER (WHERE type = 'course.completed') AS completed_at
  FROM er_engagement_events
  GROUP BY participant_id
)
SELECT
  COUNT(*) AS total_signups,
  COUNT(*) FILTER (WHERE first_class_at IS NOT NULL) AS reached_first_class,
  COUNT(*) FILTER (WHERE first_code_at IS NOT NULL) AS reached_first_code,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed_course,

  ROUND(100.0 * COUNT(*) FILTER (WHERE first_class_at IS NOT NULL) / COUNT(*), 1) AS pct_to_class,
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_code_at IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE first_class_at IS NOT NULL), 0), 1) AS pct_to_code,
  ROUND(100.0 * COUNT(*) FILTER (WHERE completed_at IS NOT NULL) / NULLIF(COUNT(*) FILTER (WHERE first_code_at IS NOT NULL), 0), 1) AS pct_to_completion
FROM steps;
```

### Time-to-step
Quanto tempo entre steps. Drop alto + tempo longo = fricção.

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (first_class_at - signup_at)) / 3600) AS avg_hours_signup_to_class
FROM steps;
```

### Funnel segmentado
Compara conversão por segmento:

| Canal | Signup→1ª aula | 1ª aula→completion |
|---|---|---|
| Orgânico | 65% | 28% |
| WhatsApp ads | 45% | 12% |
| Indicação | 80% | 45% |

**Conclusão**: indicações trazem usuário 3x mais valioso. Foca CMO aí.

## LTV cohorts

Receita acumulada por cohort ao longo do tempo.

```
Cohort       M1     M3     M6     M12
Jan 2026   R$ 27  R$ 50  R$ 80  R$ 120
Feb 2026   R$ 30  R$ 60  R$ 100 R$ ?
Mar 2026   R$ 35  R$ 70  R$ ?   R$ ?
```

**Padrão saudável**: LTV cresce ao longo do tempo (mostra que upsell + expansion funcionam).

### Query
```sql
SELECT
  DATE_TRUNC('month', s.first_subscription_at) AS cohort_month,
  COUNT(DISTINCT s.customer_id) AS cohort_size,
  SUM(p.amount_cents) FILTER (WHERE p.paid_at < s.first_subscription_at + INTERVAL '1 month') AS m1_revenue,
  SUM(p.amount_cents) FILTER (WHERE p.paid_at < s.first_subscription_at + INTERVAL '3 month') AS m3_revenue,
  SUM(p.amount_cents) FILTER (WHERE p.paid_at < s.first_subscription_at + INTERVAL '6 month') AS m6_revenue
FROM subscriptions s
JOIN payments p ON p.customer_id = s.customer_id
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

## Drop-off investigation

Quando funnel mostra drop grande, investigar:

### 1. Heatmap / session recording (Hotjar, PostHog)
- Onde clicam antes de sair?
- Que erro encontram?

### 2. Survey contextual
- "Por que está saindo?"
- Botão "Reportar problema" no step de drop

### 3. Time-to-step analysis
- Step demora muito? UX problema
- Step rápido demais? Usuário não entende valor

### 4. Segmentação
- Drop afeta todo mundo ou segmento específico?
- Mobile vs desktop?

## A/B testing em funnel

Pra mover conversão entre steps:

1. **Identifica step com maior drop**
2. **Hipótese**: "Se mudar X, conversão sobe Y pp"
3. **Roda teste 50/50**
4. **Sample size**: precisa ~1000 conversões por braço pra detectar 10% lift com confiança
5. **Duração mínima**: 2 semanas (captura ciclos semanais)

### Ferramentas
- PostHog feature flags (built-in)
- GrowthBook (open source)
- Vercel A/B testing

## Activation metric (aha moment)

O **comportamento** que prediz retenção longa.

### Como identificar
Compara D30 retention entre quem fez vs não fez ação X no D1.

| Ação no D1 | D30 retention |
|---|---|
| Validou ≥ 1 código | 38% ⭐ |
| Mandou ≥ 1 msg no chat | 22% |
| Convidou amigo | 65% (mas só 2% faz) |
| Nada | 8% |

**Activation metric pra Academia**: "Validar 1 código no D0" → forte preditor de retenção.

### O que fazer com isso
- Onboarding força essa ação
- KPI principal de ativação
- Reverse engineering das outras features pra levar nessa direção

## Anti-patterns

- Cohort sem segmentação (mistura ICP com não-ICP)
- Funnel com steps demais (12 steps = ruído)
- Funnel sem time window (compara usuários de semanas diferentes)
- Cohort retention apenas D1 (não vê PMF real)
- A/B test com sample pequeno (conclui errado)
- A/B test parado em 1 semana (não captura ciclo)

## Checklist `@bi` mensal

- [ ] Retention cohort atualizado (semana)
- [ ] Funnel principal monitorado
- [ ] LTV cohort calculado
- [ ] Drop > 30% investigado
- [ ] Activation metric definida
- [ ] Behavioral cohorts comparados (power vs lurker)
- [ ] A/B tests em andamento documentados

## Referências
- [Andrew Chen — Why retention is the silent killer](https://andrewchen.com/the-power-user-curve-the-best-way-to-understand-your-most-engaged-users/)
- [Lenny — Cohort analysis](https://www.lennysnewsletter.com/p/the-ultimate-guide-to-cohort-analysis)
- [PostHog — Funnel insights](https://posthog.com/manual/funnels)
- [Reforge — Retention](https://www.reforge.com/blog/retention-engagement-growth-silent-killer)

