

## Entendimento

**1. Fluxo do produto actual**: Landing (hero + action bar com username) → submit → `/analyze/$username` (dashboard mock determinístico) → CTA "Desbloquear relatório" → `report-gate-modal` (form Nome/Email/Empresa/RGPD) → 5 estados (`idle | submitting | success | success-last | paywall`) com quota localStorage.

**2. Estado mock actual**:
- Dados do dashboard: gerados em `src/lib/mock-analysis.ts` (determinístico por handle)
- Quota: `src/lib/quota.ts` usa `localStorage` (chave `instabench:quota:{email}:{YYYY-MM}`)
- Lead capture: **já liga a Supabase** — `report-gate-modal.tsx` faz `supabase.from("report_requests").insert(...)` na tabela criada na migração `20260417092040_*.sql`

**3. Papel do Supabase na arquitectura**: Backend completo — Auth (futuro), Postgres (leads, quotas, reports), Storage (PDFs), Edge Functions (Apify scrape, Claude AI, Resend email, EuPago webhooks), pg_cron (alertas Pro).

**4. Distinção crítica**:
- **Conectar Supabase** = infraestrutura (cliente JS, env vars, módulo partilhado, readiness check) — escopo deste prompt
- **Implementar lógica de dados do produto** = tabelas, RLS, persistência real, auth, edge functions — fora do escopo

---

## Auditoria do estado actual vs spec do prompt

**Surpresa importante:** O Supabase **já está conectado** neste projecto via Lovable Cloud:

| Item da spec | Estado actual | Acção necessária |
|---|---|---|
| `@supabase/supabase-js` instalado | ✅ Já presente (importado em `client.ts`) | Nenhuma |
| Cliente partilhado | ✅ `src/integrations/supabase/client.ts` (auto-gerado, **locked**) | Nenhuma |
| Env vars `VITE_SUPABASE_URL` + key | ✅ Em `.env` (auto-gerado, **locked**) | Nenhuma |
| Tipos Database | ✅ `src/integrations/supabase/types.ts` (auto-gerado, **locked**) | Nenhuma |
| Tabelas criadas | ⚠️ `report_requests` já existe (migração anterior) | Nenhuma — fora do escopo |
| Auth | ❌ Não implementado | Não fazer (guardrail) |
| Edge Functions | ❌ Nenhuma | Não fazer (guardrail) |

**Discrepância com a spec:**
- A spec pede `VITE_SUPABASE_ANON_KEY`. O projecto usa `VITE_SUPABASE_PUBLISHABLE_KEY` (nome novo do mesmo conceito — chave pública). Ambas referem-se à mesma anon key. **Não renomear** — o ficheiro `.env` e `client.ts` são auto-geridos pelo Lovable Cloud e não devem ser editados manualmente (ver `<important-guidelines>`).
- A spec pede para "criar um cliente partilhado" — já existe em `src/integrations/supabase/client.ts`. Path canónico de import: `@/integrations/supabase/client`.

---

## O que falta de facto fazer

Apenas **2 itens** da spec não estão presentes:

### 1. Readiness check developer-oriented (item 4 da spec)
Um utilitário interno mínimo para confirmar que o cliente está OK — sem UI pública, sem ruído.

**Proposta**: criar `src/integrations/supabase/health.ts` com:
```ts
export async function checkSupabaseConnection(): Promise<{ ok: boolean; error?: string }>
```
Faz uma query trivial (ex: `supabase.from("report_requests").select("id").limit(0)`) e devolve estado. Não é chamado em runtime — fica disponível para diagnóstico futuro (ex: dev tools, healthcheck endpoint).

### 2. Estrutura future-ready (item 5 da spec)
Criar pasta `src/integrations/supabase/queries/` com um ficheiro `_index.ts` placeholder (ou `README.md`) a documentar a convenção:
- Cada domínio terá o seu ficheiro: `report-requests.ts`, `quotas.ts`, `profiles.ts`
- Funções pequenas e tipadas via `Database` types
- UI nunca chama `supabase.from()` directamente — passa por estes helpers

**Decisão:** Em vez de criar pasta vazia (dead scaffolding — viola item 7), crio **um único helper real** que já é usado pelo modal: `src/integrations/supabase/queries/report-requests.ts` com `insertReportRequest(payload)`. Isto:
- Estabelece o padrão sem código especulativo
- Refactora o modal para deixar de chamar `supabase.from()` directamente (1 linha de mudança)
- Demonstra a convenção para prompts futuros

---

## Plano de execução

### Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/integrations/supabase/health.ts` | **Criar** — readiness check interno | Não |
| `src/integrations/supabase/queries/report-requests.ts` | **Criar** — helper tipado `insertReportRequest` | Não |
| `src/components/product/report-gate-modal.tsx` | **Editar** — trocar `supabase.from(...)` por `insertReportRequest(...)` | Não |

**Zero ficheiros locked tocados.** Nenhum dos seguintes é alterado:
- `src/integrations/supabase/client.ts` (auto-gerado)
- `src/integrations/supabase/types.ts` (auto-gerado)
- `.env` (auto-gerido)
- `LOCKED_FILES.md` foundation files

### Validação dos guardrails

✅ Sem auth, sem novas tabelas, sem RLS novas, sem Edge Functions
✅ Sem Resend/Apify/Claude/EuPago
✅ Sem novas dependências (Supabase client já presente)
✅ Sem secrets em código (env vars geridos pelo Lovable Cloud)
✅ Mock flows preservados — `/analyze/$username`, gate modal UX, quota localStorage tudo intacto
✅ Sem alterações de UI/UX
✅ pt-PT preservado (zero copy tocada)
✅ Estrutura future-ready com 1 helper real, não scaffolding morto

### Nota de comunicação

A spec pede `VITE_SUPABASE_ANON_KEY` mas o projecto (via Lovable Cloud) usa `VITE_SUPABASE_PUBLISHABLE_KEY` — é a mesma chave pública (anon), apenas renomeada. O cliente já está configurado com este nome e o `.env` é gerido automaticamente. Mantenho a nomenclatura actual.

