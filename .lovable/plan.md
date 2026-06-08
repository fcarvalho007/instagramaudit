# Refinar Pro 30d/90d (flow já maioritariamente wired)

## Estado actual (auditado)

A maioria do fluxo já existe desde o commit `9f664752 Activated Pro 30d/90d UI`. O que falta é **refinamento de copy + toasts diferenciados**, não construção from-scratch.

| Requisito | Estado |
|---|---|
| Sidebar period chips clicáveis em Pro | ✅ `report-block-nav.tsx:956-981` (`PREMIUM_WINDOWS = [30, 90]`, `onPeriodPaidClick → openConsumeDialog`) |
| Free abre upsell sem backend call | ✅ `onPeriodLockedClick → handlePremiumAccessClick` |
| `ConsumeCreditDialog` confirm para `period` | ✅ linhas 102-104, 281 — CTA `cta_use_period` activo |
| Saldo 0 bloqueia confirm | ✅ ramo `hasCredit ? Button : empty_cta` (linhas 279-308) |
| Backend POST com `window: "30d"/"90d"` (não `window_days`, sem `INTERNAL_API_TOKEN`) | ✅ `client.ts:35-49` |
| Refresh saldo + navigate `?w=` em sucesso | ✅ `report-block-nav.tsx:669-684` |
| `data_source` exposto no response | ✅ `types.ts` `"fresh" \| "cache" \| "stale"` |

## Gaps remanescentes

1. **Toast indiferenciado**: hoje só `t("success_toast")`. Precisamos cache-hit vs fresh.
2. **Copy do dialog period** menos explícita do que o pedido. Actual: *"Vai consumir 1 crédito Pro e gerar uma análise nova..."*. Pedido: condicional ("**pode** consumir 1 crédito **se ainda não existir em cache**").
3. **`WINDOW_REQUIRES_PRO`** cai no `error_generic_with_code` genérico — falta mensagem dedicada.
4. **`AnalysisPeriodSelector`** (componente hero, separado da sidebar) continua 100% locked e não está sequer mounted (`rg` confirma 0 callers fora do próprio ficheiro). Não bloqueia o flow Pro. Deixar dormant.

## Mudanças

### 1. `src/i18n/locales/pt/report.json` + `en/report.json`
Refinar/adicionar chaves sob `nav.explore.consume_dialog`:
- **`period_action_body`** (PT) → *"Esta análise pode consumir 1 crédito se ainda não existir em cache. Se esta janela já tiver sido gerada, será reutilizada sem novo custo."*
- **`period_success_toast_cache`** (PT) → *"Análise reutilizada sem novo consumo."*
- **`period_success_toast_fresh`** (PT) → *"Nova análise gerada. 1 crédito consumido."*
- **`period_success_toast_neutral`** (PT) → *"Análise por período carregada."*
- **`period_error_requires_pro`** (PT) → *"Esta janela exige acesso Pro activo."*
- EN: traduções espelho.

### 2. `src/components/report-redesign/v2/report-block-nav.tsx` (`onConfirmConsume`, ramo `period`)
- Substituir `toast.success(t("...success_toast"))` por branching em `result.data_source`:
  - `"cache"` → `period_success_toast_cache`
  - `"fresh"` → `period_success_toast_fresh`
  - outros / undefined → `period_success_toast_neutral`
- No ramo de erro, mapear explicitamente `result.error_code === "WINDOW_REQUIRES_PRO"` para `period_error_requires_pro` antes do fallback genérico.
- Sem alterações na call HTTP nem no navigate.

### 3. `src/components/report-redesign/v2/consume-credit-dialog.tsx`
- Sem mudança de lógica. Só remover o `defaultValue` inline (vai vir do JSON refinado).

### 4. `analysis-period-selector.tsx`
- **Sem mudanças.** Está dormant (zero callers). Activá-lo é fora de scope porque não está mounted; abrir esse trabalho exigiria descobrir onde montar e duplicaria UX com o sidebar — fica para PR futuro se a UX assim o exigir.

## Não tocar
Backend route, credits server, schema, EuPago, checkout, providers, Free/Public report além do já existente, comparison cards.

## Validação
- `bunx vitest run src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts` (sanity — não mexemos no backend, deve continuar verde).
- Smoke manual em `/analyze/$username?variant=pro_preview`:
  - Free → click 30d chip → upsell, sem network call.
  - Pro 0 créditos → dialog mostra empty state, sem confirm.
  - Pro ≥1 crédito → confirm 30d → toast "Nova análise..." → re-click 30d → toast "Análise reutilizada...".
- 90d **não** será testado live (gate explícito do utilizador).
- Typecheck via build automática.

## Ficheiros editados
1. `src/i18n/locales/pt/report.json` (chaves novas/refinadas)
2. `src/i18n/locales/en/report.json` (espelho)
3. `src/components/report-redesign/v2/report-block-nav.tsx` (branching de toast + erro Pro)
4. `src/components/report-redesign/v2/consume-credit-dialog.tsx` (remover `defaultValue` inline)
