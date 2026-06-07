## Objectivo
1. Passo 2 do checkout passa a multi-select baseado em objectivos, com a primeira escolha como prioridade principal.
2. Persistir `report_priority` (legado, mapeado) + `report_goals` (novo array) em metadata.
3. Order summary mais elegante e com sinal de segurança.
4. Todos os CTAs principais do checkout passam a navy local — sem tocar no `variant="primary"` global.

## Ficheiros a alterar (scope estrito ao checkout)
1. `src/components/checkout/report-priority-form.tsx` — refactor de chips para 4 cartões multi-select.
2. `src/routes/checkout.report-full.tsx` — estado, copy, persistência, CTA navy.
3. `src/components/checkout/order-summary.tsx` — strikethrough, total Fraunces, bloco segurança.
4. `src/components/checkout/human-diagnosis-upsell.tsx` — substituir o `variant="primary"` do CTA pelo navy local.
5. `src/lib/payments/eupago.functions.ts` — adicionar campo opcional `report_goals` ao validator e ao bloco `metadata`. **Apenas passthrough**: nada de preço, EuPago, schema, créditos ou entitlements muda.
6. `src/components/checkout/checkout-primary-button.tsx` — **novo** componente local com a cor navy (single source of truth).

## 1. `ReportPriorityForm` — multi-select por objectivos
- Novo tipo:
  ```ts
  export type ReportGoal =
    | "compare_competitors"
    | "what_to_publish"
    | "what_works"
    | "present_to_client";
  ```
- 4 cartões (não chips), cada um com ícone, label e sub-label curta. Multi-select com checkbox visual.
- Primeira escolha = principal: badge "Principal" no primeiro cartão escolhido; ordem preservada por ordem de clique.
- Props:
  ```ts
  interface Props {
    goals: ReportGoal[];           // ordenado, primeiro = principal
    onChange: (next: ReportGoal[]) => void;
  }
  ```
- Re-clique num cartão seleccionado remove-o (deselecciona).
- Validação: pelo menos 1 escolhido para continuar.

### Cópias dos 4 cartões
| Goal | Label | Sub-label |
|---|---|---|
| `compare_competitors` | Comparar-me com concorrentes | Ver onde estou em relação ao mercado |
| `what_to_publish` | Saber o que publicar a seguir | Ideias e formatos a testar |
| `what_works` | Perceber o que está a funcionar | Posts e formatos com melhor retorno |
| `present_to_client` | Mostrar a um cliente ou chefe | Argumentos com dados |

Header da secção (em `checkout.report-full.tsx`):
- Título: "O que te traz aqui?" (Fraunces)
- Subtítulo: "Podes escolher mais do que um. A primeira escolha conta como principal." (Inter, content-secondary)

## 2. `checkout.report-full.tsx` — estado + mapeamento + tracking
- Substitui `reportPriority: ReportPriority | null` por `reportGoals: ReportGoal[]` (`useState<ReportGoal[]>([])`).
- `STEP_LABELS[1]` passa de "Prioridade" para "Objectivo".
- `STEP_LABELS[3]` passa de "Faturação e pagamento" para "Faturação".
- Validação do passo 2: `reportGoals.length >= 1`.
- Mapeamento legado (sem mudar enum de `report_priority`):
  ```ts
  const GOAL_TO_LEGACY: Record<ReportGoal, ReportPriority> = {
    compare_competitors: "comparison",
    what_to_publish: "content",
    what_works: "formats",
    present_to_client: "recommendations",
  };
  const primaryGoal = reportGoals[0] ?? null;
  const reportPriorityLegacy = primaryGoal ? GOAL_TO_LEGACY[primaryGoal] : undefined;
  ```
- `createCheckout({ data: { ..., report_priority: reportPriorityLegacy, report_goals: reportGoals } })`.
- `trackStepComplete` no passo 2 envia `{ report_goals: reportGoals, report_priority: reportPriorityLegacy, primary_goal: primaryGoal }`.

## 3. Navy local nos CTAs do checkout (sem tocar no Button global)

### Novo componente `src/components/checkout/checkout-primary-button.tsx`
Um wrapper finíssimo sobre `<Button>` que força a paleta navy via `className` com `!` (override determinístico do `variant="primary"` global):

```tsx
import { forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAVY_OVERRIDE =
  "!bg-[rgb(var(--text-primary))] !text-[rgb(var(--text-inverse))] " +
  "hover:!bg-[rgb(var(--text-primary))]/90 active:!bg-[rgb(var(--text-primary))]/85 " +
  "!shadow-sm !bg-none";

export const CheckoutPrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="primary"
      {...props}
      className={cn(NAVY_OVERRIDE, className)}
    />
  ),
);
CheckoutPrimaryButton.displayName = "CheckoutPrimaryButton";
```

> `!bg-none` neutraliza o gradiente violeta que vive no `variant="primary"`. Sem rebrand global, sem tocar em `button.tsx`.

### Substituições (apenas dentro do checkout)
- `StepActions` (botão "Continuar" passos 1–3): `Button variant="primary"` → `CheckoutPrimaryButton`.
- Passo 4 "Confirmar e pagar": `Button variant="primary"` → `CheckoutPrimaryButton`.
- `HumanDiagnosisUpsell` CTA "Sim, quero o diagnóstico humano": `Button variant="primary"` → `CheckoutPrimaryButton`.

### Não tocar
- `button.tsx`
- Landing, pricing, app shell, sidebar, sticky bar, restantes CTAs do produto.

## 4. `OrderSummary` — refino
- Strikethrough do preço futuro:
  - Se `productCode === "report_full_9"`: mostra `9€` actual e nenhum riscado (sem mudança de preço).
  - Se `productCode === "authority_diagnosis_97"`: mostra `97€` + `149€` riscado ao lado em Fraunces (consistente com o cartão do upsell).
  - Preço-base lido de `PUBLIC_PRODUCTS[productCode]` (sem hardcode novo). O `149€` riscado vem de um novo campo opcional `compareAtLabel` no produto **OU** simplesmente hardcode literal `"149€"` aqui — escolho o literal para não mexer no schema de produtos. Diz-me se preferes adicionar `compareAtLabel` ao registry; é trivial mas vai além do checkout.
- Total: passa de `text-lg font-bold` para `font-fraunces text-2xl font-medium` + `tabular-nums`.
- Bloco de confiança no final do card:
  - Ícone `<ShieldCheck>` + "Pagamento seguro via EuPago".
  - Logos textuais discretos: "Multibanco · MB WAY · Cartão" em `text-xs text-content-tertiary`.
  - Linha-divisor subtil acima do bloco.
- Manter `sticky` opcional como está.

## 5. `eupago.functions.ts` — passthrough apenas

```ts
// validator (chain único, antes do .handler())
report_priority: z.enum([...]).optional(),  // mantido
report_goals: z.array(
  z.enum([
    "compare_competitors",
    "what_to_publish",
    "what_works",
    "present_to_client",
  ]),
).max(4).optional(),
```

```ts
// bloco metadata
report_priority: data.report_priority ?? null,
report_goals: data.report_goals ?? null,    // novo
primary_goal: data.report_goals?.[0] ?? null, // novo
```

**Nenhum** outro campo, função, preço, montante, redirect, webhook, cálculo de desconto, validação fiscal, EuPago request ou response é tocado. Schema da BD não muda — `metadata` é `jsonb` e absorve os novos campos.

> Se quiseres ainda mais estrito (zero alterações ao validator do checkout backend), posso deixar `report_goals` fora e usar **só** `report_priority` mapeado. Mas perdes a inteligência multi-goal. Recomendo manter o passthrough — diz-me se queres assim.

## Fora de âmbito
- Preço, EuPago provider, webhook, schema BD, créditos, entitlements, lógica de pagamento.
- Outros CTAs do produto.
- Admin dashboard para visualizar os goals (vem mais tarde).
- Pro/Free UI do relatório.

## Validação manual
1. Passo 2 mostra 4 cartões; selecciono 2 → primeiro fica com badge "Principal".
2. Botão "Continuar" do passo 2 só fica activo com ≥1 escolha.
3. CTAs nos 4 passos: todos em navy sólido (sem gradiente roxo, sem glow).
4. Order summary do passo 4: total em Fraunces, bloco "Pagamento seguro via EuPago · Multibanco · MB WAY · Cartão" visível.
5. Submit do passo 4: `metadata` na BD contém `report_priority` (mapeado) + `report_goals` (array) + `primary_goal`.
6. CTAs noutras páginas (landing, pricing, sidebar) continuam violeta — nada mudou.
7. Mobile 375px: cartões do passo 2 stack vertical sem overflow; CTAs full-width.

## Output após build
- Lista de ficheiros alterados.
- Confirmação de zero alterações em preço / EuPago request / webhook / schema / créditos / entitlements.
- Confirmação de zero alterações ao `variant="primary"` global e a CTAs fora do checkout.