

## Plano — quota mensal 100% server-side

### Entendimento

Confirmo o diagnóstico: hoje `report-gate-modal.tsx` decide a quota via `getQuotaUsage`/`incrementQuota` em localStorage, e o server route `/api/request-full-report` aceita tudo o que esteja bem formado. Limpar o storage permite criar N requests com o mesmo email. As tabelas `leads` (UNIQUE em `email_normalized`) e `report_requests` (com `request_month` e `is_free_request`) já existem com RLS fechado, mas falta a FK `lead_id → leads.id` e um índice para a contagem.

### Arquitectura

Backend passa a ser source of truth. Após upsert do lead, contar `report_requests` do mês corrente para esse `lead_id` com `is_free_request = true`. Decidir 3 outcomes (`first_free`, `last_free`, `limit_reached`) e responder com shape novo. Frontend deixa de pré-validar — chama o backend e mapeia `quota_status` para o estado UI.

Race condition aceite como risco residual (sem auth, volume baixo). Solução robusta com lock fica anotada como follow-up.

### Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `supabase/migrations/{ts}_quota_index_and_fk.sql` | Criar — FK idempotente + index parcial | Não |
| `src/routes/api/request-full-report.ts` | Editar — count + decisão + nova response shape | Não |
| `src/integrations/supabase/queries/report-requests.ts` | Editar — `RequestFullReportResult` ganha `quota_status` + `remaining_free_reports` + `error_code: "QUOTA_REACHED"` | Não |
| `src/components/product/report-gate-modal.tsx` | Editar — remover pré-check; mapear resposta backend → estado; `renderQuotaLine` usa `remaining` | Não |
| `src/lib/quota.ts` | Editar — reduzir a `FREE_MONTHLY_LIMIT` + `normalizeEmail`; remover storage helpers; reescrever doc-comment | Não |

Zero ficheiros locked.

### Backend — fluxo

```
upsert lead → count(month, lead_id, is_free_request=true)
  ├─ used >= 2 → { success:false, error_code:"QUOTA_REACHED", quota_status:"limit_reached", remaining_free_reports:0 }  (HTTP 200, business outcome)
  └─ used < 2  → insert request → { success:true, quota_status: used===0 ? "first_free" : "last_free", remaining_free_reports: 2 - (used+1) }
```

`metadata.quota_mode` passa a `"server_enforced"`. Mês calculado como `date_trunc('month', now())::date` para bater certo com o default da coluna.

### Frontend — mapeamento

```
result.success && quota_status === "last_free" → state "success-last"
result.success && quota_status === "first_free" → state "success"
!result.success && error_code === "QUOTA_REACHED" → state "paywall"
outro erro → setSubmitError + state "idle"
```

Novo estado local `quotaInfo` guarda `remaining_free_reports` para alimentar `renderQuotaLine` com valor real do servidor.

### Migração SQL (idempotente)

```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_requests_lead_id_fkey'
  ) THEN
    ALTER TABLE public.report_requests
      ADD CONSTRAINT report_requests_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_report_requests_free_quota
  ON public.report_requests (lead_id, request_month)
  WHERE is_free_request = true;
```

Sem nova tabela, sem função SQL, sem alteração de RLS (mantém-se fechada — o server route usa service role).

### Guardrails

| Item | Estado |
|---|---|
| Sem auth, scraping, email, PDF, IA, pagamentos | ✅ |
| Sem novas dependências | ✅ |
| RLS fechado mantido; writes só via server route | ✅ |
| Service role só no server | ✅ |
| Zero locked files | ✅ |
| pt-PT impessoal; comentários em inglês | ✅ |
| localStorage deixa de ser source of truth | ✅ |

### Checkpoints

- ☐ Migração com FK + index parcial aplicada
- ☐ Server route conta free requests por `lead_id + request_month`
- ☐ Outcomes `first_free` / `last_free` / `limit_reached` implementados
- ☐ Sem insert quando quota esgotada
- ☐ `quota.ts` reduzido a constante + `normalizeEmail`
- ☐ Modal sem pré-check; mapeia resposta backend → estado UI
- ☐ `renderQuotaLine` usa `remaining_free_reports` do servidor
- ☐ Sem auth/email/PDF/IA/scraping/pagamentos introduzidos

