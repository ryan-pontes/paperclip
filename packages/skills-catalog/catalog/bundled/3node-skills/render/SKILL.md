---
name: render
description: Alternativa ao Railway para deploy de backend
key: paperclipai/bundled/3node-skills/render
recommendedForRoles:
- devops
tags:
- render
---

# Skill: Render

## Quando usar

Alternativa ao Railway para deploy de backend. Bom free tier para projetos iniciais.

## Deploy via Dashboard

1. Conectar repositório GitHub
2. Selecionar branch `main`
3. Configurar build e start commands
4. Adicionar variáveis de ambiente

## render.yaml (Infrastructure as Code)

```yaml
services:
  - type: web
    name: api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
    healthCheckPath: /health
    autoDeploy: true
```

## Dockerfile Deploy

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 10000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
```

## Health Check

```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

## Domínio Customizado

```
# DNS config
Type: CNAME
Name: api
Value: seu-servico.onrender.com
```

## Limites Free Tier

- Spin down após 15min inatividade (cold start ~30s)
- 750h/mês de runtime
- 100GB bandwidth/mês
- Sem persistent disk no free
- Build timeout: 30min

## Dicas

- Use `gunicorn` com workers em produção para melhor performance
- Configure `WEB_CONCURRENCY` para controlar workers
- Use Render's built-in cron jobs para tarefas agendadas
- Health check evita que o serviço seja derrubado por falso positivo

```bash
# Start command para produção
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

