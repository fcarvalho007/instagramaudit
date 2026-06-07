## Auditoria

### 1. `/api/debug/lead-session-status` está protegido por design
`src/routes/api/debug/lead-session-status.ts:80` chama `requireAdminSession()` antes de qualquer leitura. O gate aceita o header `X-Admin-Email` validado contra `ADMIN_ALLOWED_EMAILS`. A protecção é **intencional** — devolve diagnóstico do cookie + `lead_id_prefix` + `lead_exists`, que não deve ser público. Não mudar.

### 2. Já existem 3 serverFns públicos seguros que lêem o `lead_session`
Todos usam `getLeadFromCookie()` server-side e fazem fail-closed. Nenhum devolve PII ou `lead_id`:

| ServerFn | Ficheiro | Retorno |
|---|---|---|
| `getLeadSessionStatus` | `src/lib/leads/lead-session.functions.ts` | `{ hasLead: boolean }` |
| `getMyReportEntitlement` | `src/lib/payments/entitlements.functions.ts` | `{ hasLead, premiumUnlocked }` (== `has_report_full_9`) |
| `getMyCreditBalance` | `src/lib/credits/credits.functions.ts` | `{ hasLead, balance }` |

Já cobrem 3 dos 4 campos pedidos (`hasLeadSession`, `has_report_full_9`, `credit_balance`). Só falta `lead_id` / `email_normalized`, que por política nunca devem ser expostos publicamente.

### 3. Nenhum endpoint público devolve `lead_id` — é intencional
A regra do projecto é: `lead_id` é PII operacional, só sai pelo gate admin. O endpoint de debug já dá apenas `lead_id_prefix` (primeiros 8 chars) para evitar exfiltração mesmo no admin.

## Proposta — sem alterações de código

### Caminho recomendado: Caminho A (admin, zero risco)
Tu já és admin (`ADMIN_ALLOWED_EMAILS` configurado). Para confirmar o lead da QA browser session:

1. No mesmo browser/tab da QA, abrir `/admin` e fazer login.
2. Em DevTools → Console:
   ```js
   await fetch('/api/debug/lead-session-status', {
     headers: { 'X-Admin-Email': localStorage.getItem('admin-email') }
   }).then(r => r.json())
   ```
3. Confirmar `has_lead_session_cookie: true`, `decoded_cookie_valid: true`, `lead_exists: true`, anotar `lead_id_prefix`.

### Complemento: Caminho B (serverFns públicos, valida desbloqueio + saldo)
Nas mesmas DevTools:
```js
// Cada serverFn tem URL hashed; mais simples: usar o React Query devtools
// ou aceder via UI (sidebar/sticky bar do relatório já chama estes 3).
```
Confirmar via UI do relatório:
- Sidebar "Créditos" → mostra `balance` (vem de `getMyCreditBalance`).
- Banner desbloqueio → mostra `premiumUnlocked` (vem de `getMyReportEntitlement`).

Se ambos refletirem o estado esperado, a sessão **está ligada** ao lead correcto, mesmo sem leres o cookie.

### Mapear `lead_id_prefix` → `lead_id` completo (server-side, sem expor)
Para a QA do Add Competitor, com o prefixo do Caminho A e o handle analisado:
```sql
SELECT id, email_normalized, created_at
FROM leads
WHERE id::text LIKE '<prefix>%'
ORDER BY created_at DESC
LIMIT 5;
```
Executa-se via `supabase--read_query` (ferramenta server-side). Tu vês o `lead_id`; o browser não.

## Quando criar nova rota (Caminho C — só se A não servir)
Se por alguma razão **não conseguires entrar em `/admin`** no mesmo browser do QA (ex: cookies cross-site bloqueados em preview, ou QA num device de terceiros), abrimos um patch mínimo:

- Novo ficheiro: `src/routes/api/debug/lead-session-qa.ts`
- Gate: `process.env.QA_DEBUG_ENABLED === "true"` (novo secret, fail-closed por omissão)
- Retorno: `{ hasLeadSession, lead_id, email_normalized, has_report_full_9, credit_balance }` — sem cookie raw, sem snapshots, sem payloads.
- `Cache-Control: no-store`.
- A flag fica OFF em produção; ligas só durante a janela de QA.

**Não criar agora.** A propor só se confirmares que o Caminho A não é viável.

## Fora de âmbito (até instrução em contrário)
- Inserir entitlement manual.
- Top-up de créditos manual.
- Chamar Apify.
- PR1 window validation.
- Add Competitor backend QA.

## Output que peço
Diz-me apenas qual caminho seguir:
- **A** — vou pelo admin gate, sem mudar código (recomendado).
- **C** — preciso da rota QA com feature flag; abre o patch.

Quando tiveres o `lead_id` confirmado por A ou C, retomamos o QA do Add Competitor com a verificação de créditos antes/depois.