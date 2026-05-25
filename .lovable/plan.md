# Veredicto editorial — gaps do Prompt 3B + Prompt 4

## Estado actual (já feito)

- `EditorialVerdict` tipado em `src/lib/insights/types.ts` com `verdict_label`, `title`, `paragraph`, `priority`, `strengths`, `limitations`, `confidence`, `evidence_used`, `warnings`.
- JSON schema strict em `prompt-v2.ts` (strengths/limitations = 2, paragraph 30–75 palavras, evidence allowlist).
- Validador em `validate-v2.ts` com deteção de fugas técnicas e pt-BR.
- `finalizeEditorialVerdict` em `openai-insights.server.ts` calcula `warnings` determinísticos (`low_sample`, `stale_data`, `cadence_uncertain`, `no_market_signals`, `benchmark_missing`) e rebaixa `confidence`.
- `EditorialIdentityCard` consome `aiVerdict` com `priority` numa linha abaixo do parágrafo; `buildFallbackCopy` cobre os 4 bands + cenários (i18n PT).
- 471 testes a passar.

## Gaps a fechar

### Gap 1 — Guard determinístico de contradições (Prompt 4, Parte 4)
Não existe `deriveEditorialVerdict(input)`. Hoje o card consome `aiVerdict` directamente ou cai no `buildFallbackCopy` apenas quando a IA está ausente. Não há rejeição quando a IA contradiz métricas.

Criar `src/lib/report/editorial-verdict.ts`:

```ts
export interface EditorialVerdictMetrics {
  postsPerWeek30d: number | null;       // cadência corrigida (do snapshot)
  cadenceSufficient: boolean;            // do módulo cadence
  engagementPct: number;                 // perfil
  benchmarkEngagementPct: number | null; // tier
  avgComments: number;
  avgLikes: number;
  competitorsCount: number;
  postsAnalyzed: number;
  daysSinceLastPost: number | null;
}

export interface EditorialVerdictResolution {
  verdict: EditorialVerdict;
  source: "ai" | "ai_downgraded" | "fallback";
  rejectionReasons: ReadonlyArray<
    | "cadence_contradiction"
    | "engagement_contradiction"
    | "conversation_contradiction"
    | "phantom_competitors"
    | "schema_invalid"
  >;
}

export function deriveEditorialVerdict(
  ai: EditorialVerdict | null,
  metrics: EditorialVerdictMetrics,
  fallback: EditorialVerdict,
): EditorialVerdictResolution
```

Regras de rejeição (palavras-chave pt-PT detectadas com regex case-insensitive nos campos `title`, `paragraph`, `priority`, `strengths`, `limitations`):

1. **cadence_contradiction** — IA usa termos `cadência fraca|baixa cadência|publica pouco|publicar mais|aumentar frequência` quando `postsPerWeek30d ≥ 2.5` e `cadenceSufficient === true`.
2. **engagement_contradiction** — IA usa `audiência não reage|envolvimento forte|reage muito|excelente envolvimento` quando `engagementPct ≥ benchmarkEngagementPct * 1.1` (positivo falso) ou inverso quando IA diz `forte` e `engagementPct < benchmarkEngagementPct * 0.7`.
3. **conversation_contradiction** — IA usa `conversa ativa|conversa saudável|comentários ricos` quando `avgComments < 2`.
4. **phantom_competitors** — IA menciona `concorrente|competidor|benchmark do setor` quando `competitorsCount === 0`.

Acção por número de contradições:
- 0 → `source: "ai"`, devolve `ai` tal como veio.
- 1 → `source: "ai_downgraded"`, preserva `title`/`strengths`/`limitations`/`priority` mas substitui `paragraph` pelo do `fallback`, força `confidence: "low"`, anota `rejectionReasons`.
- ≥2 → `source: "fallback"`, descarta IA, devolve `fallback` com `confidence: "low"`.

Adicionalmente, se `ai === null` (IA ausente ou schema_invalid) → `source: "fallback"`.

### Gap 2 — `evidence_used` mínimo (Prompt 4, Parte 1)
Spec diz "at least 3 items". Esquema actual e validador permitem `min(1)`.

Mudanças:
- `src/lib/insights/validate-v2.ts`: `evidence_used: z.array(...).min(3).max(6)`.
- `src/lib/insights/prompt-v2.ts`: JSON schema `minItems: 3` em `evidence_used`; texto do prompt passa a "3 a 6 rótulos".

Risco: aumenta probabilidade de schema reject em respostas curtas. Mitigação: `EVIDENCE_ALLOWLIST` tem 14 itens e o contexto típico cobre cadence + benchmark + format_mix, logo ≥3 é alcançável; se ainda assim falhar, o novo `deriveEditorialVerdict` cai para fallback.

### Gap 3 — Integrar `deriveEditorialVerdict` no adapter (snapshot → report)
Hoje `snapshot-to-report-data.ts` expõe `editorialVerdict` cru da IA. Passar a chamar `deriveEditorialVerdict(aiVerdict, metrics, fallback)` aqui, onde já existe acesso a `cadence`, `benchmark`, `content_summary` e `competitors`.

Resultado exposto em `ReportEnriched`:
```ts
editorialVerdict: EditorialVerdict;             // sempre presente
editorialVerdictSource: "ai" | "ai_downgraded" | "fallback";
editorialVerdictRejections: string[];           // para diagnóstico admin
```

O `fallback` é construído server-side a partir das mesmas regras já em `buildFallbackCopy` do componente (extrair lógica partilhada para `src/lib/report/editorial-verdict-fallback.ts`, usar em ambos os sítios).

### Gap 4 — UI consome resolução, não a IA bruta
`EditorialIdentityCard` passa a receber `editorialVerdict` (já resolvido) + `editorialVerdictSource`. Quando `source !== "ai"`, mostrar pequeno badge `Leitura provisória` ao lado do título (i18n `identity.verdict.provisional`). Layout intacto.

### Gap 5 — i18n EN (Prompt 4, Parte 6)
`buildFallbackCopy` usa `t("identity.fallback.<key>.title|paragraph")`. Verificar `src/i18n/locales/en.json` e adicionar chaves para `strong`, `promising`, `needs_work`, `limited_data` + cenários (`low_engagement`, `healthy_cadence_low_engagement`, `low_cadence_low_engagement`, `weak_comments`, `insufficient_sample`). PT já existe.

### Gap 6 — Testes (Prompt 4, Parte 7)
Criar `src/lib/report/__tests__/editorial-verdict.test.ts`:

- cadência saudável (`postsPerWeek30d=4`, `cadenceSufficient=true`) + IA diz "publicar mais" → 1 contradição → `ai_downgraded`, `confidence=low`.
- cadência fraca + envolvimento fraco + IA admite ambos → `source=ai`.
- bons gostos + comentários ~0 + IA diz "conversa saudável" → 1 contradição → `ai_downgraded`.
- envolvimento > benchmark + IA diz "audiência não reage" → 1 contradição → `ai_downgraded`.
- IA menciona "concorrentes" com `competitorsCount=0` → 1 contradição → `ai_downgraded`.
- 2 contradições em simultâneo → `source=fallback`.
- `ai === null` → `source=fallback`.
- `postsAnalyzed < 5` → fallback usa `limited_data`.
- EN locale → fallback devolve cópia inglesa.
- IA limpa coerente com métricas → `source=ai`, `confidence` preservado.

## Onde mexer

| Ficheiro | Mudança |
|---|---|
| `src/lib/report/editorial-verdict.ts` (novo) | `deriveEditorialVerdict` + tipos |
| `src/lib/report/editorial-verdict-fallback.ts` (novo) | `buildFallbackVerdict` partilhado (server + client) |
| `src/lib/insights/validate-v2.ts` | `evidence_used.min(3)` |
| `src/lib/insights/prompt-v2.ts` | `minItems: 3` + texto do prompt |
| `src/lib/report/snapshot-to-report-data.ts` | chamar `deriveEditorialVerdict`, expor `source`/`rejections` |
| `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` | consumir `editorialVerdict` resolvido + badge `provisional` |
| `src/i18n/locales/en.json` | chaves `identity.fallback.*` e `identity.verdict.provisional` |
| `src/i18n/locales/pt.json` | chave `identity.verdict.provisional` |
| `src/lib/report/__tests__/editorial-verdict.test.ts` (novo) | 10 testes acima |

## Riscos

- **Falsos positivos do regex de contradição** — palavras-chave pt-PT podem aparecer em frases não-contraditórias ("não é cadência fraca"). Mitigação: regex simples + threshold conservador (1 contradição = downgrade suave, não fallback total) + testes de regressão com excertos reais.
- **`evidence_used.min(3)` aumenta retries** — aceitar 1 retry; se persistir, fallback.
- **Tradução EN** — só cobre os deterministic fallbacks; IA continua a responder em pt-PT (validador pt-BR mantém-se).

## Não-objectivos

- Não criar nova chamada à OpenAI.
- Não mexer em Blocos 2–6, gauge, métricas, gating, pricing, admin.
- Não alterar prompt além do `minItems: 3` em `evidence_used`.

## Checkpoint

- ☐ Auditar `i18n/locales/en.json` para chaves `identity.fallback.*`
- ☐ Extrair `buildFallbackVerdict` partilhado
- ☐ Criar `deriveEditorialVerdict` com 4 regras de contradição
- ☐ Subir `evidence_used` para `min(3)` em validador + schema + prompt
- ☐ Integrar no adapter `snapshot-to-report-data.ts`
- ☐ Card consome resolução + badge `provisional`
- ☐ i18n PT/EN actualizado
- ☐ 10 testes do helper a passar
- ☐ `bunx tsc --noEmit` limpo
- ☐ `bunx vitest run` todo verde (espera 481+ testes)
