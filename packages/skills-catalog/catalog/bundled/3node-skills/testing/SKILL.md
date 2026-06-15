---
name: testing
description: '- **Backend:** pytest + httpx (async)'
key: paperclipai/bundled/3node-skills/testing
recommendedForRoles:
- engineer
tags:
- testing
---

# Skill: Testes

## Stack de Testes

- **Backend:** pytest + httpx (async)
- **Frontend:** Vitest + React Testing Library
- **E2E:** Playwright (via MCP)

## Backend — pytest

### Setup

```bash
pip install pytest pytest-asyncio httpx
```

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.fixture
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}
```

### Testando Endpoints

```python
@pytest.mark.asyncio
async def test_create_item(client, auth_headers):
    response = await client.post("/api/v1/items",
        json={"name": "Test", "price": 10.0},
        headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_item_unauthorized(client):
    response = await client.post("/api/v1/items", json={"name": "Test"})
    assert response.status_code == 401
```

### Testando RLS (multi-tenant)

```python
@pytest.mark.asyncio
async def test_rls_cross_tenant(client, org_a_headers, org_b_headers):
    # Org A cria item
    r = await client.post("/api/v1/items",
        json={"name": "Item A"}, headers=org_a_headers)
    item_id = r.json()["id"]

    # Org B não pode ver
    r = await client.get(f"/api/v1/items/{item_id}", headers=org_b_headers)
    assert r.status_code == 404
```

### Fixtures de Factory

```python
@pytest.fixture
async def make_org(db):
    async def _make(name="Test Org"):
        org = Organization(name=name, slug=f"test-{uuid4().hex[:8]}")
        db.add(org)
        await db.commit()
        return org
    return _make

@pytest.fixture
async def make_user(db, make_org):
    async def _make(org=None, role="member"):
        if not org:
            org = await make_org()
        user = await create_test_user(db, org.id, role)
        return user
    return _make
```

## Frontend — Vitest

### Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
```

### Testando Componentes

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ItemCard } from '@/components/items/item-card'

describe('ItemCard', () => {
  it('renders item name', () => {
    render(<ItemCard item={{ id: '1', name: 'Test' }} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn()
    render(<ItemCard item={{ id: '1', name: 'Test' }} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })
})
```

## Rodar Testes

```bash
# Backend
pytest -v
pytest -v --tb=short -q    # resumido
pytest tests/test_items.py  # arquivo específico

# Frontend
npx vitest
npx vitest run              # sem watch
npx vitest run --coverage   # com cobertura
```

