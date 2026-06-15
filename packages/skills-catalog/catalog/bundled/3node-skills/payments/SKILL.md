---
name: payments
description: '- **Asaas** → clientes brasileiros (PIX, boleto, cartão nacional)'
key: paperclipai/bundled/3node-skills/payments
recommendedForRoles:
- engineer
tags:
- payments
---

# Skill: Pagamentos

## Regra de decisão
- **Asaas** → clientes brasileiros (PIX, boleto, cartão nacional)
- **Stripe** → clientes internacionais

## Asaas

```python
# app/integrations/asaas.py
import httpx

class AsaasClient:
    def __init__(self):
        self.base_url = settings.ASAAS_BASE_URL
        self.headers = {"access_token": settings.ASAAS_API_KEY}

    async def create_customer(self, name: str, email: str, cpf_cnpj: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{self.base_url}/customers",
                json={"name": name, "email": email, "cpfCnpj": cpf_cnpj},
                headers=self.headers)
            return r.json()

    async def create_charge(self, customer_id: str, value: float,
                            billing_type: str, due_date: str) -> dict:
        # billing_type: BOLETO | PIX | CREDIT_CARD
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{self.base_url}/payments",
                json={"customer": customer_id, "billingType": billing_type,
                      "value": value, "dueDate": due_date},
                headers=self.headers)
            return r.json()

asaas = AsaasClient()
```

```python
# Webhook
@router.post("/webhooks/asaas")
async def asaas_webhook(request: Request):
    payload = await request.json()
    if payload.get("event") == "PAYMENT_CONFIRMED":
        await handle_payment_confirmed(payload["payment"]["id"])
    return {"received": True}
```

## Stripe

```python
import stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

async def create_checkout(price_id: str, email: str, success_url: str, cancel_url: str) -> str:
    session = stripe.checkout.Session.create(
        customer_email=email,
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url
    )
    return session.url
```

```python
# Webhook
@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    event = stripe.Webhook.construct_event(
        await request.body(),
        request.headers.get("stripe-signature"),
        settings.STRIPE_WEBHOOK_SECRET
    )
    if event["type"] == "checkout.session.completed":
        await handle_subscription_created(event["data"]["object"])
    return {"received": True}
```

