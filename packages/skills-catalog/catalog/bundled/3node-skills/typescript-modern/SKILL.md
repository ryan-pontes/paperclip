---
name: typescript-modern
description: Features que `@felipe` deve usar pra eliminar `any`, `as unknown as` e código frágil.
key: paperclipai/bundled/3node-skills/typescript-modern
recommendedForRoles:
- engineer
tags:
- typescript
- modern
---

# Skill: TypeScript Moderno (5.x / 6.x)

Features que `@felipe` deve usar pra eliminar `any`, `as unknown as` e código frágil.

## `satisfies` operator (5.0+)

Valida que valor satisfaz tipo SEM perder o tipo literal inferido.

```typescript
// Sem satisfies — type vira string genérica
const config: Record<string, string> = {
  endpoint: '/api/users',
  method: 'GET',
}
config.method  // type: string

// Com satisfies — preserva literais
const config = {
  endpoint: '/api/users',
  method: 'GET',
} satisfies Record<string, string>
config.method  // type: "GET" (literal)
```

**Use sempre que**: validar shape mas precisa do tipo inferido completo.

## `const` type parameters (5.0+)

Força inferência de literais em generics:

```typescript
// Sem const — vira string[]
function makeOptions<T extends string[]>(items: T): T { return items }
const opts = makeOptions(['a', 'b', 'c'])
// type: string[]

// Com const — vira readonly tuple literal
function makeOptions<const T extends readonly string[]>(items: T): T { return items }
const opts = makeOptions(['a', 'b', 'c'])
// type: readonly ['a', 'b', 'c']
```

## `using` keyword — Explicit Resource Management (5.2+)

Auto-cleanup de recursos. Equivalente a `try/finally` automático.

```typescript
// Antes
async function processFile() {
  const file = await openFile()
  try {
    return await read(file)
  } finally {
    await file.close()
  }
}

// Depois
async function processFile() {
  await using file = await openFile()
  return await read(file)
  // file.close() chamado automaticamente
}
```

Pra usar, objeto precisa implementar `Symbol.dispose` ou `Symbol.asyncDispose`.

## `isolated declarations` (5.5+)

Força declaração explícita de tipos de retorno em exports públicos. Acelera build em monorepos.

```json
// tsconfig.json
{
  "compilerOptions": {
    "isolatedDeclarations": true
  }
}
```

```typescript
// ❌ Erro com isolatedDeclarations
export function foo(x: number) { return x * 2 }

// ✅ OK
export function foo(x: number): number { return x * 2 }
```

## Branded types (segurança em tempo de compilação)

Pra evitar confusão entre tipos primitivos similares:

```typescript
type UserId = string & { __brand: 'UserId' }
type EventId = string & { __brand: 'EventId' }

function createUserId(id: string): UserId {
  return id as UserId
}

function getEvent(eventId: EventId) { /* ... */ }

const userId = createUserId('abc')
getEvent(userId)  // ❌ Erro: Type 'UserId' is not assignable to 'EventId'
```

Útil pra evitar bugs como passar `event_id` onde esperava `participant_id`.

## Template literal types

Tipo computado a partir de strings:

```typescript
type Route = `/${string}`
type ApiRoute = `/api/${string}`

function navigate(route: Route) { /* ... */ }
navigate('/dashboard')      // ✅
navigate('dashboard')        // ❌ falta /

type EventName = `event:${'created' | 'updated' | 'deleted'}`
// 'event:created' | 'event:updated' | 'event:deleted'
```

## Discriminated unions

Substitui `any` em estados:

```typescript
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

function render(state: LoadState<User>) {
  switch (state.status) {
    case 'idle': return null
    case 'loading': return <Spinner />
    case 'success': return <User data={state.data} />  // type narrowed
    case 'error': return <Error message={state.error.message} />
  }
}
```

## Type predicates (`is`)

Função que estreita tipo:

```typescript
function isUser(value: unknown): value is User {
  return typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'email' in value
}

if (isUser(data)) {
  data.email  // type: string
}
```

Substitui `as User` (cast cego).

## `assert` predicates

Como type predicate mas lança erro se falhar:

```typescript
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new Error('Not a user')
}

assertUser(data)
data.email  // type narrowed após o assert
```

Útil em validação de entrada.

## `NoInfer<T>` utility (5.4+)

Impede inferência em posição específica:

```typescript
function pick<T, K extends keyof T>(obj: T, keys: NoInfer<K>[]): Pick<T, K>

// Sem NoInfer, TS infere K do array, podendo aceitar keys inválidas
// Com NoInfer, K deve vir de outro lugar (T)
```

## `Awaited<T>` utility

Pega o tipo "descascado" de Promise:

```typescript
type Result = Awaited<Promise<string>>  // string
type NestedResult = Awaited<Promise<Promise<number>>>  // number
```

Útil em retorno de async functions.

## Eliminando `any`

### Regra: zero `any` em código de produção

Substituições:
| `any` cenário | Substituir por |
|---|---|
| Body de JSON desconhecido | `unknown` + validação Zod |
| Library sem tipos | Criar `.d.ts` ou usar `@types/...` |
| Generic ainda não definido | `unknown` + cast com type guard |
| Resposta de DB | Type from Supabase generated types |
| Event handler | Tipo do evento (`MouseEvent`, `FormEvent`) |

### Antes
```typescript
function handleSubmit(data: any) {
  console.log(data.email)
}
```

### Depois
```typescript
const Schema = z.object({ email: z.string().email() })

function handleSubmit(data: unknown) {
  const parsed = Schema.parse(data)
  console.log(parsed.email)  // type: string
}
```

## Eliminando `as unknown as`

`as unknown as X` é cheiro de design ruim. Geralmente:
- Pode usar `satisfies`
- Falta type predicate
- Falta discriminated union
- Lib precisa de declaration merging

Antes de usar, pergunta: o problema pode ser resolvido com tipo melhor?

## `tsconfig.json` recomendado

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,    // ← previne bugs em arrays
    "exactOptionalPropertyTypes": true,   // ← exato sobre undefined

    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    "incremental": true,
    "tsBuildInfoFile": "./.next/cache/tsconfig.tsbuildinfo"
  }
}
```

`noUncheckedIndexedAccess: true` é game changer — força você a checar se `arr[i]` existe.

## Patterns Supabase

```typescript
import type { Database } from '@/types/database'

type Event = Database['public']['Tables']['er_events']['Row']
type EventInsert = Database['public']['Tables']['er_events']['Insert']
type EventUpdate = Database['public']['Tables']['er_events']['Update']

// Em vez de typing manual, usa generated types
const supabase = createClient<Database>()
const { data: events } = await supabase.from('er_events').select('*')
// events: Event[] | null
```

Pra regenerar:
```bash
npx supabase gen types typescript --project-id <ref> > src/types/database.ts
```

## Decorators Stage 3 (5.0+)

Útil pra cross-cutting (logging, validação):

```typescript
function log(target: any, ctx: ClassMethodDecoratorContext) {
  return function(this: any, ...args: any[]) {
    console.log(`Calling ${String(ctx.name)}`)
    return target.call(this, ...args)
  }
}

class Service {
  @log
  process(id: string) { /* ... */ }
}
```

## Checklist TS moderno

- [ ] Zero `any` em código novo
- [ ] `satisfies` em vez de `as Type` quando possível
- [ ] Discriminated unions pra estados
- [ ] Type predicates pra narrowing
- [ ] Zod pra validação de input externo
- [ ] Generated types do Supabase
- [ ] `noUncheckedIndexedAccess: true` no tsconfig
- [ ] Branded types pra IDs distintos

## Referências
- [TypeScript What's New](https://www.typescriptlang.org/docs/handbook/release-notes/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [Total TypeScript](https://www.totaltypescript.com/)
- [Effective TypeScript](https://effectivetypescript.com/)

