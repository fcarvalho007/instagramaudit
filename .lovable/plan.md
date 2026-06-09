## Diagnóstico

O erro "HTTP 401 — Tentar novamente" e a ausência das secções (incl. funil/pipeline) na Visão Geral têm uma única causa raiz:

- O `AdminAuthShell` decide se estás autenticado **só com base no `localStorage`** (`admin.simple-gate.v1`).
- A autoridade real é o cookie HttpOnly `admin_session` emitido pelo `/api/admin/simple-login`, com **TTL de 8h**.
- Quando o cookie expira (ou o `SESSION_SECRET` foi rodado), o `localStorage` continua presente → o shell renderiza o admin → **todas** as chamadas a `/api/admin/*` devolvem 401 → cada secção mostra "Erro ao carregar HTTP 401" e as que dependem desses dados (KPIs, funil de aquisição, onboarding, custos, follow-ups) ficam vazias.
- O `adminFetch` em 401 limpa o `localStorage` mas não reage no UI → o utilizador continua preso no estado partido até refrescar manualmente.

Nada de dados dummy. A fix é só de autenticação/estado — os endpoints reais já existem e devolvem 200 assim que o cookie estiver válido.

## O que vai mudar

### 1. `src/components/admin/v2/admin-auth-shell.tsx` — validar contra o servidor
- No mount, em vez de confiar no `localStorage`, chamar `GET /api/admin/whoami` (com `credentials: "include"`).
- `allowed: true` → `signed_in` e (re)escreve o email em `localStorage` para pre-fill.
- `allowed: false` ou falha de rede → `clearAdminEmail()` + `signed_out` (mostra `AdminGate`).
- Manter `state === "checking"` no SSR/primeiro render para evitar flash.

### 2. `src/lib/admin/fetch.ts` — sinalizar sessão expirada ao shell
- Quando `adminFetch` apanhar 401/403, além de `clearAdminEmail()`, despachar um `CustomEvent("admin:session-expired")` em `window`.
- `AdminAuthShell` regista um listener desse evento e faz `setState("signed_out")` → o gate aparece imediatamente, sem refresh, e não fica preso o "Erro ao carregar HTTP 401" em cada card.

### 3. Pipeline / secções "que desapareciam"
- Nenhuma alteração de UI necessária. As secções da Visão Geral (`OverviewKpiRow`, `AcquisitionFunnel`, `OnboardingFunnelCard`, `CostSummaryCard`, `AnalysisWindowCard`, `PriorityFollowups`, `IntentSection`) e a `PipelineSection` de `/admin/relatorios` voltam a renderizar com os dados reais assim que o cookie estiver válido — todas elas usam `adminFetch` contra endpoints já existentes (`/api/admin/overview-kpis`, `/api/admin/funnel`, `/api/admin/report-requests/pipeline`, etc.).

### 4. Verificação
- Abrir `/admin` → se cookie expirado, gate aparece (sem mensagem de erro nos cards).
- Após login com email + password partilhada → Visão Geral carrega KPIs, funis e custos com dados reais do Supabase.
- Forçar 401 (apagar cookie nas devtools e clicar em "Atualizar") → gate reaparece sem refresh manual.

## Ficheiros tocados

- `src/components/admin/v2/admin-auth-shell.tsx` (lógica de gate via `whoami` + listener de sessão expirada)
- `src/lib/admin/fetch.ts` (despachar `admin:session-expired` em 401/403)

Nenhuma migration, nenhum endpoint novo, nenhum dado mock.