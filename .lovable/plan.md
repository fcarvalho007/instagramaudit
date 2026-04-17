

## Entendimento

**1. Fluxo actual**: Landing → action bar (username validado regex) → `/analyze/$username` (dashboard mock determinístico) → CTA "Desbloquear" → gate modal (5 estados) com quota localStorage + insert em `report_requests` via `insertReportRequest()` helper.

**2. Estado mock-only**: Dashboard 100% mock (`mock-analysis.ts`), quota 100% localStorage (`quota.ts`). **Excepção**: a captura de leads do gate modal **já escreve em Supabase** (tabela `report_requests` actual, criada em prompt anterior).

**3. Papel do Supabase**: Backend completo futuro — Auth, Postgres (leads/quotas/reports/cache), Storage (PDFs), Edge Functions (Apify/Claude/Resend/EuPago), pg_cron.

**4. Distinção crítica**:
- **Database foundation** = schema + RLS + indexes + triggers (este prompt)
- **Frontend integration** = wiring UI ao schema novo (prompt futuro)

---

## Auditoria do estado actual vs spec

**Conflito crítico identificado:** A tabela `report_requests` **já existe** com schema diferente do pedido:

| Campo actual | Campo pedido na spec | Conflito |
|---|---|---|
| `username` text | `instagram_username` text | Nome diferente |
| `name`, `email`, `company`, `rgpd_accepted_at` (campos de lead inline) | Mover para `leads` + `lead_id` FK | Estrutura diferente — spec normaliza |
| — | `competitor_usernames`, `request_source`, `request_status`, `delivery_status`, `is_free_request`, `request_month`, `metadata` | Falta tudo |
| RLS: `INSERT public` aberto | RLS: closed baseline (sem policies) | Conflito directo |
| Sem `leads` separada | Tabela `leads` dedicada | Falta |

**Decisão arquitectural — opções:**

**Opção A (recomendada):** **Drop + recreate `report_requests`** com schema novo + criar `leads`.
- Justificação: o helper `insertReportRequest()` usado pelo modal vai **partir** ao mudar o schema. Mas a spec é explícita: "do NOT wire any existing UI flow to Supabase yet" e "no form submission should yet write to Supabase". Ou seja, a expectativa do prompt é que o frontend NÃO esteja ligado. O wiring actual é tecnicamente uma antecipação do prompt anterior.
- Risco: o gate modal vai falhar a inserir até prompt futuro fazer rewire.
- Mitigação: tornar o insert no modal **best-effort** (try/catch silencioso) — o utilizador continua a ver success state porque a UX depende da quota localStorage, não do insert.

**Opção B:** Manter `report_requests` actual + criar `leads` + criar **nova** tabela `report_requests_v2`.
- Evita partir o modal.
- Mas deixa schema duplicado e "dead table" — viola "no speculative tables" e o princípio de simplicidade.

**Opção C:** Manter `report_requests` actual intacta + criar `leads` apenas + ignorar a parte da spec que pede `report_requests` com novo schema.
- Não cumpre a spec.

**Recomendação: Opção A** — drop + recreate. É o que a spec explicitamente pede. Adicionar try/catch no modal para que o insert falhar não quebre UX (mock continua perfeito via localStorage).

---

## Plano

### Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{timestamp}_database_foundation.sql` | **Criar** — drop antigo + leads + report_requests novo + trigger + indexes + RLS | Não |
| `src/components/product/report-gate-modal.tsx` | **Editar mínimo** — envolver `insertReportRequest()` em try/catch silencioso para não partir UX | Não |
| `src/integrations/supabase/queries/report-requests.ts` | **Editar** — actualizar tipo do payload (não-bloqueante: types.ts é auto-regenerado, mas o ficheiro de helper precisa não compilar partido) | Não |

**Zero ficheiros locked tocados.**

**Nota:** `src/integrations/supabase/types.ts` é auto-regenerado após a migração — não tocar manualmente.

---

### Migração SQL — estrutura

```sql
-- 1. Drop legacy report_requests (será recriada)
DROP TABLE IF EXISTS public.report_requests;

-- 2. Shared trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 3. leads table
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  name text NOT NULL,
  company text,
  source text NOT NULL DEFAULT 'public_report_gate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. report_requests (novo schema)
CREATE TABLE public.report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  instagram_username text NOT NULL,
  competitor_usernames jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_source text NOT NULL DEFAULT 'public_dashboard',
  request_status text NOT NULL DEFAULT 'pending',
  delivery_status text NOT NULL DEFAULT 'not_sent',
  is_free_request boolean NOT NULL DEFAULT true,
  request_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_report_requests_updated_at BEFORE UPDATE ON public.report_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Indexes
CREATE INDEX idx_report_requests_lead_id ON public.report_requests(lead_id);
CREATE INDEX idx_report_requests_instagram_username ON public.report_requests(instagram_username);
CREATE INDEX idx_report_requests_request_month ON public.report_requests(request_month);
CREATE INDEX idx_report_requests_lead_month ON public.report_requests(lead_id, request_month);

-- 6. RLS — closed baseline (no policies)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;
```

---

### Mudança mínima no frontend (não-wiring, apenas preservar UX)

Como a tabela actual é dropped, o `insertReportRequest()` actual vai falhar. Para não quebrar a UX (a spec diz "app should still behave exactly as it does now"):

**`report-gate-modal.tsx`** — envolver insert em try/catch silencioso. O sucesso visual depende apenas de `incrementQuota()` (localStorage), não do insert.

```ts
// Best-effort insert — schema is being migrated. UX driven by localStorage quota.
try {
  await insertReportRequest({ ... });
} catch {
  // Silent — frontend rewire happens in a later prompt
}
```

**`queries/report-requests.ts`** — manter assinatura mas marcar como deprecated com comentário; o `TablesInsert<"report_requests">` vai apontar para o novo schema após regen, então o helper actual vai precisar de campos novos. Solução: fazer o helper aceitar o novo shape mínimo (`lead_id`, `instagram_username`) e deixar campos opcionais com defaults SQL — o modal não chama mais com o shape antigo porque está em try/catch que pode comentar a chamada inteiramente.

**Decisão simplificadora:** comentar a chamada `insertReportRequest()` no modal com TODO claro, em vez de manter best-effort confuso. Justificação: prompt diz "no form submission should yet write to Supabase" — devolver ao estado puro mock está mais alinhado com a spec.

---

### Validação dos guardrails

✅ Sem auth, sem Edge Functions, sem Resend/Apify/Claude/EuPago
✅ Sem novas dependências
✅ Sem mudanças de routing, landing, dashboard
✅ pt-PT preservado (zero copy tocada)
✅ Quota localStorage intacta
✅ RLS closed baseline (zero policies)
✅ Sem tabelas especulativas
✅ Migração idempotente onde aplicável (`IF EXISTS`, `CREATE OR REPLACE`)

---

### Confirmações antes de implementar

1. **Aprovas Opção A (drop + recreate `report_requests` com schema novo)?** Alternativa é manter actual + criar `leads` à parte, mas viola a spec.
2. **Aprovas comentar a chamada `insertReportRequest()` no modal** (com TODO) para alinhar 100% com "no form submission should yet write to Supabase"? Alternativa: try/catch silencioso.
3. **Confirmas que perder os ~0 leads actualmente em `report_requests` é aceitável?** (tabela está vazia ou quase — só foi usada em testes locais).

