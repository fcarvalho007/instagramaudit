## Objetivo

Garantir que o `EditorialIdentityCard` (Block 1) **nunca** renderiza `ai_insights_v2.sections.hero.text` como o parágrafo editorial principal. Snapshots legados (têm `hero.text` mas não têm `editorial_verdict`) passam a usar o veredicto determinístico do fallback, evitando contradições com o cálculo corrigido de cadência (caso `robs.cortez`: hero antigo "0,1 posts/semana" vs cadence real ~2,3/semana).

## Causa-raiz

Em `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`, linhas 435-438:

```
const copy: EditorialCopy =
  resolution.source === "fallback" && !aiVerdict && aiHeroText
    ? deriveCopyFromAi(aiHeroText, fallback, aiHeroEmphasis ?? null)
    : { title: resolved.title, paragraph: resolved.paragraph };
```

Quando o snapshot tem `ai_insights_v2.sections.hero.text` mas não tem `editorial_verdict`, este ramo activa-se e injecta texto IA stale como parágrafo principal. É exactamente o bug reportado.

## Mudanças (read-only sobre dados; apenas render)

### 1. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

- **Remover por completo o ramo `deriveCopyFromAi`.** `copy` passa a ser sempre `{ title: resolved.title, paragraph: resolved.paragraph }`. Quando não há `editorial_verdict` válido, `resolution.source === "fallback"` e `resolved` é o `buildFallbackVerdict(...)` — determinístico, diagnóstico, sem verbos prescritivos.
- **Remover as props `aiHeroText` e `aiHeroEmphasis`** (e o respectivo bloco no `interface EditorialIdentityCardProps`). Já não há consumidor.
- **Remover utilitários mortos:** `deriveCopyFromAi`, `synthesizeTitleFromEmphasis`, `FORBIDDEN_PREFIX`, `splitFirstSentence`, `countWords`, `trimParagraphToSentence`. Reduz superfície e evita re-uso futuro acidental do hero legado.
- Manter `buildFallbackCopy` (`identity.fallback.*`) caso o resolver precise dele no futuro — não usado actualmente após a mudança; remover se ficar realmente órfão (verificar import e remover juntamente com `fallback` local se não for usado).
- **Badge "Leitura provisória" — sem alteração.** A regra actual já cobre o caso: `isProvisional = resolution.source !== "ai" || hasProvisionalWarning`. Aparece exactamente uma vez quando se cai em fallback ou se a IA foi parcialmente descartada.

### 2. `src/components/report-redesign/v2/report-overview-block.tsx`

- **Remover a linha 115** `aiHeroText={enriched.aiInsightsV2?.sections.hero?.text ?? null}` (e qualquer `aiHeroEmphasis={...}` correspondente — confirmar no ficheiro). Mantém todos os outros props (`aiVerdict`, métricas, cadência, etc.) intactos.

## Fora de âmbito (não tocar)

- Geração de relatórios, providers (Apify / OpenAI / DataForSEO), cache, prompts, schemas, validação `validate-v2`.
- Pricing, lead magnet, gates, modal premium, sidebar, i18n de pricing.
- `ai_insights_v2.sections.hero` continua a ser persistido na BD; apenas deixa de ser **lido** pelo Block 1. Não há regeneração de snapshots.
- `editorial-verdict-fallback.ts`: `priority` continua a conter texto no infinitivo ("reforçar…") mas **não é renderizado** no Block 1 — verificar (já verifiquei: o card só usa `resolved.title` e `resolved.paragraph`).

## Por que respeita o requisito de "sem verbos prescritivos"

Os 6 parágrafos em `identity.fallback.*.paragraph` (PT + EN) já são diagnósticos: descrevem o que os dados sugerem ("A leitura principal é…", "A tensão observada está…", "O sinal mais evidente está em…") sem "reforçar", "testar", "publicar mais", "aumentar volume" ou "fazer CTA". Confirmação por grep das chaves alteradas.

## Validação

- `bunx tsc --noEmit` — passa após remoção das props.
- `bunx vitest run` — não existem testes que toquem em `EditorialIdentityCard` / `deriveCopyFromAi` (grep confirmou); deve ficar verde sem alterações.
- Manual:
  - Snapshot antigo com `ai_insights_v2.sections.hero.text` e sem `editorial_verdict` → Block 1 mostra título + parágrafo de `identity.fallback.*` + badge "Leitura provisória" uma vez. Sem hero legado.
  - `robs.cortez` → desaparece o texto "0,1 posts/semana".
  - Snapshot moderno com `editorial_verdict` válido → comportamento inalterado, sem badge provisional.

## Output (após implementação)

- Ficheiros alterados (apenas 2).
- Confirmação grep: zero referências a `aiHeroText` / `aiHeroEmphasis` / `deriveCopyFromAi` em `src/`.
- Confirmação de que não foram tocados providers, schemas, pricing, modal nem sidebar.
