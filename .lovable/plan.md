# Auditoria — janelas 30d / 90d Pro

## Veredicto

**PASS funcional.** A implementação está coerente e os 11 testes novos passam (4 do budget per-profile + 7 do gate `force_refresh`). É lançável tal como está, mas há 2 refinamentos recomendados antes de ativar tráfego real Pro.

## O que está bem feito

- **Gate de Pro + janela larga + force_refresh** em `analyze-public-v1.ts` (linhas 633–685): a ordem é correta — kill-switch 90d → entitlement → activa `force_refresh` apenas se Pro e janela larga. Free nunca chega à reserva.
- **Cap per-(lead, handle, window)** (`assertProWindowProfileDailyBudgetAvailable`) corre **antes** de `reserveCredit` e antes de Apify, e o erro `PRO_WINDOW_BUDGET_EXCEEDED` devolve 503 com mensagem PT-PT.
- **Cap diário 90d global** mantém-se como segunda barreira independente.
- **`getPeriodCacheState`** é puramente leitura, exige cookie + entitlement Pro, e devolve sempre `hasFreshCache:false` quando falha — Free não consegue enumerar cache.
- **Cache-aware dialog** (`consume-credit-dialog.tsx` / `report-block-nav.tsx`): Caso A (cache fresco) mostra "Abrir recente / Gerar nova", Caso B só "Gerar análise · 1 crédito", Caso C bloqueia. `force_refresh:true` só sai do cliente quando o utilizador clica explicitamente em "Gerar nova".
- **`data_source = "fresh_forced"`** distingue refresh forçado pelo utilizador vs refresh interno (`?refresh=1` admin), e propaga para `analysis_events` + labels no admin.
- **Flag `pro_window_90d_enabled = true`** já está em `app_config` (confirmado por query).

## Refinamentos recomendados (não-bloqueantes para preview, bloqueantes para produção)

### R1. Cap per-profile pode contar reservas libertadas como spend

`getProWindowProfileDailySpendUsd` em `apify-budget.server.ts` (linha 237) faz:

```ts
.in("reason", ["confirm", "reserve"])
```

`credits.server.ts` insere uma linha `reason:"release"` quando uma reserva é revertida (Apify falha, perfil privado, profile_not_allowed, etc.) mas **não apaga** a linha `reserve`. Resultado: um Pro que tente `force_refresh` e bata em erro provider verá o cap acumular spend que nunca ocorreu, podendo bloquear-se a si próprio com 1–2 tentativas falhadas.

**Fix:** mudar o filtro para `reason = "confirm"` apenas. Em alternativa, juntar à query um `NOT EXISTS` de release com o mesmo `reservation_id`. A primeira é mais simples e suficiente — o cap só deve refletir gastos confirmados.

### R2. Migration em falta para `pro_window_90d_enabled`

O valor está no DB do projeto preview, mas não existe migration que o crie. Qualquer ambiente novo (clone, reset, branch) vai cair no fallback `"true"` do código — funciona, mas é frágil e não auditável.

**Fix:** criar migration que faz `INSERT ... ON CONFLICT (key) DO NOTHING` para `pro_window_90d_enabled='true'` (e idealmente também para `apify_pro_window_profile_daily_cap_usd` e `apify_90d_daily_cap_usd` com valores default explícitos).

### R3 (opcional). Invalidação do cache in-memory do cap após confirm

`cachedProWindowSpend` tem TTL (`TTL_MS`) mas não é invalidado quando um confirm acabou de escrever no ledger. Janela curta de drift onde 2 pedidos quase simultâneos podem ambos passar o cap. Mitigação simples: chamar `cachedProWindowSpend.delete(key)` no fim do handler em caminho `fresh_forced`. Risco real baixo porque o caso típico é 1 utilizador a clicar manualmente.

## Validação executada

- `bunx vitest run apify-budget-pro-window force-refresh` → **11/11 passa**.
- Query a `app_config` confirma flag presente.
- Inspeção do fluxo gate em `analyze-public-v1.ts` linhas 530–760 confirma ordem correta: kill-switch → entitlement → user-flag-flip → per-profile cap → 90d cap → reserveCredit → Apify.

## Recomendação

Aplicar **R1 + R2** numa edit-mode pass curta (≈ 30 linhas + 1 migration). R3 fica para mais tarde se aparecer evidência de drift no admin.
