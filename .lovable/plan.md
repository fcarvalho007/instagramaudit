# Redesign end-of-free paywall — neutral strategic version

## Files to edit

1. `src/components/report-redesign/v2/end-of-free-block.tsx` — layout + structure + price source.
2. `src/i18n/locales/pt/report.json` — copy under `end_of_free` only (PT-PT).

No changes to checkout, EuPago, entitlements, products catalog, gating, analytics, schema, or any other component. The CTA continues to call `handlePremiumAccessClick("lock_gate", { cta: "guarantee_launch_price" })` — same event signature, same destination.

## Price source

`LAUNCH_PRICE = "9"` is currently hardcoded in the component. Replace it with the existing source of truth from `src/lib/payments/products.ts`:

```ts
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel; // "9€"
```

No new product, no new price. If/when the product's `priceLabel` changes upstream, the card follows automatically.

## i18n copy (PT-PT, under `end_of_free`)

```
eyebrow: "VISTE OS PRIMEIROS SINAIS"
title: "Transforma sinais em decisões."
description: "O relatório completo mostra o que está a funcionar, o que está a falhar e que decisões podem melhorar a leitura estratégica deste perfil nos próximos 30 dias."
benefits_title: "NO RELATÓRIO COMPLETO VAIS CONSEGUIR"
benefits: [
  "Ver as melhores e piores publicações",
  "Perceber que formatos repetir ou reduzir",
  "Identificar padrões de ritmo e frequência",
  "Comparar o perfil com concorrentes",
  "Descobrir oportunidades editoriais"
]
price.caption_suffix: "pagamento único · sem subscrição"
cta: "Desbloquear análise completa"
reassurance: "Ideal para quem gere, analisa ou compara perfis de Instagram e precisa de decisões claras, não só de métricas."
```

Existing `chips.*` keys removed (no longer used), plus old `title`, `description`, `footnote`, replaced. `nav.access.cta` is no longer referenced by this component — leaving the key untouched in other consumers.

## Layout (matches mockup, refined)

Card: `max-w-2xl`, centred, `bg-white`, `rounded-2xl`, `border-border-default`, soft shadow — preserved.

Vertical rhythm:

1. Eyebrow (uppercase Inter, `text-eyebrow-sm`, `text-content-tertiary`).
2. Headline — Fraunces, `text-3xl sm:text-4xl md:text-[2.5rem]`, **not italic** (sentence with period). Centred.
3. Subheadline — Inter, `text-[15px]`, `text-content-secondary`, `max-w-xl mx-auto`, with "próximos 30 dias" bolded via `<strong className="font-semibold text-content-primary">` substring (Trans component).
4. **Benefits block** — replaces the chip row. Framed sub-card: `rounded-xl border border-border-default bg-surface-muted/60 px-5 py-5 sm:px-6 sm:py-6 text-left`.
   - Small uppercase title row at top (eyebrow).
   - 5 rows, each: subtle icon (`ArrowUpRight`, `Repeat`, `CalendarClock`, `Users`, `Lightbulb`) `size-4 text-accent-primary/80` + label (Inter `text-[14px] text-content-primary`).
   - `gap-2.5` between rows.
5. Price — Fraunces, `text-[3rem] sm:text-[3.5rem]`, dynamic from `priceLabel`. Caption below: `text-[13px] text-content-tertiary`.
6. CTA — existing pill button, `bg-accent-primary`, label "Desbloquear análise completa", trailing `ArrowRight` (preserved).
7. Reassurance — `text-[12.5px] text-content-tertiary max-w-md mx-auto`, no icon (cleaner than current `Bell`).

Spacing: `mt-5` after eyebrow, `mt-4` after headline, `mt-7` before benefits block, `mt-8` before price, `mt-2` price caption, `mt-6` before CTA, `mt-5` before reassurance.

## Responsive

- Card: `px-5 py-9 sm:px-10 sm:py-12`. Mobile keeps centred composition; benefits block stays full-width inside the card with `text-left`.
- No horizontal overflow; icons are `size-4` so 5-row list wraps fine on 320px.
- Headline scales `text-3xl → 4xl → [2.5rem]`.

## Out of scope (explicit)

- No change to `usePremiumCta`, `handlePremiumAccessClick`, lock_gate event, or destination.
- No change to `PUBLIC_PRODUCTS`, `products.server.ts`, EuPago flow, entitlements, credits.
- No change to gating logic in `report-shell-v2.tsx` (the component is still rendered in the same slot).
- No A/B variants, no banner rotation, no new analytics events.

## Validation

After edit:
1. Preview desktop (1440px): centred card, benefits block visible, dynamic 9€ rendered.
2. Preview mobile (375px): single column, no clipping, benefits readable.
3. Click CTA → confirm it still opens the existing premium-interest dialog (lock_gate event).
4. Grep confirms no other consumer relied on removed i18n keys (`end_of_free.chips`, `end_of_free.title` old text, `end_of_free.footnote`).
