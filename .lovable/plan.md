
## Problem

When `/analyze/frederico.m.carvalho` gets a 503 `CACHE_ONLY_NO_DATA` response, the error state does eventually render (~6s after navigation) but:

1. The first ~3-6s show a blank page (SSR returns empty shell since `ssr: false`, then 3s minimum skeleton timer runs)
2. The error state uses a generic heading ("Não foi possível concluir a análise") for all errors — no distinction for `CACHE_ONLY_NO_DATA`
3. No "Voltar ao início" secondary CTA as requested
4. The supporting copy doesn't match the requirement

## Plan

### 1. Pass `errorCode` through to `AnalysisErrorState`

**File: `src/routes/analyze.$username.tsx`**
- When setting error state, also store `errorCode` from the API response
- Pass it to `<AnalysisErrorState>`

**File: `src/components/product/analysis-error-state.tsx`**
- Add optional `errorCode?: string` prop
- When `errorCode === "CACHE_ONLY_NO_DATA"`:
  - Heading: "Este relatório ainda não tem dados públicos disponíveis."
  - Body: "Os dados deste perfil ainda não foram gerados ou a versão guardada expirou. Tenta novamente mais tarde ou solicita uma nova análise."
  - Show two CTAs: "Tentar novamente" + "Voltar ao início" (link to `/`)
- For all other errors: keep current generic heading + "Tentar novamente" only

### 2. Reduce blank-page window

**File: `src/routes/analyze.$username.tsx`**
- Reduce `MIN_DISPLAY_MS` from 3000 to 0 specifically for error responses (keep 3s only for success path). This way error states render immediately after the API responds (~1s) instead of waiting the full 3s skeleton.

### Files changed
- `src/routes/analyze.$username.tsx` — pass `errorCode` to error state; skip min-display on errors
- `src/components/product/analysis-error-state.tsx` — add `errorCode` prop with `CACHE_ONLY_NO_DATA`-specific heading, body, and secondary CTA

### Constraints respected
- No fetching logic changes beyond error rendering
- No provider calls, no schema changes, no PDF pipeline changes
- No fresh analysis triggered
- pt-PT copy only
- Light-first Iconosquare design tokens
