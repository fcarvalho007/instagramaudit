## Problema

Em `src/components/landing/hero-section.tsx`, a coluna do preview tem `order-2 lg:order-none`. `lg:order-none` resolve para `order: 0`, ficando ANTES da coluna de copy (`order-1`) em desktop. Resultado: simulador à esquerda e copy à direita — o oposto do pretendido.

## Correção

Trocar `lg:order-none` por `lg:order-2` na coluna do preview, garantindo:

- **Desktop (lg+)**: copy + input à esquerda, simulador à direita (como na referência original).
- **Mobile/tablet**: copy primeiro (order-1), simulador a seguir (order-2) — sem regressão.

```tsx
// antes
<div className="order-2 lg:order-none w-full mt-10 sm:mt-12 lg:mt-0">
// depois
<div className="order-2 lg:order-2 w-full mt-10 sm:mt-12 lg:mt-0">
```

Tracking columns continuam `lg:grid-cols-[1.1fr_0.9fr]` (copy maior, preview menor).

## Validação

- Desktop ≥1024px: copy esquerda, preview direita.
- Tablet 768px e mobile 411px: copy em cima, preview em baixo.
- Sem alterações a tokens, copy, i18n ou ao próprio `HeroReportPreview`.

## Fora de âmbito

Qualquer mudança ao conteúdo do simulador, ao input/CTA, à secção `/analyze`, premium logic ou tokens.
