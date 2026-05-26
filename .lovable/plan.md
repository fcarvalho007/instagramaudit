## Estado actual (já implementado)

A maior parte do trabalho do passo anterior já está no código:

- `src/lib/report/editorial-verdict-fallback.ts` aceita `FallbackQualifiers` com `cadenceLabelPt`, `hashtagsState`, `topHashtags`, `hasRecurringHashtags`, `cadenceMethod`. As regras descritas no pedido (recurring/weak/absent, cita até 2 tags com `#`, sem `%`, prioridade do `cadenceLabelPt`, frase cautelosa quando insuficiente) já estão implementadas.
- `src/lib/insights/build-context.ts` já deriva `top_hashtags`, `hashtags_state`, `cadence_label_pt` e injecta `caption_intelligence` + `visual_cover` quando há análise persistida.
- `snapshot-to-report-data.ts` → `report-overview-block.tsx` → `EditorialIdentityCard` já propagam `cadenceLabelPt`, `hashtagsState`, `topHashtags` para o fallback.
- `EditorialIdentityCard` nunca renderiza `ai_insights_v2.sections.hero.text` (comentário explícito + `copy` vem só de `resolved.title/paragraph`). Não existe `deriveCopyFromAi` no caminho activo (a única referência a `AI_INSIGHTS_MOCK.hero.text` é a página de exemplo `report-page.tsx`, mock isolado).
- Testes existentes: `validate-v2-verdict.test.ts` (cobre 90–140 palavras, máx 4 frases, sem `%`, sem métricas privadas, `HASHTAGS_NOT_HANDLED`, `VISUAL_CLAIM_UNSUPPORTED`, `PTBR_LEAK`, evidências), `build-context-hashtags.test.ts` (recurring/weak/absent + cadence label), `editorial-verdict-fallback.test.ts` (retrocompat, recurring, weak, absent, prioridade `cadenceLabelPt`, sem `%`).

## Gaps a fechar

1. **Falta o ficheiro `src/lib/insights/__tests__/build-context-caption-visual.test.ts`** com 4 casos: caption presente / caption ausente / visual presente / visual ausente — assegurando que `ctx.caption_intelligence` e `ctx.visual_cover` são incluídos/omissos de forma segura.

2. **Reforçar `editorial-verdict-fallback.test.ts`** com 2 cenários ainda não cobertos:
   - fallback sem `cadenceLabelPt` nem `cadenceMethod` (apenas hashtags absent) — confirma linguagem cautelosa, sem frase de cadência.
   - fallback é diagnóstico, não prescritivo — paragraph não contém verbos prescritivos no imperativo (`publica`, `usa`, `aposta`, `cria`, `evita`, `reduz`, `aumenta`, `começa`, `deves`, `tens de`).
   - (legacy hero text): assert directo de que o paragraph não contém marcadores conhecidos do hero mock (`AI_INSIGHTS_MOCK.hero.text`). A função não importa nada do hero, mas o teste serve de guarda contra regressões.

3. **Confirmação de segurança legacy**: nenhuma alteração de código — só validação por `rg` que `sections.hero.text` continua sem ser consumido pelo card e que `deriveCopyFromAi` continua inexistente. Já confirmado durante a exploração; será re-executado e reportado.

4. **Validação final**:
   - `bunx tsc --noEmit`
   - `bunx vitest run`
   - Reporte estruturado conforme os 10 pontos pedidos.

## Out of scope (explicitamente não tocar)

- Pricing, sidebar, modal, gates, admin, blocos 3–6.
- Apify, OpenAI, DataForSEO, Brevo, Resend.
- Schema/migrations.
- Qualquer redesign visual além do prop-wiring já existente.
- `report-page.tsx` / `report.example` (mock isolado).

## Checkpoint

☐ Criar `src/lib/insights/__tests__/build-context-caption-visual.test.ts` (4 cenários)
☐ Adicionar 2–3 casos a `src/lib/report/__tests__/editorial-verdict-fallback.test.ts` (sem cadência, não prescritivo, sem hero legacy)
☐ Correr `bunx tsc --noEmit`
☐ Correr `bunx vitest run`
☐ Reportar: ficheiros alterados, testes, comportamento final do fallback, hashtags (recurring/weak/absent), cadence label, caption/visual, confirmação no-legacy-hero, resultado tsc, resultado vitest, gaps restantes