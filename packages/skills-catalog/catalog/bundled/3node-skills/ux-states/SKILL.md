---
name: ux-states
description: 'Toda feature que mostra dado **tem 4 estados obrigatórios**: loading, empty, error, success'
key: paperclipai/bundled/3node-skills/ux-states
recommendedForRoles:
- designer
tags:
- ux
- states
---

# Skill: UX States (4 estados de toda feature)

Toda feature que mostra dado **tem 4 estados obrigatórios**: loading, empty, error, success. Se algum falta, não tá pronto.

## Os 4 estados

### 1. Loading
**Quando**: dado sendo buscado/processado
**Decisão skeleton vs spinner vs progress bar**:

| Tipo | Quando usar |
|---|---|
| **Skeleton** | Layout da resposta é previsível (lista, card, tabela). Reduz Cumulative Layout Shift |
| **Spinner** | Ação pontual (submit de form, upload). Duração imprevisível mas curta (<3s) |
| **Progress bar** | Progresso real mensurável (upload, geração de PDF, multi-step) |
| **Inline button loading** | Botão fica `disabled` + `<Loader2 className="animate-spin" />` |

**Regra**:
- Skeleton > spinner pra conteúdo
- Spinner > skeleton pra ações
- Texto **sempre acompanha** loading: "Buscando suas aulas…" > spinner mudo
- Aparecer só após **200ms** (evita flash em resposta rápida)

```tsx
// Skeleton pra lista
function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map((i) => (
        <div key={i} className="space-y-2 rounded-md border p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

// Button loading
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? 'Confirmando…' : 'Confirmar inscrição'}
</Button>
```

### 2. Empty
**Quando**: query OK mas sem dado pra mostrar
**Estrutura obrigatória**: ícone contextual + título + descrição curta + **CTA primário**

```tsx
function EmptyState({ icon: Icon, title, description, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  )
}

// Uso
<EmptyState
  icon={Inbox}
  title="Você ainda não tem aulas"
  description="Explore o catálogo e adicione suas primeiras aulas pra começar"
  cta={<Button>Explorar catálogo</Button>}
/>
```

**Anti-pattern**: "Nenhum item encontrado" sem CTA. **Sempre** dê próximo passo.

### 3. Error
**Estrutura obrigatória**: **O QUE** aconteceu + **POR QUE** (se útil) + **O QUE FAZER**

Tipos de erro:

| Tipo | Tratamento |
|---|---|
| **Rede** | "Sem conexão. Tente novamente." + botão retry |
| **Validação** | Inline no campo: "Email inválido" + ícone vermelho + texto |
| **Permissão** | "Você não tem acesso. Fale com o admin." + link suporte |
| **Server (5xx)** | "Tivemos um problema. Não foi culpa sua." + retry + suporte |
| **Limite/rate** | "Muitas tentativas. Aguarde X segundos." + countdown |
| **Conflito (409)** | "Esse email já está cadastrado. Quer entrar?" + ação alternativa |

```tsx
function ErrorState({ title, description, retry, support }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1 space-y-2">
          <p className="font-medium text-destructive">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="flex gap-2 pt-1">
            {retry && <Button size="sm" variant="outline" onClick={retry}>Tentar de novo</Button>}
            {support && <Button size="sm" variant="ghost" asChild><a href={support}>Falar com suporte</a></Button>}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Anti-patterns**:
- "Erro 500" sem explicação
- Só cor vermelha sem texto (daltonismo)
- "Algo deu errado" sem ação
- Toast de erro auto-dismiss (deixe usuário fechar)

### 4. Success
**Confirmação visual + texto + próximo passo**

| Tipo | Padrão |
|---|---|
| **Ação pontual** (salvar, like) | Toast 4s "Salvo!" |
| **Conclusão importante** (pagamento, certificado) | Tela dedicada com pico de delight |
| **Submit de form** | Reset form OU redirect com toast |

```tsx
// Toast simples
import { toast } from 'sonner'
toast.success('Inscrição confirmada!')

// Tela de sucesso com peak-end investido
<div className="flex flex-col items-center py-16 text-center">
  <div className="rounded-full bg-emerald-500/10 p-6">
    <Check className="h-12 w-12 text-emerald-500" />
  </div>
  <h2 className="mt-6 text-2xl font-semibold">Inscrição confirmada!</h2>
  <p className="mt-2 max-w-md text-muted-foreground">
    Te enviamos um email com tudo que você precisa pra começar. Vejo você na primeira aula!
  </p>
  <Button className="mt-8">Acessar a sala</Button>
</div>
```

## Padrões adicionais

### Optimistic UI
Atualiza estado local IMEDIATAMENTE, reverte em erro com toast explicativo.

```tsx
const [liked, setLiked] = useState(initialLiked)

const handleLike = async () => {
  setLiked(true)  // optimistic
  try {
    await api.like()
  } catch {
    setLiked(false)  // revert
    toast.error('Não conseguimos curtir. Tente de novo.')
  }
}
```

**Usar pra**: like, favorite, send message, mark as read.
**NÃO usar pra**: pagamento, deleção, ações com consequência financeira.

### Skeleton com layout shift mínimo
Skeleton deve ter **as mesmas dimensões** do conteúdo final. Caso contrário, ao trocar, o layout pula.

### Polling com backoff (fila/processamento)
Quando ação demora (geração de PDF, processamento de pagamento):
- Mostra mensagem rotativa ("Preparando…", "Quase lá…")
- Retry com backoff exponencial (2s, 4s, 8s, 16s)
- Jitter aleatório pra evitar thundering herd
- Após N tentativas → erro + CTA suporte

### Partial states
- **Lista parcial**: mostra o que tem + indicador "Carregando mais…"
- **Offline**: banner sticky "Você está offline. Mudanças serão sincronizadas."
- **Modo degradado**: feature crítica funciona, secundárias mostram fallback

## Checklist final de estados

- [ ] Loading aparece após 200ms (evita flash)
- [ ] Loading tem texto explicativo, não só spinner
- [ ] Empty tem CTA primário
- [ ] Erro segue fórmula "O QUE + POR QUÊ + O QUE FAZER"
- [ ] Erro tem ícone + texto (não só cor)
- [ ] Sucesso confirma E sugere próximo passo
- [ ] Tela importante de sucesso tem peak-end (pequeno delight)
- [ ] Optimistic UI usado onde apropriado (e revertido em erro)
- [ ] Offline tratado (banner ou modo degradado)

