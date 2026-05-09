## Objetivo

Tornar o feedback dos beta testers visível e acionável no CRM (Lead Detail Sheet + Kanban), com interpretação comercial e sugestão de próximo passo. Sem tocar no formulário público nem em providers/PDF.

---

## 1. Backend — expor `beta_feedback` no payload do CRM

Ficheiro: `src/routes/api/admin/leads-kanban.ts`

- Após obter `requests`, fazer um `select` em `beta_feedback` por `report_request_id IN (...)`.
- Construir `feedbackByLead: Map<lead_id, BetaFeedbackRow>` (mais recente por lead, normalmente único pelo `UNIQUE(report_request_id)`).
- Anexar campo `feedback` ao objeto enriquecido devolvido por lead (ou `null`).

Sem alterações de schema. Sem migrations.

---

## 2. Interpretação comercial — helper puro

Novo ficheiro: `src/lib/admin/feedback-intent.ts`

Exporta:

```ts
export type FeedbackIntent = "alto" | "medio" | "baixo" | "sem";

export interface FeedbackIntentResult {
  intent: FeedbackIntent;
  label: string;        // "Intenção alta", etc.
  accent: "revenue" | "signal" | "neutral" | "expense";
  nextAction: string;   // "Responder com proposta de relatório único", etc.
}

export function interpretFeedback(fb: BetaFeedbackRow | null): FeedbackIntentResult
```

Regras:

| Condições                                                                                       | Intent | Próxima ação                              |
| ---                                                                                             | ---    | ---                                       |
| `purchase_intent="sim"` + `contact_consent=true` + `score≥4`                                    | alto   | conforme `pricing_preference` (ver abaixo) |
| `purchase_intent="sim"` ou (`talvez` + `score≥4` + `contact_consent`)                           | médio  | "Explorar plano mensal" / bundle           |
| `purchase_intent="talvez"` sem consentimento, ou `score=3`                                      | baixo  | "Nutrir mais tarde"                        |
| `purchase_intent="nao"` ou `score≤2`                                                            | sem    | "Arquivar / nutrir mais tarde"             |
| `fb=null`                                                                                       | sem    | (não usado — secção mostra empty state)    |

Mapeamento `pricing_preference → ação`:
- `one_off_3` → "Responder com proposta de relatório único"
- `bundle_5_13` → "Sugerir bundle 5"
- `plano_mensal` / `plano_agencia` → "Explorar plano mensal"
- `nao_sei` / `undefined` → fallback pela intent

Testes em `src/lib/admin/__tests__/feedback-intent.test.ts` cobrem cada combinação.

---

## 3. Tipos partilhados

`src/lib/admin/kanban-columns.ts`:

```ts
export interface BetaFeedbackSummary {
  id: string;
  usefulness_score: number;
  clarity_text: string | null;
  missing_text: string | null;
  purchase_intent: "sim" | "talvez" | "nao";
  pricing_preference: string | null;
  contact_consent: boolean;
  created_at: string;
}
```

Adicionar `feedback: BetaFeedbackSummary | null` a `EnrichedLead`.

---

## 4. Lead Detail Sheet — secção "Feedback beta"

Ficheiro: `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`

Inserir nova secção entre "Relatório" e "Inteligência comercial" (apenas quando faz sentido — empty state simples se ausente).

Layout compacto:

- Cabeçalho: `SectionTitle` "Feedback beta" + `relativeTime(created_at)` à direita.
- Linha de score: 5 pontos preenchidos conforme `usefulness_score` (reutilizar tokens, sem hardcodes).
- `DetailRow "Disposto a pagar"` → label PT + badge.
- `DetailRow "Opção preferida"` → `PRICING_PREFERENCE_LABELS[…]` ou "—".
- `DetailRow "Permite contacto"` → "Sim" / "Não".
- Bloco texto livre (apenas se preenchidos):
  - "O que ficou mais claro" → `clarity_text`
  - "O que faltou" → `missing_text`
- Caixa destacada (mesmo estilo do "Próximo passo sugerido", cor pelo accent da `interpretFeedback`):
  - eyebrow "Sinal comercial" + intent label
  - "Sugestão" + `nextAction`

Empty state (sem feedback): card minimal com "Sem feedback ainda" e CTA "Pedir feedback" (já existe acima — apenas referenciar).

A `Inteligência comercial` continua a usar o `suggestNextLeadAction` baseado no estado, mas se houver feedback, sobrescreve o `intent` mostrado lá pela interpretação do feedback (mais forte que o sinal heurístico).

---

## 5. Kanban Card — badges de feedback

Ficheiro: `src/components/admin/v2/beta-leads/lead-card.tsx`

Na linha de badges existente, juntar (apenas se `lead.feedback`):
- `AdminBadge` "Feedback" (variant `info`) com tooltip do score (`★ 4/5`).
- `AdminBadge` da intent (variant pelo accent retornado por `interpretFeedback`).

Sem aumentar altura do card — ambas as badges entram no mesmo flex-wrap.

---

## 6. Timeline — `feedback_submitted`

Já existe `EVENT_LABELS.feedback_submitted` e `EVENT_ICONS.feedback_submitted`. Confirmar visualmente; nenhuma mudança de código necessária.

---

## 7. Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (incluindo `feedback-intent.test.ts`)
- Manual: lead com feedback mostra a secção; lead sem feedback mostra empty state limpo; card mostra badges quando aplicável.

---

## Ficheiros tocados

**Novos**
- `src/lib/admin/feedback-intent.ts`
- `src/lib/admin/__tests__/feedback-intent.test.ts`

**Editados**
- `src/lib/admin/kanban-columns.ts` — tipo `BetaFeedbackSummary` + campo no `EnrichedLead`
- `src/routes/api/admin/leads-kanban.ts` — fetch + map + payload
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — nova secção + override do intent
- `src/components/admin/v2/beta-leads/lead-card.tsx` — badges

**Não tocados**
- Formulário público (`feedback-form.tsx`, `feedback-schema.ts`, `routes/feedback.$requestId.tsx`)
- API pública `/api/public/feedback.$requestId.ts`
- Pipelines de relatório / PDF / providers
- `supabase/migrations/*`

---

## Checkpoint

- ☐ Endpoint devolve `feedback` por lead
- ☐ `interpretFeedback` cobre todas as combinações + testes verdes
- ☐ Lead Detail Sheet renderiza secção e empty state em pt-PT
- ☐ Card mostra badges sem quebrar layout
- ☐ `tsc --noEmit` limpo · `vitest` 100% verde