---
name: incident-response
description: Playbook prático pra responder a incidentes
key: paperclipai/bundled/3node-skills/incident-response
recommendedForRoles:
- sre
tags:
- incident
- response
---

# Skill: Incident Response (playbook SEV1/SEV2/SEV3)

Playbook prático pra responder a incidentes. Mitiga primeiro, debuga depois.

## Severidade

| Nível | Critério | Tempo de resposta | Comunicação |
|---|---|---|---|
| **SEV1** | Sistema fora, transações falhando, evento ao vivo quebrado | < 5min | Imediata, status page |
| **SEV2** | Funcionalidade crítica degradada, alguns usuários afetados | < 15min | Status page se >30min |
| **SEV3** | Funcionalidade secundária quebrada, workaround disponível | < 1h | Tracker interno |
| **SEV4** | Bug menor, sem urgência | Próxima sprint | Backlog |

## Fluxo de resposta (SEV1/SEV2)

```
DETECT → TRIAGE → MITIGATE → COMMUNICATE → RESOLVE → POSTMORTEM
```

### 1. Detect (≤ 1min)

Fontes de detecção:
- Alerta automático (Sentry, Vercel, Supabase)
- Reclamação de usuário
- Monitoramento manual
- Status check

**Cria o incidente IMEDIATAMENTE** mesmo sem confirmação 100%. Renomear/fechar depois é fácil. Demorar pra criar custa minutos preciosos.

```bash
# Cria arquivo de incidente
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
mkdir -p docs/sre/incidents
touch docs/sre/incidents/$INCIDENT_ID.md
```

### 2. Triage (≤ 2min)

Pergunta-chave: **Qual o blast radius?**

| Pergunta | Resposta orienta |
|---|---|
| Quantos usuários afetados? | Severidade |
| Qual funcionalidade? | Onde olhar |
| Quando começou? | Correlacionar com deploy/mudança |
| Está piorando? | Urgência |
| Workaround disponível? | Comunicação |

Output: define severidade e foco.

### 3. Mitigate (≤ 15min pra SEV1)

**Para o sangramento primeiro. Root cause depois.**

Mitigations comuns:

| Sintoma | Mitigação rápida |
|---|---|
| Deploy recente quebrou | **Revert** no Vercel ("Promote previous deployment") |
| Endpoint específico falhando | Feature flag desliga (GrowthBook) |
| Worker externo caiu | Fallback ou banner "temporariamente indisponível" |
| Pico de tráfego | Aumenta rate limit, desliga features pesadas |
| DB lento | Mata queries longas (`pg_terminate_backend`), aumenta cache |
| Auth quebrada | Whitelist temporário, banner |
| Erro em massa em uma feature | Esconde a feature do menu |

**Documenta cada decisão no INCIDENT-XXX.md** enquanto faz.

### 4. Communicate (durante)

Pra Ryan/time:
```
🚨 INCIDENT [SEV1] — [título curto]
Iniciado: [HH:MM]
Sintoma: [o que tá quebrado]
Mitigação: [o que tô fazendo]
ETA: [tempo estimado pra resolver]
```

Pra usuários (se aplicável):
- Banner no app: "Estamos com instabilidade na geração de certificados. Já estamos trabalhando."
- Status page externa (se houver)
- WhatsApp grupo de suporte
- Email pro mailing afetado (só se SEV1 prolongado)

**Tom**: honesto, breve, não-defensivo. Atualizações a cada 15-30min mesmo sem novidade ("Ainda investigando").

### 5. Resolve

Sistema voltou ao normal. Antes de marcar resolvido:
- [ ] Métrica SLI confirmando recuperação
- [ ] Test manual do fluxo afetado
- [ ] Última atualização de comunicação
- [ ] Marca timestamp de resolução

### 6. Post-mortem (< 48h após resolução)

Ver template em `agents/sre.md`. Regra sagrada: **blameless**.

## Template de incidente

`docs/sre/incidents/INC-YYYYMMDD-HHMMSS.md`:

```markdown
# INC-[id] — [título]
**Severidade**: SEV1 | SEV2 | SEV3
**Status**: 🔴 Em andamento | 🟡 Mitigado | ✅ Resolvido
**Iniciado**: [HH:MM UTC-3]
**Resolvido**: [HH:MM UTC-3]
**Duração**: [Xmin]

## Sintoma
[O que usuário/sistema observou]

## Impacto
- Usuários afetados: [N ou %]
- Funcionalidade: [lista]
- Receita: [se aplicável]

## Timeline
| HH:MM | Evento |
|---|---|
| 10:00 | Alerta Sentry: error rate > 5% no /api/certificates |
| 10:01 | Triagem iniciada |
| 10:03 | Hipótese 1: deploy 09:55 mudou algo |
| 10:05 | Confirmado: PR #234 quebrou cert worker call |
| 10:06 | Revert deploy via Vercel UI |
| 10:08 | Error rate normalizado |
| 10:10 | Comunicação: incidente resolvido |

## Decisões durante incidente
- [decisão] — [contexto]
- ...

## Mitigação aplicada
[O que parou o sangramento]

## Próximos passos
- [ ] Post-mortem (até [data])
- [ ] Análise de root cause
```

## Comandos úteis durante incidente

### Vercel
```bash
# Logs em tempo real
vercel logs --follow

# Revert pro deploy anterior
# UI: Deployments → ... → Promote to Production
```

### Supabase
```sql
-- Queries longas em andamento
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY query_start;

-- Mata query específica
SELECT pg_terminate_backend(<pid>);

-- Connections em uso
SELECT count(*) FROM pg_stat_activity;
```

### Sentry
- Dashboard → Issues → filtrar por "last 1 hour"
- Performance → endpoint específico → trace
- Releases → ver mudanças recentes

### Status check
```bash
# Health check do app
curl -i https://room.3node.org/api/health

# Health check Supabase
curl -I https://<ref>.supabase.co/rest/v1/

# Status oficial
open https://status.supabase.com
open https://www.vercel-status.com
```

## Categorias comuns de incidente

### 1. Deploy quebrou prod
- **Detecção**: error rate sobe imediatamente após deploy
- **Mitigação**: revert (1 clique no Vercel)
- **Prevenção**: preview deploys obrigatórios, smoke test pós-deploy

### 2. Database overload
- **Detecção**: latência sobe, connection pool esgota
- **Mitigação**: mata queries lentas, escala instance, cache agressivo
- **Prevenção**: query budget, indexes, slow query log

### 3. Worker externo caiu (Cloudflare/Stripe/OpenAI)
- **Detecção**: erros vindos do worker
- **Mitigação**: fallback (mensagem ao usuário), retry com backoff, circuit breaker
- **Prevenção**: dependency health checks, SLA monitoring

### 4. Pico de tráfego
- **Detecção**: requests/s sobe, latência sobe junto
- **Mitigação**: rate limit, desliga features pesadas, scale up
- **Prevenção**: load test pré-evento, autoscaling configurado

### 5. Auth em massa falhando
- **Detecção**: alertas de auth, usuários reclamando
- **Mitigação**: rollback de mudança recente, banner explicativo
- **Prevenção**: testes de auth no CI

### 6. Storage cheio
- **Detecção**: upload falha
- **Mitigação**: limpa logs antigos, sobe quota
- **Prevenção**: monitoring de quota, retention policy

## Anti-patterns durante incidente

- Tentar entender root cause antes de mitigar (sangramento continua)
- Não documentar enquanto faz (esquece os detalhes)
- Não comunicar (Ryan/usuários acham que abandonaram)
- Mexer em duas coisas ao mesmo tempo (não sabe o que funcionou)
- Apontar dedos (cultura blameless)
- Pular post-mortem quando resolveu rápido (perde aprendizado)

## Comunicação durante incidente — templates

### Status page / banner no app
```
⚠️ Estamos com instabilidade no [funcionalidade]. Nossa equipe já está trabalhando. Atualizamos em [HH:MM].
```

### Resolução
```
✅ Sistema restabelecido. Pedimos desculpas pelo transtorno. Estamos preparando um relatório para evitar que aconteça de novo.
```

### Para Ryan (privado)
```
🚨 INC-[id] [SEV1]
[título]
Status: mitigando
Duração: Xmin
Causa provável: [hipótese]
Próximo update: [HH:MM]
```

## Checklist pós-incidente

- [ ] Marcou timestamp de resolução
- [ ] Confirmou métricas voltaram
- [ ] Última comunicação enviada
- [ ] INCIDENT-XXX.md atualizado
- [ ] Post-mortem agendado (até 48h)
- [ ] Action items extraídos
- [ ] Runbook atualizado se necessário

## Referências
- [Google SRE — Incident Management](https://sre.google/sre-book/managing-incidents/)
- [PagerDuty Incident Response](https://response.pagerduty.com/)
- [Atlassian Incident Handbook](https://www.atlassian.com/incident-management/handbook)

