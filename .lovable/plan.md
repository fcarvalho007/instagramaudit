
# Beta Analysis Request Flow

## 1. Flow Architecture

```text
Landing page (/)
  └─ CTA "Analisar perfil" → /beta/request (NEW route)

/beta/request — 3-step progressive disclosure form
  Step 1: Instagram handle + email
  Step 2: User type + purpose + profile ownership
  Step 3: Beta terms + consent + submit

/beta/submitted/$requestId — confirmation page
  └─ Shows request status, expectations, next steps

Admin: /admin/beta-requests (NEW admin panel)
  └─ Review queue → approve → trigger analysis → notify
```

The form does NOT trigger analysis. It creates a `report_request` in `pending_review` status. An admin reviews and manually approves, which triggers the analysis pipeline with existing cost controls (Apify allowlist, cache, etc.).

## 2. Database Schema

### Extend `leads` table (migration)

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS user_type text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS profile_ownership text,
  ADD COLUMN IF NOT EXISTS beta_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_consent_at timestamptz;
```

No new table needed — `leads` + `report_requests` already model the relationship. The `report_requests.request_source` will be `'beta_form'`.

### New `request_status` values

Current values: `pending`, `processing`, `completed`, `failed`.

Add to the flow (no enum change needed — it's a text column):

| Status | Meaning |
|---|---|
| `pending_review` | Submitted, awaiting admin approval |
| `approved` | Admin approved, analysis queued |
| `processing` | Analysis running |
| `completed` | Report ready |
| `failed` | Analysis failed |
| `rejected` | Admin rejected (spam, invalid, etc.) |

### Metadata JSONB on `report_requests`

Store beta-specific context in the existing `metadata` column:

```json
{
  "beta_version": "v1",
  "submitted_at": "2026-05-07T...",
  "user_type": "creator",
  "purpose": "improve_content",
  "profile_ownership": "own_profile"
}
```

## 3. UX Steps (Progressive Disclosure)

### Step 1 — Perfil

```
┌─────────────────────────────────────┐
│  BETA PRIVADA                       │
│                                     │
│  Análise gratuita do teu perfil     │
│  de Instagram                       │
│                                     │
│  Estamos a abrir a plataforma a     │
│  um grupo limitado de testadores.   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ @handle do Instagram        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ O teu email                 │    │
│  └─────────────────────────────┘    │
│                                     │
│           [Continuar →]             │
└─────────────────────────────────────┘
```

### Step 2 — Contexto

```
┌─────────────────────────────────────┐
│  Ajuda-nos a entender o teu caso    │
│                                     │
│  Tipo de utilizador:                │
│  ○ Criador de conteúdo              │
│  ○ Marca / Empresa                  │
│  ○ Agência                          │
│  ○ Consultor                        │
│  ○ E-commerce                       │
│  ○ Outro                            │
│                                     │
│  Para que vais usar o relatório?    │
│  ○ Melhorar conteúdo                │
│  ○ Comparar com concorrentes        │
│  ○ Preparar relatório de cliente    │
│  ○ Crescer audiência                │
│  ○ Validar comunicação de marca     │
│  ○ Outro                            │
│                                     │
│  Este perfil é:                     │
│  ○ O meu perfil pessoal             │
│  ○ O perfil da minha marca          │
│  ○ O perfil de um cliente           │
│                                     │
│        [← Voltar] [Continuar →]     │
└─────────────────────────────────────┘
```

### Step 3 — Termos e Submissão

```
┌─────────────────────────────────────┐
│  Antes de submeter                  │
│                                     │
│  ℹ Isto é uma versão beta.          │
│    Os relatórios podem demorar      │
│    até 24h e a disponibilidade      │
│    é limitada.                      │
│                                     │
│  ℹ A análise usa exclusivamente     │
│    dados públicos do Instagram.     │
│                                     │
│  ℹ Poderemos pedir-te feedback      │
│    breve sobre o relatório.         │
│                                     │
│  ℹ O serviço é gratuito durante     │
│    a fase beta. Futuramente,        │
│    aplicar-se-ão planos pagos.      │
│                                     │
│  ┌─ Preços indicativos ──────────┐  │
│  │ Relatório único    €9,90      │  │
│  │ Pack 10 análises   €49,90     │  │
│  │ Plano Pro mensal   €29,90/mês │  │
│  │ (preços provisórios)          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ☐ Li e aceito as condições da      │
│    beta e a política de             │
│    privacidade.                     │
│                                     │
│         [← Voltar] [Submeter]       │
└─────────────────────────────────────┘
```

### Confirmation Page

```
┌─────────────────────────────────────┐
│  ✓ Pedido registado                 │
│                                     │
│  Perfil: @frederico.m.carvalho      │
│  Estado: A aguardar revisão         │
│                                     │
│  Receberás um email em              │
│  nome@email.com quando o            │
│  relatório estiver pronto.          │
│                                     │
│  Referência: #BETA-0042             │
│                                     │
│  [← Voltar ao início]              │
└─────────────────────────────────────┘
```

## 4. Copy Blocks (pt-PT)

| Key | Copy |
|---|---|
| badge | `BETA PRIVADA` |
| headline | `Análise gratuita do teu perfil de Instagram` |
| subline | `Estamos a abrir a plataforma a um grupo limitado de testadores.` |
| step2_headline | `Ajuda-nos a entender o teu caso` |
| step3_headline | `Antes de submeter` |
| beta_notice | `Isto é uma versão beta. Os relatórios podem demorar até 24h e a disponibilidade é limitada.` |
| data_notice | `A análise usa exclusivamente dados públicos do Instagram.` |
| feedback_notice | `Poderemos pedir-te feedback breve sobre o relatório.` |
| pricing_notice | `O serviço é gratuito durante a fase beta. Futuramente, aplicar-se-ão planos pagos.` |
| consent_label | `Li e aceito as condições da beta e a política de privacidade.` |
| confirmation_title | `Pedido registado` |
| confirmation_body | `Receberás um email quando o relatório estiver pronto.` |
| error_duplicate | `Já existe um pedido para este perfil com este email. Receberás notificação quando estiver pronto.` |

## 5. Admin Workflow

New panel at `/admin/beta-requests`:

1. **Queue view** — table of pending requests sorted by `created_at`
   - Shows: handle, email, user_type, purpose, ownership, submitted_at
   - Actions: Approve, Reject, View profile

2. **Approve** — changes `request_status` to `approved`, triggers the existing analysis pipeline for that handle (uses Apify allowlist, cache, cost controls)

3. **Reject** — changes status to `rejected` with optional reason

4. **Bulk actions** — approve/reject multiple requests

5. **Stats** — total requests, pending, approved, completed, conversion rate

## 6. Cost-Control Recommendations

| Control | Implementation |
|---|---|
| No auto-trigger | Form never calls Apify — admin must approve |
| Apify allowlist | Add handle to `APIFY_ALLOWLIST` before approving (or auto-add on approve) |
| Daily cap | Limit approvals to N per day (admin discipline, can add soft cap later) |
| Duplicate detection | Check if handle already has a recent snapshot — reuse cache |
| Batch processing | Admin can approve in batches during off-peak hours |
| Cost visibility | Show estimated cost per approval in admin panel |

## 7. Files to Create/Modify

| File | Action |
|---|---|
| `src/routes/beta.request.tsx` | New — 3-step form |
| `src/routes/beta.submitted.$requestId.tsx` | New — confirmation page |
| `src/routes/admin.beta-requests.tsx` | New — admin queue |
| `src/server/beta.functions.ts` | New — submitBetaRequest server function |
| `src/components/beta/beta-request-form.tsx` | New — form component |
| `src/components/beta/beta-step-indicator.tsx` | New — progress indicator |
| Migration | Extend `leads` table with beta fields |
| Landing page CTA | Update to link to `/beta/request` instead of direct analysis |

## 8. Implementation Prompts (ordered)

**Prompt 1** — Database migration: extend `leads` with beta fields, add RLS policy for anonymous inserts via server function.

**Prompt 2** — Server function: `submitBetaRequest` — validates input, creates lead + report_request, checks duplicates, returns request ID.

**Prompt 3** — Beta request form: 3-step progressive disclosure at `/beta/request` with validation, dark theme, design tokens.

**Prompt 4** — Confirmation page at `/beta/submitted/$requestId`.

**Prompt 5** — Admin beta queue at `/admin/beta-requests` with approve/reject actions.

**Prompt 6** — Connect approval to existing analysis pipeline (add handle to allowlist, trigger analysis).

**Prompt 7** — Landing page CTA update — route to `/beta/request`.

## 9. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Spam submissions | Rate limit server function; honeypot field; email validation |
| Cost spike from mass approvals | Admin-only trigger; daily soft cap; cost estimate in UI |
| Duplicate handles | Dedup check at submit time; reuse cached snapshots |
| Email deliverability | Use Resend (already configured); verify sender domain |
| Scope creep | Each prompt is atomic; no auto-generation until Prompt 6 |
| Beta form leaks into prod before ready | Use feature flag or admin-only access initially |
