---
name: jtbd
description: Antes de escrever feature no PRD, entender o **job** que o usuário tá tentando completar
key: paperclipai/bundled/3node-skills/jtbd
recommendedForRoles:
- engineer
tags:
- jtbd
---

# Skill: Jobs to Be Done (extração e aplicação)

Antes de escrever feature no PRD, entender o **job** que o usuário tá tentando completar. Usado pelo `@nic` no início de todo projeto/feature.

## Core insight

Usuário não "compra produto" — **contrata o produto pra fazer um job**. Mesmo job pode ter múltiplas soluções (concorrentes).

Exemplo clássico (Clayton Christensen):
- Pessoa "contrata" milkshake no café da manhã pra **matar o tédio + saciar a fome no trânsito + não sujar carro**.
- Concorrentes: banana, donut, café. Não outros milkshakes.

## Job Story format

Estrutura padrão:

```
Quando [SITUAÇÃO + GATILHO]
Quero [MOTIVAÇÃO]
Pra [RESULTADO ESPERADO]
```

Exemplo (Academia de Pregadores):
- **Quando** preparo o sermão de domingo numa quinta à noite,
- **Quero** revisar rapidamente os pontos chave da última aula que assisti,
- **Pra** evitar errar interpretação na pregação.

## Três tipos de jobs

| Tipo | O que é | Exemplo |
|---|---|---|
| **Functional** | Tarefa prática | "Preparar sermão pra domingo" |
| **Emotional** | Como se sentir | "Não me sentir inseguro pregando escatologia" |
| **Social** | Como ser percebido | "Ser visto como pastor estudioso na minha igreja" |

**Insight chave**: feature de sucesso resolve os 3 tipos juntos. Aulas em vídeo resolvem functional. Material didático impresso adiciona emotional. Certificado adiciona social.

## Como `@nic` extrai JTBD

### Perguntas pra usuário/Ryan

#### Functional
- "O que você estava fazendo antes de buscar [solução]?"
- "Como você resolve isso hoje (sem nosso produto)?"
- "Qual o resultado prático que precisa?"

#### Emotional
- "Como você se sente fazendo isso hoje?"
- "Como gostaria de se sentir?"
- "Que ansiedade some quando você resolve isso?"

#### Social
- "Como você quer ser visto pelos outros quando fizer isso?"
- "Quem mais vê o resultado do seu trabalho?"

### Forças de progresso (Bob Moesta)

4 forças que movem decisão:

| Força | Direção | Exemplo |
|---|---|---|
| **Push** (do velho) | Empurra pra fora do status quo | "Tô cansado de preparar sermão no Google" |
| **Pull** (pro novo) | Atrai pra solução | "Curso estruturado por pastor referência" |
| **Anxiety** (medo) | Bloqueia mudança | "E se o curso não for bom?" |
| **Inertia** (acomodação) | Mantém status quo | "Já sei usar Google, dá conta" |

**Pra produto vencer**: Push + Pull > Anxiety + Inertia.

### Como mapear forças

Em entrevista de discovery:
- "Quando você começou a procurar uma solução?" → identifica Push
- "O que te atraiu nesse curso?" → identifica Pull
- "Que dúvida você teve antes de comprar?" → identifica Anxiety
- "Por que demorou pra decidir?" → identifica Inertia

## Aplicação no PRD

### Antes (PRD sem JTBD)
```
## Feature: Player de vídeo
- Reproduz vídeo
- Pause/play
- Velocidade variável
```

### Depois (PRD com JTBD)
```
## JTBD principal
Quando preparo sermão à noite cansado,
Quero revisar partes específicas da aula sem assistir tudo,
Pra absorver insights chave em 20 minutos.

## Feature: Player de vídeo
- Reproduz vídeo
- **Pause/play + velocidade variável** (resolve "preciso ir rápido")
- **Marcadores de capítulo** (resolve "não quero assistir tudo")
- **Anotações exportáveis** (resolve "preciso registrar pra sermão")
```

Cada feature **deriva** do JTBD. Sem JTBD, feature pode ser tecnicamente correta mas não atende o job.

## Opportunity Solution Tree (Teresa Torres)

Estrutura visual:

```
                    OUTCOME (KR)
                         |
            -------------------------
            |          |            |
       OPPORTUNITY  OPPORTUNITY  OPPORTUNITY
            |          |            |
      ----------   ---------    ---------
      |   |    |   |   |   |    |   |   |
     SOL SOL  SOL  S   S   S    S   S   S
```

- **Outcome**: métrica que importa (NSM, KR)
- **Opportunity**: necessidade não atendida (= job)
- **Solution**: feature/experiment que testa solução

Vantagem: força a considerar múltiplas oportunidades antes de pular pra solução.

## Anti-patterns

### "Feature first" — pular do problema pra solução
- ❌ "Vamos fazer um app de chat"
- ✅ "Qual o job? Discussão entre alunos? Pergunta ao professor? Networking?"

### JTBD genérico
- ❌ "Quero aprender Bíblia"
- ✅ "Quero estudar Daniel em 2 dias pra pregar no próximo domingo"

### Confundir solução com job
- ❌ Job: "quero um app mobile"
- ✅ Job: "quero acessar aulas no ônibus"

### Múltiplos jobs misturados
- ❌ "Quero aprender, ensinar e conectar com pastores"
- ✅ Separa em 3 jobs → 3 features distintas

## Templates de entrevista de discovery

### Pré-compra
1. "O que te fez começar a procurar uma solução?"
2. "O que você usou pra resolver antes?"
3. "Como você descobriu nosso produto?"
4. "Que outras opções você considerou?"
5. "O que te fez escolher essa?"

### Pós-uso (semana 1)
1. "Quando você usou a primeira vez?"
2. "Qual foi a primeira ação que fez?"
3. "Encontrou alguma fricção?"
4. "Que valor já obteve?"
5. "Que job você esperava resolver?"

### Churned users
1. "Por que parou de usar?"
2. "O que voltou a fazer no lugar?"
3. "Em que ponto começou a perder interesse?"
4. "O que precisaria mudar pra voltar?"

## Outcome > Output

Ao escrever features no PRD, sempre amarrar a outcome:

| Feature (output) | Outcome esperado |
|---|---|
| Marcadores de capítulo | +20% revisão antes de sermão |
| Anotações exportáveis | +15% aderência ao curso |
| Notificação WhatsApp | +30% taxa de presença |

Sem outcome esperado, feature vira "agradar quem reclama mais alto".

## JTBD ≠ User story

- **User story**: "Como [persona], quero [feature], pra [benefício]"
- **JTBD**: "Quando [situação], quero [motivação], pra [resultado]"

Diferença: JTBD foca em **circunstância** (quando/onde/por quê), user story foca em **persona** (quem).

User story é tática (escrever no backlog). JTBD é estratégico (entender o que construir).

## Checklist `@nic` antes de fechar PRD

- [ ] JTBD principal identificado (job story formatado)
- [ ] Tipos cobertos (functional + emotional + social)
- [ ] Forças de progresso mapeadas
- [ ] Cada feature deriva de um job
- [ ] Outcome esperado por feature
- [ ] Anti-jobs identificados (o que NÃO resolvemos)
- [ ] Substitutos atuais documentados

## Referências
- [Bob Moesta — Demand-Side Sales 101](https://www.amazon.com/dp/1544509987)
- [Teresa Torres — Continuous Discovery Habits](https://www.producttalk.org/continuous-discovery-habits/)
- [Tony Ulwick — Jobs To Be Done](https://strategyn.com/jobs-to-be-done/)
- [Clayton Christensen — Competing Against Luck](https://www.amazon.com/dp/0062435612)

