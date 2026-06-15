---
name: runbooks
description: Procedimento executável por **qualquer pessoa**, sem contexto prévio, em situação de pressão.
key: paperclipai/bundled/3node-skills/runbooks
recommendedForRoles:
- sre
tags:
- runbooks
---

# Skill: Runbooks (procedimentos passo-a-passo)

Procedimento executável por **qualquer pessoa**, sem contexto prévio, em situação de pressão.

## Princípios

1. **Imperativo**: "Faça X" não "Você deveria X"
2. **Concreto**: comandos exatos pra copiar/colar
3. **Verificável**: cada passo tem critério de "tá funcionando"
4. **Reversível**: se algo der errado, como voltar atrás
5. **Sem contexto**: assume zero conhecimento prévio

## Formato padrão

`docs/sre/runbooks/<nome>.md`:

```markdown
# Runbook — [Sintoma/Situação]

## Quando usar
[Sintoma específico que dispara este runbook]

## Severidade típica
SEV1 | SEV2 | SEV3

## Tempo médio de resolução
~Xmin

## Pré-requisitos
- Acesso a [Vercel / Supabase / etc]
- [Outros]

## Passos

### 1. Verificar o sintoma
```bash
[comando]
```
**Esperado**: [output]
**Se diferente**: [próximo passo / outro runbook]

### 2. Identificar escopo
```sql
[query]
```
**Se [condição]** → vai pro passo 3a
**Se [condição]** → vai pro passo 3b

### 3a. Mitigação A
[passos]

### 3b. Mitigação B
[passos]

### 4. Verificar recuperação
```bash
[comando de health check]
```

## Comunicação
Mensagem-padrão pra Ryan/usuários: "[texto]"

## Pós-mitigação
- [ ] Atualizar INCIDENT-XXX.md
- [ ] Agendar post-mortem
- [ ] Atualizar este runbook se algo mudou

## Histórico
- 2026-06-08 — Criado por @sre após INC-20260608-104500
- ...
```

## Runbooks essenciais pro contexto Ryan

Manter pelo menos estes 7 escritos antes de evento ao vivo:

### 1. `vercel-deploy-quebrou-prod.md`
Sintoma: error rate sobe após deploy.

Passos:
1. Confirmar correlação temporal com deploy
2. Identificar deploy culpado: Vercel → Deployments
3. **Promote previous deployment**: 1 clique no UI
4. Verificar error rate normaliza (Sentry, < 5min)
5. Comunicar resolução

### 2. `supabase-db-lento.md`
Sintoma: latência sobe, queries demorando.

Passos:
1. Identificar queries lentas:
   ```sql
   SELECT pid, query, state, query_start, now() - query_start AS duration
   FROM pg_stat_activity
   WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds';
   ```
2. Matar queries específicas:
   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```
3. Verificar connection pool:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
4. Se persistir, considerar scale up no dashboard Supabase

### 3. `worker-cloudflare-cert-caiu.md`
Sintoma: geração de certificado falhando com 503.

Passos:
1. Verificar status Cloudflare: `curl https://status.cloudflare.com/api/v2/summary.json`
2. Testar worker direto:
   ```bash
   curl -X POST $CERT_WORKER_URL/generate -H "..." -d "..."
   ```
3. Se confirmado offline:
   - Ativar banner no app: "Geração temporariamente indisponível. Tente novamente em alguns minutos."
   - `certificate_until` permite gerar depois — tranquilizar usuário
4. Lock antigo na tabela:
   ```sql
   DELETE FROM er_cert_locks WHERE started_at < NOW() - INTERVAL '10 minutes';
   ```
5. Monitorar e remover banner quando worker voltar

### 4. `pico-trafego-inesperado.md`
Sintoma: requests/s sobe drasticamente, latência sobe junto.

Passos:
1. Identificar fonte: Vercel Analytics → top routes
2. Se for endpoint específico que pode esperar:
   - Reduzir rate limit do endpoint
   - Feature flag desliga (GrowthBook)
3. Se geral:
   - Aumentar rate limit no Supabase
   - Habilitar cache agressivo em rotas read-heavy
4. Comunicar usuários: "Estamos com muita gente. Aguarde."
5. Monitorar até normalizar

### 5. `realtime-supabase-instavel.md`
Sintoma: chat/pin/poll não atualiza em tempo real.

Passos:
1. Verificar status Supabase Realtime
2. Testar broadcast manual via SQL:
   ```sql
   SELECT realtime.send(
     '{"test": "ping"}'::jsonb,
     'test:event',
     'er:event:<id>',
     false
   );
   ```
3. Verificar policy de `realtime.messages` (já criada)
4. Verificar triggers (`er_broadcast_event_change`) estão ativos
5. Se inflada: ALTER PUBLICATION supabase_realtime DROP/ADD TABLE
6. Fallback: ativar polling agressivo no client

### 6. `auth-supabase-falha-massa.md`
Sintoma: usuários não conseguem logar/registrar.

Passos:
1. Status Supabase Auth: status page
2. Verificar SMTP (se confirmação email)
3. Verificar rate limits na auth
4. Whitelist temporário se mudança recente quebrou
5. Banner comunicando

### 7. `vercel-edge-down.md`
Sintoma: app totalmente fora.

Passos:
1. Verificar status Vercel
2. Verificar DNS (cloudflare)
3. Testar deploy direto via `.vercel.app` URL
4. Se DNS: limpa cache Cloudflare
5. Aguardar Vercel se infraestrutura deles

## Estrutura de pasta

```
docs/sre/runbooks/
  vercel-deploy-quebrou-prod.md
  supabase-db-lento.md
  worker-cloudflare-cert-caiu.md
  pico-trafego-inesperado.md
  realtime-supabase-instavel.md
  auth-supabase-falha-massa.md
  vercel-edge-down.md
  INDEX.md          ← índice navegável
```

## INDEX.md exemplo

```markdown
# Runbooks Index

## Por sintoma
| Sintoma | Runbook |
|---|---|
| Error rate alta após deploy | [vercel-deploy-quebrou-prod](./vercel-deploy-quebrou-prod.md) |
| Latência alta DB | [supabase-db-lento](./supabase-db-lento.md) |
| Cert falha | [worker-cloudflare-cert-caiu](./worker-cloudflare-cert-caiu.md) |
| Pico de tráfego | [pico-trafego-inesperado](./pico-trafego-inesperado.md) |
| Realtime não chega | [realtime-supabase-instavel](./realtime-supabase-instavel.md) |
| Auth quebrada | [auth-supabase-falha-massa](./auth-supabase-falha-massa.md) |
| App fora | [vercel-edge-down](./vercel-edge-down.md) |

## Por severidade típica
- SEV1: vercel-edge-down, auth-falha-massa, vercel-deploy-quebrou
- SEV2: cloudflare-cert-caiu, supabase-db-lento, realtime-instavel
- SEV3: pico-trafego (com workaround)

## Última atualização
[data] por @sre
```

## Manutenção de runbooks

- **Após cada incidente**: atualizar runbook usado (ou criar novo)
- **Mensal**: revisar runbooks "antigos" que não foram executados
- **Trimestral**: testar runbook em dry-run (simulação)

## Como escrever um runbook bom — checklist

- [ ] Sintoma específico no título
- [ ] Comandos exatos pra copiar/colar
- [ ] Cada passo tem "esperado" + "se diferente"
- [ ] Branches lógicos claros (3a, 3b)
- [ ] Sem suposição de conhecimento prévio
- [ ] Comunicação template incluída
- [ ] Pós-mitigação incluída
- [ ] Testado em dry-run pelo menos 1x

## Anti-patterns

- "Use seu julgamento" → não, especifica
- Comando incompleto ("ajuste conforme necessário") → especifica
- Sem critério de sucesso (como sei que funcionou?)
- Sem rollback (e se piorar?)
- Sem versionamento (quem mudou, quando, por quê)
- Runbook "vivo" (atualiza durante incidente) sem registrar mudança

## Referências
- [PagerDuty Runbook Guide](https://www.pagerduty.com/resources/learn/what-is-a-runbook/)
- [Google SRE — Tooling and Runbooks](https://sre.google/workbook/postmortem-culture/)

