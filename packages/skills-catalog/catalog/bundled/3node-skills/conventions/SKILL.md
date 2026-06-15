---
name: conventions
description: '- `snake_case` para funções, variáveis, módulos'
key: paperclipai/bundled/3node-skills/conventions
recommendedForRoles:
- engineer
tags:
- conventions
---

# Skill: Convenções de Código

## Python (Backend)

### Naming
- `snake_case` para funções, variáveis, módulos
- `PascalCase` para classes e models
- `UPPER_CASE` para constantes
- Prefixo `_` para funções privadas

### Imports (ordem)
```python
# 1. stdlib
import os
from uuid import UUID
from datetime import datetime

# 2. terceiros
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

# 3. locais
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate
```

### Type hints — sempre
```python
async def create_item(
    data: ItemCreate,
    org_id: UUID,
    db: AsyncSession
) -> Item:
```

### Error handling
```python
# Específico, nunca genérico
raise HTTPException(status_code=404, detail="Item não encontrado")
raise HTTPException(status_code=403, detail="Sem permissão para esta organização")
raise HTTPException(status_code=422, detail="CPF inválido")

# Nunca isso:
raise HTTPException(status_code=500, detail="Erro interno")
```

## TypeScript (Frontend)

### Naming
- `camelCase` para funções, variáveis, hooks
- `PascalCase` para componentes e tipos/interfaces
- `UPPER_CASE` para constantes de env

### Componentes
```typescript
// Arrow function + export nomeado
export const ItemCard = ({ item, onDelete }: ItemCardProps) => {
  return (...)
}

// Interfaces antes do componente
interface ItemCardProps {
  item: Item
  onDelete: (id: string) => void
}
```

### Imports (ordem)
```typescript
// 1. react/next
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. libs externas
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// 3. componentes
import { Button } from '@/components/ui/button'
import { ItemCard } from '@/components/items/item-card'

// 4. utils/types
import { formatDate } from '@/lib/utils'
import type { Item } from '@/types'
```

### Error handling
```typescript
// Try/catch com toast — nunca silencioso
try {
  await createItem(data)
  toast.success('Item criado!')
} catch (error) {
  toast.error('Erro ao criar item', {
    description: error instanceof Error ? error.message : 'Tente novamente'
  })
}
```

## Git (Conventional Commits)

```
feat: adiciona autenticação com Google
fix: corrige RLS policy de organizations
refactor: extrai service de pagamentos
docs: documenta endpoints de webhook
chore: atualiza dependências
style: ajusta espaçamento no dashboard
test: adiciona testes de RLS cross-tenant
```

### Branches
- `main` — produção
- `develop` — integração (quando aplicável)
- `feature/nome-curto` — nova feature
- `fix/nome-curto` — correção
- `hotfix/nome-curto` — fix urgente em prod

