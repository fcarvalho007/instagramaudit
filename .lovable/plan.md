# Plano — Formulário público de feedback beta

## 1. Rota pública

Criar `src/routes/feedback.$requestId.tsx` (rota pública, sem auth gate).

- Param `requestId` = `report_requests.id` (UUID, já público no link enviado por email; o lead deve apenas conseguir abrir a partir do email).
- `loader` chama um server function público para validar o `requestId` e devolver dados mínimos (nome do lead, handle, se já foi submetido feedback).
- Estados de UI:
  - **Inválido** → mensagem clara: "Link inválido ou expirado."
  - **Já submetido** → ecrã "Já recebemos o teu feedback. Obrigado." (sem reabrir form).
  - **Form** → mostra perguntas.
  - **Thank-you** → após submit.

## 2. Schema (nova tabela)

Recomendação: **criar tabela nova `beta_feedback`**. Motivo: dados de pesquisa têm estrutura própria (escala, intenção de compra, opção de pricing) e não pertencem a `leads` ou `report_requests`. Mantém CRM limpo.

```sql
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  report_request_id uuid NOT NULL UNIQUE,  -- evita duplicados
  usefulness_score smallint NOT NULL CHECK (usefulness_score BETWEEN 1 AND 5),
  clarity_text text,
  missing_text text,
  purchase_intent text NOT NULL CHECK (purchase_intent IN ('sim','talvez','nao')),
  pricing_preference text CHECK (pricing_preference IN ('one_off_3','bundle_5_13','plano_mensal','plano_agencia','nao_sei')),
  contact_consent boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
-- Sem policies públicas: tudo via server function com supabaseAdmin.
CREATE INDEX idx_beta_feedback_lead ON public.beta_feedback(lead_id);
```

`UNIQUE (report_request_id)` resolve duplicados a nível de DB. Server function trata o erro de conflito devolvendo `already_submitted`.

## 3. Endpoints (server routes públicas)

Sob `/api/public/` para bypass de auth, sempre validados.

- `GET /api/public/feedback/$requestId` → valida, devolve `{ ok, leadFirstName, handle, alreadySubmitted }`. Se válido e ainda não submetido, regista evento `feedback_started` (idempotente: só na primeira chamada por requestId, controlado checando se já existe um `feedback_started` no `product_events` para esse lead+request).
- `POST /api/public/feedback/$requestId` → valida payload com Zod, insere em `beta_feedback`, regista evento `feedback_submitted`, atualiza `commercial_status` do lead para `feedback_recebido` via `updateLeadCommercialStatus({source:"auto"})`. Em caso de violação UNIQUE, devolve `{ ok:false, code:"already_submitted" }`.

## 4. UI do formulário (mobile-first)

Componente `FeedbackForm` em `src/components/feedback/feedback-form.tsx`:

- 6 perguntas numa única página (sem multi-step, evita "feel de inquérito longo").
- Indicador visual leve: "6 perguntas · ~1 minuto".
- Pergunta 1: 5 botões grandes (1–5) com legenda "Nada útil → Muito útil".
- Perguntas 2 e 3: `<textarea>` com `maxLength=500`.
- Pergunta 4: `<RadioGroup>` (Sim / Talvez / Não).
- Pergunta 5: `<RadioGroup>` com 5 opções de pricing.
- Pergunta 6: `<Switch>` consentimento de contacto (default off).
- Apenas Pergunta 1 e Pergunta 4 obrigatórias.
- Validação client-side com Zod + react-hook-form (já no projeto).
- Após submit: ecrã thank-you com link "Voltar ao InstaBench".
- Tokens semânticos apenas (sem cores hardcoded). Inter para tudo, Fraunces apenas no H1.

## 5. CRM

- Após `feedback_submitted`, status passa a `feedback_recebido`. O Kanban e o lead-detail-sheet existentes já reconhecem este status — sem mudança de layout.
- O lead-detail-sheet já mostra a timeline de `product_events`, portanto `feedback_started` e `feedback_submitted` aparecem automaticamente.

## 6. Eventos

| Evento | Quando | Metadata |
|---|---|---|
| `feedback_started` | GET inicial bem-sucedido (1ª vez) | `{ report_request_id }` |
| `feedback_submitted` | POST bem-sucedido | `{ report_request_id, usefulness_score, purchase_intent, pricing_preference }` |
| `lead_status_changed` | já emitido por `updateLeadCommercialStatus` | source: `"auto"`, reason: `"feedback_received"` |

## 7. Ficheiros a criar/editar

**Migration:**
- nova tabela `beta_feedback` (via tool de migração).

**Criar:**
- `src/routes/feedback.$requestId.tsx`
- `src/routes/api/public/feedback.$requestId.ts` (GET + POST)
- `src/components/feedback/feedback-form.tsx`
- `src/lib/feedback/feedback-schema.ts` (Zod schema partilhado client/server)
- `src/lib/feedback/__tests__/feedback-schema.test.ts`

**Não tocar:** report pipeline, PDF, scoring, layout do CRM, `/report.example`.

## 8. Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (incluindo novos testes do schema)
- Manual: abrir `/feedback/<id-válido>`, submeter, confirmar que:
  - aparece em `beta_feedback`
  - lead muda para `feedback_recebido` no Kanban
  - segunda submissão do mesmo `requestId` mostra "já submetido"
  - `requestId` inválido mostra erro claro

## Checkpoint

- ☐ Migration aprovada
- ☐ Rota pública `/feedback/$requestId` funcional
- ☐ POST escreve em `beta_feedback` (UNIQUE em report_request_id)
- ☐ Eventos `feedback_started` e `feedback_submitted` emitidos
- ☐ Status do lead vai para `feedback_recebido`
- ☐ Estados: inválido / já submetido / form / thank-you
- ☐ Mobile-first, tokens semânticos, pt-PT
- ☐ tsc + vitest verdes
