---
name: design
description: Toda interface criada deve ser **distintiva e production-grade** — evitar estética genérica de IA.
key: paperclipai/bundled/3node-skills/design
recommendedForRoles:
- designer
tags:
- design
---

# Skill: Design System

## Filosofia de Design (Frontend Design)

Toda interface criada deve ser **distintiva e production-grade** — evitar estética genérica de IA.

### Antes de codar, definir:
- **Propósito**: Que problema essa interface resolve? Quem usa?
- **Tom visual**: Escolher uma direção BOLD — brutalmente minimal, maximalista, retro-futurista, orgânico, luxo/refinado, playful, editorial, brutalista, art deco, soft/pastel, industrial, etc.
- **Diferenciação**: O que torna essa interface MEMORÁVEL?

### Diretrizes Estéticas
- **Tipografia**: Fontes bonitas e únicas. NUNCA usar Arial, Inter, Roboto, system fonts. Parear uma display font distinta com uma body font refinada.
- **Cor e Tema**: Paleta coesa com CSS variables. Cores dominantes com acentos marcantes > paletas tímidas e distribuídas igualmente.
- **Motion**: Animações para micro-interações. CSS-only para HTML, Motion library para React. Foco em momentos de alto impacto: page load com staggered reveals (animation-delay), scroll-triggering, hover states que surpreendem.
- **Composição Espacial**: Layouts inesperados. Assimetria. Overlap. Fluxo diagonal. Elementos que quebram o grid. Espaço negativo generoso OU densidade controlada.
- **Backgrounds e Detalhes**: Criar atmosfera e profundidade — gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, grain overlays.

### NUNCA usar
- Famílias de fonte genéricas (Inter, Roboto, Arial, system fonts)
- Esquemas de cor clichê (gradientes roxos em fundo branco)
- Layouts previsíveis e cookie-cutter
- Mesmo visual em projetos diferentes — cada projeto é único

## Princípios Técnicos

- Profissional, não genérico — nunca tema padrão do shadcn
- Cada projeto tem identidade visual própria
- Dark mode nativo desde o início
- Mobile-first: começa em 375px, expande progressivamente

## Feedback Visual Obrigatório

```typescript
// Loading em botão
const [loading, setLoading] = useState(false)
<Button disabled={loading} onClick={async () => {
  setLoading(true)
  try { await action() } finally { setLoading(false) }
}}>
  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
  {loading ? 'Salvando...' : 'Salvar'}
</Button>

// Toast
import { toast } from 'sonner'
toast.success('Salvo!')
toast.error('Erro', { description: error.message })
toast.promise(action(), { loading: 'Salvando...', success: 'Salvo!', error: 'Erro' })
```

## Skeleton Loaders

```typescript
import { Skeleton } from '@/components/ui/skeleton'
function CardSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
```

## Transições entre Páginas

```typescript
// app/layout.tsx
'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Layout({ children }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

## Estado Vazio

```typescript
function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <InboxIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm mt-1 mb-4">{description}</p>
      {action}
    </div>
  )
}
```

## Dark Mode

```typescript
import { ThemeProvider } from 'next-themes'
// Wrap app com: <ThemeProvider attribute="class" defaultTheme="system" enableSystem>

// Toggle
const { theme, setTheme } = useTheme()
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</Button>
```

## Mobile-first

```typescript
// Sempre começa pelo mobile
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
<div className="px-4 md:px-6 lg:px-8">
```

