

## Entendimento

**1. Fluxo landing → análise**: hero action bar (regex de username) → `useNavigate` → `/analyze/$username`.

**2. Rota `/analyze/$username`**: SSR-friendly, `getMockAnalysis(username)` (determinístico) → `<PublicAnalysisDashboard>` → `<PremiumLockedSection>` que abre `<ReportGateModal>` com `username` prop.

**3. Gate modal + quota local**: 5 estados (`idle | submitting | success | success-last | paywall`). Validação client (Nome, Email, RGPD). Fluxo actual: `validate` → `getQuotaUsage(normalizedEmail)` → se `>= FREE_MONTHLY_LIMIT` mostra `paywall`; caso contrário `setState("submitting")` → mock delay 600ms → `incrementQuota` → `success` ou `success-last`. **Sem persistência real** (TODO documentado, linhas 135-139).

**4. Supabase actual**:
- Cliente browser: `src/integrations/supabase/client.ts` (locked, auto-gerado)
- Cliente admin: `src/integrations/supabase/client.server.ts` (service role, server-only)
- Tabelas: `public.leads` (com `email_normalized UNIQUE`) + `public.report_requests` (FK `lead_id`, todos os status fields, `request_month`, `metadata jsonb`)
- RLS: **enabled, zero policies** (closed baseline) em ambas
- Helper: `src/integrations/supabase/queries/report-requests.ts` (tipado, não usado)
- Sem Edge Functions ainda (`supabase/` tem só `migrations/` + `config.toml`)

**5. Porquê Edge Function (não insert directo)**: RLS está fechado — frontend com anon key não consegue fazer `INSERT`. Abrir policy pública de `INSERT` em `leads` e `report_requests` expõe escrita anónima sem rate limit, sem validação server-side, sem possibilidade de futuras checagens (disposable email, IP throttling, captcha). Edge Function com `SUPABASE_SERVICE_ROLE_KEY` é o **boundary público** correcto: valida payload, normaliza email, faz upsert atómico, mantém RLS fechado.

---

## Discrepância arquitectural a resolver

A spec pede **Supabase Edge Function** (Deno, em `supabase/functions/`). O projecto está na stack **TanStack Start** que tem dois mecanismos server nativos:
- `createServerFn` (RPC interno)
- Server routes (`createFileRoute` com `server.handlers` em `src/routes/api/`)

A Project Knowledge / TanStack Start guidance diz explicitamente: **"Do NOT use Supabase Edge Functions. Use TanStack Start's built-in server capabilities instead."**

**Decisão**: usar **server route TanStack** em `src/routes/api/request-full-report.ts` com `POST` handler. Cumpre o objectivo da spec (boundary público server-side com service role) usando o mecanismo nativo do projecto. O nome da rota (`/api/request-full-report`) preserva a intenção semântica.

Justificação para o utilizador: as "Edge Functions" da Supabase exigiriam infra Deno separada e não há nenhuma neste projecto; as server routes TanStack correm no mesmo runtime edge (Cloudflare Worker), têm acesso ao `supabaseAdmin` já configurado, e seguem a arquitectura definida pelo workspace.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/routes/api/request-full-report.ts` | **Criar** — server route POST + OPTIONS, valida payload, upsert lead, insert report_request, retorna shape estruturado | Não |
| `src/integrations/supabase/queries/report-requests.ts` | **Editar** — substituir helper antigo por `requestFullReport(payload)` que faz `fetch("/api/request-full-report")` | Não |
| `src/components/product/report-gate-modal.tsx` | **Editar mínimo** — substituir mock `setTimeout` por chamada a `requestFullReport`, passar `username` + `competitor_usernames: []`, manter quota local intacta, tratar erro com mensagem pt-PT | Não |
| `src/components/product/premium-locked-section.tsx` | **Editar minúsculo** — passar `competitorUsernames` extraído de `data.competitors` ao modal (opcional; alternativa: hardcode `[]` no modal) | Não |

**Zero ficheiros locked.** Não toco em `client.ts`, `client.server.ts`, `types.ts`, `.env`, nem foundation files.

---

## Server route — design

`POST /api/request-full-report`:
- Validação Zod: `email` (string email, max 255), `name` (1-120), `company` (opcional, max 120), `instagram_username` (regex `^[A-Za-z0-9._]{1,30}$`), `competitor_usernames` (array opcional de strings, max 2), `request_source` (enum: `public_dashboard`, default).
- Normaliza `email_normalized = email.trim().toLowerCase()`.
- `supabaseAdmin.from("leads").upsert({ email, email_normalized, name, company, source: "public_report_gate" }, { onConflict: "email_normalized" }).select("id").single()` — devolve `lead_id`.
- `supabaseAdmin.from("report_requests").insert({ lead_id, instagram_username, competitor_usernames, request_source: "public_dashboard", metadata: { quota_mode: "local_mock", flow_version: "v1" } }).select("id").single()`.
- Sucesso: `{ success: true, lead_id, report_request_id, message: "Pedido registado com sucesso." }` (200).
- Erro validação: `{ success: false, error_code: "INVALID_PAYLOAD", message: "Dados inválidos." }` (400).
- Erro DB: log server-side + `{ success: false, error_code: "PERSISTENCE_FAILED", message: "Não foi possível registar o pedido." }` (500). Sem stack traces.
- Handler `OPTIONS` para preflight (boa prática mesmo sendo same-origin).

---

## Modal — alterações mínimas

```ts
// dentro de handleSubmit, substituir o bloco mock:
try {
  if (onSubmit) {
    await onSubmit(data);
  } else {
    const result = await requestFullReport({
      email: data.email,
      name: data.nome,
      company: data.empresa,
      instagram_username: username ?? "",
      competitor_usernames: [], // future: vir do dashboard
      request_source: "public_dashboard",
    });
    if (!result.success) throw new Error(result.message);
  }
  const newCount = incrementQuota(normalizedEmail);
  setState(newCount >= FREE_MONTHLY_LIMIT ? "success-last" : "success");
} catch (err) {
  console.error("Report request submission failed", err);
  setSubmitError("Não foi possível concluir o pedido. Tentar novamente.");
  setState("idle");
}
```

UX já tem `submitError` declarado (linha 81) mas **não é renderizado** no form actual — refinamento incluído: adicionar bloco de erro pt-PT visível acima do botão submit quando `submitError` existe.

Quota local **fica intacta** (check antes do call, increment depois do call bem-sucedido).

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem auth | ✅ |
| Sem alterar quota localStorage | ✅ |
| Sem report generation / email / PDF / IA / scraping / EuPago | ✅ |
| Sem novas dependências (zod já está no projecto, supabase admin já configurado) | ✅ |
| Sem mudanças visuais desnecessárias | ✅ (só adicionar mensagem de erro inline pt-PT) |
| RLS fechado mantido | ✅ (escrita via service role no server) |
| Service role nunca no cliente | ✅ (só em `client.server.ts` importado pela route server) |
| Zero locked files | ✅ |
| pt-PT impessoal | ✅ |
| Comentários técnicos em inglês | ✅ |

---

## Confirmações antes de implementar

1. **Aprovas usar TanStack server route (`/api/request-full-report`) em vez de Supabase Edge Function (Deno)?** É o que a Project Knowledge define. Mesma intenção arquitectural.
2. **`competitor_usernames` na primeira versão fica `[]`** (o dashboard mock tem `competitors` mas o hero/modal não recolhem inputs de concorrentes ainda). Confirmas? Alternativa: extrair handles do mock `data.competitors` em `PremiumLockedSection` e passar adiante.
3. **Adicionar bloco de erro inline no form do modal** (actualmente `submitError` é guardado mas nunca mostrado) — confirmo que conta como "no unnecessary visual change" porque é refinamento funcional pt-PT?

