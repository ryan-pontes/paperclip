---
name: vercel
description: Plataforma padrão para deploy de frontend Next.js.
key: paperclipai/bundled/3node-skills/vercel
recommendedForRoles:
- devops
tags:
- vercel
---

# Skill: Vercel

## Quando usar

Plataforma padrão para deploy de frontend Next.js.

## Setup via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## vercel.json (quando necessário)

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.seudominio.com/:path*" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

## Variáveis de Ambiente

```bash
# Via CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Convenção Next.js
# NEXT_PUBLIC_ → exposto no browser
# Sem prefixo → apenas server-side
```

## Deploy Automático

- Push para `main` → deploy de produção
- Push para qualquer branch → preview deploy
- PR aberto → preview com URL única

## Domínio Customizado

```bash
vercel domains add seudominio.com
# Configurar DNS: CNAME → cname.vercel-dns.com
```

## Edge Functions / Middleware

```typescript
// middleware.ts — roda na edge (rápido, global)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Auth check, redirects, geolocation, etc.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

## Limites Importantes

- Serverless function timeout: 10s (hobby) / 60s (pro)
- Edge function timeout: 30s
- Payload máximo: 4.5MB (serverless) / 25MB (com streaming)
- Build timeout: 45min
- Free tier: 100GB bandwidth/mês

