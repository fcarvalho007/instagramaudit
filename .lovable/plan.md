## Objetivo

Tornar o veredicto editorial do Bloco 1 mais concreto, alimentando o `InsightsContext` (e o fallback determinístico) com sinais que já existem no snapshot mas hoje não chegam ao OpenAI: temas/length das captions, resumo/consistência da análise visual, e qualificadores completos da cadência. Reaproveitar o que já está implementado para hashtags e cadência (não duplicar).

Sem novas chamadas a Apify, DataForSEO ou OpenAI. Sem regenerar snapshots existentes.

## Estado actual já cumprido (não mexer)

- `top_hashtags`, `hashtags_state`, `cadence_label_pt` — já no `InsightsContext` (`build-context.ts:158-206`).
- `cadence.method | sampleSize | windowDays | sufficient | reliability | pinnedExcluded | note` — já no `InsightsContext.cadence`.
- Validador v2: bloqueia `%`, métricas privadas, verbos prescritivos, exige tratamento explícito de hashtags, limita parágrafo a 90–140 palavras / 4 frases.
- Fallback determinístico (`buildFallbackVerdict`) não usa `sections.hero.text`.

Por isso a auditoria da prompt do utilizador está parcialmente desactualizada — foco real abaixo.

## Mudanças

### 1. `InsightsContext` — `src/lib/insights/types.ts`

Adicionar dois sub-objectos opcionais (compactos, defensivos):

```ts
caption_intelligence?: {
  topics: string[];                    // dominantThemes.label, máx 3
  caption_length_pattern: string | null; // derivado de formulaicPatterns OU placeholder
  tone_summary: string | null;         // brandVoice.rating + 1 linha de explanation
  hook_pattern: string | null;         // hookQuality.rating + 1 linha
};

visual_cover?: {
  summary: string;                     // visual_cover_analysis.summary
  consistency: "consistent"|"mixed"|"inconsistent"|null; // mapeia repeatedTemplateCount + status
  visual_clarity: "strong"|"needs_improvement"|"critical"; // status
  cover_pattern: string | null;        // aggregate.repeatedTemplateNote
};
```

Ambos `undefined` quando o snapshot ainda não tem `caption_semantic_analysis` / `visual_cover_analysis` (não forçar regeneração).

### 2. `build-context.ts`

- Acrescentar parâmetros opcionais ao `BuildInsightsCtxInput`:
  - `captionSemantic?: CaptionSemanticAnalysis | null`
  - `visualCover?: VisualCoverAnalysis | null`
- Derivar os dois sub-objectos compactos acima usando funções puras locais. Quando o input for `null/undefined`, NÃO adicionar a chave ao ctx.
- Manter o resto idêntico (incluindo `hashtags_state`, `cadence_label_pt`).

### 3. `run-enrichment.server.ts`

Em `buildCtxForInsights`, ler do `ctx.previousPayload`:
- `caption_semantic_analysis` (validar shape mínimo, senão `null`).
- `visual_cover_analysis` (idem).

Passar para `buildInsightsCtx`. Se ambos forem `null` (caso de snapshots antigos ou quando insights_v2 corre antes destes enrichments), o contexto fica idêntico ao actual.

### 4. `EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST` — `types.ts`

Adicionar (mantendo as entradas existentes):
- `top_hashtags`
- `has_recurring_hashtags`
- `caption_intelligence.topics`
- `caption_intelligence.caption_length_pattern`
- `visual_cover.summary`
- `visual_cover.consistency`
- `visual_cover.visual_clarity`
- `cadence.method`
- `cadence.windowDays`
- `cadence.sampleSize`

Nota: `caption_intelligence.topics`, `caption_intelligence.length`, `caption_intelligence.hashtags` já existem. Acrescentamos só `caption_length_pattern` se quisermos distinguir do `length` cru — para evitar duplicação semântica, **manter `caption_intelligence.length`** e mapear `caption_length_pattern` para esse rótulo no prompt; **não adicionar** `caption_intelligence.caption_length_pattern` à allowlist. Apenas os 9 rótulos restantes são novos.

### 5. `prompt-v2.ts` — bloco `editorial_verdict`

Reforçar (sem partir o existente):
- Exigir **≥ 3 sinais de evidência** distintos (já está; clarificar que pelo menos 1 deve vir do conjunto `cadence.*`, `top_hashtags`/`has_recurring_hashtags` ou `benchmark.tier_*`).
- Quando `caption_intelligence` existir, citar 1 tema dominante (sem listar todos). Quando ausente, não mencionar temas.
- Quando `visual_cover` existir, pode referir consistência visual em 1 expressão curta (ex.: "capas com padrão consistente" / "capas ainda dispersas"). Quando ausente, NÃO inventar avaliação visual.
- Manter proibições actuais (`%`, métricas privadas, verbos prescritivos, hashtags inventadas).
- Manter regra de cadência (frase exacta de `cadence_label_pt`).
- Continuar a falar de "atenção sem conversa" quando likes ≈ benchmark e comentários < 2.

### 6. Validador `validate-v2.ts`

- Aceitar os novos rótulos via `EDITORIAL_VERDICT_EVIDENCE_ALLOWLIST` (vem grátis do passo 4).
- Acrescentar guard: se `paragraph` contiver palavras-chave visuais (`capa`, `capas`, `consistência visual`, `padrão visual`) e o `evidence_used` NÃO incluir nenhum `visual_cover.*`, rejeitar com `VISUAL_CLAIM_UNSUPPORTED`. Evita alucinação visual quando o snapshot não tem `visual_cover_analysis`.

### 7. Fallback determinístico + propagação

- `editorial-verdict-fallback.ts` (`buildFallbackVerdict`): aceitar 3 campos opcionais — `cadenceMethod`, `cadenceWindowDays`, `hasRecurringHashtags` — e usá-los para customizar a frase final do parágrafo via i18n:
  - quando `cadenceMethod === "window_30d"` → sufixo "nos últimos 30 dias"
  - quando `cadenceMethod === "window_90d"` → "nos últimos 90 dias"
  - quando `cadenceMethod === "sample_span"` → "na amostra recente"
  - quando `hasRecurringHashtags === false` → frase "Sem hashtags recorrentes na amostra."

  Implementação: novas chaves opcionais em `pt/report.json` (`identity.fallback_cadence_qualifier.*`, `identity.fallback_hashtags_absent`); o template existente passa a interpolar `{{cadenceQualifier}}` e `{{hashtagsLine}}` com `defaultValue: ""`. Snapshots antigos (sem cadência fiável) continuam a renderizar sem ruído.

- `EditorialIdentityCard`: adicionar props opcionais `cadenceMethod`, `cadenceWindowDays`, `hasRecurringHashtags`, `topHashtags` (passados ao `buildFallbackVerdict`).

- `snapshot-to-report-data.ts`: ler estes campos do snapshot (`ai_insights_v2.editorial_verdict`-derivados ou directamente do `normalized_payload.posts` para hashtags + do objecto `cadence`) e propagar ao card.

### 8. Testes

Novos / actualizados em `src/lib/insights/__tests__/`:

- `build-context-caption-visual.test.ts` (novo):
  - Captions presentes → `ctx.caption_intelligence` tem topics + tone.
  - Captions ausentes → chave não está no ctx.
  - Visual cover presente → `ctx.visual_cover` tem summary + consistency.
  - Visual cover ausente → chave não está.
- `validate-v2-verdict.test.ts` (extender):
  - Rejeita "capas consistentes" sem `visual_cover.*` em evidence (`VISUAL_CLAIM_UNSUPPORTED`).
  - Aceita evidência nova (`top_hashtags`, `cadence.method`, `visual_cover.summary`).
  - Continua a rejeitar `%`, métricas privadas, verbos prescritivos.
- `editorial-verdict-fallback.test.ts` (novo):
  - `cadenceMethod=window_30d` injecta "nos últimos 30 dias".
  - `hasRecurringHashtags=false` injecta "Sem hashtags recorrentes na amostra.".
  - Sem campos opcionais, parágrafo continua igual ao baseline actual.
  - Nunca usa `sections.hero.text`.

Reusar fixtures existentes em `__tests__`.

### 9. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`

## Ficheiros tocados

- `src/lib/insights/types.ts` (+ allowlist + dois sub-objectos novos)
- `src/lib/insights/build-context.ts` (input + derivação)
- `src/lib/enrichment/run-enrichment.server.ts` (`buildCtxForInsights` passa caption/visual)
- `src/lib/insights/prompt-v2.ts` (regras editoriais novas)
- `src/lib/insights/validate-v2.ts` (guard visual sem evidência)
- `src/lib/report/editorial-verdict-fallback.ts` (qualificadores opcionais)
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (novas props)
- `src/lib/report/snapshot-to-report-data.ts` (propagar props)
- `src/i18n/locales/pt/report.json` (`fallback_cadence_qualifier.*`, `fallback_hashtags_absent`)
- testes acima

## Fora de âmbito (não tocar)

- Apify, DataForSEO, novas chamadas OpenAI.
- `ai_insights_v2.sections.hero.text` continua proibido como parágrafo principal.
- Blocos 3–6, sidebar, gate, modal, pricing.
- Mudar Top-N de hashtags / cadência (já estão).
- Regenerar snapshots — todas as mudanças são retro-compatíveis com `undefined`.

## Checkpoint

- [ ] `InsightsContext` ganha `caption_intelligence` e `visual_cover` opcionais
- [ ] `buildInsightsCtx` deriva-os a partir dos novos inputs
- [ ] `run-enrichment.server.ts` lê do `previousPayload` e injecta
- [ ] Allowlist estendida com 9 rótulos novos
- [ ] Prompt cita visual/temas só quando os campos existem
- [ ] Validador rejeita afirmação visual sem evidência visual
- [ ] Fallback usa qualificadores de cadência + linha "sem hashtags recorrentes"
- [ ] Card e adapter propagam as props novas
- [ ] Snapshots antigos continuam a render sem regressão
- [ ] `tsc --noEmit` limpo
- [ ] `vitest run` verde
