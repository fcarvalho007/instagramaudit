## Estado atual: já implementado

Após auditoria, o pedido já está aplicado no código atual. Resumo da verificação:

### Modal (`src/components/product/unlock-modal.tsx`)
- `TOTAL_STEPS = 4` ✅
- 4 passos: Email → Profile ownership → Goal → User type → Success ✅
- Sem passo de pricing no JSX ✅
- Progresso "Passo X de 4" ✅
- Submit final (`handleFinalSubmit`) **não envia** `pricing_preference` no payload ✅
- Lookup + skip qualification preservados ✅

### Schema cliente (`src/lib/unlock-flow.ts`)
- `unlockFormSchema` já tem `pricing_preference: z.enum(...).optional()` ✅
- Comentário já marca campo como movido para sheet pós-valor ✅
- Constantes `PRICING_PREFERENCES` e `PRICING_PREFERENCE_LABELS` mantidas (usadas pelo `pricing-feedback-sheet`) ✅

### Schema servidor (`src/lib/unlock.server.ts`)
- `pricing_preference` já é `.optional()` no `reportUnlockSchema` ✅
- Branch returning lead nunca regride o campo ✅

### Testes
- `unlock-flow.test.ts`: já cobre payload válido sem pricing + back-compat com pricing ✅
- `unlock-schema.test.ts`: aceita payload mínimo sem pricing ✅

### Coluna BD
- `leads.pricing_preference` intacta, sem migração ✅

---

## Limpezas opcionais (cosméticas)

Se quiseres, faço numa única passagem mínima e segura:

1. **Remover `pricing_preference: undefined` dos `defaultValues`** do `useForm` em `unlock-modal.tsx` (linha 72) — campo não é editado em lado nenhum do modal, só polui os defaults.
2. **Remover o import não utilizado** `BookmarkPlus` se não for usado no `SuccessState` (verificar antes).

Nenhuma destas mexe em comportamento, apenas higiene de código.

---

## Validação a correr depois (mesmo que não haja alterações)

- `bunx tsc --noEmit`
- `bunx vitest run` (focar `unlock-flow`, `unlock-schema`)
- Smoke manual: abrir modal → 4 passos → unlock OK

---

## Pergunta antes de avançar

Queres que:
- (A) faça apenas as **limpezas cosméticas** acima e corra a validação, ou
- (B) considere a tarefa **fechada como já implementada** (sem tocar em nada) e avance para o próximo lote (Phase 4 — `report_engaged` event)?