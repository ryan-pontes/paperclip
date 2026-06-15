---
name: multitenant
description: Todo projeto começa multi-tenant
key: paperclipai/bundled/3node-skills/multitenant
recommendedForRoles:
- engineer
tags:
- multitenant
---

# Skill: Multi-tenant + Multi-workspace (N:N)

Todo projeto começa multi-tenant. Modelo padrão: **1 user pode estar em N organizações (workspaces) com role independente em cada**.

Referência conceitual: [basejump](https://github.com/usebasejump/basejump) (Supabase) e [cal.com](https://github.com/calcom/cal.com).

---

## Quando usar este padrão

✅ SaaS B2B (consultor com vários clientes, agência com várias contas, freelancer com vários workspaces)
✅ Produto que prevê convite de membros pra um time
✅ Qualquer dúvida → **use este padrão**. É aditivo: 1 user com 1 org só funciona igual ao modelo simples, sem custo extra.

❌ Único caso pra modelo simples 1:1: ferramenta pessoal pura (sem features colaborativas planejadas).

---

## Schema base (prefixe tabelas com escopo do produto, ex: `er_`, `fy_`, etc)

```sql
-- ENUM de roles na membership
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'member');

-- Organizações (tenants)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free',
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Profile = perfil base do usuário (1:1 com auth.users) + workspace ativa atual
CREATE TABLE profiles (
  id                        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                     TEXT NOT NULL,
  full_name                 TEXT,
  avatar_url                TEXT,
  active_organization_id    UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Memberships N:N (a tabela central do modelo)
CREATE TABLE org_members (
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role             app_role NOT NULL DEFAULT 'member',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_org_members_org  ON org_members(organization_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);
```

---

## Função `current_org_id()` (a chave de tudo)

Retorna a org ativa do user logado **só se ele for membro dela**. Toda policy de tabelas multi-tenant usa essa função.

```sql
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT m.organization_id
  FROM profiles p
  JOIN org_members m ON m.user_id = p.id
                    AND m.organization_id = p.active_organization_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

**Por que SECURITY DEFINER:** roda com privilégios do owner da função, contorna RLS interna pra evitar recursão (policy de `org_members` chamando função que consulta `org_members`).

---

## RPCs server-side pro frontend chamar via `supabase.rpc(...)`

```sql
-- Trocar workspace ativa (valida membership)
CREATE OR REPLACE FUNCTION set_active_organization(target_org UUID)
RETURNS UUID AS $$
DECLARE is_member BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid() AND organization_id = target_org)
    INTO is_member;
  IF NOT is_member THEN RAISE EXCEPTION 'not_a_member' USING ERRCODE = '42501'; END IF;
  UPDATE profiles SET active_organization_id = target_org, updated_at = now() WHERE id = auth.uid();
  RETURN target_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar nova workspace (user vira owner, e a nova vira ativa)
CREATE OR REPLACE FUNCTION create_workspace(workspace_name TEXT)
RETURNS UUID AS $$
DECLARE new_org_id UUID; slug_seed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF length(trim(workspace_name)) < 2 THEN RAISE EXCEPTION 'name_too_short'; END IF;

  slug_seed := LOWER(REGEXP_REPLACE(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug_seed := REGEXP_REPLACE(slug_seed, '(^-|-$)', '', 'g');
  IF slug_seed = '' THEN slug_seed := 'workspace'; END IF;

  INSERT INTO organizations (name, slug)
  VALUES (trim(workspace_name), slug_seed || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8))
  RETURNING id INTO new_org_id;

  INSERT INTO org_members (user_id, organization_id, role) VALUES (auth.uid(), new_org_id, 'owner');
  UPDATE profiles SET active_organization_id = new_org_id WHERE id = auth.uid();

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## Trigger de signup (cria org default automaticamente)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE new_org_id UUID; display_name TEXT; slug_seed TEXT;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
  slug_seed    := LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug_seed    := REGEXP_REPLACE(slug_seed, '(^-|-$)', '', 'g');
  IF slug_seed = '' THEN slug_seed := 'workspace'; END IF;

  INSERT INTO organizations (name, slug)
  VALUES (display_name, slug_seed || '-' || SUBSTRING(NEW.id::TEXT, 1, 8))
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, email, full_name, active_organization_id)
  VALUES (NEW.id, NEW.email, display_name, new_org_id);

  INSERT INTO org_members (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Policies (template — replicar pra cada tabela do produto)

```sql
-- profiles: read self + read peers da org atual; update só do próprio
CREATE POLICY profiles_self_read   ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_peers_read  ON profiles FOR SELECT TO authenticated
  USING (id IN (SELECT user_id FROM org_members WHERE organization_id = current_org_id()));
CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- organizations: read se for membro; update se for owner/admin; insert authenticated
CREATE POLICY org_member_read  ON organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY org_owner_update ON organizations FOR UPDATE TO authenticated
  USING (id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
CREATE POLICY org_auth_insert ON organizations FOR INSERT TO authenticated WITH CHECK (true);

-- org_members: read próprias + peers; insert/update/delete só owner/admin
CREATE POLICY om_self_read   ON org_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY om_peer_read   ON org_members FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid()));
CREATE POLICY om_admin_write ON org_members FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
    OR user_id = auth.uid()
  );
CREATE POLICY om_admin_update ON org_members FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));
CREATE POLICY om_admin_delete ON org_members FOR DELETE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner','admin')));

-- TABELAS DE NEGÓCIO (template) — toda tabela do produto leva organization_id e usa current_org_id():
-- CREATE TABLE feature_x (..., organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, ...);
-- CREATE POLICY feature_x_org_all ON feature_x FOR ALL TO authenticated
--   USING (organization_id = current_org_id())
--   WITH CHECK (organization_id = current_org_id());
```

---

## Backend helper (Next.js + @supabase/ssr)

```ts
// lib/api/auth.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized', status: 401 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, active_organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.active_organization_id) return { error: 'no_active_workspace', status: 403 };

  const { data: member } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('organization_id', profile.active_organization_id)
    .maybeSingle();

  if (!member) return { error: 'not_a_member', status: 403 };

  return { userId: user.id, email: profile.email, organizationId: profile.active_organization_id };
}
```

```ts
// lib/supabase/queries.ts — getAdminContext devolve workspaces[] + active pro layout
export async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, active_organization_id')
    .eq('id', user.id).maybeSingle();

  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organizations:organization_id(id, name, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const workspaces = (memberships ?? []).flatMap((m) => {
    const o = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    return o ? [{ id: o.id, name: o.name, slug: o.slug, role: m.role }] : [];
  });

  if (workspaces.length === 0 || !profile) return null;

  let activeId = profile.active_organization_id;
  if (!activeId || !workspaces.some((w) => w.id === activeId)) {
    activeId = workspaces[0].id;
    await supabase.from('profiles').update({ active_organization_id: activeId }).eq('id', user.id);
  }

  const active = workspaces.find((w) => w.id === activeId)!;
  return { user, profile, active, workspaces };
}
```

---

## APIs do switcher (Next.js Route Handlers)

```ts
// app/api/workspaces/route.ts — POST cria nova
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { name } = await req.json();
  const { data, error } = await supabase.rpc('create_workspace', { workspace_name: name });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization_id: data }, { status: 201 });
}

// app/api/workspaces/switch/route.ts — POST troca ativa
export async function POST(req: Request) {
  const supabase = await createClient();
  const { organization_id } = await req.json();
  const { data, error } = await supabase.rpc('set_active_organization', { target_org: organization_id });
  if (error) return NextResponse.json({ error: error.code === '42501' ? 'not_a_member' : error.message }, { status: error.code === '42501' ? 403 : 500 });
  return NextResponse.json({ active_organization_id: data });
}
```

---

## UI: WorkspaceSwitcher (padrão Vercel/Dub/Linear)

Dropdown no header com:
- Avatar circular com inicial do nome
- Lista de workspaces do user (com role abaixo do nome)
- Indicador `●` na ativa
- Botão "+ Nova workspace" abre form inline
- Click fora fecha

Após switch: `router.refresh()` recarrega tudo no novo contexto (Server Components refazem queries com `current_org_id()` apontando pra nova).

---

## Regras de ouro

1. **Toda tabela do produto leva `organization_id`** com FK pra `organizations(id) ON DELETE CASCADE`
2. **Toda policy usa `current_org_id()`** — nunca hardcode `auth.uid()` direto em queries de negócio
3. **RPCs são a única forma de mutar `active_organization_id`** — nunca UPDATE direto via client
4. **Service role nunca passa por current_org_id**: pra endpoints públicos (LP cadastra lead) ou jobs cross-tenant, usar service_role + filtrar `organization_id` no código
5. **`organization_id` em insert/update**: pegar do contexto (`requireAdmin().organizationId`), não confiar no body do request
6. **Convite de membros (futuro):** tabela `org_invites (org_id, email, role, token, expires_at)` + `accept_invite(token)` RPC que insere em `org_members`

---

## Referências para validar/inspirar

- [basejump](https://github.com/usebasejump/basejump) — biblioteca oficial de team accounts pro Supabase (referência canônica)
- [cal.com](https://github.com/calcom/cal.com) — teams completos (Prisma+Postgres, mas mesmo padrão)
- [dub](https://github.com/dubinc/dub) — referência de UX do workspace switcher
- [vercel/platforms](https://github.com/vercel/platforms) — multi-tenant com subdomínios (complementar)

## Casos reais que validam o padrão (anti-modelo 1:1)

- Consultor de marketing gerencia 5 clientes (5 workspaces, role owner em cada)
- Agência convida cliente como `member` pra revisar (cliente é dono da própria org E member da agência)
- Funcionário entra/sai de empresa sem perder conta (só remove da membership)
- Time vê uma org compartilhada + cada um tem workspace pessoal

Modelo 1:1 quebra em todos esses casos. Use N:N por padrão.

---

## Extensão 1: Convite de membros (`org_invites`)

Quando precisar convidar pessoas por email pra entrar numa workspace (caso comum em SaaS B2B).

```sql
CREATE TABLE org_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           CITEXT NOT NULL,
  role            app_role NOT NULL DEFAULT 'member',
  token           TEXT NOT NULL UNIQUE,
  invited_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_org_invites_token ON org_invites(token);

-- Só owner/admin da org pode criar/cancelar invites
CREATE POLICY invites_admin_all ON org_invites FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM org_members
    WHERE user_id = auth.uid() AND role IN ('owner','admin')
  ));

-- RPC pra aceitar: valida token, cria membership, marca accepted_at
CREATE OR REPLACE FUNCTION accept_invite(invite_token TEXT)
RETURNS UUID AS $$
DECLARE inv RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO inv FROM org_invites WHERE token = invite_token AND accepted_at IS NULL AND expires_at > now();
  IF inv IS NULL THEN RAISE EXCEPTION 'invalid_or_expired_invite'; END IF;

  INSERT INTO org_members (user_id, organization_id, role)
  VALUES (auth.uid(), inv.organization_id, inv.role)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE org_invites SET accepted_at = now() WHERE id = inv.id;
  UPDATE profiles SET active_organization_id = inv.organization_id WHERE id = auth.uid();

  RETURN inv.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

Fluxo de UX: admin cria invite → app envia email com link `/invite/{token}` → destinatário faz signup/login → frontend chama `accept_invite(token)` → cai na nova workspace.

---

## Extensão 2: Projects (segundo nível abaixo de organization)

Útil quando uma org tem múltiplos "contextos" isolados (Vercel: org → projects, Cal.com: team → event types, Linear: org → projects). Não use se a org já é granular o suficiente.

```sql
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_org_member ON projects FOR ALL TO authenticated
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());
```

Toda tabela do produto que pertence a um project leva **ambos** `organization_id` E `project_id` (redundância proposital, simplifica policies e queries). Active project pode viver no `profiles.active_project_id` ou em URL/cookie (depende se troca frequentemente).

---

## RBAC granular: quando ir além de `role IN (...)`

`er_admin_role` enum cobre 80% dos casos (owner/admin/moderator/member). Se precisar de permissions finas (ex: "moderator pode apagar mensagem mas não banir"), considere:

- **[CASL](https://casl.js.org/)** — biblioteca de abilities/conditions composáveis. Padrão em luskafaria/multi-tenant-rbac e cal.com. Funciona client + server.
- **Permissions table** — `org_permissions (role, resource, action)` consultada em policies. Mais flexível, mais complexo.

Não otimize antes de precisar — `role IN ('owner','admin')` resolve a maioria dos checks.

---

## Anti-padrões (NÃO use no Supabase)

- **Database-per-tenant** (1 banco por org): GDPR/healthtech pesado às vezes pede isso, mas no Supabase cada DB extra é um project novo (a partir de $25/mês cada). Vira caro rapidíssimo. RLS resolve isolation com 1 banco compartilhado.
- **Schema-per-tenant** (1 schema Postgres por org): possível, mas complica migrations, pooling, types gerados. Use só se compliance for mandatório.
- **`organization_id` opcional/null**: NUNCA. Toda tabela de negócio é obrigatoriamente vinculada a uma org. NULL = bug de isolamento.
- **Trust no body do request pra `organization_id`**: sempre pegar de `requireAdmin().organizationId`, nunca do client.

