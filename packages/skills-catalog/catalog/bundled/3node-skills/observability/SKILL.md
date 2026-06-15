---
name: observability
description: Sem observability, debug em produção é chute
key: paperclipai/bundled/3node-skills/observability
recommendedForRoles:
- sre
tags:
- observability
---

# Skill: Observability (3 pilares + AI/LLM tracing)

Sem observability, debug em produção é chute. Os 3 pilares: **errors**, **metrics**, **tracing**. Mais um quarto pra apps com IA: **LLM tracing**.

## Stack pro contexto Ryan (Next.js + Supabase)

| Pilar | Ferramenta | Custo | Setup |
|---|---|---|---|
| **Errors** | Sentry | Free 5k/mês → $26/mês | `npx skills add sentry-nextjs-sdk/SKILL.md` |
| **Metrics** | Vercel Speed Insights | Free com Vercel | Toggle no dashboard |
| **Tracing** | OpenTelemetry → Sentry/Logfire | Free | `instrumentation.ts` |
| **Logs** | Vercel Logs / Supabase Logs / Railway | Incluso (rate limited) | Default |
| **LLM** | Langfuse (open source) ou LangSmith | Free tier generoso | SDK no fluxo do agente |
| **Realtime** | Supabase Dashboard → Realtime | Incluso | Dashboard nativo |

## 1. Errors — Sentry

### Setup Next.js
```bash
npx @sentry/wizard@latest -i nextjs
```

Cria:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- Source maps upload via build

### Configurações importantes
```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Filtra ruído
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection captured',
    /^NetworkError/,
  ],
})
```

### Captura manual
```typescript
import * as Sentry from '@sentry/nextjs'

try {
  await dangerousOp()
} catch (err) {
  Sentry.captureException(err, {
    tags: { feature: 'certificate-generation' },
    extra: { eventId, participantId },
  })
}
```

### Performance monitoring
```typescript
const transaction = Sentry.startTransaction({
  name: 'generate-certificate',
  op: 'http.server',
})
// ... operação ...
transaction.finish()
```

## 2. Metrics — Vercel Speed Insights

```bash
npm i @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

Mede:
- **LCP** (Largest Contentful Paint) — alvo < 2.5s
- **INP** (Interaction to Next Paint) — alvo < 200ms
- **CLS** (Cumulative Layout Shift) — alvo < 0.1
- **TTFB** (Time to First Byte) — alvo < 800ms

## 3. Tracing — OpenTelemetry

Conecta operações cross-service (Vercel → Supabase → Cloudflare Worker).

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}

// instrumentation.node.ts
import { registerOTel } from '@vercel/otel'

registerOTel({
  serviceName: 'event-room',
  traceExporter: 'auto',
})
```

Custom spans:
```typescript
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('cert-flow')
const span = tracer.startSpan('cert.generate')
try {
  // operação
} finally {
  span.end()
}
```

## 4. Logs

### Vercel
```bash
vercel logs <project> --follow
```

Logs estruturados (JSON):
```typescript
console.log(JSON.stringify({
  level: 'info',
  msg: 'cert generated',
  event_id: eventId,
  participant_id: participantId,
  duration_ms: 1240,
}))
```

### Supabase
Dashboard → Logs Explorer
- Auth logs
- API logs
- Database logs (slow queries)
- Realtime logs

### Filtros úteis no Supabase
```sql
-- Slow queries
SELECT * FROM postgres_logs
WHERE event_message LIKE '%duration%'
  AND CAST(event_message AS float) > 500
ORDER BY timestamp DESC;
```

## 5. LLM Tracing (Langfuse)

Pra apps com agentes IA (LangGraph/Agno):

```bash
pip install langfuse  # Python
# ou
npm i langfuse  # TypeScript
```

```typescript
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PK,
  secretKey: process.env.LANGFUSE_SK,
})

const trace = langfuse.trace({
  name: 'cert-generation',
  userId: participantId,
})

const generation = trace.generation({
  name: 'openai-completion',
  model: 'gpt-4o-mini',
  input: prompt,
})

const response = await openai.chat.completions.create(...)

generation.end({
  output: response.choices[0].message.content,
  usage: { input: response.usage.prompt_tokens, output: response.usage.completion_tokens },
})
```

Captura: prompt, response, tokens, custo, latency.

## Alertas inteligentes

### Sentry
- Error rate > X% por Y minutos → Slack
- New error type → email
- Performance regression > 50% → Slack

### Vercel
- LCP P95 > 4s → email
- Error rate > 5% → email

### Supabase
- DB CPU > 80% por 5min → email
- DB connections > 80% pool → email
- Realtime channels > N → email

## Anti-patterns

- `console.log` sem estrutura (logs viram lixo)
- Capturar TODOS os erros (Sentry vai lotar com ruído)
- `tracesSampleRate: 1.0` em produção (custo alto)
- Não enviar `release` pro Sentry (source maps quebram)
- Alertar sem playbook (alerta sem ação = ignored)
- Logar PII (email/CPF em log) — LGPD

## Custos esperados (Ryan scale)

| Ferramenta | Free tier | Pago quando |
|---|---|---|
| Sentry | 5k errors/mês | > 5k → $26/mês (50k) |
| Vercel Speed Insights | Incluso Pro | — |
| Logfire | 10M logs/mês | Praticamente nunca |
| Supabase Logs | 1 dia retention | $25/mês (7 dias) |
| Langfuse Cloud | Generous free | Self-host se crescer |

## Checklist observability

### Setup mínimo (todo projeto)
- [ ] Sentry instalado (client + server + edge)
- [ ] Vercel Speed Insights ativo
- [ ] Logs estruturados (JSON) em endpoints críticos
- [ ] `release` enviado no deploy (commit SHA)
- [ ] Source maps subindo

### Pre-event readiness
- [ ] Alertas configurados (error rate, latency)
- [ ] Dashboard de SLI aberto na 2ª tela
- [ ] Runbook visível
- [ ] Sample rate ajustado pra evento (suba pra capturar mais)

### Post-event
- [ ] Capturar métricas finais
- [ ] Comparar vs SLO
- [ ] Atualizar SLO-DASHBOARD.md
- [ ] Reduzir sample rate de volta

## Referências
- [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Observability](https://vercel.com/docs/observability)
- [OpenTelemetry JS](https://opentelemetry.io/docs/languages/js/)
- [Langfuse docs](https://langfuse.com/docs)
- [Three Pillars of Observability](https://www.honeycomb.io/blog/three-pillars-data-observability)

