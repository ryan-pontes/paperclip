---
name: agentic-systems
description: Usado pelo `@cto` ao decidir entre agente autônomo, workflow estruturado, ou código determinístico.
key: paperclipai/bundled/3node-skills/agentic-systems
recommendedForRoles:
- engineer
tags:
- agentic
- systems
---

# Skill: Agentic Systems (quando usar agentes vs fluxos)

Usado pelo `@cto` ao decidir entre agente autônomo, workflow estruturado, ou código determinístico.

## A pergunta-chave: precisa de agente?

**NÃO use agente quando:**
- Tarefa é determinística e previsível
- Latência crítica
- Custo crítico
- Erros são caros (pagamento, médico, legal)
- Sequência de ações é fixa

**Use agente quando:**
- Tarefa requer raciocínio em múltiplos passos
- Caminho não é predefinido
- Trade-off de qualidade > custo/latência
- Necessidade de escolher entre N ferramentas
- Output requer "compreensão" semântica

## Espectro: workflow → agente

```
Determinístico ←————————————————————————→ Autônomo
  Código     LLM call    Chain     Agent      Multi-agent
  puro       único       (LangChain) (LangGraph) (CrewAI)
```

Mais autonomia = mais qualidade potencial + mais imprevisibilidade + mais custo.

## Padrões (Anthropic — "Building Effective Agents")

### 1. Prompt chaining
Tarefa quebrada em sub-tarefas sequenciais com LLM em cada step.

```
[Input] → [LLM 1: extrair] → [LLM 2: validar] → [LLM 3: formatar] → [Output]
```

Quando usar: tarefa decomponível, qualidade premium importa, custo aceitável.

### 2. Routing
Classificador inicial decide qual LLM/handler usar.

```
[Input] → [Router (Haiku)] → [LLM especializado] → [Output]
```

Quando usar: queries variadas com requisitos diferentes.

### 3. Parallelization
Sub-tarefas independentes rodam em paralelo.

```
       → [LLM A] →
[Input]→ [LLM B] → [Aggregator] → [Output]
       → [LLM C] →
```

Quando usar: análise multi-dimensional (security + perf + style review).

### 4. Orchestrator-workers
LLM "manager" decompõe tarefa, delega pra workers, agrega.

```
[Input] → [Orchestrator]
             ↓
         [Worker 1] [Worker 2] [Worker 3]
             ↓        ↓         ↓
         [Aggregate Result]
```

Quando usar: tarefa complexa cuja decomposição não é óbvia.

### 5. Evaluator-optimizer
LLM gera, outro LLM avalia, loop até passar threshold.

```
[Input] → [Generator] → [Evaluator] → score < threshold? → loop
                                          ↓
                                      [Output]
```

Quando usar: qualidade premium, retry com feedback.

### 6. Autonomous agent
LLM com ferramentas decide o que fazer next até atingir goal.

```
[Goal] → [LLM] → [Tool call] → [Observe result] → [LLM decide next] → ...
```

Quando usar: tarefa aberta, sem caminho fixo, com tools bem definidas.

## Escolha de framework

| Framework | Quando |
|---|---|
| **Código direto** | Workflows simples, controle total |
| **LangChain** | Chains, basic agents, RAG |
| **LangGraph** | State machines, multi-agent, observability |
| **CrewAI** | Multi-agent role-based (CEO, analista, escritor) |
| **AutoGen** | Multi-agent com conversas |
| **Agno (Python)** | Agentes simples Python, leve |
| **Mastra (TypeScript)** | Agentes TypeScript com tools |

### Pro contexto Ryan
- **Tarefa única simples**: código direto + Anthropic SDK
- **Agente de chat**: LangGraph (state machine clara)
- **Multi-step com tools**: Mastra ou LangGraph TypeScript
- **Python isolado**: Agno

## Tool design

### Boas tools
- Schema claro (Zod ou similar)
- Descrição rica explicando QUANDO usar
- Output estruturado e previsível
- Idempotente (mesma input = mesmo output)

```typescript
const searchEvents = {
  name: 'search_events',
  description: `Search events by name or organization.
    Use when user asks about events, workshops, or webinars.
    NOT for searching users or registrations.`,
  parameters: z.object({
    query: z.string().describe('Search term, max 100 chars'),
    organization_id: z.string().uuid().optional(),
  }),
  handler: async ({ query, organization_id }) => {
    return await db.events.findMany({
      where: {
        AND: [
          { name: { contains: query } },
          organization_id ? { organization_id } : {},
        ],
      },
      take: 10,
    })
  },
}
```

### Princípios de tool
1. **Single responsibility** — uma tool, um propósito
2. **Clear naming** — `search_events` > `get_data`
3. **Strong typing** — Zod schemas
4. **Error handling** — retorna mensagem clara, não throw
5. **Idempotent quando possível**
6. **Side effects documentados**

## Limites de autonomia

Quanto mais autônomo, mais perigoso:

| Nível | Autonomia | Mitigação |
|---|---|---|
| 1 | Sugestões (humano executa) | Mostra preview |
| 2 | Tools read-only | OK pra produção |
| 3 | Tools write (criar, editar) | Audit log |
| 4 | Tools destrutivas (deletar) | Confirmação humana |
| 5 | Agente decide sozinho cada ação | Sandbox + budget cap |

**Regra**: começa nível 2-3. Promove só com evidência de qualidade.

## Human-in-the-loop

Pra ações sensíveis:

```typescript
const sendEmail = {
  // ...
  handler: async ({ to, body }) => {
    // Não executa direto — cria draft
    const draft = await createDraft({ to, body })
    await notifyHuman({
      message: `Email pendente: ${draft.id}`,
      approveUrl: `/admin/drafts/${draft.id}`,
    })
    return { status: 'pending_approval', draftId: draft.id }
  },
}
```

## Cost control

Agentes podem entrar em loop ou usar tokens demais.

### Hard limits
```typescript
const MAX_ITERATIONS = 10
const MAX_TOKENS = 50_000
const MAX_TOOL_CALLS = 20
const MAX_COST_USD = 0.50

let iterations = 0
let totalTokens = 0
let toolCalls = 0
let totalCost = 0

while (true) {
  iterations++
  if (iterations > MAX_ITERATIONS) throw new Error('iteration_limit')
  if (totalTokens > MAX_TOKENS) throw new Error('token_limit')
  if (totalCost > MAX_COST_USD) throw new Error('cost_limit')

  const response = await llm.call(...)
  totalTokens += response.usage.total
  totalCost += calculateCost(response)

  if (response.stop_reason === 'end_turn') break
  // ... handle tool calls
}
```

## Memory patterns

### Short-term (in-session)
- Mensagens do chat atual
- Tool call results recentes
- Cache em memória

### Long-term (cross-session)
- Conversation history (DB)
- User preferences
- Learned facts (RAG sobre memory)

### Pattern: Mem0 / LangMem
Sistema separado que decide o que vale memorizar:
- "User prefere respostas curtas"
- "User trabalha com escatologia bíblica"

## Observability pra agentes

### O que rastrear
- Goal/input do agente
- Cada LLM call (prompt, response, tokens)
- Cada tool call (input, output, latency)
- Decisões do agente
- Custo total da execução
- Sucesso/falha do goal

### Stack
- **Langfuse** — agent traces nativos
- **LangSmith** — se já usa LangChain/LangGraph
- **Sentry** — erros + performance

## Evals pra agentes

Sem evals, não dá pra confiar. Antes de produção:

### Test cases
- Goal típico → resultado esperado
- Edge cases (input vazio, malicioso, ambíguo)
- Robustness (mesma input, output similar?)

### Métricas
- Task success rate
- Goal completion accuracy
- Avg cost per task
- Avg latency
- Tool call efficiency (#calls per task)

### Ferramentas
- **Promptfoo** — eval framework
- **Braintrust** — observability + evals
- **DeepEval** — LLM evals em pytest

## Quando agente é OVER-engineering

- **Caminho determinístico**: tarefa tem só 1 jeito de fazer. Use código.
- **Volume alto + simples**: usar LLM puro com prompt caching.
- **Trade-off ruim**: cust + latência > ganho de qualidade.
- **Tarefa < 5 steps**: chain simples basta, sem state machine.

## Decisão final — agentic ou não

| Pergunta | Se SIM → agente faz sentido |
|---|---|
| Tem mais de 1 caminho válido pra resolver? | ✅ |
| Precisa decidir QUANDO usar cada ferramenta? | ✅ |
| Output requer raciocínio sobre output anterior? | ✅ |
| Falha de qualidade é tolerável (humano revisa)? | ✅ |
| Custo de $0.05-$0.50 por execução é aceitável? | ✅ |
| Latência > 5s é aceitável? | ✅ |

Se respondeu SIM em 4+ → agente vale.
Se respondeu SIM em 1-2 → workflow ou código direto.

## Anti-patterns

- "Agente pra tudo" — gimmick, qualidade pior que código
- Agent sem max_iterations (loop infinito)
- Agent com tools demais (confunde, perde foco)
- Sem evals (descobre problema em prod)
- Sem observability (debugging às cegas)
- Agente com permissões demais (excessive agency)
- Multi-agent pra problema que cabe em chain

## Checklist arquitetural

- [ ] Decidiu agente vs workflow vs código com critério
- [ ] Framework escolhido com razão
- [ ] Tools com schema Zod + descrição clara
- [ ] Limits configurados (iterations, tokens, cost)
- [ ] Human-in-the-loop em ações sensíveis
- [ ] Observability (Langfuse)
- [ ] Evals antes de produção
- [ ] Fallback se agente falha
- [ ] ADR documentando decisão

## Referências
- [Anthropic — Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [LangGraph docs](https://langchain-ai.github.io/langgraph/)
- [Mastra docs](https://mastra.ai/)
- [Agno docs](https://docs.agno.com/)
- [CrewAI docs](https://docs.crewai.com/)
- [Pragmatic Engineer — AI agents in production](https://newsletter.pragmaticengineer.com/p/ai-agents-2024)

