---
name: product-analytics
description: Frameworks pro `@bi` aplicar em SaaS/educação
key: paperclipai/bundled/3node-skills/product-analytics
recommendedForRoles:
- engineer
tags:
- product
- analytics
---

# Skill: Product Analytics (HEART + AARRR + NSM)

Frameworks pro `@bi` aplicar em SaaS/educação. Diferente de BI executivo (financeiro), product analytics olha **comportamento** do usuário.

## North Star Metric (NSM)

Métrica única que indica saúde do produto. Tudo se conecta a ela.

| Tipo de produto | NSM exemplo |
|---|---|
| SaaS B2B | ARR (Annual Recurring Revenue) |
| Marketplace | GMV mensal |
| Educação | % alunos que terminam curso |
| Webinar | % participantes que assistem > 80% |
| Social/comunidade | DAU/MAU ratio |
| Conteúdo | Tempo médio engajado |

### Pra Academia de Pregadores
**NSM proposta**: % de inscritos que validam **todos** os códigos do curso.

Por quê:
- Indica engajamento real (não só assistir)
- Conecta com retenção (quem termina, volta)
- Mede valor entregue (aluno absorveu)

## HEART Framework (Google)

Pra cada feature, mede 5 dimensões:

| Letra | Significado | Métrica |
|---|---|---|
| **H** | Happiness | NPS, CSAT, rating |
| **E** | Engagement | sessões/usuário, tempo, ações |
| **A** | Adoption | novos usuários da feature |
| **R** | Retention | volta a usar |
| **T** | Task Success | completion rate, time on task |

### Aplicação prática
Pra cada feature, define **1 métrica por dimensão**. Não precisa tudo, só o que faz sentido.

Exemplo (feature de chat ao vivo):
- H: NPS após evento (5+)
- E: msgs/participante (>3)
- A: % participantes que mandam ≥1 msg (>40%)
- R: % volta no próximo evento (>50%)
- T: taxa de mensagens enviadas com sucesso (>99%)

## AARRR (Pirate Metrics)

Funnel de produto:

| Etapa | Mede |
|---|---|
| **A**cquisition | Como chegam? Tráfego, fontes |
| **A**ctivation | Primeira experiência boa |
| **R**etention | Voltam? |
| **R**eferral | Indicam? |
| **R**evenue | Pagam? |

### Aplicação no contexto Ryan
| Etapa | Métrica concreta | Target |
|---|---|---|
| Acquisition | Inscrições/mês | Track + crescimento |
| Activation | % que assistem ≥1 aula em 24h | > 40% |
| Retention | % que voltam dia 7 | > 25% |
| Referral | % que indicam | > 15% |
| Revenue | % que compra upsell | > 5% |

## Input Metrics Tree

NSM é difícil de mover diretamente. Decompõe em inputs:

```
NSM: % alunos que terminam curso
  ↑
  ├─ % que assistem 1ª aula (activation)
  │    ├─ Email de boas-vindas open rate
  │    ├─ Tempo entre inscrição e 1ª aula
  │    └─ Onboarding completion
  │
  ├─ % que assistem aulas regulares
  │    ├─ Notificações de aula (push, WA, email)
  │    ├─ Aderência de horário
  │    └─ Conteúdo relevante
  │
  └─ % que validam códigos
       ├─ Lembrete durante aula
       ├─ Recompensa visível
       └─ Fricção mínima
```

Features movem inputs → inputs movem NSM.

## Cohort analysis

### Retention cohort
% de usuários que volta após X dias.

```
Cohort           D0     D1     D7     D30
Jun 1-7   100%   45%    22%    12%
Jun 8-14  100%   50%    28%    15%  ← melhorando
Jun 15-21 100%   38%    18%     8%  ← regressão, investigar
```

Padrão saudável B2C SaaS BR: D30 ~10-15%.

### Implementação no Supabase
```sql
WITH cohorts AS (
  SELECT
    participant_id,
    DATE_TRUNC('week', first_access_at) AS cohort_week,
    first_access_at
  FROM er_event_participants
  WHERE first_access_at IS NOT NULL
),
activity AS (
  SELECT DISTINCT
    participant_id,
    DATE_TRUNC('day', occurred_at) AS active_day
  FROM er_engagement_events
)
SELECT
  c.cohort_week,
  COUNT(DISTINCT c.participant_id) AS cohort_size,
  COUNT(DISTINCT a.participant_id) FILTER (
    WHERE a.active_day = c.first_access_at::date
  ) AS d0,
  COUNT(DISTINCT a.participant_id) FILTER (
    WHERE a.active_day = c.first_access_at::date + 1
  ) AS d1,
  COUNT(DISTINCT a.participant_id) FILTER (
    WHERE a.active_day = c.first_access_at::date + 7
  ) AS d7,
  COUNT(DISTINCT a.participant_id) FILTER (
    WHERE a.active_day = c.first_access_at::date + 30
  ) AS d30
FROM cohorts c
LEFT JOIN activity a ON a.participant_id = c.participant_id
GROUP BY c.cohort_week
ORDER BY c.cohort_week DESC;
```

## Funnel analysis

% de usuários em cada step do fluxo.

```
Step                       Users   Conversion
1. Landed on page          1000    100%
2. Started signup          400     40% ⚠️ grande drop
3. Completed signup        320     80%
4. Confirmed email         240     75% ⚠️
5. First class watched     180     75%
6. Code validated          120     67%
```

**Drops > 30% indicam fricção** — foco do `@ux` audit.

## Ferramentas (stack Ryan)

### PostHog (recomendado)
- Free tier generoso (1M events/mês)
- Funnels, retention, paths nativos
- Self-hostable

### Mixpanel
- Mais maduro pra mobile
- Pago

### Métricas via Supabase
- Sem custo extra
- Queries SQL diretas
- Menos dinâmico que PostHog

### Vercel Analytics
- Web vitals + funil de página
- Incluso Vercel Pro
- Limitado a eventos default

## Tracking — eventos

### Quais eventos rastrear

| Categoria | Eventos chave |
|---|---|
| Account | sign_up, login, profile_updated |
| Onboarding | tutorial_started, tutorial_step_completed |
| Engagement | feature_used, session_started |
| Value | first_value, milestone_reached |
| Monetization | upgrade_clicked, payment_completed |
| Lifecycle | activated, churned, reactivated |

### Estrutura de evento
```typescript
posthog.capture('keyword_validated', {
  event_id: '6020c0af',
  participant_id: '...',
  day_number: 1,
  keyword: 'XYZ',
  time_since_aula_start_sec: 1240,
  $session_id: '...',
})
```

Properties úteis sempre:
- `event_id`, `participant_id`, `organization_id` (multi-tenant)
- Timestamp (PostHog auto)
- Context (`day_number`, etc)

## Métricas vaidade vs métricas reais

| ❌ Vanity | ✅ Real |
|---|---|
| Total signups | Activation rate (% que ativam) |
| Total downloads | DAU (daily active users) |
| Total mensagens enviadas | Mensagens por usuário ativo |
| Total horas assistidas | % cursos completados |
| Followers / curtidas | Conversões |

## Anti-patterns analíticos

### Métrica sem comparação
- "1000 usuários este mês" → e daí?
- "Cresceu 15% vs mês anterior" ✅

### Métrica sem segmento
- "% activation: 40%" → de quem?
- "% activation: 40% no segmento B, 25% no segmento A" ✅

### Métrica em silo
- "MRR cresceu 20%" mas churn dobrou
- Olha métricas juntas

### Métrica enviesada por base pequena
- "% conversão sobe 50%" mas é 1 → 1.5 de 10 usuários
- Mostra absoluto também

### Métrica desatualizada
- Dashboard de Q1 olhando em Q3
- Atualização semanal mínima

## Dashboard executivo — modelo

```markdown
# Dashboard semanal — [Data]

## North Star
- Course completion rate: 23% (↑ 2pp vs semana passada)

## Inputs principais
- Activation D1: 41% (↑ 3pp)
- D7 retention: 18% (→)
- D30 retention: 9% (↓ 1pp ⚠️)

## Funil principal
- Landing → Signup: 38%
- Signup → 1ª aula: 64%
- 1ª aula → 1º código validado: 72%
- Validação completa: 31%

## Alertas
- D30 retention caindo 3 semanas seguidas
- Drop signup→1ª aula em segmento WhatsApp (foco @cmo)

## Decisões da semana
- Investigar D30 drop (foco @cpo continuous discovery)
- A/B test no onboarding (foco @ux)
```

## Checklist `@bi` ao desenhar analytics

- [ ] NSM definida e validada com Ryan
- [ ] Input metrics tree mapeada
- [ ] Eventos chave instrumentados
- [ ] Funil principal definido
- [ ] Retention cohorts setup
- [ ] Dashboard semanal automatizado
- [ ] Alertas em métricas críticas
- [ ] Segmentação por org/canal/persona
- [ ] Documentação dos eventos

## Referências
- [Google HEART](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/)
- [Dave McClure — AARRR](https://www.slideshare.net/dmc500hats/startup-metrics-for-pirates)
- [Sean Ellis — North Star Framework](https://amplitude.com/blog/north-star-framework)
- [PostHog Tutorials](https://posthog.com/tutorials)
- [Mixpanel Analytics Academy](https://mixpanel.com/blog/category/best-practices/)

