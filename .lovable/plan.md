# Plano — Fechar refinamento do Editorial Verdict (Bloco 1)

Continuação do trabalho já feito. Esta fase é só fallback determinístico + testes + validação. Sem novas chamadas a providers, sem mexer no gate/sidebar, sem regenerar relatórios antigos, sem tocar nos blocos 3–6.

## 1. Atualizar `buildFallbackVerdict`

Ficheiro: `src/lib/report/editorial-verdict-fallback.ts`

- Aceitar novos parâmetros opcionais:
  - `cadenceLabelPt?: string` (ex.: "cerca de 3 publicações por semana nos últimos 30 dias")
  - `hashtagsState?: 'recurring' | 'weak' | 'absent'`
  - `topHashtags?: string[]` (máx. 3)
- Construir parágrafo determinístico em pt-PT respeitando:
  - 90–140 palavras, máx. 4 frases
  - sem `%` nem números privados
  - cadência expressa via `cadenceLabelPt` quando existir
  - hashtags:
    - `recurring` → citar 1–2 (`#tag`) com qualificador "recorrentes"
    - `weak` → "uso pontual de hashtags"
    - `absent` → "sem hashtags relevantes"
  - envolvimento remetido para o benchmark/secções inferiores (sem valor numérico)
- Manter assinatura retrocompatível (todos os novos params opcionais; comportamento legado quando ausentes — snapshots antigos).

## 2. Propagar props até ao card

- `src/lib/report/snapshot-to-report-data.ts`: derivar `cadenceLabelPt`, `hashtagsState`, `topHashtags` do `InsightsContext`/snapshot e incluir no payload do overview.
- `src/components/report-redesign/v2/report-overview-block.tsx`: passar as novas props ao `EditorialIdentityCard`.
- `EditorialIdentityCard`: aceitar e encaminhar para o fallback quando `ai_insights_v2.editorial_verdict` estiver ausente/inválido.
- Fallback para snapshots antigos: se props ausentes, comportamento atual mantém-se (texto legado determinístico sem hashtags/cadence label).

## 3. Testes

### 3.1 Atualizar existente
- `src/lib/insights/__tests__/validate-v2-verdict.test.ts`:
  - Ajustar limites para 90/140 palavras e máx. 4 frases.
  - Cobrir `ENGAGEMENT_PERCENT_LEAK`, `PRIVATE_METRIC_LEAK`, `HASHTAGS_NOT_HANDLED`, `TOO_MANY_SENTENCES`.

### 3.2 Novos
- `src/lib/insights/__tests__/build-context-hashtags.test.ts`:
  - 3 cenários: recurring (≥2 hashtags em ≥30% dos posts), weak (presença esporádica), absent.
  - Verifica `top_hashtags`, `hashtags_state`, `cadence_label_pt`.
- `src/lib/report/__tests__/editorial-verdict-fallback.test.ts`:
  - Casos: com cadence label + recurring hashtags; com weak; com absent; sem props (legado).
  - Asserções: 90–140 palavras, ≤4 frases, sem `%`, hashtags tratadas conforme estado, cadence label embebida quando presente.

## 4. Validação final

- `bunx tsc --noEmit`
- `bunx vitest run`

## Contrato editorial final (recap)

- 90–140 palavras, máx. 4 frases, pt-PT.
- Sem `%`, sem métricas privadas, sem repetir KPIs do header.
- Cadência → frase humana via `cadence_label_pt`.
- Hashtags tratadas explicitamente (recurring/weak/absent).
- Análise visual usada só se `visual_cover` existir no contexto.
- Envolvimento remetido para benchmark/secções inferiores.

## Output esperado (após implementação)

Reporto: ficheiros alterados, contrato editorial, tratamento de hashtags, frase de cadência, confirmação de ausência de `%`, fallback para snapshots antigos, resultado de `tsc` + `vitest`.

## Checkpoint

- ☐ `buildFallbackVerdict` aceita cadence/hashtags e respeita contrato
- ☐ Props propagadas via overview → card
- ☐ `validate-v2-verdict.test.ts` atualizado e a passar
- ☐ `build-context-hashtags.test.ts` criado e a passar
- ☐ `editorial-verdict-fallback.test.ts` criado e a passar
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` verde
