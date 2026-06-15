---
name: llm-architecture
description: Usado pelo `@cto` ao decidir como integrar LLMs em produtos
key: paperclipai/bundled/3node-skills/llm-architecture
recommendedForRoles:
- engineer
tags:
- llm
- architecture
---

# Skill: LLM Architecture (decisões de arquitetura com modelos)

Usado pelo `@cto` ao decidir como integrar LLMs em produtos. Cobre escolha de modelo, RAG vs fine-tuning, custo, observabilidade.

## Decisão 1: Qual modelo usar

### Família Claude (Anthropic)
| Modelo | Quando |
|---|---|
| **Claude Opus 4.7** | Tarefa complexa, raciocínio profundo, custo > velocidade |
| **Claude Sonnet 4.6** | Default — trade-off ideal entre custo, latência e qualidade |
| **Claude Haiku 4.5** | Tarefa simples, alta frequência, custo crítico |

### Família OpenAI
| Modelo | Quando |
|---|---|
| **GPT-5** (release oct/2025) | Comparable a Opus 4.x, mas tool calling top |
| **GPT-4o-mini** | Tarefas simples, baixo custo |
| **o1 / o3** | Raciocínio matemático, código complexo |

### Família Gemini (Google)
| Modelo | Quando |
|---|---|
| **Gemini 2.5 Pro** | Contexto grande (2M tokens), multimodal |
| **Gemini 2.5 Flash** | Velocidade + custo baixo, multimodal |

### Local / open-source
| Modelo | Quando |
|---|---|
| **Llama 3.3 70B** | Self-hosted, dado sensível, privacy |
| **Qwen 2.5 72B** | Bom em multilíngue (PT-BR forte) |
| **Mistral Large** | Europeu, GDPR-friendly |

### Decisão por critério

| Critério | Escolha primeira |
|---|---|
| Qualidade máxima | Opus 4.7 / GPT-5 |
| Custo crítico | Haiku / GPT-4o-mini |
| Latência crítica | Haiku / Gemini Flash |
| Contexto > 200k tokens | Gemini 2.5 Pro (2M) |
| Multimodal (visão + texto) | Gemini 2.5 / GPT-5 |
| Code generation | Claude Sonnet / GPT-5 |
| Tool calling robusto | Claude Sonnet / GPT-5 |
| Dado precisa ficar interno | Llama self-hosted |
| LGPD strict | Llama BR cloud ou Mistral EU |

## Decisão 2: RAG vs Fine-tuning vs Prompt Engineering

| Abordagem | Quando | Custo | Tempo |
|---|---|---|---|
| **Prompt engineering** | MVP, validação rápida | $ | dias |
| **RAG** | Conteúdo dinâmico, base atualizada (docs, FAQs) | $$ | semanas |
| **Fine-tuning** | Padrão específico, qualidade premium, escala | $$$ | meses |
| **Híbrido** | Production-grade | $$$ | meses |

### RAG architecture típica

```
[User query]
    ↓
[Embedding model]
    ↓
[Vector DB search] ← [Documentos indexados]
    ↓
[Top K results]
    ↓
[Construct prompt with context]
    ↓
[LLM generation]
    ↓
[Response]
```

### Stack RAG no contexto Ryan
- **Embeddings**: `text-embedding-3-large` (OpenAI) ou `voyage-3` (Anthropic)
- **Vector DB**: `pgvector` no Supabase (sem nova ferramenta)
- **LLM**: Claude Sonnet 4.6 (padrão)
- **Orchestration**: LangChain ou código direto

### Quando NÃO usar RAG
- Base estática que cabe no contexto (< 100k tokens)
- Performance crítica (RAG adiciona ~1s de latência)
- Resposta não depende de conhecimento factual específico

## Decisão 3: Estrutura de prompt

### System prompt longo (preferido)
- Coloca toda regra/role/exemplo no system message
- Cache de prompt ativo (Anthropic prompt caching, 90% desconto em cached tokens)
- User message só com a query

### Few-shot examples (quando útil)
- Tarefa estruturada (extração, classificação)
- 3-5 exemplos suficientes
- Mantém no system prompt (cacheável)

### Chain-of-thought
- Tarefa complexa de raciocínio
- `<thinking>` tags ou `Let's think step by step`
- Ver `prompt-reasoning.md`

## Decisão 4: Custo

### Custo de LLM em produção (estimativas 2025)

| Modelo | Input | Output |
|---|---|---|
| Claude Haiku 4.5 | $0.80/1M | $4/1M |
| Claude Sonnet 4.6 | $3/1M | $15/1M |
| Claude Opus 4.7 | $15/1M | $75/1M |
| GPT-4o-mini | $0.15/1M | $0.60/1M |
| GPT-5 | $15/1M (estimado) | $60/1M |
| Gemini 2.5 Flash | $0.075/1M | $0.30/1M |
| Gemini 2.5 Pro | $1.25/1M | $5/1M |

### Cálculo de custo por usuário

```
custo_por_request = (input_tokens × input_price) + (output_tokens × output_price)

Exemplo:
- Sonnet 4.6
- Input: 2000 tokens × $3/1M = $0.006
- Output: 500 tokens × $15/1M = $0.0075
- Total: ~$0.014 por request

Pra 1000 usuários × 10 req/dia × 30 dias = 300k requests/mês
Custo: 300k × $0.014 = $4.200/mês
```

### Otimizações de custo

1. **Prompt caching** (Anthropic) — system prompt em cache = 90% desconto
2. **Modelo menor pra subtarefas** — usa Haiku pra classificar, Sonnet pra responder
3. **Cache de resposta** — perguntas comuns retornam cache
4. **Limit `max_tokens`** — força resposta concisa
5. **Batch API** (OpenAI/Anthropic) — 50% desconto pra tarefas async (24h)
6. **Streaming** — UX melhor, mas mesmo custo

## Decisão 5: Latência

### Componentes da latência
1. **TTFT** (Time to First Token) — 200ms a 3s dependendo do modelo
2. **Throughput** — tokens/segundo
3. **Total** — TTFT + (output_tokens / throughput)

### Otimizações
- Streaming pra UX (usuário vê primeiro token rápido)
- Modelos menores (Haiku tem TTFT < 500ms)
- Self-hosted (latência local sem network)
- Edge LLM (Cloudflare Workers AI, Vercel AI SDK edge)
- Speculative decoding (Anthropic prompt prefix optimization)

## Decisão 6: Observability

Stack mínimo (ver `observability.md`):
- **Langfuse** ou **LangSmith** — tracing de LLM calls
- Captura: prompt, response, tokens, custo, latência, modelo, user_id
- Métricas: cost/user, latency P95, error rate, satisfaction score

```typescript
import { Langfuse } from 'langfuse'

const langfuse = new Langfuse({...})

const trace = langfuse.trace({ name: 'chat-response', userId })
const generation = trace.generation({
  name: 'claude-sonnet',
  model: 'claude-sonnet-4-6',
  input: messages,
})

const response = await anthropic.messages.create(...)

generation.end({
  output: response.content,
  usage: {
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
  },
})
```

## Decisão 7: Resiliência

### Fallback strategy
```typescript
async function llmCall(prompt: string) {
  try {
    return await primaryLLM(prompt)  // Claude Sonnet
  } catch (err) {
    if (isRateLimit(err)) await sleep(1000)
    try {
      return await secondaryLLM(prompt)  // GPT-4o
    } catch {
      return fallbackResponse()  // resposta cacheada ou error humano
    }
  }
}
```

### Circuit breaker
- Após N falhas consecutivas, desabilita LLM temporariamente
- Retorna resposta cacheada ou mensagem fallback
- Volta após X minutos

### Timeout
```typescript
const response = await Promise.race([
  llm.complete(prompt),
  timeout(30000),
])
```

## Decisão 8: Multi-model orchestration

Quando usar mais de um modelo:

### Router pattern
```
Query → Classifier (Haiku) → Decide qual modelo usar → Response
```

Exemplo: pergunta simples → Haiku. Pergunta complexa → Sonnet.

### Verifier pattern
```
Query → Modelo 1 (gera) → Modelo 2 (valida/melhora) → Response
```

Útil pra qualidade premium.

### Ensemble
```
Query → 3 modelos em paralelo → Voting/consensus → Response
```

Caro mas alta confiabilidade.

## Decisão 9: Privacy e compliance

### LGPD (Brasil)
- Dados pessoais NÃO devem ir pra LLM hosted (OpenAI/Anthropic) sem consentimento explícito
- Anthropic e OpenAI têm DPA disponível
- Opção: anonimizar antes de enviar
- Opção: self-host Llama no Brasil

### Pra Academia de Pregadores (público religioso)
- Email/nome do participante: ok mandar pra LLM se feature precisar
- Dados sensíveis (saúde, financeiro): não mandar, anonimizar
- Histórico de aulas/engagement: anonimizar (apenas ID)

## Anti-patterns

- Usar Opus pra tudo (caro sem ganho proporcional)
- Sem prompt caching (joga dinheiro fora)
- Sem `max_tokens` (custo imprevisível)
- Sem observability (debugging às cegas)
- Sem fallback (1 hora de downtime do OpenAI = feature quebrada)
- Fine-tuning prematuro (otimiza antes de saber o que otimizar)
- RAG sem evals (chunks ruins, embeddings ruins, mas ninguém percebe)
- LLM em fluxo crítico sem human-in-the-loop

## Checklist arquitetural

- [ ] Modelo escolhido com razão clara (não default)
- [ ] Custo por usuário estimado
- [ ] Prompt caching ativado se Anthropic
- [ ] `max_tokens` setado em todas as chamadas
- [ ] Timeout configurado
- [ ] Fallback definido
- [ ] Observability (Langfuse/LangSmith) configurado
- [ ] LGPD compliance verificado
- [ ] Custo de feature documentado no ADR

## Referências
- [Anthropic Models](https://docs.anthropic.com/en/docs/about-claude/models)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Pragmatic Engineer — Building with AI](https://newsletter.pragmaticengineer.com/)
- [LangChain — RAG](https://python.langchain.com/docs/use_cases/question_answering/)

