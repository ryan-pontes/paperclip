---
name: netlify
description: Alternativa à Vercel para deploy de frontend Next.js
key: paperclipai/bundled/3node-skills/netlify
recommendedForRoles:
- devops
tags:
- netlify
---

# Skill: Netlify

## Quando usar

Alternativa à Vercel para deploy de frontend Next.js. Bom para sites estáticos e JAMstack.

## Setup via CLI

```bash
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## netlify.toml

```toml
[build]
  command = "next build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "https://api.seudominio.com/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

## Plugin Next.js

```bash
npm install @netlify/plugin-nextjs
```

```toml
# netlify.toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Variáveis de Ambiente

```bash
# Via CLI
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xxx.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJ..."

# Contextos: production, deploy-preview, branch-deploy
netlify env:set API_URL "https://api.prod.com" --context production
netlify env:set API_URL "https://api.staging.com" --context deploy-preview
```

## Deploy

- Push para `main` → deploy de produção
- Push para branch → deploy preview
- `netlify deploy` → draft deploy (preview)
- `netlify deploy --prod` → produção

## Netlify Functions (Serverless)

```typescript
// netlify/functions/hello.ts
import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello' })
  }
}
// Acessível em: /.netlify/functions/hello
```

## Domínio Customizado

```bash
netlify domains:add seudominio.com
# DNS: CNAME → seu-site.netlify.app
# Ou use Netlify DNS para SSL automático
```

## Limites Free Tier

- 100GB bandwidth/mês
- 300 build minutes/mês
- 125k function invocations/mês
- 1 concurrent build
- Forms: 100 submissions/mês

