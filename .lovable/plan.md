## Cached AI Editorial Readings — implementação

Implementação da arquitetura já aprovada. Server-only, single-shot, cache por snapshot+comparação+modelo, UI opcional abaixo das métricas determinísticas.

---

### 1. Storage (sem schema nova)

Reuso da infra existente `enrichment_jobs` + `normalized_payload`, sem nova tabela (a arquitetura admite "enrichment_jobs result payload" como opção; é a que minimiza superfície e respeita "não mudar schema sem aprovação").

- Novo `EnrichmentType = "comparison_readings"` em `src/lib/enrichment/types.ts`.
- Adicionado a `PAID_ENRICHMENT_TYPES` (corre só em Pro; o enqueue paid já está condicionado a entitlement).
- Resultado escrito em `normalized_payload.ai_comparison_readings_v1` com a forma:

```ts
{
  version: "1",
  model: "google/gemini-3-flash-preview",
  prompt_version: "v1",
  evidence_hash: string,            // sha256 do evidence pack
  competitor_handle: string,        // primeiro concorrente (MVP: 1)
  window: string,                   // ex "30d"
  generated_at: string,             // ISO
  readings: ComparisonAIReadings,   // ver §3
  status: "ready" | "failed",
  error?: string,
}
```

Idempotência: o runner skipa se `evidence_hash` no payload bate com o recomputado, ou se `model`/`prompt_version` não mudaram. Reanálise não recalcula → custo controlado.

---

### 2. Files to add

```text
src/lib/comparison-readings/
  types.ts                       // Zod schema + types
  build-evidence.ts              // pure: snapshot → evidence pack (testável)
  build-evidence.test.ts
  prompt.ts                      // system + user templates (v1)
  generate.server.ts             // calls Lovable AI Gateway, validates output
  validate.ts                    // post-hoc: cada evidence_point existe no pack
```

```text
src/components/report-redesign/v2/leitura-ia/
  leitura-ia-box.tsx             // <LeituraIaBox cardId reading /> — render only
  use-comparison-readings.ts     // pure selector from snapshot payload
```

### 3. JSON schema (Zod, estrito)

```ts
const CardId = z.enum([
  "overview","engagement","cadence","weekday_rhythm",
  "format_mix","bio_conversion","top_posts",
]);

const EvidencePoint = z.object({
  label: z.string().min(1).max(60),
  field: z.string().min(1).max(60),     // chave canónica do evidence pack
  primary_value: z.union([z.string(), z.number(), z.null()]),
  competitor_value: z.union([z.string(), z.number(), z.null()]),
});

const CardReading = z.object({
  card_id: CardId,
  headline: z.string().min(1).max(90),
  key_reading: z.string().min(1).max(420),
  evidence_points: z.array(EvidencePoint).min(0).max(4),
  recommendation: z.string().max(220).nullable(),
  confidence: z.enum(["low","medium","high"]),
  caveats: z.array(z.string().max(140)).max(4),
});

export const ComparisonAIReadingsSchema = z.object({
  version: z.literal("1"),
  language: z.literal("pt-PT"),
  global_summary: z.object({
    headline: z.string().min(1).max(110),
    key_reading: z.string().min(1).max(360),
    confidence: z.enum(["low","medium","high"]),
  }),
  cards: z.array(CardReading).min(1).max(7),
});
```

### 4. Evidence pack (input do modelo)

`buildComparisonEvidence(payload, competitorIndex=0, window)` — função pura, sem I/O. Extrai do `normalized_payload` campos já existentes (profile, summary, format_stats, weekday counts, top hashtags/mentions, recentPosts truncados, deltas). Nada novo do Apify. Hash determinístico com `sha256(JSON.stringify(stableSort(pack)))`.

Campos PII proibidos pelo construtor: emails, telefones, thumbnail URLs, follower lists.

### 5. Generation (server-only)

`generateComparisonReadings.server.ts`:
- Recebe `{ snapshotId, competitorHandle, window }`.
- Lê snapshot via `supabaseAdmin`.
- Constrói evidence pack + hash.
- Short-circuit: se `normalized_payload.ai_comparison_readings_v1.evidence_hash === hash` e `model`/`prompt_version` iguais → return cached.
- Gate: precisa de ≥1 competitor com `success:true` e Pro entitlement (verificado a montante pelo enqueue).
- AI SDK via Lovable Gateway helper já existente (`src/lib/ai-gateway.server.ts` se existir; senão criar usando padrão do `ai-sdk-lovable-gateway`).
- `generateObject` / `Output.object(ComparisonAIReadingsSchema)` com `google/gemini-3-flash-preview`, `temperature: 0.4`, `maxOutputTokens: 1400`.
- Validação pós-hoc (`validate.ts`): cada `evidence_points[].field` tem de existir no pack; `primary_value`/`competitor_value` têm de bater com pack (≤1% tolerância numérica). Se falhar → status `failed`, payload guarda erro.
- Log custo em `provider_call_logs` (provider=`lovable-ai`, actor=`comparison-readings`, source_context=`enrichment`).
- Patch escrito via runner standard (`payloadPatch: { ai_comparison_readings_v1: {...} }`).

### 6. Runner integration

Em `run-enrichment.server.ts`:
- Novo handler `runComparisonReadings(ctx, snapshot)` no switch dispatch.
- Skipa quando `ctx.competitors` vazio ou nenhum tem dados → status `skipped` com motivo `no_competitors`.
- Adicionado a `ALL_ENRICHMENT_TYPES` + `PAID_ENRICHMENT_TYPES`.
- `ENRICHMENT_PRIORITY.comparison_readings = 40` (corre depois das métricas determinísticas estarem prontas).
- `buildInitialEnrichmentStatus` / `buildFreeEnrichmentStatus` atualizados (Free marca como `skipped_free`).

### 7. Prompt (v1)

System (PT-PT):
```
És um analista editorial de Instagram. Escreves em português europeu, tom credível e prático.
Recebes um EVIDENCE PACK comparativo entre PERFIL e CONCORRENTE.
Regras absolutas:
- Usa APENAS valores presentes no EVIDENCE PACK. Nunca inventes números, datas ou factos.
- Cada card tem 0–4 evidence_points; field/value vêm literalmente do pack.
- Se faltar dado de um lado: confidence="low", recommendation=null, adiciona um caveat
  explicando "dados insuficientes do concorrente" ou "amostra demasiado pequena".
- Nunca comentes thumbnails, identidades, ou conteúdo não presente.
- Sem superlativos não suportados ("o melhor", "explosivo", etc.).
- Devolve estritamente o schema JSON pedido. Sem markdown.
```

User: `EVIDENCE_PACK:\n<json>\nGera ComparisonAIReadings v1 para os cards aplicáveis.`

### 8. UI

- `useComparisonReadings(payload)` — selector puro, devolve `{ global, byCard }` ou `null` quando ausente/malformado (try/catch + zod safeParse).
- `<LeituraIaBox cardId="engagement" />` — caixa opcional dentro de cada `CompareCardShell` via prop `aiReading?: ReactNode`. Render:
  - eyebrow `● LEITURA IA` (accent-primary),
  - headline Inter SemiBold,
  - key_reading texto secundário,
  - chip de confidence,
  - linha de caveats em `text-content-tertiary`,
  - `Sugestão:` quando `recommendation` existe.
- `<ExecutiveSummary global={...} />` opcional no topo da secção comparativa.
- Quando `null`/`pending`/malformado → não renderiza nada (card determinístico fica idêntico).
- Skeleton só quando `enrichment_status.comparison_readings === "running"`.

### 9. Files to edit

- `src/lib/enrichment/types.ts` — novo tipo + priority + arrays.
- `src/lib/enrichment/run-enrichment.server.ts` — dispatch + handler.
- `src/lib/enrichment/enqueue-paid.server.ts` — enqueue só se houver competitor.
- `src/components/report-redesign/v2/compare/compare-card-shell.tsx` — prop opcional `aiReading`.
- Cada um dos 6 cards (`competitor-overview-compare`, `competitor-engagement-compare`, `competitor-cadence-compare`, `competitor-weekday-compare`, `competitor-format-compare`, `competitor-bio-compare`) — lê reading via hook e passa ao shell.
- Local apropriado no shell do report Pro — render `<ExecutiveSummary />`.

### 10. Validation guarantees

- Zod `safeParse` em todo o consumo → JSON malformado é silenciosamente ignorado.
- UI degrada para determinístico (já o faz quando `aiReading={null}`).
- Sem chamadas AI no cliente; nenhum `useEffect` que dispara generate.
- Refresh da página apenas lê `normalized_payload` já persistido.
- Free/Public report nunca toca este código (gate em `PAID_ENRICHMENT_TYPES` + entitlement check no enqueue).
- Sem alterações em checkout, EuPago, credits, ou Free path.

### 11. Test plan

- Unit: `build-evidence.test.ts` (campos esperados, sem PII, hash estável).
- Unit: `validate.test.ts` (rejeita evidence_point com field inexistente; rejeita mismatch numérico >1%).
- Unit: hook `useComparisonReadings` devolve null para payload vazio/malformado.
- Smoke: `run-enrichment.server.ts` skipa quando sem competitor.
- Typecheck via build automático.

### 12. Fora de scope (não tocar)

- `/report.example` (continua mockup).
- Free / Public report.
- Checkout, EuPago, créditos, payments, subscriptions.
- Apify calls.
- Migrations SQL (não há tabela nova nesta fase).
- Streaming, chat-com-report, edição manual de leituras, multi-idioma.

### 13. Riscos

| Risco | Mitigação |
| --- | --- |
| Modelo devolve JSON malformado | Zod safeParse + status `failed`; UI esconde caixa. |
| Hallucination numérica | Validador post-hoc compara cada evidence_point ao pack. |
| Custo descontrolado | Single-shot + hash idempotente + gate Pro + log em `provider_call_logs`. |
| Quebra do report determinístico | `aiReading` é prop opcional; ausência → render igual ao atual. |
| Mudança do payload Apify | `buildComparisonEvidence` é o único acoplamento; coberto por teste. |
