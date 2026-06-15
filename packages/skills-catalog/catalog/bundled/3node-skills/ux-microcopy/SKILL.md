---
name: ux-microcopy
description: 'Texto que o usuário lê na interface: labels, botões, placeholders, erros, toasts, empty states'
key: paperclipai/bundled/3node-skills/ux-microcopy
recommendedForRoles:
- copywriter
- designer
tags:
- ux
- microcopy
---

# Skill: UX Microcopy (funcional, não marketing)

Texto que o usuário lê na interface: labels, botões, placeholders, erros, toasts, empty states. Diferente de copy de marketing (que é do `/copywriter`).

## Princípios

### 1. Linguagem da pessoa, não do sistema
| Errado (sistema) | Certo (pessoa) |
|---|---|
| "Erro 422: Unprocessable Entity" | "Esse email já está cadastrado. Quer entrar com ele?" |
| "Registro salvo no banco" | "Presença confirmada!" |
| "Submeter formulário" | "Confirmar inscrição" |
| "Operação realizada com sucesso" | "Pronto! Seu certificado tá no email." |

### 2. Verbo de ação descreve a ação que será feita
- ❌ "OK" / "Enviar" / "Submeter"
- ✅ "Confirmar inscrição" / "Acessar minha conta" / "Quero gerar meu certificado"

O texto do botão deve ser autoexplicativo **sem depender do contexto ao redor**.

### 3. Label > placeholder
- Placeholder some quando usuário digita → idoso perde referência
- Sempre `<label>` visível acima do campo
- Placeholder só pra exemplo: "Ex: Maria de Almeida Santos"

## Fórmula do erro

**O QUE aconteceu + (POR QUE se útil) + O QUE FAZER**

Exemplos:

```
❌ "Senha incorreta"
✅ "Senha incorreta. Verifique caps lock ou clique em 'Esqueci minha senha'."

❌ "Erro ao gerar certificado"
✅ "Não conseguimos gerar agora. Tente em alguns minutos ou fale com a gente."

❌ "Campo inválido"
✅ "Email inválido. Confira se digitou certo (ex: nome@gmail.com)."

❌ "Falha de rede"
✅ "Sem conexão. Confira sua internet e tente de novo."
```

## Tom por contexto

| Situação | Tom |
|---|---|
| Onboarding / boas-vindas | Acolhedor, animado, em primeira pessoa do plural ("Vamos começar?") |
| Confirmação de ação | Direto, declarativo ("Inscrição confirmada!") |
| Erro do usuário | Gentil, não-culpado ("Confira o email") |
| Erro do sistema | Empático, responsável ("Tivemos um problema. Não foi culpa sua.") |
| Ação destrutiva | Firme, específico ("Excluir a aula 'X'? Não pode ser desfeito.") |
| Loading / espera | Específico, contextual ("Buscando suas aulas…" > "Carregando…") |

## Para público religioso/leigo/idoso (Academia de Pregadores)

- Frases curtas (máx 12 palavras por sentença)
- Voz ativa ("Você completou" > "Foi completado")
- Sem jargão técnico, gírias ou referências seculares ambíguas
- Tom respeitoso, sem condescendência
- Em ações importantes, tom pode ser pastoral leve ("Que bom ter você aqui")
- Evita "App", "Login", "Submit" — usa "Aplicativo", "Acessar", "Confirmar"

## Microcopy de espera (Doherty Threshold)

Resposta >400ms = sensação de espera. Mostra texto contextual reduz ansiedade:

```
❌ "Carregando…"
✅ "Buscando suas aulas…"
✅ "Preparando a sala…"
✅ "Gerando seu certificado…"
```

Pra esperas longas (5s+): mensagens rotativas a cada 6-8s. Ver `ux-states.md` pra padrão completo.

## Confirmações destrutivas

Nomear o que será perdido — não perguntar genericamente:

```
❌ "Tem certeza?"
✅ "Excluir a aula 'O Fim dos Tempos em Daniel'? Isso não pode ser desfeito."

❌ "Confirmar exclusão"
✅ "Excluir esses 3 alunos? Eles vão perder acesso ao certificado."
```

## Empty states

Estrutura: **título + descrição (por que vazio + o que fazer) + CTA**

```
Título: "Você ainda não tem aulas"
Descrição: "Explore o catálogo e adicione suas primeiras aulas pra começar"
CTA: "Explorar catálogo"
```

## Toasts (sonner)

| Tipo | Duração | Comportamento |
|---|---|---|
| Sucesso | 4s | Auto-dismiss |
| Info | 5s | Auto-dismiss |
| Erro | **Manual** | Não auto-fechar — deixa usuário ler/copiar |
| Loading promise | Até resolver | `toast.promise(...)` |

```tsx
toast.success('Inscrição confirmada!')
toast.error('Não conseguimos confirmar', {
  description: 'Tente de novo ou fale com a gente.',
  duration: Infinity,
  action: { label: 'Tentar de novo', onClick: retry }
})
```

## Microcopy de features de IA

Pra público leigo/religioso, atenção redobrada com IA:

- ❌ "IA gerou pra você"
- ✅ "Sugestão automática — revise antes de enviar"

- ❌ "Resposta de IA"
- ✅ "Esboço gerado — você decide se usa"

- ❌ "Confie na IA"
- ✅ "Esta é uma sugestão. Sempre revise o conteúdo final."

**Princípio**: nunca venda IA como verdade absoluta. Microcopy precisa gerenciar expectativa.

## Templates WhatsApp (UAZAPI)

Template do WA Business API tem regras:
- **Tipos**: utility (transacional), marketing (promocional), authentication (OTP)
- **Variáveis**: `{{1}}`, `{{2}}` em ordem
- **Limites**: header 60 chars, body 1024 chars, footer 60 chars
- **Aprovação Meta**: marketing leva 24-72h; utility geralmente aprovado em horas

Template de evento (utility):
```
{{1}}, sua inscrição em "{{2}}" foi confirmada!

📅 {{3}}
🔗 Acessar: {{4}}

Vejo você lá!
```

## Anti-patterns que `@ux` bloqueia

- Placeholder como label
- "OK" / "Enviar" / "Confirmar" sem objeto
- "Erro" / "Algo deu errado" sem ação
- "Tem certeza?" sem nome do item
- Toast de erro com auto-dismiss <8s
- Jargão técnico em UI ("token", "cache", "JWT", "endpoint")
- "Login" / "Submit" / "App" em projeto pra público leigo BR
- Microcopy de IA que vende como verdade absoluta
- Confirmação destrutiva sem nomear o item

## Checklist final de microcopy

- [ ] Botões descrevem a ação (verbo + objeto)
- [ ] Labels visíveis (não só placeholder)
- [ ] Erros seguem fórmula "O QUE + POR QUÊ + O QUE FAZER"
- [ ] Erros têm ícone + texto (não só cor)
- [ ] Loading tem texto contextual
- [ ] Sucesso confirma + sugere próximo passo
- [ ] Confirmação destrutiva nomeia o item
- [ ] Tom adequado ao público (formal/leigo/pastoral)
- [ ] Toast de erro NÃO auto-dismiss
- [ ] Sem jargão técnico em UI
- [ ] Microcopy de IA gerencia expectativa

