---
name: continuous-discovery
description: Usado pelo `@cpo`
key: paperclipai/bundled/3node-skills/continuous-discovery
recommendedForRoles:
- product-manager
tags:
- continuous
- discovery
---

# Skill: Continuous Discovery (Teresa Torres aplicado)

Usado pelo `@cpo`. Cadência de discovery — pesquisar com usuário **semanalmente** em vez de "esperar tudo ficar claro" antes de codar.

## Princípio central

Ryan opera no escuro se só ouve usuário quando lança. Continuous Discovery: **toda semana**, fala com 2-3 usuários. Atualiza modelo mental do produto.

## A cadência semanal

```
SEG: planejamento da semana — quem entrevistar, sobre que tópico
TER-QUI: 2-3 entrevistas de 20-30min
SEX: síntese — atualiza Opportunity Solution Tree
```

Não precisa ser usuário pago. Pode ser:
- Inscrito (não-conversor)
- Aluno ativo
- Aluno churned
- Lead que abandonou
- Pessoa do mercado (pastor, líder, etc)

## Opportunity Solution Tree (OST)

Estrutura central da metodologia. Visualiza:

```
                    [OUTCOME]
                  (métrica que importa)
                        |
       ----------------------------------
       |               |                |
  [OPP 1]         [OPP 2]          [OPP 3]
  (need)          (need)            (need)
       |               |                |
   [Sol A] [Sol B]  [Sol C]      [Sol D] [Sol E]
       |                                    |
   [Test 1]                              [Test 2]
```

### Elementos
- **Outcome**: KR ou North Star (ex: "% alunos que terminam curso: 25% → 40%")
- **Opportunity**: necessidade não atendida do usuário, em formato job-like
- **Solution**: ideia que pode resolver a opportunity
- **Test**: assumption mais arriscada, como testar barato

### Como construir
1. Define outcome do trimestre
2. Cada entrevista identifica 1-3 oportunidades novas
3. Pra cada opportunity, brainstorm de 3-5 soluções
4. Pra cada solução crítica, identifica 1-2 assumptions arriscadas
5. Roda assumption tests rápidos antes de codar

## Tipos de entrevista

### Discovery (encontrar oportunidades)
- **Quem**: usuário recente do produto OU lead recente
- **Tempo**: 20-30 min
- **Foco**: jornada, atritos, motivações
- **Perguntas exemplo**:
  - "Conte sobre a última vez que [tentou X]"
  - "O que estava acontecendo antes?"
  - "Por que isso foi um problema?"
  - "Como você resolveu (sem nosso produto)?"

### Assumption testing (validar hipóteses)
- **Quem**: usuário típico do segmento
- **Tempo**: 15-20 min
- **Foco**: testar hipótese específica
- **Perguntas**: depende da hipótese
- **Exemplo**: "Mostro 2 mockups de player de aula com features X e Y. Qual prefere e por quê?"

### Concept testing (validar solução)
- **Quem**: usuário fit pra solução
- **Tempo**: 30 min
- **Foco**: reação à solução proposta
- **Perguntas**: "Se isso existisse, você usaria?" + por quê

## Anti-patterns em entrevista

### Perguntas hipotéticas
- ❌ "Você usaria uma feature de X?" → todo mundo diz sim
- ✅ "Quando foi a última vez que precisou de X?" → realidade

### Perguntas sugestivas
- ❌ "Você não acha que seria útil X?" → confirma o que quer ouvir
- ✅ "Como você resolve isso hoje?" → revela comportamento real

### Generalizações
- ❌ "Como você geralmente faz?" → respostas vagas
- ✅ "Me conte sobre a última vez específica" → detalhe real

### Falar mais que o usuário
- Regra 80/20: usuário fala 80%, você 20%
- Pause depois de pergunta — deixa silêncio trabalhar

## Síntese semanal

Sexta-feira:
1. Lê notas das entrevistas
2. Marca **citações fortes** (frases que revelam emoção/problema)
3. Identifica **opportunities novas** (necessidades não-atendidas)
4. Atualiza **OST** (adiciona, refina, descarta)
5. Decide **próximos testes** pra semana seguinte

### Template de síntese

```markdown
# Discovery — Semana de [data]

## Entrevistas
- [Nome 1] (perfil) — [tópico]
- [Nome 2] (perfil) — [tópico]

## Top quotes
- "[citação 1]" — [contexto]
- "[citação 2]" — [contexto]

## Opportunities novas
1. **[Nome curto]**: [descrição]
   - Evidência: [fonte]
   - Frequência: alta/média/baixa
   - Severidade pra usuário: alta/média/baixa

## Opportunities descartadas/refinadas
- [O que mudou e por quê]

## OST update
- [link/arquivo]

## Próximos testes
1. [Hipótese] — [como testar]
2. [Hipótese] — [como testar]
```

## Assumption testing rápido

Antes de construir feature, identifica assumption mais arriscada:

### Categorias de assumption
- **Desirability** (usuário quer?)
- **Viability** (faz sentido pro negócio?)
- **Feasibility** (dá pra construir?)
- **Usability** (consegue usar?)
- **Ethical** (deveríamos construir?)

### Métodos de teste rápido

| Assumption | Método rápido |
|---|---|
| Desirability | Landing page com "wait list" → mede signup rate |
| Desirability | Wizard of Oz (humano simula feature) |
| Viability | Cálculo de unit economics |
| Feasibility | Spike técnico de 1-2 dias |
| Usability | Prototype no Figma + 3 user tests |

### Exemplo
**Hipótese**: alunos vão usar feature de "anotações exportáveis pra sermão".

**Assumption mais arriscada**: querem **exportar** (vs só fazer anotação interna).

**Teste**: adiciona botão "Exportar minhas anotações" que mostra "Coming soon" + pesquisa "por que quer exportar?". Mede clicks + qualitativo em 7 dias.

**Decisão**: se >20% dos usuários ativos clicam, vale priorizar.

## Como `@cpo` aplica no PRD

Antes de fechar PRD:

1. **Identifica opportunity** (do OST)
2. **Documenta assumptions arriscadas**
3. **Define teste rápido pra cada uma**
4. **Roda testes ANTES de @edu fazer schema**
5. **PRD final só com assumptions testadas**

Resultado: features que `@felipe` constrói têm evidência de demanda.

## Cadência por estágio

### Pre-PMF (Ryan agora?)
- 5+ entrevistas/semana
- Foco: encontrar PMF
- Pivot rápido se sinal forte

### Search (achando PMF mas otimizando)
- 2-3 entrevistas/semana
- Foco: refinar value prop, ICP

### Growth (PMF claro, escalando)
- 1-2 entrevistas/semana
- Foco: expansão, retenção, novos segmentos

### Mature
- Discovery distribuído (analytics + algumas entrevistas)
- Foco: incrementais, edge cases

## Recrutamento de entrevistados

### Fontes
- Lista de inscritos novos (último mês)
- Pesquisa NPS — perguntar "podemos conversar?"
- LinkedIn (cold outreach polido)
- Comunidade do produto (Discord, WhatsApp group)
- Indicação de aluno atual

### Incentivo
- R$ 50 voucher ou desconto no curso
- Acesso antecipado a feature nova
- Tempo bem usado (30min max)

### Templates de outreach

```
Olá, [Nome]!

Sou o Ryan, da Academia de Pregadores. Vi que você se inscreveu recentemente
no nosso curso de Daniel. Posso te tomar 20 minutos esta semana pra entender
melhor o que te levou a se inscrever?

Não é venda — é só pra aprender com você como podemos melhorar o curso pra
quem vem depois. Como agradecimento, te mando R$ 50 de voucher.

[Link de calendário]

Obrigado!
```

## Anti-patterns de discovery

- Só falar com fãs (viés de sobrevivência)
- Só falar com novos (perde contexto de longo prazo)
- Pular semanas (perde cadência)
- Entrevistar sem hipótese (vira chat)
- Não sintetizar (perde aprendizado)
- Não atualizar OST (notas viram lixo)
- Construir antes de testar assumption arriscada

## Checklist semanal `@cpo`

- [ ] 2-3 entrevistas agendadas
- [ ] Hipóteses claras pra cada uma
- [ ] Notas estruturadas
- [ ] Sínteses sexta-feira
- [ ] OST atualizado
- [ ] Próximos testes definidos

## Templates

### Discovery interview script

```
1. Apresentação (1min)
   "Sou o Ryan. Estou aprendendo como pessoas como você pensam sobre [tema].
   Vou fazer perguntas. Não tem resposta certa ou errada. Pode ser honesto."

2. Background (3min)
   - "Conte um pouco sobre você (papel, contexto)"
   - "Há quanto tempo trabalha com [área]?"

3. Jornada (15min)
   - "Conte sobre a última vez que [tarefa relevante]"
   - "O que aconteceu antes?"
   - "O que aconteceu depois?"
   - "O que foi mais difícil?"
   - "O que funcionou bem?"

4. Status quo (5min)
   - "Como você faz isso hoje?"
   - "Que ferramentas usa?"
   - "Que parte odeia?"

5. Wrap (1min)
   - "Tem algo que eu deveria ter perguntado mas não perguntei?"
   - "Posso voltar se tiver mais perguntas?"
```

## Referências
- [Teresa Torres — Continuous Discovery Habits](https://www.amazon.com/dp/1736633309) (livro)
- [Product Talk blog](https://www.producttalk.org/)
- [Marty Cagan / SVPG — Discovery](https://www.svpg.com/category/product-discovery/)
- [The Mom Test — Rob Fitzpatrick](https://www.momtestbook.com/) (como entrevistar bem)

