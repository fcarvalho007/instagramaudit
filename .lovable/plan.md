
# Auditoria P07 — Visual Cover Analysis

## Status actual: **Fully implemented, never executed**

A cadeia completa existe:
- Tipos (`visual-cover-types.ts`) — completos
- Prompt (`visual-cover-prompt.ts`) — existe
- Server call (`visual-cover-analysis.server.ts`) — OpenAI vision API com gating, timeout, cost logging, error handling
- Integração no pipeline (`analyze-public-v1.ts` linhas 1009-1051) — gated, com cache reuse
- Snapshot mapping (`visual_cover_analysis` no payload) — persiste quando gerado
- Parsing no bloco (`report-diagnostic-block.tsx` linha 165) — lê do snapshot
- Card UI (`visual-cover-analysis-card.tsx`) — 460 linhas, completo com thumbnails, scores, sub-scores, diagnóstico, metodologia

**Zero execuções**: `provider_call_logs WHERE actor = 'visual-cover-analysis'` retorna 0 registos.

## 1. Dados dos posts

| Campo | Disponível |
|-------|-----------|
| `thumbnail_url` | Sim — posts têm thumbnails (o card já os mostra) |
| `permalink` / `shortcode` | Sim |
| `format` | Sim |
| `caption` | Sim |
| `date` / `taken_at_iso` | Sim |

## 2. Porquê "Score visual indisponível"

O card recebe `analysis={parseVisualCoverAnalysis(payload)}`, que retorna `null` porque nenhum snapshot contém `visual_cover_analysis`.

A cadeia de gating no `analyze-public-v1.ts` (linha 1023):

```
if (isOpenAiAllowed(handle)) { ... }
```

Que por sua vez chama:
1. `isOpenAiEnabled()` → `process.env.OPENAI_ENABLED === "true"` 
2. `isOpenAiTestingModeActive()` → default ON
3. `getOpenAiAllowlist().includes(handle)` → handle must be in `OPENAI_ALLOWLIST`

Os secrets `OPENAI_ENABLED`, `OPENAI_ALLOWLIST`, `OPENAI_API_KEY` e `OPENAI_TESTING_MODE` existem no Lovable Cloud. **Se `OPENAI_ENABLED` for `"true"` e o handle estiver na allowlist, a próxima análise gerará P07.**

O blocker exacto é: **os snapshots existentes foram gerados quando a gate não passou** (OPENAI_ENABLED não era "true", ou o handle não estava na allowlist, ou o visual cover code ainda não existia nessa versão).

## 3. Infraestrutura OpenAI

| Dimensão | Estado |
|----------|--------|
| API key | `OPENAI_API_KEY` — secret existe |
| Model | `gpt-5.4-mini` (hardcoded) |
| Provider call logs | Sim — `recordProviderCall` com actor `visual-cover-analysis` |
| Timeout | 45s |
| Cost logging | Sim — `calculateOpenAiCost` |
| Gating | `OPENAI_ENABLED` + `OPENAI_TESTING_MODE` + `OPENAI_ALLOWLIST` |
| Cache reuse | Sim — reutiliza `visual_cover_analysis` de snapshot anterior se existir |

## 4. O que NÃO precisa de ser editado

- `visual-cover-analysis.server.ts` — funcional
- `visual-cover-analysis-card.tsx` — funcional
- `visual-cover-types.ts` — completo
- `visual-cover-prompt.ts` — existe
- `report-diagnostic-block.tsx` — já parseia e passa ao card
- `analyze-public-v1.ts` — já chama `generateVisualCoverAnalysis`

## 5. O que é preciso para activar

**Nenhuma edição de código.** Apenas:

1. Confirmar que `OPENAI_ENABLED` = `"true"` no Lovable Cloud
2. Confirmar que o handle de teste está na `OPENAI_ALLOWLIST`
3. Executar uma nova análise para o handle (forçar refresh, não cache)
4. O snapshot resultante terá `visual_cover_analysis` e o card renderiza automaticamente

## 6. Riscos

- **Model `gpt-5.4-mini`**: Se o nome do modelo mudou na API da OpenAI, a chamada falhará com HTTP 404. Verificar nos logs após a primeira execução.
- **Thumbnail URLs**: O servidor OpenAI precisa de aceder às URLs dos thumbnails. Se passarem por proxy (`/api/public/ig-thumb`), as URLs não são acessíveis externamente. Verificar se as URLs raw são usadas (linha 1034 usa `p.thumbnail_url!` directamente — são os URLs raw do Apify, não proxied).
- **Custo**: `detail: "low"` minimiza tokens de imagem. 12 imagens × low detail ≈ 85 tokens/imagem ≈ 1020 tokens de imagem + prompt + completion ≈ ~$0.01-0.02 por análise.

## Próximo passo recomendado

Confirmar os valores das env vars e executar uma nova análise. Se falhar, consultar `provider_call_logs WHERE actor = 'visual-cover-analysis'` para o código de erro exacto.
