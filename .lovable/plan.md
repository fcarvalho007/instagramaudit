## Objetivo

Refinar UI do `OnboardingModal` para mobile (360–412px), sem mexer em lógica, payload, tracking, endpoints ou copy de fundo. Apenas tipografia, spacing e responsividade dos botões.

## Ficheiros a editar

- `src/components/onboarding/onboarding-modal.tsx` (único ficheiro de código)
- Sem alterações em `gate.json` (pt/en) — copy mantém-se.

## Mudanças concretas

### 1. Shell do modal (`DialogContent`, ~linha 346)

- Outer padding: `px-7 py-8 sm:px-9 sm:py-9` → `px-5 py-7 sm:px-9 sm:py-9` em todos os bodies (Intro/Login/Form). Liberta ~16px laterais em 360–390.
- Mantém `w-[calc(100vw-2rem)] sm:max-w-[760px] max-h-[92vh]`.

### 2. Títulos — consistência entre os 4 estados

Hoje:
- Intro/Login: `text-[28px] sm:text-[30px] leading-[1.1] tracking-[-0.01em]`
- FormStep: `text-[22px] sm:text-[30px] leading-[1.15] tracking-[-0.01em]` ← inconsistente (22px é pequeno demais e diferente do intro)

Normalizar todos para:
```
font-display text-[28px] sm:text-[30px] leading-[1.08] tracking-[-0.015em] text-content-primary
```
- `min-w-0 break-words text-balance` mantém-se nos passos com `<Trans>`.

### 3. Subtitle (FormStep)

`text-[13px] leading-relaxed` → `text-[15px] leading-[1.55] text-content-secondary`. Continua claramente secundário, mas mais legível.

### 4. Spacing do header

`DialogHeader space-y-3` → `space-y-2.5` no FormStep (eyebrow → title → subtitle → progress mais compacto vertical).  
`mt-6 space-y-4` da Intro → `mt-5 space-y-4`.  
Form `space-y-6 mt-6` → `space-y-5 mt-5`.

### 5. Step 1 — Input nome

- Label `text-sm` → `text-[15px] font-medium text-content-primary`
- Helper `text-[11px] text-content-tertiary` → `text-[13px] leading-[1.45] text-content-tertiary`
- Erro `text-xs` → `text-[13px]`
- Container `space-y-1.5` → `space-y-2`
- Input herda altura `size-lg` do shadcn — confirmar que o `font-size` é ≥16px (evita zoom iOS). Se o Input tem 14px default, adicionar `className="text-base"`.

### 6. Step 2 — Chips

`ChipGroup`:
- Grid mantém `grid-cols-2 sm:grid-cols-4`, gap `gap-2` → `gap-2.5`
- Botão: `min-h-[76px] text-[12px]` → `min-h-[88px] text-[14px] font-semibold`
- Padding: `px-2 py-3` → `px-2.5 py-3.5`
- Ícone: `size-5` → `size-[22px]`, gap `gap-1.5` → `gap-2`
- Label: adicionar `leading-[1.2] break-words hyphens-auto` para evitar overflow em "competitor_research" / "benchmark_competitors".

Question labels (Step2):
- `text-[13px] font-medium` → `text-[15px] font-medium`

Consequence line:
- `text-[12px]` → `text-[13px] leading-[1.5]`

### 7. Step 3 — Email/Phone/Consent

- Labels `text-sm` → `text-[15px] font-medium`
- Optional `text-[12px]` → `text-[13px]`
- Helper `text-[11px]` → `text-[13px] leading-[1.45]`
- Erros `text-xs` → `text-[13px]`
- Inputs: aplicar `text-base` (16px) para evitar zoom iOS
- Consent box padding `p-4` mantém-se; copy `text-[12.5px] leading-relaxed` → `text-[14px] leading-[1.55]`
- "consentMandatory"/"marketingOptional" labels `text-content-tertiary` mantém-se mas herda o `text-[14px]`.

### 8. Intro — handle context + trust line

- `text-[13px]` / `text-[12.5px]` → `text-[14px]` / `text-[13.5px] leading-[1.5]`
- Trust line `text-[11px]` → `text-[12px]` (mínimo legível mantido)

### 9. Footer dos botões — RESPONSIVO (mudança chave)

Linha 768:
```
flex gap-3 ... pt-5 mt-2
```
Substituir por:
```
flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3 ... pt-5 mt-2
```

- `<=640px`: botões stacked verticalmente, primário em cima ("flex-col-reverse" garante que "Voltar" fica em baixo, "Continuar/Analisar" em cima — primário tem destaque).
- `>=sm` (≥640px): volta a side-by-side como hoje.
- Botão "Voltar": remove `flex-shrink-0`, adiciona `w-full sm:w-auto`.
- Botão primário: `flex-1 min-w-0` mantém-se mas em mobile fica `w-full` (flex-col já garante full width).
- Resultado: zero risco de CTA truncado em 360px; em 390–412 também sai mais respirado.

### 10. Progress bar

Mantém. `gap-1.5` → `gap-2` e `pt-1` → `pt-2` para isolar visualmente do subtitle (que agora é maior).

## Fora de âmbito (não toco)

- Endpoints, payload (`buildStartPayload`), schemas (`unlockFormSchema`)
- Honeypot, timing guard, tracking events
- Lógica de `goNext` / `goBack` / `handleFinalSubmit`
- `useOnboardingDraft`, `parseFullName`
- LoginStepBody mantém estrutura — só recebe os mesmos tweaks tipográficos para coerência (label `text-[15px]`, helper `text-[12px]→[13px]`).

## Validação

1. `bunx tsc --noEmit`
2. QA visual nos 4 estados (intro, step1, step2, step3) em:
   - 360×800
   - 390×844
   - 412×915
   - tablet 768
   - desktop 1440
3. Confirmar: sem overflow horizontal, CTA primário sempre legível por inteiro, chips 2×2 sem cramping, inputs com tap target confortável.

## Checkpoint

- ☐ Títulos consistentes (28→30px, leading 1.08, mesmo tracking) nos 4 estados
- ☐ Body typography mais legível (subtitle 15px, labels 15px, helpers 13px)
- ☐ Chips do Step 2 sem cramping, label 14px, min-h 88px
- ☐ Step 3 footer stacked em mobile, side-by-side em sm+
- ☐ Sem zoom iOS (inputs ≥16px)
- ☐ Sem overflow horizontal em 360/390/412
- ☐ `tsc` limpo
- ☐ Zero alterações em endpoints, payload, tracking, copy
