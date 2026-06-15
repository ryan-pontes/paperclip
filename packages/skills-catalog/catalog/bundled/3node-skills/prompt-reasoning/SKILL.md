---
name: prompt-reasoning
description: Eleva qualidade de raciocínio em prompts complexos
key: paperclipai/bundled/3node-skills/prompt-reasoning
recommendedForRoles:
- engineer
tags:
- prompt
- reasoning
---

# Skill: Prompt Reasoning (CoT explícito + extended thinking)

Eleva qualidade de raciocínio em prompts complexos. Usada pelo `@ju` ao criar agentes, especialmente os de **análise** (`@qa`, `@sec`, `@reviewer`, `@edu`).

## Conceitos

### Chain-of-Thought (CoT)
Modelo "pensa em voz alta" antes de responder. Melhora drasticamente raciocínio em tarefas complexas.

### Extended Thinking (Claude 3.7+ / 4.x)
Bloco `<thinking>` que NÃO conta no output final mas guia raciocínio. Modelos com extended thinking budget têm tokens dedicados pra raciocínio interno.

## Quando usar CoT explícito

| Tarefa | Usar CoT? |
|---|---|
| Análise de código complexo | ✅ Sim |
| Auditoria de segurança | ✅ Sim |
| Code review (decisão técnica) | ✅ Sim |
| Decisão arquitetural | ✅ Sim |
| Resposta simples/categórica | ❌ Não — adiciona ruído |
| Output estruturado JSON | ❌ Não — quebra parsing |
| Microtarefas (extrair campo) | ❌ Não — overhead |

## Padrões pra adicionar em agentes

### Pattern 1 — `<thinking>` antes da resposta final

Em system prompt de agente analítico:

```
## Processo de raciocínio

Antes de responder, use o bloco <thinking> pra:
1. Identificar o que tá sendo perguntado
2. Listar evidências relevantes que você viu
3. Considerar 2-3 interpretações possíveis
4. Decidir qual interpretação tem mais suporte
5. Identificar incertezas

Depois do <thinking>, escreva sua resposta final clara e direta.

Exemplo:

<thinking>
O usuário pergunta se a RLS dessa tabela está correta. Olhando o código:
- Policy existe pra SELECT em authenticated
- Usa `auth.uid() = user_id` mas a tabela tem `organization_id`
- Em multi-tenant, isso permite que user veja dado de outra org se for o "owner"
- Falta filtro `organization_id = current_org()`

Conclusão: RLS incompleta. Vulnerável a vazamento cross-tenant.
</thinking>

A RLS dessa tabela tem um buraco de multi-tenant: ...
```

### Pattern 2 — Decompose-then-solve

Pra problemas grandes:

```
## Processo

1. **Decompose**: divida o problema em sub-problemas independentes
2. **Solve each**: resolva cada um separadamente
3. **Synthesize**: combine as soluções

Use <thinking> em cada etapa.
```

### Pattern 3 — Considerar alternativas explicitamente

Pra decisões técnicas:

```
Antes de responder, considere PELO MENOS 2 alternativas:

<thinking>
Opção A: [descrição] — Prós: ... Contras: ...
Opção B: [descrição] — Prós: ... Contras: ...

Decisão: Opção [X] porque [razão principal].
</thinking>

Resposta: ...
```

### Pattern 4 — Self-critique

Pra outputs complexos (revisão de código, análise):

```
Após escrever sua resposta inicial, releia em <thinking> e procure:
- Argumentos circulares
- Premissas não verificadas
- Casos não considerados
- Linguagem vaga

Refine antes de finalizar.
```

## Extended thinking budget (Claude 4.x)

Em API direto:
```python
response = anthropic.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    thinking={
        "type": "enabled",
        "budget_tokens": 8000  # tokens dedicados pra raciocínio
    },
    messages=[...]
)
```

| Budget | Quando usar |
|---|---|
| 0 (padrão) | Tarefa simples, resposta direta |
| 2000 | Análise leve, code review pequeno |
| 8000 | Análise profunda, decisão arquitetural |
| 16000+ | Reasoning extremo (pesquisa, matemática) |

**Custo**: tokens de thinking contam pra billing, mas não pra output.

## Como `@ju` aplica nos agentes existentes

### `@sec` (Security Auditor)
Adiciona: `<thinking>` obrigatório em cada finding pra:
1. Identificar a vulnerabilidade
2. Verificar exploitabilidade
3. Considerar mitigações alternativas
4. Decidir severidade

### `@qa` (Quality Assurance)
Adiciona: `<thinking>` antes de cada validação pra:
1. Mapear critério PRD vs implementação
2. Identificar gaps
3. Determinar severidade

### `@reviewer` (Code Review)
Adiciona: `<thinking>` antes de cada finding pra:
1. Entender intenção do código
2. Considerar contexto/constraints
3. Avaliar trade-offs (não só "tá errado")

### `@edu` (Architect)
Adiciona: `<thinking>` antes de cada decisão pra:
1. Listar opções (≥2)
2. Avaliar contra restrições
3. Documentar trade-off escolhido (alimenta ADR)

## Patterns que NÃO funcionam

- **CoT em resposta JSON estruturada** — quebra parsing
- **`<thinking>` em saída pra usuário final** — confuso
- **CoT em tarefa simples** — overhead sem ganho
- **`<thinking>` sem prompt explícito** — modelo pode ignorar

## Anti-pattern: "Pensa passo a passo"

Em 2024-2025, o "let's think step by step" original do paper do Kojima virou ruído sem estrutura.

**Errado**:
```
Think step by step before answering.
```

**Certo**:
```
Use <thinking> tags pra:
1. Identificar X
2. Considerar Y
3. Decidir Z

Use a estrutura, não só a instrução vaga.
```

## Validação

Pra cada agente que `@ju` cria/melhora, verificar:

- [ ] CoT explícito (`<thinking>` ou equivalente) onde aplicável
- [ ] Decompose-then-solve em problemas grandes
- [ ] Alternativas consideradas explicitamente em decisões
- [ ] Self-critique em outputs longos
- [ ] Extended thinking budget configurado se via API

## Exemplos antes/depois

### Antes
```
Você é um security auditor. Encontre vulnerabilidades no código.
```

### Depois
```
Você é um security auditor.

## Processo de análise

Pra cada arquivo/feature, use <thinking> antes de reportar:

<thinking>
1. O que esse código faz?
2. Quais inputs vêm de fora (user, API, DB)?
3. Quais saídas vão pra fora (HTML, SQL, fetch)?
4. Quais boundaries de trust são cruzados?
5. Que vulnerabilidades clássicas se aplicam aqui?
6. Pra cada candidata, ela é explorável dado o contexto?
</thinking>

Depois do thinking, reporte findings no formato:
[severidade]: [resumo] em [arquivo:linha]
Why: [explicação]
Fix: [correção]
```

Ganho típico: 30-50% menos falso positivo, descobertas mais profundas.

## Referências
- [Anthropic — Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Anthropic Extended Thinking docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Chain-of-Thought Prompting paper](https://arxiv.org/abs/2201.11903)
- [Self-Refine paper](https://arxiv.org/abs/2303.17651)

