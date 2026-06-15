---
name: mouse-peeker
description: Personagem fofo (urso/panda/coruja) em SVG que segue o cursor com as pupilas e cobre os olhos com as patas quando o user clica em "ver senha"
key: paperclipai/bundled/3node-skills/mouse-peeker
recommendedForRoles:
- engineer
tags:
- mouse
- peeker
---

# Skill: Mouse Peeker Character

Personagem fofo (urso/panda/coruja) em SVG que segue o cursor com as pupilas e cobre os olhos com as patas quando o user clica em "ver senha". Padrão clássico de tela de login que dá personalidade ao produto.

## Quando usar
- Tela de login/cadastro com senha
- Forms onde quer humanizar a UX
- Qualquer overlay que precise de "atenção" e "privacidade" temáticas

## Como funciona
1. Componente captura `mousemove` global e calcula vetor centro→cursor
2. Pupilas se movem proporcionalmente (clamped a `max=5px`) na direção do cursor
3. Quando prop `coveringEyes=true`, patas (SVG separado com transition) sobem cobrindo
4. Pupilas escondidas quando cobrindo (não desperdiça render)
5. Suporta touch (mobile) via `touchmove`

## Implementação React + SVG inline (Tailwind opcional)

```tsx
import { useEffect, useRef, useState } from 'react'

interface Props {
  coveringEyes: boolean
  size?: number
}

export default function MousePeekerCharacter({ coveringEyes, size = 96 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pupil, setPupil] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (coveringEyes) return
      const el = ref.current
      if (!el) return
      const point = 'touches' in e
        ? e.touches[0]
          ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }
          : null
        : { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY }
      if (!point) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = point.clientX - cx
      const dy = point.clientY - cy
      const dist = Math.hypot(dx, dy) || 1
      const max = 5
      const f = Math.min(max, dist) / dist
      setPupil({ x: dx * f, y: dy * f })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
    }
  }, [coveringEyes])

  return (
    <div ref={ref} style={{ width: size, height: size }} className="relative mx-auto select-none">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* Orelhas */}
        <circle cx="28" cy="28" r="13" fill="#1e293b" />
        <circle cx="28" cy="28" r="6" fill="#475569" />
        <circle cx="92" cy="28" r="13" fill="#1e293b" />
        <circle cx="92" cy="28" r="6" fill="#475569" />
        {/* Cabeça */}
        <circle cx="60" cy="62" r="45" fill="#f1f5f9" stroke="#1e293b" strokeWidth="2.5" />
        {/* Manchas panda */}
        <ellipse cx="42" cy="55" rx="13" ry="14" fill="#1e293b" opacity="0.85" />
        <ellipse cx="78" cy="55" rx="13" ry="14" fill="#1e293b" opacity="0.85" />
        {/* Olhos brancos */}
        <ellipse cx="42" cy="55" rx="8" ry="9" fill="#fff" />
        <ellipse cx="78" cy="55" rx="8" ry="9" fill="#fff" />
        {/* Pupilas que seguem o mouse */}
        {!coveringEyes && (
          <g style={{ transition: 'transform 60ms linear' }}>
            <circle cx={42 + pupil.x} cy={55 + pupil.y} r="3.5" fill="#0f172a" />
            <circle cx={42 + pupil.x - 1} cy={55 + pupil.y - 1} r="1" fill="#fff" />
            <circle cx={78 + pupil.x} cy={55 + pupil.y} r="3.5" fill="#0f172a" />
            <circle cx={78 + pupil.x - 1} cy={55 + pupil.y - 1} r="1" fill="#fff" />
          </g>
        )}
        {/* Focinho */}
        <ellipse cx="60" cy="78" rx="14" ry="10" fill="#fef3c7" stroke="#1e293b" strokeWidth="1.5" />
        <ellipse cx="60" cy="74" rx="3.5" ry="2.5" fill="#0f172a" />
        <path d="M 56 80 Q 60 84 64 80" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>

      {/* Patas cobrindo */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-300 ease-out ${
          coveringEyes ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <g transform={coveringEyes ? 'translate(0,0)' : 'translate(-20,30)'} style={{ transition: 'transform 300ms ease-out' }}>
            <ellipse cx="38" cy="55" rx="14" ry="11" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="32" cy="55" r="2" fill="#fef3c7" />
            <circle cx="38" cy="50" r="2" fill="#fef3c7" />
            <circle cx="44" cy="55" r="2" fill="#fef3c7" />
            <circle cx="38" cy="60" r="3" fill="#fef3c7" />
          </g>
          <g transform={coveringEyes ? 'translate(0,0)' : 'translate(20,30)'} style={{ transition: 'transform 300ms ease-out' }}>
            <ellipse cx="82" cy="55" rx="14" ry="11" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="76" cy="55" r="2" fill="#fef3c7" />
            <circle cx="82" cy="50" r="2" fill="#fef3c7" />
            <circle cx="88" cy="55" r="2" fill="#fef3c7" />
            <circle cx="82" cy="60" r="3" fill="#fef3c7" />
          </g>
        </svg>
      </div>
    </div>
  )
}
```

## Uso

```tsx
const [showPassword, setShowPassword] = useState(false)

<MousePeekerCharacter coveringEyes={showPassword} size={110} />

<button onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? <EyeOff /> : <Eye />}
</button>
```

## Variações
- **Padrão "olha quando digita senha"**: `coveringEyes={!showPassword && passwordFocused}` — cobre quando senha tá em modo escondido E focado
- **Padrão "olha quando senha visível"**: `coveringEyes={showPassword}` (atual) — finge "respeitar privacidade"
- **Vue/Svelte**: mesma lógica (event listener global + state pra pupila + transition)
- **Mascotes alternativas**: trocar SVG por coruja (orelhas pontudas), gato (orelhas triangulares), polvo (tentáculos cobrindo)

## Considerações
- **Performance**: `mousemove` 60fps no main thread — leve porque só `setState` com 2 floats
- **Acessibilidade**: `aria-hidden` nas patas (decorativo). Personagem todo em SVG, invisível pra screen reader
- **Mobile**: suporta `touchmove` mas pra tela de login mobile geralmente não vê o character (teclado cobre)
- **Não use** se o produto é sério/B2B enterprise — não combina com tom corporativo

