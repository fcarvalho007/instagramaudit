## Goal

Make `/api/market-signals` return accurate, UI-safe status semantics so the public report can decide whether to render or hide the "Sinais de Mercado" section. No provider calls, no schema changes, no UI changes.

## Files to modify

1. `src/lib/dataforseo/market-signals.ts` — orchestration + status derivation + error classification
2. `src/lib/dataforseo/types.ts` — extend `MarketSignalsResult` shape (add `partial`, structured errors, `queries_cap`, `message` on partial/error)
3. `src/routes/api/market-signals.ts` — no logic changes (already returns whatever the orchestrator produces); only ensure `disabled`/`blocked` envelopes include the same shape (`plan`, `message`)

No DB migrations. No UI. No secret changes. No call to DataForSEO or Apify.

## Final status rules

| Condition | status |
|---|---|
| `DATAFORSEO_ENABLED` is not `true` | `disabled` |
| Owner not in allowlist | `blocked` |
| No keywords could be derived | `no_keywords` |
| Hard timeout (60s) | `timeout` |
| At least one provider call returned a usable result, no errors | `ready` |
| At least one usable result AND at least one error | `partial` |
| All provider calls failed, no usable result | `error` |

"Usable result" definition: the parsed result object is non-null AND (for `trends`: `items` array has length > 0; for `keyword_ideas`: result object exists; for `serp`: at least one entry with non-null `result`).

## Error classification

In `buildSignalsInner`, every `catch` will normalise the error via a new helper `classifyError(source, err)` returning:

```ts
{ source: string; code: string; message: string; httpStatus?: number; apiStatusCode?: number }
```

Mapping rules (using `DataForSeoUpstreamError` fields already populated by the client):
- `apiStatusCode === 40104` OR (`httpStatus === 403` AND message matches `/verify your account/i`) → `code: "ACCOUNT_NOT_VERIFIED"`, `message: "A conta DataForSEO ainda não está verificada."`
- `httpStatus === 401` OR `apiStatusCode === 40101` → `code: "AUTH_FAILED"`, `message: "Credenciais DataForSEO inválidas."`
- `httpStatus === 429` OR `apiStatusCode === 40202` → `code: "RATE_LIMITED"`, `message: "Limite de pedidos DataForSEO atingido."`
- `DataForSeoBlockedError` with `reason: "kill_switch"` → `code: "DISABLED"`
- `DataForSeoBlockedError` with `reason: "allowlist"` → `code: "BLOCKED"`
- timeout / abort → `code: "TIMEOUT"`
- anything else → `code: "UNKNOWN"`, message = original error message

`source` will be the call name (`"dataforseo:google_trends"`, `"dataforseo:keyword_ideas"`, `"dataforseo:serp_organic:<keyword>"`).

## Status derivation

After running all attempted calls, count:
- `usable` = number of non-null results that pass the "usable" check above
- `attempted` = number of calls actually issued (`used`)
- `failed` = `errors.length`

Rules:
- `attempted === 0` → keep current behaviour (`no_keywords` already short-circuits earlier; otherwise treat as `error`)
- `usable === 0 && failed > 0` → `error` with `message: "Não foi possível obter sinais de mercado nesta tentativa."`
- `usable > 0 && failed === 0` → `ready`
- `usable > 0 && failed > 0` → `partial` with `message: "Sinais de mercado parciais — algumas fontes falharam."`

## Type changes (`src/lib/dataforseo/market-signals.ts`)

Replace `MarketSignalsOk` with two-shape envelope:

```ts
export interface ClassifiedError {
  source: string;
  code: "ACCOUNT_NOT_VERIFIED" | "AUTH_FAILED" | "RATE_LIMITED"
      | "DISABLED" | "BLOCKED" | "TIMEOUT" | "UNKNOWN";
  message: string;
  httpStatus?: number;
  apiStatusCode?: number;
}

export interface MarketSignalsReady {
  status: "ready" | "partial";
  plan: MarketSignalsPlan;
  keywords: string[];
  trends?: GoogleTrendsResult | null;
  keyword_ideas?: KeywordIdeasResult | null;
  serp?: Array<{ keyword: string; result: SerpOrganicResult | null }>;
  queries_used: number;
  queries_cap: number;
  errors: ClassifiedError[];
  message?: string;
}

export interface MarketSignalsFail {
  status: "disabled" | "blocked" | "no_keywords" | "timeout" | "error";
  plan: MarketSignalsPlan;
  message: string;
  queries_used?: number;
  queries_cap?: number;
  errors?: ClassifiedError[];
}
```

The `error` envelope (only emitted when all calls failed) will include `errors`, `queries_used`, `queries_cap`, `plan`, and the required `message`.

## Endpoint envelope alignment

In `src/routes/api/market-signals.ts`, the `disabled` and `blocked` short-circuit responses already include `status`, `plan`, `message` — keep as-is. No code change there.

## Validation

1. `bunx tsc --noEmit`
2. `bun run build`
3. No fetch to DataForSEO or Apify; verified by inspecting diff.
4. No SQL / migration / secret changes.

## Out of scope (explicit)

- UI rendering of the new statuses (will be handled in a follow-up).
- Caching layer.
- `/report/example`, Apify pipeline, secrets, billing.

## Summary of behaviour after fix

For the current failing scenario (DataForSEO 403 / `40104`, no usable trend data):
- response `status` = `"error"`
- `errors[0]` = `{ source: "dataforseo:google_trends", code: "ACCOUNT_NOT_VERIFIED", message: "A conta DataForSEO ainda não está verificada.", httpStatus: 403, apiStatusCode: 40104 }`
- `message` = `"Não foi possível obter sinais de mercado nesta tentativa."`
- `queries_used`, `queries_cap`, `plan` included
- Public UI can safely hide the section on `disabled | blocked | error | timeout | no_keywords`.