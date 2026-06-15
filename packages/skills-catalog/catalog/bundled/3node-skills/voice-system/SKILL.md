---
name: voice-system
description: '`/copywriter` define tom no `VOICE.md` por produto'
key: paperclipai/bundled/3node-skills/voice-system
recommendedForRoles:
- copywriter
tags:
- voice
- system
---

# Skill: Voice System (tom de voz persistente por produto)

`/copywriter` define tom no `VOICE.md` por produto. Garante consistência entre sessões, evita escrever copy contraditório.

## Por que existe

Sem `VOICE.md`:
- Em uma sessão, copy é informal ("Bora pra próxima!")
- Em outra, formal ("Prosseguir com a inscrição")
- Marca confusa, usuário desconectado

Com `VOICE.md`:
- Mesmo tom em todas as sessões
- Microcopy, emails, landing, tudo coerente
- Consistência tipo Stripe vs Mailchimp vs Notion

## Onde fica

`docs/VOICE.md` na raiz do projeto.

## Estrutura do VOICE.md

```markdown
# Voice & Tone — [Produto]

## Identidade resumida
[2-3 linhas: quem é a marca falando]

Ex: A Academia de Pregadores é uma escola pastoral acolhedora, séria sobre formação bíblica
mas conversacional na voz. Fala com o aluno como mestre que respeita o discípulo.

## Personalidade — espectro

| Eixo | Posição | Por quê |
|---|---|---|
| Sério ←→ Brincalhão | 70% sério | Conteúdo bíblico exige reverência |
| Formal ←→ Casual | 60% formal | Público pastoral, respeito tradicional |
| Pragmático ←→ Inspirador | 50/50 | Equilibra instrução e motivação |
| Reservado ←→ Caloroso | 70% caloroso | Acolhe novos alunos |
| Técnico ←→ Acessível | 80% acessível | Público leigo + idoso comum |

## Vozes (quando muda)

### Vox 1 — Onboarding/boas-vindas
**Tom**: caloroso, acolhedor, primeira pessoa do plural
**Exemplos**:
- ✅ "Que bom ter você aqui."
- ✅ "Vamos começar essa jornada juntos."
- ❌ "Inscrição realizada com sucesso."

### Vox 2 — Conteúdo/aula
**Tom**: respeitoso, pastoral, conteúdo da palavra
**Exemplos**:
- ✅ "Nesta aula, o Pr. Juliano nos guia pelos fundamentos da escatologia."
- ❌ "Aula 1 disponível!"

### Vox 3 — Ações importantes (cert, pagamento)
**Tom**: claro, direto, sem floreios
**Exemplos**:
- ✅ "Confirmar inscrição"
- ✅ "Baixar certificado"
- ❌ "Clica aí pra resgatar"

### Vox 4 — Erros / problemas
**Tom**: empático, sem culpa, com ação
**Exemplos**:
- ✅ "Tivemos um problema. Não foi culpa sua. Tente em alguns minutos."
- ❌ "Erro 500: Internal Server Error"

### Vox 5 — Celebração / sucesso
**Tom**: alegre mas comedido, pastoral
**Exemplos**:
- ✅ "Parabéns! Você concluiu a imersão. 🙌"
- ❌ "🎉🎊 You did it! Congrats! 🚀"

## Palavras que usamos
- "Você" sempre (nunca "tu" nem "vós")
- "Aula" (não "vídeo", "conteúdo", "módulo")
- "Aluno" (não "usuário", "user", "membro")
- "Sala" (não "ambiente", "plataforma", "espaço virtual")
- "Pr." antes de nome de pastor
- "Certificado" (não "diploma", "comprovante")

## Palavras que evitamos
- "App" → usar "aplicativo" ou "sala"
- "Login" → usar "acessar"
- "Submit" → usar "enviar" ou ação específica
- "Click" → usar "clicar" ou "tocar"
- "Cool", "Top", gírias seculares fortes
- Termos técnicos: "token", "JWT", "cache", "API"

## Estrutura de frase
- Curta: 8-15 palavras por sentença
- Voz ativa: "Você completou" (não "Foi completado")
- Comece com verbo em CTAs: "Confirmar X" (não "X confirmação")

## Pontuação
- Ponto final em frases de UI? Sim, mantém formalidade respeitosa
- Emoji? Esparso e adequado:
  - 🙏 (oração, gratidão) — OK
  - ✨ — evitar (vibe IA)
  - 🚀 — não cai bem no público
  - 🎉 — só em sucesso real grande

## Exemplos completos

### Header de email de boas-vindas
✅ "Que bom ter você aqui, [Nome]!"
❌ "Welcome aboard! 🚀"

### Botão CTA principal
✅ "Garantir minha vaga"
❌ "Sign up now"
❌ "Confirmar"

### Erro de pagamento
✅ "O pagamento não foi aprovado. Confira seus dados e tente de novo, ou fale com a gente."
❌ "Payment failed. Please try again."

### Empty state da lista de aulas
✅ "Você ainda não tem aulas. Vamos começar?"
❌ "No classes found."

### Loading
✅ "Buscando suas aulas…"
❌ "Carregando..."

### Notificação WhatsApp
✅ "Olá, Maria! Sua aula de amanhã às 19h está confirmada. Conto contigo lá!"
❌ "Your class tomorrow at 7PM is confirmed."

## Adaptações por canal

| Canal | Adaptação |
|---|---|
| WhatsApp | Mais informal, emojis ok, breve |
| Email | Mais elaborado, com saudação + assinatura |
| Push notification | Curtíssimo, 1 ação clara |
| UI | Conciso, ação direta |
| Landing page | Persuasivo, AIDA/PAS |

## Erros de voz a evitar

❌ "Plataforma de aprendizado online" (genérico, vazio)
❌ "Curso revolucionário que vai mudar sua vida" (vendedor demais)
❌ "Maximize seu potencial pedagógico" (corporativo)
❌ "É só dar um clique e pronto!" (informal demais)
❌ "Submita o formulário" (anglicismo)

## Tom para diferentes momentos do funil

| Momento | Tom |
|---|---|
| Pré-cadastro (landing) | Convidativo, esperança |
| Onboarding (primeira sessão) | Acolhedor, pastoral |
| Engagement (durante aula) | Respeitoso, didático |
| Pagamento / decisão | Claro, urgência sem pressão |
| Pós-conclusão | Celebrativo, próximo passo |
| Falha / erro | Empático, com ação |
| Reativação (volta!) | Caloroso, sem cobrança |
```

## Como o `/copywriter` usa

### Ao iniciar projeto novo
1. Pergunta sobre identidade
2. Cria `VOICE.md` baseado nas respostas
3. Toda copy futura referencia este doc

### Ao continuar projeto existente
1. **Lê `VOICE.md` ANTES de escrever** qualquer copy
2. Atualiza se novo padrão emerge (e Ryan aprova)
3. Em divergência, segue o VOICE.md ou pergunta

## Como `@joao` se relaciona

`@joao` define **como parece** (visual). `/copywriter` define **como soa** (voz). Os dois precisam combinar:

- Marca minimalista + voz econômica
- Marca expressiva + voz mais elaborada
- Marca séria + voz formal/respeitosa
- Marca playful + voz casual

`VOICE.md` e `DESIGN.md` deveriam ser feitos próximos (ou em paralelo) pra ficarem alinhados.

## Como `@ux` se relaciona

`@ux` define **microcopy funcional** (labels, erros, estados). Ele deve consultar `VOICE.md` pra garantir que o tom funcional bate com a voz da marca.

## Checklist VOICE.md

- [ ] Identidade clara em 2-3 linhas
- [ ] Espectro de personalidade definido
- [ ] ≥ 3 vozes específicas (onboarding, conteúdo, erro)
- [ ] Palavras que usamos / evitamos
- [ ] Estrutura de frase definida
- [ ] Política de emoji
- [ ] Exemplos do/don't pra cada contexto comum
- [ ] Adaptações por canal (WA, email, UI)
- [ ] Tom por momento do funil

## Anti-patterns

- VOICE.md genérico ("sério mas amigável") sem exemplo
- VOICE.md desatualizado (não atualiza ao mudar marca)
- Copy escrito sem consultar VOICE
- Mistura voz da marca com voz do dev (cada um seu tom)

## Templates por nicho

### Educação religiosa BR (Academia)
- Tom pastoral leve, respeitoso, primeira pessoa do plural
- Sem gírias seculares ou anglicismos
- Citação bíblica ocasional em momentos certos

### SaaS B2B
- Direto, profissional, foco em valor
- Verbos de ação, métricas concretas
- Sem jargão excessivo

### Consumer/lifestyle
- Conversacional, próximo do amigo
- Emojis com critério
- Personalidade marcante

### Fintech
- Confiável, claro, sem ambiguidade
- Tranquilizador em momentos críticos (pagamento, fraude)
- Transparente sobre custos/processos

## Referências
- [Mailchimp Voice & Tone](https://styleguide.mailchimp.com/voice-and-tone/) — referência clássica
- [Atlassian Voice & Tone](https://atlassian.design/content/voice-and-tone) — concreto, com exemplos
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/)
- [Content Design London — Voice Scale](https://contentdesign.london/)

