---
name: usage-based-pricing
description: Usado pelo `@cfo` ao modelar pricing pra features de IA ou produtos com consumo variável
key: paperclipai/bundled/3node-skills/usage-based-pricing
recommendedForRoles:
- engineer
tags:
- usage
- based
- pricing
---

# Skill: Usage-Based Pricing (UBP)

Usado pelo `@cfo` ao modelar pricing pra features de IA ou produtos com consumo variável. Modelo cresceu de 38% pra 61% dos SaaS B2B em 2024 (OpenView Partners).

## Quando UBP faz sentido

| Característica | UBP vence |
|---|---|
| Custo varia muito por usuário (LLM tokens) | ✅ |
| Valor entregue é variável (mensagens, créditos) | ✅ |
| Usuário tem incentivo pra economizar | ✅ |
| Receita escala com sucesso do cliente | ✅ |
| Fricção de upgrade é alta | ❌ Use flat |
| Cliente quer previsibilidade total | ❌ Use flat |

## Modelos de UBP

### 1. Pay-as-you-go puro
Cobra por uso, sem comprometimento.
- Ex: $0.10 por mensagem enviada
- Pro: zero fricção pra começar
- Contra: receita imprevisível

### 2. Créditos pré-pagos
Cliente compra pacote de créditos.
- Ex: 1000 créditos por R$ 50
- Pro: receita upfront, força commitment
- Contra: créditos não consumidos viram passivo contábil

### 3. Subscription + uso (híbrido) ⭐ mais comum
Mensalidade base + cobra excedente.
- Ex: R$ 99/mês com 500 chamadas inclusas, R$ 0.20 por chamada extra
- Pro: previsibilidade base + upside
- Contra: complexidade de billing

### 4. Tiered subscription com limites
Plano fixo com limites por tier.
- Ex: Free 100/mês, Pro 1000/mês, Business 10000/mês
- Pro: simples, previsível
- Contra: cliente pune limite, pode forçar overprovisioning

### 5. Cost-plus
Custo real + margem.
- Ex: tokens × 2.5x do custo da OpenAI
- Pro: cobre custo sempre
- Contra: cliente percebe "estamos cobrando demais"

## Modelando UBP pro contexto Ryan

### Cenário: feature de IA "Sugestão de sermão" na Academia
- Custo OpenAI: ~$0.05 por geração
- Margem alvo: 60%
- Preço: $0.125 por geração (= R$ 0.65)

### Planos sugeridos
| Plano | Mensalidade | Inclusos | Excedente |
|---|---|---|---|
| Free | R$ 0 | 3 gerações/mês | — |
| Pastor | R$ 29 | 30 gerações/mês | R$ 1.50/geração |
| Igreja | R$ 99 | 200 gerações/mês | R$ 0.80/geração |

### Por que 3 tiers
- Free: aquisição
- Pastor: maioria dos pastores individuais
- Igreja: equipe pastoral compartilhada

## Cálculo de unit economics em UBP

### Variáveis chave
- **COGS variável**: custo direto por uso (tokens LLM, storage, bandwidth)
- **Take rate**: % do preço que vira margem bruta
- **Avg usage per customer**: uso médio
- **Distribuição de uso**: % de heavy users vs light users

### Exemplo
```
Plano Pastor R$ 29/mês com 30 gerações inclusas
Custo OpenAI: $0.05/geração = R$ 0.26
Custo de 30 gerações: 30 × R$ 0.26 = R$ 7.80
Margem bruta: R$ 29 - R$ 7.80 = R$ 21.20 (73% margin) ✅
```

### Edge case: heavy user
```
Cliente usa 100 gerações (limite 30 + 70 extras)
Cobra: R$ 29 + 70 × R$ 1.50 = R$ 134
Custo: 100 × R$ 0.26 = R$ 26
Margem: R$ 108 (81% margin) ✅
```

### Edge case: light user
```
Cliente usa 5 gerações (no limite)
Cobra: R$ 29
Custo: 5 × R$ 0.26 = R$ 1.30
Margem: R$ 27.70 (95% margin) ⭐
```

**Light users financiam heavy users**. Pricing saudável.

## Como decidir tier de inclusos

### Curva de uso típica
- 80% dos usuários: light (5-10% do limite)
- 15%: médio (50-70% do limite)
- 5%: heavy (acima do limite, pagam excedente)

### Setar limite no P90 da distribuição
- P50 (mediana) — muitos usuários atingem
- P75 — alguns usuários atingem
- P90 — 10% atingem (pagam excedente) ⭐
- P99 — quase ninguém atinge (sem upside)

## Metered billing — implementação técnica

### Eventos a contar
- Definir evento cobrável claro (1 geração = 1 evento)
- Idempotency key pra não duplicar
- Logged com timestamp + customer + cost

### Stripe metered billing
```typescript
// Setup
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [
    { price: 'price_base_pastor' },          // R$ 29/mês fixo
    { price: 'price_excedente_geracao' },    // metered
  ],
})

// Em cada uso
await stripe.subscriptionItems.createUsageRecord(
  itemId,
  {
    quantity: 1,
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment',
  }
)
```

### Asaas (Brasil) — não tem metered billing nativo
Solução: tracking em `er_usage_events` no Supabase, gerar boleto/PIX mensal manual ou via integration.

```sql
CREATE TABLE er_usage_events (
  id uuid primary key,
  customer_id uuid not null,
  event_type text not null,
  quantity int not null,
  unit_cost_cents int not null,
  occurred_at timestamptz default now()
);

-- Fim do mês: gerar fatura
SELECT
  customer_id,
  SUM(quantity * unit_cost_cents) AS total_cents
FROM er_usage_events
WHERE occurred_at >= date_trunc('month', NOW())
GROUP BY customer_id;
```

## NRR (Net Revenue Retention) — métrica chave de UBP

```
NRR = (start_mrr + expansion - churn - contraction) / start_mrr × 100%
```

Em UBP saudável:
- Clientes usam mais ao longo do tempo
- NRR > 110% é meta (top SaaS hit 120-140%)
- Sem UBP, NRR raramente passa 100%

### Por que NRR > 100% importa
- Cresce sem precisar de aquisição
- Cada $1 de MRR de hoje vira $1.10 daqui a 1 ano sozinho
- Compounding: 10 anos com NRR 120% = MRR cresce 6.2x

## Anti-patterns

### Free tier muito generoso
- Free com 100 gerações/mês quando heavy users usam só 30
- Resultado: ninguém faz upgrade
- Fix: free tier suficiente pra testar, não pra trabalhar

### Pricing por usuário em produto consumido por uso
- "$10 por usuário" mas 1 usuário pode usar 10x mais que outro
- Resultado: penaliza adoção
- Fix: UBP puro ou usage allowance generoso

### Cobrar centavos por evento
- $0.001 por evento — soma micro, soma micro
- Cliente assusta com "10 reais a mais" mesmo sendo justo
- Fix: pacotes (1000 eventos por R$ 50)

### Não comunicar limite chegando
- Usuário usa, usa, recebe fatura gigante
- Resultado: churn + reembolso
- Fix: notificação em 50%, 80%, 100%

### Mudar preço retroativo
- Cliente assinou R$ 99, sobe pra R$ 149 no mês 3
- Resultado: churn + LinkedIn post
- Fix: grandfather pricing pra clientes existentes

## Comunicação de preço

### Errado
"R$ 0.0001 por token de output, R$ 0.00005 por token de input com cache hit, 50% desconto em batch async..."

### Certo
"R$ 0.65 por sermão gerado. Pacotes a partir de R$ 29/mês com 30 gerações inclusas."

**Tradução**: complexidade no backend, simplicidade no preço.

## Decisão final — UBP ou flat?

| Pergunta | Se SIM → UBP |
|---|---|
| Custo escala muito com uso? | ✅ |
| Valor escala com uso? | ✅ |
| Heavy users beneficiam desproporcionalmente? | ✅ |
| Quer NRR > 110%? | ✅ |
| Cliente quer previsibilidade total? | ❌ |
| Custo é fixo (servidor on-demand)? | ❌ |

Se sim em 4+ → UBP. Se sim em 1-2 → flat.

## Checklist `@cfo` ao definir UBP

- [ ] Modelo de UBP escolhido (PAYG / créditos / híbrido / tiered)
- [ ] Custo por unidade calculado
- [ ] Margem alvo definida
- [ ] Limite incluso setado no P90
- [ ] 3 tiers max (free + 2 pagos)
- [ ] Excedente claro e previsível
- [ ] Notificações de 50/80/100% do limite
- [ ] Grandfather pricing pra clientes existentes
- [ ] Stack técnico (Stripe metered / Asaas custom)
- [ ] Comunicação de preço simples

## Referências
- [OpenView — Usage-Based Pricing Report](https://openviewpartners.com/usage-based-pricing/)
- [Patrick Campbell — Pricing Strategies](https://www.priceintelligently.com/)
- [Tomasz Tunguz — UBP analysis](https://tomtunguz.com/)
- [Bessemer — Cloud SaaS metrics](https://www.bvp.com/atlas/state-of-the-cloud-2024)

