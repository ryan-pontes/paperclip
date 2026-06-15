---
name: pql-playbook
description: Usado pelo `@cro`
key: paperclipai/bundled/3node-skills/pql-playbook
recommendedForRoles:
- product-manager
tags:
- pql
- playbook
---

# Skill: PQL Playbook (Product-Qualified Leads)

Usado pelo `@cro`. Identifica usuários do free tier com **alto sinal de compra** e ativa outreach personalizado. Pilar do Product-Led Sales (PLS).

## Definição

**PQL** = usuário que demonstrou comportamento que prediz conversão em paid.

Diferente de MQL (Marketing Qualified Lead, baseado em demografia/source) e SQL (Sales Qualified Lead, baseado em qualificação de SDR).

## Por que existe

Modelo PLG (Product-Led Growth) traz **alto volume** de free signups. Sem PQL:
- Sales talk com todos (caro)
- Ou ignora todos (perde conversão fácil)

PQL = filtro inteligente. Sales/automação foca onde tem chance real.

## Definindo critério PQL

### Step 1: identificar comportamentos preditores

Analisa cohort de usuários que **converteram pra paid**. O que fizeram **antes** de comprar?

```sql
-- Comportamentos comuns 30 dias antes da conversão
SELECT
  event_type,
  COUNT(DISTINCT participant_id) AS unique_users,
  COUNT(DISTINCT participant_id)::float / total.n AS pct_of_converted
FROM er_engagement_events e
JOIN conversions c ON c.participant_id = e.participant_id
  AND e.occurred_at BETWEEN c.converted_at - INTERVAL '30 days' AND c.converted_at,
(SELECT COUNT(DISTINCT participant_id) AS n FROM conversions) total
GROUP BY event_type, total.n
ORDER BY unique_users DESC;
```

### Step 2: define preditores fortes
Comportamentos correlacionados com conversão >2x da média.

Exemplo (Academia):
- 80% dos pagantes acessaram pelo menos 3 aulas grátis → forte preditor
- 60% dos pagantes mandaram pergunta no chat → médio preditor
- 90% dos pagantes assistiram > 50% de pelo menos 1 aula → forte preditor

### Step 3: combine em score

```typescript
function calculatePQLScore(user) {
  let score = 0

  if (user.classesWatched >= 3) score += 30
  if (user.completionRatePerClass > 0.5) score += 25
  if (user.chatMessagesSent >= 1) score += 15
  if (user.keywordsValidated >= 1) score += 20
  if (user.daysSinceSignup < 7 && user.activeToday) score += 10  // engagement timing

  return score
}

// PQL threshold
if (score >= 60) markAsPQL(user)
```

## PQL signals comuns

### Engagement signals
- **Frequência de uso** (logs por dia, semana)
- **Profundidade** (% do conteúdo consumido)
- **Adoção de features chave** (a "aha moment")
- **Tempo no produto** (não vanity, mas sustained engagement)

### Intent signals
- **Visitou página de pricing**
- **Clicou em CTA de upgrade**
- **Tentou usar feature paid (encontrou paywall)**
- **Viu modal "este recurso é Pro"**

### Account signals (B2B)
- **Múltiplos usuários da mesma org**
- **Convidou colega**
- **Domínio corporativo (vs gmail)**

### Negative signals (anti-PQL)
- Login único (drive-by)
- Email descartável
- Sem ativação após X dias
- Erro repetido (fricção)

## Tipos de PQL

### PQL "Hot"
Alto sinal + recente. Outreach em 24h.
- Score > 80
- Active hoje
- Visitou pricing ontem

**Ação**: WhatsApp/email pessoal de Ryan (alta conversão, mas só vale pra HOT)

### PQL "Warm"
Médio sinal, sustained.
- Score 60-79
- Active semanal

**Ação**: email sequence automatizada (drip)

### PQL "Nurture"
Sinal baixo mas curioso.
- Score 40-59

**Ação**: conteúdo relevante (newsletter, casos de uso)

## Playbook de outreach

### HOT lead — WhatsApp pessoal
```
Olá, [Nome]! Aqui é o Ryan da Academia.

Vi que você assistiu 4 aulas essa semana — muito bom!
Tô curioso pra entender se nosso curso tá te ajudando no que você esperava.

Posso te ligar 10 min hoje à tarde?
```

Taxa de resposta: 30-40% (alto sinal).
Conversão: 15-25% dos que respondem.

### WARM lead — email automatizado
```
Assunto: Vi que você tá curtindo a Academia, [Nome]

Olá, [Nome]!

Você assistiu [X aulas] e ficamos felizes. A maioria dos alunos que chegam
nesse ponto querem aprofundar com nosso curso completo.

Quer um link especial pra economizar R$ 20 no curso? Válido até [data].

→ [Garantir desconto]

Pr. Juliano
```

Conversão: 5-10%.

### NURTURE lead — newsletter
Email semanal com casos, conteúdo, sem hard sell.

## Implementação técnica

### Tabela de PQL
```sql
CREATE TABLE er_pql_scores (
  participant_id uuid NOT NULL REFERENCES er_participants(id),
  organization_id uuid NOT NULL,
  score int NOT NULL DEFAULT 0,
  tier text NOT NULL CHECK (tier IN ('cold', 'nurture', 'warm', 'hot')),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  signals jsonb,  -- detalhes do que pontuou
  PRIMARY KEY (participant_id, calculated_at)
);

CREATE INDEX idx_pql_recent ON er_pql_scores (organization_id, tier, calculated_at DESC);
```

### Job de cálculo (cron diário)
```typescript
async function calculatePQLs() {
  const users = await getActiveFreeUsers()

  for (const user of users) {
    const signals = await getSignals(user.id, last30Days)
    const score = calculateScore(signals)
    const tier = score >= 80 ? 'hot' : score >= 60 ? 'warm' : score >= 40 ? 'nurture' : 'cold'

    await supabase.from('er_pql_scores').insert({
      participant_id: user.id,
      organization_id: user.organization_id,
      score,
      tier,
      signals,
    })

    if (tier === 'hot') {
      await notifyRyan({ user, signals })  // Slack/email pessoal
    } else if (tier === 'warm' && !user.alreadyInDripSequence) {
      await enrollInDripSequence(user.id)
    }
  }
}
```

### Trigger de notificação ao Ryan
```typescript
async function notifyRyan({ user, signals }) {
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({
      text: `🔥 PQL HOT: ${user.name} (${user.email})\nSignals: ${JSON.stringify(signals)}\nWhatsApp: ${user.whatsapp}`,
    }),
  })
}
```

## Conversion playbook

### Hot lead acabou de chegar
1. **Ryan vê notificação em < 1h**
2. **Verifica perfil rápido**: nome, igreja, comportamento
3. **WhatsApp pessoal em < 24h**
4. **Se responder**: chamada de 15min ou demo direta
5. **Após chamada**: oferta personalizada com prazo
6. **Follow-up em 3 dias se não fechar**

### Conversão rate típica
- Hot → Demo: 25-40%
- Demo → Paid: 20-40%
- **Hot → Paid: 5-15%** (líquido)

Parece baixo, mas é **5-15x acima da média** de free → paid (1-2%).

## Métricas chave do PQL

| Métrica | Target |
|---|---|
| % free users que viram PQL | 5-15% |
| % PQL que viram customer | 15-25% (hot) |
| Time to conversion após HOT marker | < 14 dias |
| LTV de PQL vs MQL | PQL > MQL em 2-3x |
| CAC de PQL | < 30% do CAC de cold lead |

## Anti-patterns

### PQL definido por achismo
- ❌ "Quem assistir 5 aulas é PQL"
- ✅ "Quem assistir 5 aulas porque 70% dos pagantes fizeram isso"

### Score sem ação
- Score calculado mas ninguém faz outreach → métrica decorativa

### Outreach genérico em HOT
- "Olá, viu que você é nosso aluno? Quer comprar?" → desperdiça sinal
- Personaliza baseado em comportamento específico

### Threshold único pra tudo
- Mesma régua pra free user de 1 dia vs 1 mês → contexto importa

### Sem feedback loop
- Não revisita score baseado em conversões reais
- Score fica estagnado, perde precisão

## Decay de score

Sinal antigo vale menos que sinal recente:

```typescript
function decayedSignal(signal, daysAgo) {
  return signal * Math.pow(0.95, daysAgo)  // 5% decay por dia
}
```

Ou: só conta sinais dos últimos 7-30 dias.

## Pro contexto Ryan

### PQLs típicos da Academia
- HOT: Pastor que assistiu 3+ aulas e mandou pergunta substantiva
- WARM: Aluno regular do free que ainda não comprou
- NURTURE: Curioso que vê 1-2 aulas por semana

### Ações específicas
- HOT: WhatsApp do Ryan ou Pr. Juliano em pessoa
- WARM: Drip de 4-5 emails sobre como aprofundar conhecimento
- NURTURE: Newsletter semanal de devocional + caso de uso

## Checklist `@cro` ao montar PQL

- [ ] Identifica preditores via análise de quem converteu
- [ ] Define score (escala clara, 0-100)
- [ ] Tiers definidos (hot/warm/nurture)
- [ ] Ações por tier documentadas
- [ ] Job de cálculo automatizado
- [ ] Notificação pra HOT em < 1h
- [ ] Conversion rate por tier monitorada
- [ ] Revisita preditores trimestralmente

## Referências
- [OpenView — Product Qualified Leads](https://openviewpartners.com/blog/the-pql-product-qualified-lead/)
- [Reforge — Product-Led Sales](https://www.reforge.com/blog/product-led-sales)
- [Crossbeam — PQL definition](https://www.crossbeam.com/blog/what-is-product-qualified-lead/)
- [Wes Bush — Product-Led Growth](https://productled.com/)

