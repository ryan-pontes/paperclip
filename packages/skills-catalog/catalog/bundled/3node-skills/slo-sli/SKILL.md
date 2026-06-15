---
name: slo-sli
description: Metas mensuráveis de confiabilidade
key: paperclipai/bundled/3node-skills/slo-sli
recommendedForRoles:
- sre
tags:
- slo
- sli
---

# Skill: SLO / SLI fundamentos

Metas mensuráveis de confiabilidade. Sem SLO, não há objetivamente "tá bom" ou "tá ruim".

## Vocabulário

| Termo | O que é |
|---|---|
| **SLI** (Service Level Indicator) | Métrica observada do sistema (latência atual, uptime atual) |
| **SLO** (Service Level Objective) | Meta interna para a SLI (P95 < 800ms, uptime > 99.9%) |
| **SLA** (Service Level Agreement) | Compromisso contratual com cliente — com penalidades |
| **Error Budget** | Quanto de "ruim" é permitido antes de bloquear novos releases |

## SLIs comuns

| SLI | Como medir |
|---|---|
| **Availability** | % de requests com sucesso (não 5xx) |
| **Latency** | P50/P95/P99 de requests respondidas com sucesso |
| **Throughput** | Requests por segundo |
| **Error rate** | % de requests com erro (não-2xx, não-3xx) |
| **Saturation** | Uso de recursos (CPU, RAM, DB connections, queue depth) |
| **Time to first byte** | Latência inicial |
| **Time to interactive** | Quando frontend fica usável |

## SLOs sugeridos pro contexto Ryan

### Tier 1 — Hot path crítico (sala de aula ao vivo, pagamento)
- **Availability**: 99.9% (43min downtime/mês)
- **Latency P95**: < 800ms
- **Latency P99**: < 2s
- **Error rate**: < 0.5%

### Tier 2 — Path importante (dashboard admin, registro)
- **Availability**: 99.5% (3h36min downtime/mês)
- **Latency P95**: < 1.5s
- **Error rate**: < 1%

### Tier 3 — Path secundário (analytics, configuração)
- **Availability**: 99% (7h12min downtime/mês)
- **Latency P95**: < 3s
- **Error rate**: < 2%

### Projeto NOVO sem histórico
Começa **conservador** (Tier 2 SLO), observa por 30 dias, ajusta.

## Tabela de equivalência uptime → downtime

| SLO | Downtime/mês | Downtime/ano | Downtime/dia |
|---|---|---|---|
| 99% | 7h 12min | 3.65 dias | 14.4min |
| 99.5% | 3h 36min | 1.83 dias | 7.2min |
| 99.9% | 43.8min | 8.76h | 1.44min |
| 99.95% | 21.9min | 4.38h | 0.72min |
| 99.99% | 4.32min | 52.6min | 8.64s |

**Realidade pro contexto Ryan (bootstrap, sem time 24/7):**
- 99.9% é a meta saudável
- 99.99% requer redundância multi-região + on-call → não vale o custo agora

## Como escolher SLO

### Pergunta-chave: **quanto downtime o usuário perdoa?**

- App de webinar ao vivo durante evento → < 1min é tolerável
- Dashboard admin que se acessa 2x/dia → 10min é tolerável
- Documentação estática → 1h é tolerável

### Princípios
1. **SLO < expectativa real do usuário** — sempre. Promete menos do que entrega.
2. **SLO realista pra alcançar com esforço razoável** — 100% é impossível e caro.
3. **SLO mensurável com observability existente** — sem dado, não há SLO.

## Como medir SLI

### Availability
```sql
-- Supabase: % de requests sem erro
SELECT
  (COUNT(*) FILTER (WHERE status < 500))::float / COUNT(*) * 100 AS availability
FROM request_logs
WHERE ts > NOW() - INTERVAL '24 hours';
```

Em Sentry: `transaction.failure_rate`
Em Vercel Speed Insights: dashboard mostra direto.

### Latency
```sql
SELECT
  percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99
FROM request_logs
WHERE ts > NOW() - INTERVAL '1 hour';
```

### Error rate
```
errors / total_requests
```

## Dashboard mínimo de SLI

Criar `docs/sre/SLO-DASHBOARD.md` com:

```markdown
# SLO Dashboard — [Projeto]
**Update**: [data]

## Tier 1 (hot path)
| SLI | Target | Atual (7d) | Status |
|---|---|---|---|
| Availability | 99.9% | 99.94% | ✅ |
| P95 latency | < 800ms | 620ms | ✅ |
| P99 latency | < 2s | 1.4s | ✅ |
| Error rate | < 0.5% | 0.18% | ✅ |

## Tier 2 (admin)
...

## Error budget consumido (mês atual)
- Tier 1: 12% (5.4min de 43min)
- Tier 2: 45% (97min de 3h36min)

## Tendência últimos 7 dias
- P95 latency aumentou 8% (de 575 → 620ms)
- Error rate estável

## Ações pendentes
- [ ] Investigar aumento de latência (story #234)
```

Atualizar **semanalmente**.

## Quando ajustar SLO

- **Subir** quando observado consistentemente acima por 90 dias
- **Descer** quando observado consistentemente abaixo + custo de manter é alto demais
- **Revisar** após mudança grande de arquitetura ou tráfego

## Anti-patterns de SLO

- SLO sem medição (fantasia)
- SLO sem error budget (sem consequência = sem disciplina)
- SLO 100% (impossível, caro, e quando inevitavelmente falha, todos ignoram)
- SLO igual entre todos os endpoints (hot path ≠ documentação estática)
- SLO baseado em "o cliente quer" sem dado (overprovisioning caro)

## Checklist SLO

- [ ] SLOs definidos por tier (não global)
- [ ] SLIs medidos automaticamente (Sentry/Vercel/Supabase)
- [ ] Dashboard de SLI visível
- [ ] Error budget calculado
- [ ] Revisão mensal agendada
- [ ] Thresholds de alerta configurados (em 50%, 80%, 100% de budget)

## Referências
- [Google SRE Book — SLO](https://sre.google/sre-book/service-level-objectives/)
- [The Site Reliability Workbook (free online)](https://sre.google/workbook/implementing-slos/)
- [SLO calculator](https://sla-calculator.io/)

