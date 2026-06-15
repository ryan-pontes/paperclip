---
name: lovable-mode
description: Pipeline obrigatório quando o objetivo é **produzir UI que NÃO pareça gerada por IA**
key: paperclipai/bundled/3node-skills/lovable-mode
recommendedForRoles:
- engineer
tags:
- lovable
- mode
---

# Skill: Lovable Mode — Design loop fechado com feedback visual

Pipeline obrigatório quando o objetivo é **produzir UI que NÃO pareça gerada por IA**. Replica o que Lovable, Vercel v0 e Claude Design fazem internamente: scrape refs reais → propor com restrição → implementar → screenshot → crítica visual → loop.

A diferença entre "design feito por IA" e "design feito por designer" não é talento da IA — é o **loop fechado de feedback visual**. Sem isso, o output diverge da intenção em ~80% das vezes.

---

## Quando invocar

- `@joao` ativado pra projeto novo
- Redesign de página/feature existente
- Qualquer prompt do Ryan que diga "não quero que pareça IA", "estilo Lovable", "premium", "Editorial", "distintivo"
- Antes de qualquer mockup gerado via `mcp-image`

---

## Pipeline (6 etapas, sequencial)

### Etapa 1 — Scrape de referências reais (OBRIGATÓRIO antes de propor qualquer coisa)

Antes de propor design, **ler 3-5 referências reais**. Em ordem de preferência:

1. **`~/.claude/refs/<categoria>/`** — biblioteca local curada (ver `~/.claude/refs/README.md`). Use `Read` no PNG (multimodal).
2. **WebFetch URLs específicas** quando o Ryan citar uma referência (ex: "estilo Linear", "tipo Resend")
3. **`mcp__21st-magic__21st_magic_component_inspiration`** pra componentes isolados
4. **`mcp__claude_ai_Canva__search-designs`** quando Canva conectado

**Mínimo 3 refs.** Se ainda não tem refs locais salvas, peça permissão ao Ryan pra criar uma base na pasta certa antes de prosseguir.

Pra cada ref, extrair em uma linha:
- Paleta dominante (3 cores)
- Tipografia (display + body)
- Composição (assimetria? grid? overlap?)
- Motion observável (hover states, transições)

Resultado: tabela com 3-5 linhas comparando refs. Esse é o substrato do qual a proposta nasce — nunca do zero.

---

### Etapa 2 — Anti-IA checklist (validação rigorosa, 40 regras)

Antes de propor, validar contra esse checklist. **Se a proposta tem QUALQUER item dessa lista, refaz.**

**Tipografia (8 regras):**
1. ❌ Inter, Roboto, Arial, system-ui, Helvetica, Open Sans, Lato, Nunito, Poppins, Montserrat
2. ❌ Mesma fonte para display e body (precisa ter pareamento)
3. ❌ Mais de 2 famílias na mesma tela
4. ❌ Mais de 3 pesos na mesma tela
5. ❌ Tracking padrão em headlines (precisa ajustar — negativo em large, positivo em small caps)
6. ❌ Title case automático em CTAs
7. ❌ Texto justificado em coluna estreita
8. ❌ Line-height 1.5 universal (varia por contexto)

**Cor (10 regras):**
9. ❌ Gradiente roxo→azul, roxo→rosa, ciano→verde
10. ❌ Mais de 1 cor de acento dominante
11. ❌ Acento "purple-500" do Tailwind padrão
12. ❌ Background pure white (#FFFFFF) — use off-white #FAFAF9 ou #F8F8F7
13. ❌ Background pure black (#000000) — use #0F0F11 ou #0A0A0C
14. ❌ Border #E5E7EB padrão Tailwind
15. ❌ Múltiplas cores semânticas brigando (success verde brilhante + warning amarelo brilhante + error vermelho brilhante na mesma tela)
16. ❌ Gradiente em texto (background-clip: text) sem justificativa editorial
17. ❌ Glow/shadow colorido em botão primary
18. ❌ Cores neon (cyan, magenta, lime, fluo)

**Composição (8 regras):**
19. ❌ Hero centralizado simétrico com h1 + subtitle + CTA + ilustração
20. ❌ Grid 3 colunas de cards iguais como elemento principal
21. ❌ Stats bar com 4 números grandes + label embaixo
22. ❌ Testimonial slider com aspas grandes
23. ❌ Pricing 3 colunas com "Most popular" highlighted no meio
24. ❌ FAQ accordion stack vertical
25. ❌ Footer mega com 5 colunas de links
26. ❌ Logo de marca + nav + CTA right alinhado no header (use algo mais ousado)

**Visual effects (8 regras):**
27. ❌ Glassmorphism (backdrop-blur + border branca semi-transparente)
28. ❌ Mesh gradient como background full-page
29. ❌ Partículas animadas (three.js, particles.js)
30. ❌ Floating elements pulsando infinitamente
31. ❌ Marquee de logos no header sem razão
32. ❌ Cursor follower (dot que segue o mouse)
33. ❌ Hover scale(1.05) com transition genérico em tudo
34. ❌ Box-shadow padrão (`0 4px 6px rgba(0,0,0,0.1)`)

**Copy/microcopy (6 regras):**
35. ❌ "Build faster", "Ship faster", "10x developer", "Game changer"
36. ❌ "Powered by AI" sem contexto específico
37. ❌ "Join thousands of users" sem provar
38. ❌ Lorem ipsum em mockups (use copy real do domínio)
39. ❌ CTAs genéricos: "Get started", "Try free", "Sign up"
40. ❌ Empty states com "No data yet" sem ação ou personalidade

**O teste mental:** Se um designer sênior olhasse a proposta por 3 segundos e dissesse "isso parece template", **refaz**.

---

### Etapa 3 — Proposta com restrição intencional

Apresentar ao Ryan **uma direção concreta** (não 3 opções). Formato:

```
Direção: [nome curto, ex: "Editorial Conversion", "Industrial Minimal"]

Inspirado em: ref1 + ref2 + ref3 (citar)
Tensão proposta: [X vs Y, ex: "denso vs respirável", "rígido vs orgânico"]

Paleta (3-4 cores):
- Base: #hex (background)
- Surface: #hex
- Acento ÚNICO: #hex (1 cor, dominante)
- Texto: #hex + muted

Tipografia (2 fontes):
- Display: [fonte distintiva] — [por que]
- Body: [fonte distintiva] — [por que]

Composição assinatura:
[1-2 frases descrevendo o que torna esse design memorável — assimetria, escala, contraste]

Motion:
[1-2 frases — durations + easings + onde aplica]

Anti-patterns evitados (3+):
[lista]

Refs: [arquivos consultados]
```

**Aguardar OK do Ryan antes de gerar mockup ou DESIGN.md.**

---

### Etapa 4 — DESIGN.md + mockups visuais

Após OK:

1. Escrever `docs/DESIGN.md` (seguir template do `@joao` em `~/.claude/agents/joao.md`)
2. Gerar 3-5 mockups via `mcp__mcp-image__generate_image` com preset `quality`. Prompts devem incluir:
   - Hex codes exatos
   - Nomes das fontes (com fallback indicado)
   - Composição assinatura (citar a tensão)
   - Componentes-chave (CTA, card, input)
   - Explicit anti-patterns no negative prompt ("no glassmorphism, no mesh gradient, no neon")

Se Gemini estiver com quota, salvar prompts no DESIGN.md e marcar "pendente geração" — não bloquear.

---

### Etapa 5 — Implementação (delegada ao @felipe)

`@joao` delega. NÃO codifica. Mas no prompt pro `@felipe` incluir:

> **Após implementar, rodar `npx playwright screenshot http://localhost:3000/<rota> /tmp/screenshot.png` (mobile + desktop) e voltar pro @joao com os caminhos.**

Sem isso o loop quebra.

---

### Etapa 6 — Crítica visual (LOOP FECHADO — diferencial Lovable)

Após `@felipe` mandar os screenshots:

1. `@joao` lê os PNGs via `Read` (multimodal)
2. Compara contra DESIGN.md ponto a ponto:
   - Paleta bate? (eyeball)
   - Tipografia carregou? (se não, fallback foi pra Arial — refaz)
   - Composição assinatura está presente? (não virou layout genérico)
   - Anti-patterns NÃO apareceram?
3. Re-roda anti-IA checklist (40 regras) contra o screenshot
4. Gera um diff em texto: "Diferenças entre DESIGN.md e implementação:"
   - Lista numerada de cada divergência com prioridade (Crítico/Importante/Polish)
   - Pra cada item: arquivo:linha + correção sugerida
5. Se há issues Críticos: delega de volta pro `@felipe` com diff. Loop até 3 iterações.
6. Se passa: aprova publicamente no chat. "Design implementado conforme DESIGN.md. Loop fechado."

**Esse loop é o que falta hoje.** É 80% do diferencial do Lovable.

---

## Ferramentas obrigatórias

| Ferramenta | Quando |
|---|---|
| `Read` multimodal (PNG) | Etapa 1 (refs locais) + Etapa 6 (screenshots) |
| `WebFetch` | Etapa 1 quando ref é URL pública |
| `mcp__21st-magic__21st_magic_component_inspiration` | Etapa 1 quando precisa componente isolado |
| `mcp__mcp-image__generate_image` | Etapa 4 (mockups) |
| `Bash` (playwright screenshot) | Etapa 6 (delegado ao @felipe) |
| `Write` | Etapas 3 e 4 (proposta + DESIGN.md) |

---

## Anti-pattern desta skill

- NÃO usar essa skill pra ajuste pontual de cor ou copy — é overkill
- NÃO pular a Etapa 1 (referências) por pressa — é a etapa que diferencia tudo
- NÃO aceitar "depois eu vejo o resultado" — o loop visual é **dentro da mesma sessão**

---

## Como o `@joao` invoca

No prompt do `@joao`, adicionar no topo: "Aplicar `~/.claude/skills/lovable-mode.md` integralmente. Não pular etapas."

Quando o Ryan disser "estilo Lovable", "premium", "Editorial", "não quero IA", a skill ativa automaticamente.

