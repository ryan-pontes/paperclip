---
name: n8n
description: 'Workflows automatizados: CRM triggers, notificações, sincronização entre serviços, agendamentos.'
key: paperclipai/bundled/3node-skills/n8n
recommendedForRoles:
- engineer
tags:
- n8n
---

# Skill: n8n (Automações)

## Quando usar

Workflows automatizados: CRM triggers, notificações, sincronização entre serviços, agendamentos.

## Setup

```env
N8N_URL=https://sua-instancia.n8n.cloud
N8N_API_KEY=seu-api-key
```

## Chamar Workflow via API

```python
import httpx

class N8nClient:
    def __init__(self):
        self.base = settings.N8N_URL
        self.headers = {"X-N8N-API-KEY": settings.N8N_API_KEY}

    async def trigger_webhook(self, webhook_path: str, data: dict) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.base}/webhook/{webhook_path}",
                json=data)
            return r.json()

    async def trigger_production(self, webhook_path: str, data: dict) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.base}/webhook-prod/{webhook_path}",
                json=data)
            return r.json()

n8n = N8nClient()
```

## Receber Webhook do n8n

```python
@router.post("/webhooks/n8n/{action}")
async def n8n_webhook(action: str, request: Request):
    payload = await request.json()

    handlers = {
        "new-lead": handle_new_lead,
        "payment-confirmed": handle_payment,
        "send-report": handle_report,
    }

    handler = handlers.get(action)
    if not handler:
        raise HTTPException(status_code=404, detail="Action not found")

    await handler(payload)
    return {"status": "ok"}
```

## Patterns Comuns

### Novo usuário → welcome flow
```
Supabase (trigger: new row in profiles)
  → Buscar dados do usuário
  → Enviar email de boas-vindas
  → Enviar WhatsApp via UAZAPI
  → Notificar admin no Slack
```

### Pagamento confirmado → ativar plano
```
Webhook Asaas/Stripe (PAYMENT_CONFIRMED)
  → Buscar customer no banco
  → Atualizar plano da organization
  → Enviar confirmação por email
  → Enviar recibo no WhatsApp
```

### Relatório agendado
```
Cron (todo dia 8h)
  → Buscar métricas do banco
  → Gerar relatório
  → Enviar por email/WhatsApp
```

## Dicas

- Use webhook-test para desenvolvimento, webhook-prod para produção
- Sempre valide o payload recebido do n8n
- n8n pode chamar seus endpoints autenticados — passe o service role key no header
- Use o node "Code" do n8n para transformações complexas antes de chamar sua API

