---
name: agno
description: Agentes simples com ferramentas
key: paperclipai/bundled/3node-skills/agno
recommendedForRoles:
- engineer
tags:
- agno
---

# Skill: Agno

## Quando usar

Agentes simples com ferramentas. Para orquestração complexa com estado, use LangGraph.

## Setup

```bash
pip install agno
```

## Agente Simples

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat

agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    instructions=["Responda em português", "Seja direto e objetivo"],
    markdown=True
)
agent.print_response("Sua pergunta aqui")
```

## Com Memória Persistente

```python
from agno.memory.db.postgres import PostgresMemoryDb
from agno.storage.agent.postgres import PostgresAgentStorage

agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    memory=PostgresMemoryDb(table_name="agent_memory", db_url=settings.DATABASE_URL),
    storage=PostgresAgentStorage(table_name="agent_sessions", db_url=settings.DATABASE_URL),
    add_history_to_messages=True,
    num_history_responses=5
)
```

## Time de Agentes

```python
from agno.team import Team

team = Team(
    members=[researcher_agent, writer_agent],
    mode="coordinate",
    model=OpenAIChat(id="gpt-4o")
)
team.print_response("Escreva um artigo sobre IA")
```

## Ferramenta Customizada

```python
from agno.tools import tool

@tool
def buscar_no_banco(query: str) -> str:
    """Busca informações no banco de dados."""
    result = supabase.table("items").select("*").ilike("name", f"%{query}%").execute()
    return str(result.data)

agent = Agent(model=OpenAIChat(id="gpt-4o"), tools=[buscar_no_banco])
```

