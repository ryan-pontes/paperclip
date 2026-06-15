---
name: ux-principles
description: Fundamentos pra decisão rápida de UX
key: paperclipai/bundled/3node-skills/ux-principles
recommendedForRoles:
- designer
tags:
- ux
- principles
---

# Skill: UX Principles (Nielsen + Laws of UX)

Fundamentos pra decisão rápida de UX. Sempre ativada pelo `@ux`.

## 10 Heurísticas de Nielsen aplicadas ao stack RyanDevSquad

| # | Heurística | Aplicação prática |
|---|---|---|
| 1 | Visibilidade do status | Sempre mostrar onde o usuário está: breadcrumbs, steps ativos, progresso de upload, contagem de salvamento |
| 2 | Match com mundo real | Linguagem do público (religioso/leigo BR), não jargão técnico. "Confirmar inscrição" > "Submeter formulário" |
| 3 | Controle e liberdade | "Desfazer" disponível após ações importantes. Cancelar deve estar visível em modal/wizard |
| 4 | Consistência | Mesmo padrão de botão, mesmo tom de erro, mesma posição de CTAs em todo o app |
| 5 | Prevenção de erros | Confirmar ações destrutivas com nome do item; validar inline; desabilitar submit se inválido |
| 6 | Reconhecer, não lembrar | Labels sempre visíveis (nunca só placeholder); autocomplete em formulários longos |
| 7 | Flexibilidade | Atalhos pra usuário avançado (cmd+K) sem prejudicar leigo |
| 8 | Estética minimal | Não poluir com features raramente usadas; esconder em "Mais opções" |
| 9 | Recuperação de erros | Mensagem clara + ação de recuperação (retry, fallback, suporte) |
| 10 | Ajuda e documentação | Tooltip acessível em ícones; FAQ inline em ações complexas; link "Não consegue?" |

## Laws of UX — quando cada uma se aplica

### Jakob's Law — usuários esperam padrões conhecidos
- Botão de voltar onde sempre fica (esquerda superior)
- Hamburguer menu (topo esquerdo) ou bottom nav (mobile)
- Carrinho/perfil topo direito
- **Não reinventar** padrões consagrados sem motivo forte

### Hick's Law — menos opções = decisão mais rápida
- 1 decisão principal por tela em mobile
- Formulários longos = 1 campo por tela (ex: cadastro multi-step)
- Menu com >7 itens = agrupar em categorias
- **Para idoso**: máximo 5 opções por tela

### Fitts's Law — alvo maior + mais próximo = mais fácil
- Touch target mínimo **44x44px** (WCAG 2.2 AA = 24px, mas 44 é padrão Apple/Google)
- CTAs primários grandes e na thumb zone (terço inferior em mobile)
- Ações destrutivas no canto superior (longe do dedo, evita acidente)

### Miller's Law — limite de 7±2 itens em memória de curto prazo
- Listas com >7 itens precisam paginação ou agrupamento
- Wizards: máx 7 steps; idealmente 3-5
- Dashboards: 5-7 cards principais por viewport

### Peak-End Rule — usuário lembra do pico e do final
- Invista na **tela de sucesso** (pagamento, certificado, conclusão de aula)
- Pequeno momento de delight no fim (animação, mensagem celebrativa)
- Pico negativo no meio do fluxo é PIOR do que erro no início

### Aesthetic-Usability Effect — bonito parece mais fácil
- Design cuidado reduz frustração percebida
- Em público leigo, estética cuidada aumenta confiança
- **Não substitui usabilidade real**, mas amplifica boa percepção

### Tesler's Law — complexidade não some, se transfere
- Preferir complexidade no código (auto-detect, defaults inteligentes) a expor no usuário
- Configurações avançadas escondidas em "Mais opções"
- **Onboarding inteligente** > formulário gigante

### Zeigarnik Effect — progresso visível motiva conclusão
- Progress bar em formulários longos
- Steps numerados ("3 de 5")
- "Falta pouco" em fluxos com múltiplas etapas

### Doherty Threshold — responsividade < 400ms elimina sensação de espera
- Botões respondem visualmente em <100ms (active state, ripple)
- Loading visible em >300ms
- Optimistic UI pra ações comuns (like, favorite, send)

## Frameworks de prioridade UX

### MoSCoW pra estados
- **Must**: loading, error, success
- **Should**: empty, partial, offline
- **Could**: undo, redo, history
- **Won't**: gimmicks sem propósito

### RICE adaptado pra UX
- **Reach**: quantos usuários afeta (% do total)
- **Impact**: 1 (marginal), 3 (notável), 10 (transformador)
- **Confidence**: 50-100% (baseado em evidência)
- **Effort**: pessoa-dias

Score = (Reach × Impact × Confidence) / Effort. Use pra priorizar quick wins de UX.

## Quando aplicar cada lei (cheat sheet)

| Situação | Lei prioritária |
|---|---|
| Layout de menu/navegação | Jakob + Miller |
| Tamanho/posição de botão | Fitts |
| Quantidade de opções | Hick |
| Investimento de polish | Peak-End |
| Justificar UX cuidado | Aesthetic-Usability |
| Esconder configuração | Tesler |
| Formulário longo | Zeigarnik + Hick + Miller |
| Velocidade percebida | Doherty |

## Referências
- [Laws of UX](https://lawsofux.com/) — Jon Yablonski
- [NN/g 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Don't Make Me Think — Steve Krug](https://sensible.com/dont-make-me-think/)

