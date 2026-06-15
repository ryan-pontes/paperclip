---
name: ux-patterns
description: Padrões prontos pra produção que ainda não viraram default
key: paperclipai/bundled/3node-skills/ux-patterns
recommendedForRoles:
- designer
tags:
- ux
- patterns
---

# Skill: UX Patterns Emergentes (2024-2026)

Padrões prontos pra produção que ainda não viraram default. Inclui Gen UI, adaptive layouts, CSS moderno.

## Generative UI (Vercel AI SDK)

LLM "renderiza" componentes React em vez de só retornar texto.

```tsx
// app/api/chat/route.ts
import { streamUI } from 'ai/rsc'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req) {
  const { messages } = await req.json()
  const result = await streamUI({
    model: anthropic('claude-sonnet-4-6'),
    messages,
    tools: {
      showWeather: {
        description: 'Show weather card',
        parameters: z.object({ city: z.string() }),
        generate: async ({ city }) => {
          const data = await getWeather(city)
          return <WeatherCard data={data} />
        },
      },
    },
  })
  return result.toAIStreamResponse()
}
```

**Quando usar**: dashboards adaptativos, chats ricos, admin generativo.
**Quando NÃO usar**: fluxos críticos (pagamento, auth) — determinismo importa.

## Adaptive layouts

Layout que se adapta ao **comportamento** do usuário:

```tsx
// Esconde menu items raramente clicados
const useAdaptiveMenu = (userId: string) => {
  const clicks = useUserClickCounts(userId)
  return menuItems
    .map(item => ({ ...item, clickCount: clicks[item.id] ?? 0 }))
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 5) // Top 5 mais usados
}
```

**Padrões adaptativos comuns**:
- Densidade (compact vs comfortable) baseada em uso anterior
- Reordenar menu por frequência
- Mostrar tooltips só nas primeiras N sessões
- Auto-pin de features acessadas regularmente

Salvar preferência no Supabase: `er_user_preferences.layout_density`, etc.

## Container queries em produção

Suporte universal desde 2024. Componente reage ao seu container:

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card-content {
    grid-template-columns: 1fr 2fr;
  }
}
```

Em Tailwind v4:
```tsx
<div className="@container">
  <div className="@md:grid-cols-2 grid-cols-1">
```

**Vantagem**: mesmo card vira coluna única em sidebar (300px) e grid em main (800px) sem media query.

## CSS nativo moderno

### `@starting-style` (animar entrada sem JS)
```css
.toast {
  opacity: 1;
  transition: opacity 200ms;
}

@starting-style {
  .toast {
    opacity: 0;
  }
}
```
Chrome 117+, Firefox 129+, Safari 17.5+.

### `transition-behavior: allow-discrete`
Permite animar de `display: none` pra `display: block`:
```css
.menu {
  display: none;
  opacity: 0;
  transition: display 200ms, opacity 200ms;
  transition-behavior: allow-discrete;
}
.menu.open {
  display: block;
  opacity: 1;
}
```

### Scroll-driven animations
```css
.header {
  position: sticky;
  top: 0;
  animation: shrink linear;
  animation-timeline: scroll(root);
  animation-range: 0 200px;
}

@keyframes shrink {
  from { padding: 24px 16px; }
  to   { padding: 8px 16px; }
}
```

### `text-wrap: balance` / `pretty`
```css
h1 {
  text-wrap: balance;  /* distribui linhas igualmente */
}
p {
  text-wrap: pretty;   /* evita viúvas (palavra solta no fim) */
}
```

Em Tailwind v4: `text-balance`, `text-pretty`.

### `:has()` selector
Estilizar pai baseado em filho:
```css
/* Card recebe borda quando contém input com erro */
.card:has(input:invalid) {
  border-color: var(--color-destructive);
}
```

### CSS color-mix
```css
.button {
  background: color-mix(in oklch, var(--primary) 50%, transparent);
}
```

## Optimistic UI moderno (React 19)

```tsx
import { useOptimistic } from 'react'

function MessageList({ messages, sendMessage }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (state, newMessage) => [...state, { ...newMessage, pending: true }]
  )

  const handleSend = async (text) => {
    addOptimistic({ id: 'temp', text })
    await sendMessage(text)
  }

  return optimisticMessages.map(m => (
    <Message key={m.id} message={m} pending={m.pending} />
  ))
}
```

## View Transitions API

```css
/* Marca elemento pra transitar entre rotas */
.product-image {
  view-transition-name: product-image;
}
```

```tsx
// next.config.ts
experimental: {
  viewTransition: true,
}
```

```css
::view-transition-old(product-image),
::view-transition-new(product-image) {
  animation-duration: 300ms;
}
```

Funciona em Chrome 111+, Safari 18+, Firefox em flag.

## Islands Architecture (Next.js 14/16)

Server Components pra conteúdo estático + Client Components só onde precisa interatividade:

```tsx
// Server (sem JS no client)
export default async function PostPage({ params }) {
  const post = await getPost(params.id)
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <LikeButton postId={post.id} />  {/* Client */}
    </article>
  )
}

// Client (mínimo JS)
'use client'
export function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(!liked)}>{liked ? '❤️' : '🤍'}</button>
}
```

**Bundle pequeno = render rápido em mobile lento**.

## Skeleton com layout exact match

Em vez de placeholder genérico, skeleton com dimensões exatas do conteúdo:

```tsx
<div className="space-y-3">
  {loading ? (
    <>
      {/* Mesmo layout do conteúdo real */}
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </>
  ) : (
    <>
      <h3 className="h-6">{title}</h3>
      <p className="h-4">{description}</p>
    </>
  )}
</div>
```

Resultado: zero layout shift quando dado chega.

## Streaming UI (Suspense)

```tsx
// Carrega progressivamente — não espera tudo
export default function Dashboard() {
  return (
    <div>
      <Header />  {/* Renderiza imediato */}
      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards />  {/* Streaming */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Streaming */}
      </Suspense>
    </div>
  )
}
```

Primeira tela pinta rápido, partes lentas chegam depois.

## Assistentes embarcados

Pattern: drawer lateral com chat contextual. Sabe a página/contexto atual.

**Critérios**:
- NÃO bloqueia conteúdo (drawer, não modal)
- NÃO roda automaticamente (espera ação do usuário)
- Tem X visível
- Mostra contexto que captou ("Você está em: Dashboard de vendas")
- Trigger via botão flutuante OU `Cmd+K`

```tsx
<Sheet>
  <SheetTrigger>💬 Assistente</SheetTrigger>
  <SheetContent side="right">
    <Chat contextPath={pathname} contextData={data} />
  </SheetContent>
</Sheet>
```

## Voice-first considerations

Microcopy precisa funcionar como **texto falado**:
- Frases sem ambiguidade
- Sem dependência de visual ("clique no botão azul" não funciona)
- Confirmações verbais ("Inscrição confirmada" > "✓")

Aplica mesmo quando não há voice — porque screen readers leem assim.

## Anti-patterns dos padrões emergentes

- Gen UI em fluxo crítico (pagamento gerado por LLM = risco)
- Adaptive layout que esconde feature antes do usuário descobrir
- View Transition em mudança não-relacionada (parece glitch)
- Streaming sem skeleton (telas pintam de baixo pra cima)
- Assistente embarcado que abre automaticamente (intrusivo)

## Quando adotar cada padrão

| Padrão | Maturidade | Adotar quando |
|---|---|---|
| Container queries | ✅ Universal | Componentes em múltiplos containers |
| Optimistic UI (`useOptimistic`) | ✅ React 19 estável | Ações comuns sem dinheiro envolvido |
| Streaming UI (Suspense) | ✅ Estável | Dashboards com fetches lentos |
| Islands (RSC) | ✅ Default Next 14+ | Conteúdo estático com poucas ilhas interativas |
| Gen UI | ⚠️ Experimental | Admin/dashboards, não fluxos críticos |
| View Transitions | ⚠️ Parcial | Animação cross-route entre páginas com elemento compartilhado |
| `@starting-style` | ⚠️ Parcial | Quer animar entrada sem JS |
| Adaptive layouts | ⚠️ Custom | Quando tem dados de comportamento (≥3 meses) |

## Referências
- [Vercel AI SDK — streamUI](https://sdk.vercel.ai/docs/concepts/streaming-ui)
- [MDN — Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [React docs — useOptimistic](https://react.dev/reference/react/useOptimistic)
- [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions)
- [@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)

