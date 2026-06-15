---
name: langchain
description: '- **LangGraph:** agentes com múltiplos passos, loops, estado persistente'
key: paperclipai/bundled/3node-skills/langchain
recommendedForRoles:
- engineer
tags:
- langchain
---

# Skill: LangGraph / LangChain

## Quando usar

- **LangGraph:** agentes com múltiplos passos, loops, estado persistente
- **Agno:** agentes simples com ferramentas, sem grafos

## Setup

```bash
pip install langchain langgraph langchain-openai
```

## Agente com LangGraph

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    user_id: str

llm = ChatOpenAI(model="gpt-4o", temperature=0)

def call_llm(state: AgentState):
    return {"messages": [llm.invoke(state["messages"])]}

graph = StateGraph(AgentState)
graph.add_node("agent", call_llm)
graph.add_edge(START, "agent")
graph.add_edge("agent", END)
app = graph.compile()

result = app.invoke({"messages": [HumanMessage(content="Olá!")], "user_id": "uuid"})
```

## Com Memória (Supabase)

```python
from langchain_community.chat_message_histories import PostgresChatMessageHistory

def get_history(session_id: str):
    return PostgresChatMessageHistory(
        connection_string=settings.DATABASE_URL,
        session_id=session_id
    )
```

## Integração FastAPI

```python
@router.post("/chat")
async def chat(message: str, current_user: User = Depends(get_current_user)):
    result = await app.ainvoke({
        "messages": [HumanMessage(content=message)],
        "user_id": str(current_user.id)
    })
    return {"response": result["messages"][-1].content}
```

