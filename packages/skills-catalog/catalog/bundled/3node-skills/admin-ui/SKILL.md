---
name: admin-ui
description: Padrões de UI pra **dashboard interno** (pós-login) e **estrutura de SaaS completo** (landing + auth + app + settings).
key: paperclipai/bundled/3node-skills/admin-ui
recommendedForRoles:
- engineer
tags:
- admin
- ui
---

# Skill: Admin UI + SaaS Layout Patterns

Padrões de UI pra **dashboard interno** (pós-login) e **estrutura de SaaS completo** (landing + auth + app + settings).

Complementa `design.md` (identidade visual por projeto) e `multitenant.md` (workspace switcher).

---

## Quando usar

✅ Qualquer SaaS B2B/B2C com painel interno
✅ Dashboard admin (CMS, analytics, BI)
✅ Produtos com landing + signup + dashboard combo

❌ Marketing puro (landing standalone) → use `design.md` direto
❌ Ferramenta CLI/sem UI

---

## Stack moderna (2026)

| Camada | Lib | Por quê |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Server Components, Route Handlers, file-based routing |
| UI base | **shadcn/ui** | Componentes Radix + Tailwind, customizáveis, copy-paste |
| Estilo | **Tailwind CSS v3 ou v4** | v3 estável hoje; v4 quando settle |
| Forms | **React Hook Form + Zod** | Validação tipada server+client |
| Tabelas | **TanStack Table v8** | Headless, virtualização, sorting/filtering |
| State client | **Zustand** | Simples, sem boilerplate (Redux é overkill) |
| Async/cache | **TanStack Query** (se SPA-ish) ou **Server Actions** (se SSR-first) | |
| Lint/format | **Biome** ou ESLint+Prettier | Biome é mais rápido, single tool |
| i18n (se precisar) | **next-intl** | Padrão App Router |
| Toasts | **sonner** | Recomendado pelo shadcn |
| Command palette | **cmdk** | Cmd+K menu (opcional mas dá personalidade) |
| Tema | **next-themes** | Light/dark/auto sem flash |

**NÃO usar:**
- Clerk (vendor lock-in pago) — usar Supabase Auth (`@supabase/ssr`)
- Drizzle/Prisma — usar Supabase JS client (types gerados, RLS no banco)
- Material UI / Chakra / Mantine — escolha já feita (shadcn)
- Inter/Roboto/Arial — genérico (ver `design.md`)

---

## Estrutura de pastas (SaaS completo)

Inspirado em `ixartz/SaaS-Boilerplate` (adaptado pra Supabase):

```
apps/web/
├── app/
│   ├── (marketing)/          # landing page, pricing, sobre — público
│   │   ├── page.tsx           # hero
│   │   ├── pricing/
│   │   └── layout.tsx
│   ├── (auth)/                # login, signup, forgot — público
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── (app)/                 # dashboard interno — autenticado
│   │   ├── layout.tsx          # AppShell (sidebar + header)
│   │   ├── dashboard/
│   │   ├── settings/
│   │   │   ├── workspace/
│   │   │   ├── members/
│   │   │   └── billing/
│   │   └── ...
│   ├── api/                   # Route Handlers (server-only)
│   │   ├── (public)/           # endpoints sem auth (LP, webhooks)
│   │   └── (internal)/         # endpoints com auth
│   ├── globals.css
│   └── layout.tsx              # root: tema dark + fonts
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn (button, card, input, ...)
│   │   ├── auth/               # AuthForm, etc
│   │   ├── shell/              # AppShell, Sidebar, Header, Topbar
│   │   ├── marketing/          # Hero, Pricing, FeatureGrid, FAQ, CTA
│   │   ├── data/               # DataTable, EmptyState, StatCard
│   │   └── domain-x/           # componentes do domínio (events, ...)
│   ├── features/               # feature folders (queries + actions + UI)
│   │   ├── workspaces/
│   │   └── billing/
│   ├── lib/
│   │   ├── supabase/           # browser, server, service clients
│   │   ├── api/                # requireAdmin, rate-limit, etc
│   │   ├── utils/              # cn, formatters, ...
│   │   └── analytics/          # posthog, plausible
│   ├── types/                  # database.ts (gerado) + domain.ts
│   └── middleware.ts
├── public/
└── package.json
```

**Regras:**
- `(marketing)`, `(auth)`, `(app)` são **route groups** (parênteses não viram URL). Cada um tem `layout.tsx` próprio
- `api/(public)` exposto sem middleware auth (rate limit obrigatório)
- `api/(internal)` passa por `requireAdmin()` no handler
- `features/` = vertical slices (query + action + UI específica), só importar fora se for reuso real

---

## AppShell (layout do dashboard interno)

Inspirado em `arhamkhnz/next-shadcn-admin-dashboard` + Linear/Vercel.

```
┌────────────────────────────────────────────────────────┐
│ [Logo] [WorkspaceSwitcher ▾]              [User ▾]    │  ← Header (h-12)
├────────────┬───────────────────────────────────────────┤
│            │                                           │
│ [Nav 1]    │                                           │
│ [Nav 2]    │           Main content                    │
│ [Nav 3]    │                                           │
│ ───        │                                           │
│ [Sub 1]    │                                           │
│ [Sub 2]    │                                           │
│            │                                           │
│            │                                           │
│ [Collapse]│                                           │
└────────────┴───────────────────────────────────────────┘
   ← Sidebar (w-48~64, colapsável)
```

**Header (sticky top, blur backdrop):**
- Logo à esquerda + WorkspaceSwitcher (ver `multitenant.md`)
- User menu à direita (dropdown com email, settings, logout)
- Opcional: barra de busca / command palette trigger (`Cmd+K`)

**Sidebar (colapsável):**
- Nav primária (Dashboard, Eventos, Members, ...)
- Divider + Nav contextual (quando estiver dentro de um objeto, ex: dentro de `/eventos/:id` aparece "Geral, Dias, Participantes")
- Botão "Collapse" no rodapé (vira w-12 com só ícones)
- Mobile: vira off-canvas drawer

**Main:**
- `max-w-7xl mx-auto px-6 py-8` (não estica em tela ultrawide)
- Page header com título + breadcrumb (link "← Voltar") + ações no canto direito

---

## Tema dark nativo + theme presets

CSS variables HSL (padrão shadcn). Setar dark como **default** se o produto é dev/profissional:

```tsx
// app/layout.tsx
<html lang="pt-BR" suppressHydrationWarning className="dark">
  <head>
    <script dangerouslySetInnerHTML={{
      __html: `try {
        const stored = localStorage.getItem('theme');
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        if (stored === 'light' || (!stored && prefersLight)) {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      } catch(_) { document.documentElement.classList.add('dark'); }`,
    }} />
  </head>
  <body className={`${inter.variable} font-sans bg-background text-foreground antialiased`}>
    {children}
  </body>
</html>
```

**Theme presets** (opcional, vale pra produtos com personalidade — ver arhamkhnz):
- Default (Neutral shadcn)
- Tangerine (warm orange/coral)
- Brutalist (high contrast, bordas grossas)
- Soft Pop (pastéis vibrantes)

Implementação: trocar `--primary`, `--accent`, `--ring` via CSS variables, manter resto.

**Anti-padrão visual:**
- Tema shadcn default puro (genérico, todo SaaS parece igual)
- Gradiente `bg-gradient-to-r from-blue-500 to-purple-500` (cara de IA mid-2024)
- Inter/Roboto/Arial (sem personalidade)
- Box shadow gigante (`shadow-2xl` em tudo)

Personalidade vem do `@joao` por projeto (DESIGN.md). Template dá estrutura, não identidade.

---

## Landing page (estrutura padrão SaaS)

Quando precisar de landing antes do app (signup público), receita:

1. **Hero** — H1 + subtitle + CTA primário + screenshot mockup (pode ser gerado via `mcp-image`)
2. **Logos** — "Confiado por" (social proof, mesmo que com clientes fakes/placeholders)
3. **Features grid** — 3 ou 6 features com ícone + headline + 1 linha
4. **How it works** — 3 passos numerados ilustrando o fluxo
5. **Pricing** — 3 tiers (Free, Pro, Business) + destacar o do meio
6. **Testimonials** — quotes com foto + nome + cargo (mesmo que 1-2)
7. **FAQ** — accordion shadcn com 5-8 perguntas
8. **CTA final** — repeat do CTA do hero
9. **Footer** — links + redes + copyright

**Templates reutilizáveis** em `src/components/marketing/`:
- `<Hero variant="left|center" />`
- `<PricingGrid plans={...} highlight="pro" />`
- `<FeatureGrid features={...} cols={3} />`
- `<FAQAccordion items={...} />`

---

## DataTable (tabela com filtros, sorting, paginação)

Use TanStack Table v8 + shadcn `Table` component. Padrão arhamkhnz:

```tsx
// components/data/data-table.tsx
'use client';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel,
  type ColumnDef,
} from '@tanstack/react-table';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  searchKey?: keyof TData & string;
}

export function DataTable<TData>({ data, columns, searchKey }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  // ...render Table do shadcn
}
```

**Features mínimas:**
- Sorting por header click
- Busca global (debounced)
- Paginação (10/25/50 por página)
- Empty state custom quando data.length === 0
- Loading skeleton durante fetch

---

## Forms (RHF + Zod)

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({ resolver: zodResolver(schema) });

const onSubmit = (values: FormValues) => {
  // values é tipado E validado
};
```

- Sempre `zodResolver` (validação client + tipo derivado)
- Mesmo schema Zod usado no server (Route Handler valida antes de inserir)
- Mensagens de erro abaixo de cada campo
- Botão submit com `disabled={form.formState.isSubmitting}`

---

## Componentes obrigatórios (todo dashboard precisa)

| Componente | Onde | Bib |
|---|---|---|
| `WorkspaceSwitcher` | header | (custom, ver `multitenant.md`) |
| `ThemeSwitcher` | user menu | `next-themes` |
| `UserMenu` | header | shadcn DropdownMenu |
| `Sidebar` (colapsável) | shell | shadcn Sheet pra mobile |
| `CommandPalette` (Cmd+K) | global | `cmdk` |
| `Toaster` | root layout | `sonner` |
| `Breadcrumb` | page header | shadcn |
| `EmptyState` | listas vazias | custom (ícone + título + CTA) |
| `StatCard` | dashboards | custom (label + value + delta %) |
| `ConfirmDialog` | ações destrutivas | shadcn AlertDialog |

---

## i18n (quando precisar)

`next-intl` em `app/[locale]/` route group. Padrão ixartz.

```
app/
├── [locale]/
│   ├── (marketing)/
│   ├── (app)/
│   └── layout.tsx
└── api/                    # api fora do [locale]
```

Locales em `messages/pt-BR.json`, `messages/en.json`. Não inicialize i18n se o produto é BR-only — adiciona complexidade sem ROI.

---

## Acessibilidade (não-negociável)

- Todos componentes shadcn já vêm WCAG 2.1 AA via Radix
- Mas: testar com `axe-core` (ver `accessibility.md`) — toda UI nova passa por gate antes do `/qa`
- Foco visível em **todos** elementos interativos
- Navegação por teclado (tab, esc, setas em menus)
- ARIA labels em ícones-only buttons
- Contraste mínimo 4.5:1 (validar com `tailwindcss-themer` ou Lighthouse)

---

## Performance

- Server Components por default (Next.js 14+). `'use client'` só quando precisa (forms, modais, state)
- Imagens via `next/image` (lazy + responsive)
- Fontes via `next/font/google` (display:swap, sem layout shift)
- `loading.tsx` em rotas pesadas (skeleton no SSR)
- Suspense boundaries em chunks grandes
- Bundle analyzer (`@next/bundle-analyzer`) periódico

Métricas: LCP < 2.5s, INP < 200ms, CLS < 0.1 (ver `accessibility.md` e PRD)

---

## Referências (estudar quando travar)

| Repo | Para que | Stars | Pegar |
|---|---|---|---|
| [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) | UI de dashboard interno completa | 2.4k | Sidebar colapsável, theme presets, DataTable patterns, dashboards prontos (CRM, Finance, Analytics) |
| [ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate) | Estrutura de SaaS completo (marketing + app) | 7.1k | Pastas `features/templates/locales`, i18n setup, landing components, Sentry/CI |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Componentes base | 90k+ | Tudo. Sempre. |
| [vercel/platforms](https://github.com/vercel/platforms) | Multi-tenant com subdomínios custom | 5k+ | Quando precisar de `*.yourdomain.com` por workspace |
| [dubinc/dub](https://github.com/dubinc/dub) | UX de workspace switcher | 19k | Polishing do dropdown |
| [calcom/cal.com](https://github.com/calcom/cal.com) | Settings de team complexo | 36k | Members, invites, roles, billing UI |

**Como usar:** rodar local (`gh repo clone`), abrir em outro VSCode, **copiar padrão** (estrutura, naming, organização). Não copiar visual genérico — identidade do produto vem do `@joao` + `design.md`.

---

## Anti-padrões (NÃO faça)

- **Copy/paste de landing inteira de template** — fica cara de boilerplate
- **Theme shadcn default puro** sem customizar — genérico, todo SaaS parece igual
- **Sidebar fixa sem opção de colapsar** — chato em laptop pequeno
- **Page header genérico** ("Welcome, User!") — chato, pouco útil
- **Dashboard sem empty state** — primeiro acesso fica vazio sem direção
- **Forms sem validação client** — UX ruim (espera roundtrip pro server)
- **Toast só pra success** — também precisa pra erro (sempre), warning (às vezes)
- **Tabela sem paginação** — quebra com 1000+ linhas
- **Logo do produto = só texto** — sem identidade, esquecível

