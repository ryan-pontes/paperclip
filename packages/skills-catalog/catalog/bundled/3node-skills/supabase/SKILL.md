---
name: supabase
description: from supabase import create_client
key: paperclipai/bundled/3node-skills/supabase
recommendedForRoles:
- engineer
tags:
- supabase
---

# Skill: Supabase

## Setup

```python
# backend
from supabase import create_client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

```typescript
// frontend browser
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// frontend server
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export const createClient = () => createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { getAll: () => cookies().getAll() } }
)
```

## Auth

```typescript
// email/senha
await supabase.auth.signInWithPassword({ email, password })

// google
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${origin}/auth/callback` }
})

// callback: app/auth/callback/route.ts
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')
  if (code) await createClient().auth.exchangeCodeForSession(code)
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

## Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cs) => cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    }}
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && request.nextUrl.pathname.startsWith('/dashboard'))
    return NextResponse.redirect(new URL('/login', request.url))
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

## RLS Padrão

```sql
ALTER TABLE [tabela] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON [tabela]
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
```

