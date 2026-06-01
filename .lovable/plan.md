## Objetivo

Reduzir falsos negativos por timeout em `/admin/apify-lab` ajustando apenas os guardrails das janelas `30d`, `60d` e `90d`. Produção, `analyze-public-v1`, OpenAI, DataForSEO, report, pricing, thumbnails e onboarding ficam intocados.

## Ficheiros alterados

### 1) `src/routes/api/admin/apify-lab.ts` — `WINDOW_CONFIGS`

| Janela | Campo | Antes | Depois |
|---|---|---|---|
| 30d (posts) | apifyTimeoutSecs | 55 | **90** |
| 30d (posts) | timeoutMs | 60 000 | **100 000** |
| 60d (posts) | apifyTimeoutSecs | 55 | **120** |
| 60d (posts) | timeoutMs | 60 000 | **130 000** |
| 90d (posts) | apifyTimeoutSecs | 120 | **150** |
| 90d (posts) | timeoutMs | 130 000 | **160 000** |
| 365d (posts) | apifyTimeoutSecs | 240 | inalterado |
| 365d (posts) | timeoutMs | 260 000 | inalterado |
| baseline (details) | — | — | inalterado |

`maxTotalChargeUsd`, `resultsLimit`, `maxItems`, `memoryMbytes` ficam todos inalterados.

### 2) `src/routes/admin.apify-lab.tsx` — nota informativa

Adicionar uma nova `<section>` (estilo neutro, a seguir à secção azul de "Modos do Lab") com o texto:

> Janelas mais longas podem demorar 1–3 minutos. Os timeouts aqui são guardrails do Lab e não afectam o relatório gratuito de produção.

Sem alterações de tokens, layout ou copy noutras zonas.

## Tabela final de guardrails

| Janela | mode | resultsLimit | apifyTimeoutSecs | timeoutMs | maxTotalChargeUsd |
|---|---|---|---|---|---|
| baseline | details | 12 | 55 | 60 000 | 0.10 |
| 30d | posts | 100 | **90** | **100 000** | 0.10 |
| 60d | posts | 200 | **120** | **130 000** | 0.20 |
| 90d | posts | 300 | **150** | **160 000** | 0.30 |
| 365d | posts | 1 000 | 240 | 260 000 | 1.00 |

## Verificação

- `bunx tsc --noEmit`
- Confirmar que apenas `src/routes/api/admin/apify-lab.ts` (bloco `WINDOW_CONFIGS`) e `src/routes/admin.apify-lab.tsx` (nova secção informativa) foram tocados.
- Sem chamadas Apify. Sem migrações. Sem mudanças em produção.

## Checkpoint

- ☐ 30d: apifyTimeoutSecs=90, timeoutMs=100 000
- ☐ 60d: apifyTimeoutSecs=120, timeoutMs=130 000
- ☐ 90d: apifyTimeoutSecs=150, timeoutMs=160 000
- ☐ 365d inalterado, baseline inalterado, caps inalterados
- ☐ Nota UI adicionada em `admin.apify-lab.tsx`
- ☐ `bunx tsc --noEmit` limpo
- ☐ Produção e `analyze-public-v1` intactos
