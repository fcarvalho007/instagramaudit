
## Audit: Área autenticada e documentação de tracking

### Ficheiros verificados (todos existem)

- `src/routes/app.tsx`
- `src/routes/app.reports.tsx`
- `src/routes/app.reports.$id.tsx`
- `src/routes/app.account.tsx`
- `src/routes/app.plan.tsx`
- `src/server/account.functions.ts`
- `src/server/reports.functions.ts`
- `docs/future-tracking-cost-controls.md`

---

### Resultados

| # | Item | Resultado | Notas |
|---|------|-----------|-------|
| 1 | `/app/reports/$id` existe? | **PASS** | Ficheiro `app.reports.$id.tsx` existe e é funcional. |
| 2 | `getOwnedReport` e `getReportPdfUrl` existem? | **PASS** | Ambos exportados de `src/server/reports.functions.ts`. |
| 3 | Ownership verificada antes de devolver dados/PDF? | **PASS** | Ambas as funções usam `requireSupabaseAuth` middleware + `.eq("user_id", userId)` explícito via `supabaseAdmin`. Sem report = throw `NOT_FOUND`. PDF signed URL tem 60s de expiração. Campos sensíveis (`pdf_error_message`, `email_error_message`) são sanitizados para booleans. |
| 4 | `/app/reports` usa dados reais? | **PASS** | Query direta ao `report_requests` via browser client (RLS ativado, confirmado). Não é placeholder. |
| 5 | Imports duplicados/não usados? | **PASS** | `app.reports.tsx` — sem duplicados (Link importado e usado). `app.plan.tsx` — sem duplicados. Todos os imports são utilizados. |
| 6 | Proteção de `/app` — client-side ou router-level? | **PASS (funcional, mas client-side)** | `app.tsx` usa `useEffect` + `supabase.auth.getUser()` + redirect via `window.location.href`. Não é `beforeLoad` router-level, mas funciona porque mostra spinner enquanto verifica. Flash de conteúdo protegido não ocorre (spinner). **Nota:** migrar para `beforeLoad` seria melhor prática, mas não é bug. |
| 7 | Algum `/app` route expõe tokens/secrets/paths? | **PASS** | Nenhum route expõe `pdf_storage_path`, `normalized_payload`, tokens de provider, service-role keys ou headers admin. `getOwnedReport` filtra explicitamente os campos devolvidos. |
| 8 | Tracking runtime inexistente? | **PASS** | Zero referências a `tracked_profiles`, `tracking_jobs`, `tracking_snapshots`, `tracking_alerts` no código. Nenhum cron de tracking. Nenhum Apify/OpenAI call a partir do dashboard do utilizador. |
| 9 | Cálculo no doc correcto? | **FAIL** | Linha 40: `100 × 10 × 4 × $0.03 × 30 = $36,000/month`. O cálculo correcto é **$3,600/month** (100 × 10 × 4 × 0.03 × 30 = 3,600). |
| 10 | Doc é planning-only? | **PASS** | Zero referências ao ficheiro em `src/`. Puramente documentação. |

---

### Bugs encontrados

1. **docs/future-tracking-cost-controls.md, linha 40** — cálculo errado: `$36,000` deveria ser `$3,600`.

### Problemas de discurso (não-bloqueantes, relacionados com pedido anterior)

Várias ocorrências de "o teu" / "a tua" nos ficheiros `/app`:
- `app.reports.tsx:100` — "Os teus relatórios"
- `app.reports.tsx:139` — "associar à tua conta"
- `app.reports.tsx:154` — "A tua conta está preparada"
- `app.plan.tsx:32` — "conhecer o teu perfil"
- `app.plan.tsx:104` — "o teu plano atual"
- `app.plan.tsx:173` — "O teu plano atual"
- `app.plan.tsx:189` — "a tua conta guarda"
- `app.account.tsx:109` — "da tua conta"

Estes são do âmbito da conta do utilizador (não do relatório), portanto "teu" pode ser aceitável aqui — o utilizador está a ver a sua própria conta. Diferente do relatório público onde o observador pode não ser o dono do perfil. Decisão do utilizador.

---

### Patch proposto (mínimo)

**1 edição** — corrigir o cálculo em `docs/future-tracking-cost-controls.md`:

```
Linha 40:
- = $36,000/month in Apify alone
+ = $3,600/month in Apify alone
```

Nenhuma outra edição de código é necessária para este audit.
