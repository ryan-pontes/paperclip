---
name: uazapi
description: UAZAPI_URL=https://sua-instancia.uazapi.com
key: paperclipai/bundled/3node-skills/uazapi
recommendedForRoles:
- engineer
tags:
- uazapi
---

# Skill: UAZAPI (WhatsApp)

## Setup

```env
UAZAPI_URL=https://sua-instancia.uazapi.com
UAZAPI_TOKEN=seu-token
UAZAPI_INSTANCE=nome-da-instancia
```

## Cliente

```python
import httpx

class UazapiClient:
    def __init__(self):
        self.base = settings.UAZAPI_URL
        self.headers = {"token": settings.UAZAPI_TOKEN}
        self.instance = settings.UAZAPI_INSTANCE

    async def send_text(self, phone: str, message: str) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.base}/message/sendText/{self.instance}",
                json={"number": phone, "text": message},
                headers=self.headers)
            return r.json()

    async def send_buttons(self, phone: str, text: str, buttons: list) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{self.base}/message/sendButtons/{self.instance}",
                json={"number": phone, "text": text, "buttons": buttons},
                headers=self.headers)
            return r.json()

uazapi = UazapiClient()
```

## Webhook

```python
@router.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    payload = await request.json()
    if payload.get("type") == "message":
        phone = payload["from"]
        text = payload.get("body", "")
        await process_message(phone, text)
    return {"status": "ok"}
```

## Formatar número

```python
def format_phone(phone: str) -> str:
    numbers = ''.join(filter(str.isdigit, phone))
    if not numbers.startswith('55'):
        numbers = '55' + numbers
    return numbers
```

