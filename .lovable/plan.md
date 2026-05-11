## Objetivo

Limpar `pricingOption` da cadeia do template `commercial-followup` e ligar `checkoutUrl` como campo opcional manual no diálogo admin, sem inventar URLs no backend.

## Ficheiros a alterar

1. **`src/lib/email/templates/commercial-followup.ts`**
   - Remover `pricingOption?: string | null` de `CommercialFollowupInput`.

2. **`src/lib/email/shared.ts`**
   - Verificar e remover `pricingOption` se exportado e não usado por outros templates.

3. **`src/components/admin/v2/email-lab/email-template-registry.ts`**
   - Remover `pricingOption: "monthly"` dos samples de `commercial-followup`.
   - Adicionar dois exemplos/preview keys: um com `checkoutUrl: "https://instabench.app/checkout/abc"` e outro com `checkoutUrl: null`, para mostrar ambos os estados.

4. **`src/routes/api/admin/send-commercial-followup.ts`**
   - Adicionar `checkout_url: z.string().url().optional()` ao `RequestSchema`.
   - Pré-processo: tratar string vazia como `undefined` antes do parse (`z.preprocess` ou normalização manual no payload).
   - Remover `pricingOption: pricingPreference` da chamada a `renderCommercialFollowup` (manter `pricingPreference` apenas no metadata do evento, que é uso administrativo válido — não removido).
   - Passar `checkoutUrl: payload.checkout_url ?? null` ao template.
   - Incluir `checkout_url` no metadata de `commercial_followup_sent`.

5. **`src/components/admin/v2/beta-leads/commercial-followup-dialog.tsx`**
   - Remover `pricingOption: pricingRaw` da chamada `renderCommercialFollowup`.
   - Manter “Preço preferido” no grid (apenas contexto informativo).
   - Adicionar `<Input>` controlado para “URL de checkout (opcional)” com placeholder `https://…`, validação leve client-side (`new URL(value)` em try/catch) e mensagem de erro inline.
   - Normalizar trim + string vazia → `undefined` antes de enviar.
   - Alterar `onConfirm` para receber `checkoutUrl?: string`. Atualizar `CommercialFollowupDialogProps`.
   - Passar `checkoutUrl` ao preview `renderCommercialFollowup` para refletir CTA dinâmico.

6. **Caller(s) de `CommercialFollowupDialog`** (provavelmente `src/components/admin/v2/beta-leads/...` na kanban)
   - Atualizar `onConfirm` para receber `checkoutUrl` e enviá-lo no body do POST `/api/admin/send-commercial-followup` como `checkout_url`.

7. **`src/lib/email/__tests__/templates.test.ts`**
   - Remover/ajustar testes que referenciam `pricingOption` em `commercial-followup`.
   - Garantir cobertura: render sem `checkoutUrl` (sem botão "Desbloquear"), render com `checkoutUrl` válido (com botão).

## Validação

```
bunx vitest run src/lib/email/__tests__/templates.test.ts
bunx vitest run src/lib/email/__tests__
bunx vitest run
bunx tsc --noEmit
```

## Riscos

- **Caller do diálogo**: preciso localizar o componente kanban que abre o diálogo e atualizar `onConfirm` (assinatura muda). Falha aqui partiria a UI admin.
- **String vazia vs URL**: `z.string().url().optional()` falha com `""`. Solução: normalizar `""` → `undefined` no client e/ou via `z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional())` no servidor.
- **`shared.ts`**: se `pricingOption` for exportado num tipo partilhado por outros templates, manter; se isolado, remover. Auditar antes de tocar.
- **Tests existentes**: rever 2-3 asserts em `templates.test.ts` que usam `pricingOption`.

## Resumo final entregará

- lista de ficheiros alterados;
- pontos onde `pricingOption` foi removido;
- esquema de validação de `checkoutUrl`;
- comportamento com URL vazio (CTA omitido, sem erro);
- resultado das 4 suites de validação.
