## Fase 2 — Gating de créditos no fluxo de análise

Aplicar a política aprovada (Opção A): cada pedido confirmado consome 1 crédito, mesmo em cache hit. Lead anónimo sem `lead_session` cookie continua bloqueado.

## Decisões consolidadas

- Lead novo recebe **+2 créditos** ao submeter o modal (já implementado em `/api/onboarding/start`).
- **Cada pedido confirmado** ao `analyze-public-v1` consome 1 crédito — cache hit, stale ou fresh, todos contam.
- Se o provider falhar **antes** de produzir snapshot utilizável → **release** da reserva (devolve 1 crédito).
- Sem cookie `lead_session` válido → resposta `402 NO_CREDITS_LEAD_REQUIRED` (modal abre no frontend, sem alterações visuais nesta fase — só código de erro novo).
- Saldo 0 → resposta `402 INSUFFICIENT_CREDITS`.

## Mudanças backend (apenas)

### 1. `src/routes/api/analyze-public-v1.ts`
Inserir lifecycle de crédito **antes** do `buildCacheKey` / lookup de cache (a cache só é tocada depois de termos uma reserva):

```
read lead_session cookie
  └─ ausente/inválido → return 402 NO_CREDITS_LEAD_REQUIRED
reserveCredit(lead_id, handle, cache_key)
  └─ InsufficientCreditsError → return 402 INSUFFICIENT_CREDITS

try {
  ... fluxo existente (cache → fresh → snapshot) ...
  confirmReservation(reservation_id, { snapshot_id, cache_key, data_source })
} catch (anyFailureBeforeSnapshot) {
  releaseReservation(reservation_id, reason)
  rethrow
}
```

Detalhes:
- **Allowlist / `forceRefresh` interno**: requests com `Authorization: Bearer $INTERNAL_API_TOKEN` ignoram o gating de crédito (admin/smoke test). Mantém comportamento atual.
- **Cache hit e stale**: confirmam reserva imediatamente (Opção A — cada pedido confirmado consome).
- **Fresh success**: confirmam após `analysis_snapshots` upsert.
- **Fresh provider error / Apify timeout / `INVALID_USERNAME` / `PROFILE_NOT_FOUND`**: release. Erros de validação (Zod) acontecem **antes** da reserva, portanto não chegam a reservar.

### 2. `src/lib/credits/credits.server.ts`
Já tem `reserveCredit` / `confirmReservation` / `releaseReservation`. Adicionar apenas helper de conveniência:
- `getLeadCreditState(lead_id) → { balance, has_initial_grant }` para o endpoint `/api/onboarding/start` poder devolver o saldo atualizado (útil para o frontend futuro saber o estado sem chamar endpoint extra). Read-only, sem novas writes.

### 3. `src/lib/leads/lead-cookie.server.ts`
Adicionar `readLeadCookieFromRequest(request) → { leadId } | null` que encapsula `getRequestHeader('cookie')` + parse + verify. Hoje a verificação está pronta mas só é chamada no endpoint `/api/onboarding/start`. Centraliza para `analyze-public-v1`.

### 4. Novos códigos de erro em `analyze-public-v1`
- `NO_CREDITS_LEAD_REQUIRED` → 402, mensagem PT "Precisamos do teu email para gerar o relatório."
- `INSUFFICIENT_CREDITS` → 402, mensagem PT "Já usaste os teus 2 relatórios gratuitos."
Adicionar a `ERROR_MESSAGES`, `ERROR_HTTP_STATUS`, e ao tipo `PublicAnalysisErrorCode`. Logar em `analysis_events` com `outcome='blocked_credits'` (novo valor de `outcome` — admite-se sem migration porque a coluna é `text` livre).

### 5. Testes
- Unitário: contrato de lifecycle no fluxo do endpoint, com Supabase mockado:
  - sem cookie → 402 `NO_CREDITS_LEAD_REQUIRED`, sem reserva criada
  - cookie válido + saldo 0 → 402 `INSUFFICIENT_CREDITS`
  - cookie válido + saldo 2 + cache hit → 200, ledger tem `reserve` + `confirm` (saldo final 1)
  - cookie válido + saldo 2 + fresh success → 200, ledger tem `reserve` + `confirm`
  - cookie válido + saldo 2 + fresh provider error → 5xx, ledger tem `reserve` + `release` (saldo final 2)
  - request com `Authorization: Bearer INTERNAL_API_TOKEN` → bypassa gating, ledger vazio
- Manter os 12 testes da Fase 1 verdes.

## NÃO mexer nesta fase

- `OnboardingModal` (visual + copy)
- `HeroActionBar`
- report rendering, premium gating, pricing, emails
- Apify/OpenAI prompts, thumbnails
- schema (sem migration nova — `credit_ledger` já é suficiente)

## Verificação ao fim

1. `bunx tsc --noEmit` → 0 erros.
2. `bunx vitest run` → todos os testes verdes.
3. Smoke manual em preview:
   - `curl POST /api/onboarding/start` cria lead, devolve cookie, ledger ganha `+2 initial_grant`.
   - `curl POST /api/analyze-public-v1` com esse cookie e handle de allowlist → 200, ledger ganha `-1 reserve` + `+0 confirm` (delta zero, status update).
   - Mesmo lead, 3.ª chamada → 402 `INSUFFICIENT_CREDITS`.
   - Chamada admin com `Authorization: Bearer $INTERNAL_API_TOKEN` → 200, ledger inalterado.

## Riscos & mitigações

- **Erro pós-snapshot**: se o snapshot já está em DB e o crash é depois (ex.: render de payload), confirmamos antes — o lead pagou e tem o snapshot consultável.
- **Lead com cookie antigo + DB recriada**: `reserveCredit` falha com `lead_id not found` → tratamos como `NO_CREDITS_LEAD_REQUIRED` (frontend re-abre modal).
- **Concorrência (2 cliques rápidos)**: já protegido por advisory lock em `reserveCredit`.

## Restrições mantidas

- Sem alterações visuais.
- Sem alterações ao schema.
- Sem alterações a providers (Apify/OpenAI/thumbnails).
- Sem alterações a `pricing_plans`, emails, report rendering, premium gating.
