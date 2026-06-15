---
name: rsc-patterns
description: Padrões de Server Components, Client Components, Server Actions e caching no Next.js moderno
key: paperclipai/bundled/3node-skills/rsc-patterns
recommendedForRoles:
- engineer
tags:
- rsc
- patterns
---

# Skill: RSC Patterns (Next.js 15/16 App Router)

Padrões de Server Components, Client Components, Server Actions e caching no Next.js moderno. **OBRIGATÓRIO** pro `@felipe` ler antes de implementar qualquer feature em projeto Next.js 15+.

## A mudança crítica do Next.js 15+

**`fetch()` NÃO tem mais cache automático por padrão.** Você precisa decidir explicitamente.

```typescript
// Antes (Next.js 13/14): cached por default
const data = await fetch(url)

// Next.js 15+: NOT cached por default
const data = await fetch(url)  // sem cache

// Pra cachear, opt-in:
const data = await fetch(url, { next: { revalidate: 60 } })

// Ou usar 'use cache' directive (Next.js 16, estável)
async function getData() {
  'use cache'
  return await db.query(...)
}
```

## Decisão: Server Component vs Client Component

### Default: Server Component (sem `'use client'`)

Use quando o componente:
- Só renderiza dado (lê de DB/API)
- Não precisa de hooks (`useState`, `useEffect`, `onClick`)
- Não usa browser APIs (`window`, `localStorage`)

**Vantagens:**
- Zero JavaScript no client
- Acesso direto a DB/API/secrets no componente
- Stream-friendly

```tsx
// app/dashboard/page.tsx — Server Component
import { getServiceClient } from '@/lib/supabase/service'

export default async function DashboardPage() {
  const supabase = getServiceClient()
  const { data } = await supabase.from('events').select('*')
  return <EventList events={data ?? []} />
}
```

### Use Client Component (`'use client'`) só quando precisa:
- Hooks (`useState`, `useEffect`, etc)
- Event handlers (`onClick`, `onChange`)
- Browser APIs
- 3rd party libs que precisam window (`framer-motion`, `recharts`)
- Context

```tsx
'use client'

import { useState } from 'react'

export function LikeButton({ initial }: { initial: boolean }) {
  const [liked, setLiked] = useState(initial)
  return <button onClick={() => setLiked(!liked)}>{liked ? '❤️' : '🤍'}</button>
}
```

### Pattern: Server por padrão, ilhas de Client

```tsx
// page.tsx (Server)
export default async function Page() {
  const data = await fetchData()  // server-side
  return (
    <div>
      <Heading>{data.title}</Heading>            {/* Server */}
      <Content>{data.body}</Content>             {/* Server */}
      <LikeButton initial={data.liked} />        {/* Client (ilha) */}
      <CommentsSection postId={data.id} />       {/* Client (ilha) */}
    </div>
  )
}
```

Bundle JS resultante: SÓ as ilhas Client.

## Caching no Next.js 15/16

### 4 mecanismos
| Mecanismo | Onde | Quando |
|---|---|---|
| **`fetch` cache** | Per-request, deduplicação | `fetch(url, { next: { revalidate: N } })` |
| **`'use cache'`** | Funções ou componentes inteiros | Quando dado é cacheable |
| **`unstable_cache`** | Wrappers de funções não-fetch | Legacy, prefira `'use cache'` |
| **`revalidatePath`/`revalidateTag`** | Invalidação após mutation | Em Server Actions |

### Decisão por tipo de dado

| Dado | Estratégia |
|---|---|
| Lista de produtos (mudança rara) | `'use cache'` com `cacheLife('hours')` |
| Perfil do usuário | `'use cache'` com tag, revalidate on update |
| Dashboard real-time | Sem cache, `dynamic = 'force-dynamic'` |
| Dado por usuário (não compartilhável) | Sem cache de fetch, mas use React `cache()` pra dedupe in-request |

### Exemplos

```typescript
// Cache estável
async function getCategories() {
  'use cache'
  cacheLife('days')
  return await db.categories.findMany()
}

// Cache com tag (pra invalidação granular)
async function getUserProfile(userId: string) {
  'use cache'
  cacheTag(`user:${userId}`)
  cacheLife('hours')
  return await db.users.findUnique({ where: { id: userId } })
}

// Mutation que invalida cache
'use server'
async function updateProfile(userId: string, data: ProfileData) {
  await db.users.update({ where: { id: userId }, data })
  revalidateTag(`user:${userId}`)
}
```

## Server Actions

Substituem grande parte de API Routes. Função server-side chamada direto do client.

```tsx
// app/actions/event.ts
'use server'

import { z } from 'zod'

const InputSchema = z.object({
  name: z.string().min(2).max(100),
  date: z.string().datetime(),
})

export async function createEvent(formData: FormData) {
  // 1. Auth check
  const session = await getSession()
  if (!session) return { error: 'unauthorized' }

  // 2. Validação Zod (não confiar no client)
  const parsed = InputSchema.safeParse({
    name: formData.get('name'),
    date: formData.get('date'),
  })
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 3. Execução
  const event = await db.events.create({ data: parsed.data })

  // 4. Invalidação
  revalidatePath('/events')

  return { success: true, event }
}

// Component que usa
<form action={createEvent}>
  <input name="name" />
  <input name="date" type="datetime-local" />
  <button>Criar</button>
</form>
```

### Server Action vs API Route — quando cada
| Situação | Use |
|---|---|
| Mutation chamada do mesmo app | Server Action |
| Endpoint público (webhook, mobile app) | API Route |
| Upload de arquivo | API Route (controle de stream) |
| Long-running (>30s) | API Route com `maxDuration` |
| Multi-tenant API com auth complexa | API Route |

## `useOptimistic` (React 19)

```tsx
'use client'
import { useOptimistic } from 'react'

export function MessageList({ messages, sendMessage }) {
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state, newMsg) => [...state, { ...newMsg, pending: true }]
  )

  const handleSend = async (text: string) => {
    addOptimistic({ id: 'temp', text, sender: 'me' })
    await sendMessage(text)  // Server Action
  }

  return (
    <ul>
      {optimistic.map(m => (
        <li key={m.id} style={{ opacity: m.pending ? 0.5 : 1 }}>
          {m.text}
        </li>
      ))}
    </ul>
  )
}
```

## `useActionState` (React 19)

Combina form submission + estado de loading + erro:

```tsx
'use client'
import { useActionState } from 'react'

export function EventForm() {
  const [state, formAction, pending] = useActionState(createEvent, null)

  return (
    <form action={formAction}>
      <input name="name" />
      {state?.error && <p>{state.error}</p>}
      <button disabled={pending}>{pending ? 'Criando…' : 'Criar'}</button>
    </form>
  )
}
```

## React Compiler (Next.js 15+)

Compiler elimina `useMemo`/`useCallback` manuais. Em `next.config.ts`:

```typescript
experimental: {
  reactCompiler: true,
}
```

**O que muda:**
- `useMemo` desnecessário em maior parte dos casos
- `useCallback` raramente preciso
- Re-renders otimizados automaticamente

Felipe NÃO deve adicionar `useMemo`/`useCallback` "preventivamente". Compiler resolve.

## Streaming + Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <div>
      <Header />  {/* renderiza imediato */}

      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards />  {/* streaming */}
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* streaming */}
      </Suspense>
    </div>
  )
}

async function KpiCards() {
  const kpis = await getKpis()  // slow
  return <div>{kpis.map(k => <Kpi key={k.id} {...k} />)}</div>
}
```

Primeira pintura rápida. Partes lentas chegam progressivamente.

## Middleware patterns

`middleware.ts` na raiz (mesmo nível de `app/`):

```typescript
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Edge runtime — limitado, sem Node APIs
  const session = request.cookies.get('session')
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Importante**: middleware é Edge runtime. Sem `fs`, sem libs Node. Pra Supabase, use `@supabase/ssr`.

## Anti-patterns que `@felipe` evita

- `'use client'` em componente que não precisa (bundle inflado)
- `useEffect` pra fetch quando podia ser Server Component
- `useMemo`/`useCallback` "preventivo" com React Compiler ativo
- Sem validação Zod em Server Action (input vem do client = não confiar)
- `fetch()` sem decidir cache (intencional ou não?)
- `dynamic = 'force-dynamic'` em página que poderia ser estática
- Server Action sem `revalidatePath/Tag` após mutation (UI fica stale)
- Mixing 'use client' e Server Actions de forma confusa

## Checklist antes de PR

- [ ] Componentes Server por padrão, Client só quando necessário
- [ ] Decisão de cache explícita em `fetch`
- [ ] Server Actions com Zod validation
- [ ] `revalidatePath/Tag` após mutation
- [ ] Middleware em runtime correto (Edge tem limitações)
- [ ] Streaming/Suspense em rotas com fetch lento
- [ ] Sem `useMemo`/`useCallback` preventivo

## Referências
- [Next.js 15 — Caching](https://nextjs.org/docs/app/deep-dive/caching)
- [Next.js — `use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [React 19 — Server Components](https://react.dev/reference/rsc/server-components)
- [React Compiler](https://react.dev/learn/react-compiler)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

