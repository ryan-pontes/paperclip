---
name: error-budget
description: Disciplina que conecta SLO a decisão de produto
key: paperclipai/bundled/3node-skills/error-budget
recommendedForRoles:
- sre
tags:
- error
- budget
---

# Skill: Error Budget

Disciplina que conecta SLO a decisão de produto. Quando budget acaba, **features esperam**.

## Conceito

Se o SLO é 99.9% availability, o **budget** é 0.1% — ou 43min/mês de downtime tolerado.

```
budget_total = (1 - SLO) × tempo_total
budget_restante = budget_total - downtime_observado
```

Exemplo:
- SLO 99.9% mensal → budget = 43min
- Em 15 dias do mês, teve 30min de downtime
- Budget restante: 43 - 30 = 13min
- Consumido: 30/43 = 70%

## Por que existe

Sem budget, time fica em loop:
- "Vamos melhorar reliability" (mas sem critério)
- "Vamos lançar features novas" (mas sistema instável)

Budget resolve: **acima do SLO = velocidade**. **Abaixo do SLO = estabilidade**.

## Thresholds e ações

| Budget consumido | Status | Ação |
|---|---|---|
| 0-50% | 🟢 Saudável | Velocidade normal, lança features |
| 50-80% | 🟡 Atenção | Ainda lança, mas evita mudanças arriscadas |
| 80-100% | 🟠 Cuidado | Feature freeze; só bugfix e reliability |
| > 100% | 🔴 Esgotado | **STOP**: nada novo até resolver root cause + recuperar |

## Tipos de budget

### Budget de availability
```
total_minutes_in_month × (1 - SLO_target)
```

### Budget de latency
% de requests acima do P95 alvo. Ex:
- SLO P95 < 800ms
- Se 0.5% das requests passam de 800ms, gastou 5% do budget de latency

### Budget de error rate
```
total_requests × max_error_rate
```

## Cálculo prático

```sql
-- Supabase: calcula error budget consumido (último mês)
WITH stats AS (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status >= 500) AS errors
  FROM request_logs
  WHERE ts > NOW() - INTERVAL '30 days'
)
SELECT
  errors,
  total,
  (errors::float / total) * 100 AS observed_error_rate,
  0.5 AS slo_max_error_rate,
  ((errors::float / total) / 0.005) * 100 AS budget_consumed_pct
FROM stats;
```

## Dashboard de budget

`docs/sre/SLO-DASHBOARD.md` deve ter seção:

```markdown
## Error Budget (mês atual)
| Tier | SLO | Budget | Consumido | Status |
|---|---|---|---|---|
| 1 (hot path) | 99.9% | 43min | 12min (28%) | 🟢 |
| 2 (admin) | 99.5% | 3h36min | 1h12min (33%) | 🟢 |
| 3 (analytics) | 99% | 7h12min | 5h48min (80%) | 🟠 |

## Trends
- Tier 3 consumindo budget rápido — investigar
```

## Quando "queimar" budget intencionalmente

Tudo bem **gastar** budget se:
- Lançar feature de alto valor (vale o risco)
- Migração planejada com downtime esperado
- Manutenção comunicada

Não tudo bem:
- Gastar sem aprender (sem post-mortem)
- Gastar por descuido (sem testes)
- Esconder consumo (sem dashboard)

## Burn rate (taxa de queima)

Velocidade de consumo de budget. Útil pra alertar antes de esgotar.

```
burn_rate = budget_consumido / tempo_passado
```

Multi-window burn rate alert (Google SRE):
- **Fast burn**: 2% do budget em 1h → alerta urgente
- **Slow burn**: 10% do budget em 24h → alerta normal

```yaml
# Conceito de alerta (Prometheus-style)
- alert: HighErrorBudgetBurn
  expr: error_budget_consumed_1h > 0.02
  severity: critical

- alert: ModerateErrorBudgetBurn
  expr: error_budget_consumed_24h > 0.10
  severity: warning
```

## Política de feature freeze

Quando budget esgota:

1. **Stop**: novas features pausadas
2. **Investigate**: por que budget esgotou? Tier afetado?
3. **Action plan**: root cause + ações de melhoria
4. **Recovery**: implementa, monitora, espera SLO voltar
5. **Resume**: após X dias acima do SLO, libera features

Comunicar pro time: "Tier 1 esgotou budget. Esta semana só reliability work."

## Adaptado pro contexto Ryan (solopreneur)

Ryan é dev/owner/everything. "Feature freeze" significa:
- Pausa desenvolvimento de novas features
- Foco em testes, observability, runbooks
- Investiga incidentes que consumiram budget
- Implementa melhorias preventivas

Disciplina, não dogma: se incidente foi 1x e claro, não freeze todo desenvolvimento. Use bom senso.

## Trade-off com inovação

Budget alto consumido pode significar:
- Reliability ruim (precisa melhorar)
- **OU** velocidade alta saudável (lançando feature legitimamente arriscada)

Distinguir: incidentes **planejados** (vale a pena) vs **acidentais** (sintoma).

## Anti-patterns

- SLO 100% (budget zero = impossível inovar)
- Budget calculado mas ignorado (vira só métrica)
- Feature freeze sem critério (vira política política)
- Burn rate sem alerta (descobre tarde)
- Não comunicar consumo ao time (afeta planejamento)

## Checklist error budget

- [ ] SLOs definidos por tier
- [ ] Budget calculado e visível no dashboard
- [ ] Burn rate alertado (50%, 80%, 100%)
- [ ] Política clara de quando freeze
- [ ] Revisão mensal de consumo
- [ ] Aprendizado de consumo documentado

## Referências
- [Google SRE — Embracing Risk](https://sre.google/sre-book/embracing-risk/)
- [Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [Multi-window burn rate alerts](https://sre.google/workbook/alerting-on-slos/)

