
# Auditoria Final — AuditProfiles

Objetivo: validar, ponto a ponto, que a app está pronta para utilizadores reais. Sem alterar código. Output final = relatório com PASS / WARN / FAIL por área + lista priorizada de correções (se houver).

## Áreas a auditar

### 1. Infra e saúde
- `cloud_status` (Lovable Cloud ACTIVE_HEALTHY)
- `supabase--db_health` (conexões, WAL, deadlocks)
- `supabase--linter` (RLS, policies, exposições)
- Segredos presentes: EUPAGO_* , APIFY_*, DATAFORSEO_*, OPENAI_*, BREVO_*, RESEND_*, SESSION_SECRET, UNSUBSCRIBE_TOKEN_SECRET, ADMIN_ALLOWED_EMAILS
- `/api/admin/sistema/health` + `/runtime-checks` (todos OK)

### 2. Build e tipos
- `bunx tsc --noEmit`
- `bunx vitest run` (suite completa)
- Verificar warnings de import / rotas fantasma

### 3. Rotas públicas (smoke em mobile 411×742 e desktop 1366×768)
- `/` landing — hero, CTAs, footer, links legais
- `/precos`, `/servicos`, `/design-system`
- `/login`, `/signup`, `/reset-password` (forms + validação)
- `/aviso-legal`, `/privacidade`, `/termos`, `/cookies`
- `/sitemap.xml`, `/robots.txt`
- `/report.example` (mockup intacto)
- 404 (rota inexistente) renderiza notFoundComponent

### 4. Fluxo principal de análise
- `/` → input handle → `/analyze/$username`
- Cache hit vs fresh (provider_call_logs)
- Estados: loading, erro, perfil privado, perfil inexistente
- Benchmark, competitors, insights AI

### 5. Onboarding + Checkout + Pagamento
- `/checkout/authority-diagnosis` — 4 steps, validação, upsell
- `createEupagoCheckout` → 302 para `clientes.eupago.pt`
- `lead_payments` row criada (pending)
- Webhook `/api/public/eupago-webhook` (assinatura HMAC, idempotência) — verificar logs recentes
- Tracking: 6 eventos `checkout_*` aceites pelo Zod enum (já corrigido)
- Provider isolation: 0 calls Apify/OpenAI/DFS antes do pagamento

### 6. Pós-pagamento e entitlements
- `lead_entitlements` criado no webhook paid
- Email de confirmação (Brevo/Resend)
- Acesso a `/app/reports/$id` desbloqueado
- Auto-login token funcional

### 7. Área autenticada `/app/*`
- `/app`, `/app/reports`, `/app/reports/$id`, `/app/account`, `/app/plan`
- Sidebar, topbar, logout
- RLS: utilizador só vê os próprios relatórios

### 8. Admin `/admin/*`
- Gate por `ADMIN_ALLOWED_EMAILS`
- `sistema` (health, secrets, caps, runtime-checks)
- `visao-geral`, `receita`, `leads`, `beta-leads`, `beta-requests`, `clientes`, `perfis`, `relatorios`, `automacoes`, `apify-lab`, `email-lab`, `estudo-mercado`, `conhecimento`, `report-preview`
- Kill-switches APIFY/DFS/OPENAI funcionais
- Custos: `provider_call_logs` como fonte única (memory rule)

### 9. Beta + Feedback
- `/beta/request` → submissão → `/beta/submitted/$id`
- `/feedback/$requestId` e inline feedback
- `/unsubscribe` com token

### 10. Email + PDF
- `/api/send-report-email` (template, links unsubscribe)
- `/api/generate-report-pdf` (PDFShift) + `/api/public/public-report-pdf`
- Storage `report-pdfs` permissões

### 11. Cron / hooks públicos
- `sync-apify-costs`, `sync-dataforseo-costs`, `sync-openai-costs`, `cleanup-expired-report-snapshots` — verificar últimas execuções

### 12. i18n + SEO
- PT/EN bundles completos
- `<head>` por rota (title, description, og:*, canonical)
- Sitemap inclui rotas públicas

### 13. Design system (mobile + desktop)
- Tokens semânticos (sem `slate-*`, sem cores hardcoded)
- Tipografia: Fraunces + Inter em público; JetBrains Mono só admin
- Ocean Breeze no relatório light
- Contraste, focus rings, touch targets ≥44px em mobile

### 14. Segurança
- `security--run_security_scan`
- RLS em todas as tabelas com dados de utilizador
- `user_roles` separado (não no profiles)
- Webhooks com signature verification
- Sem secrets no bundle cliente

### 15. Performance
- Console limpa (sem erros/warnings críticos)
- Network: 200s, sem 4xx/5xx em rotas públicas
- LCP da landing aceitável em mobile

## Método

1. Tooling read-only: `cloud_status`, `db_health`, `linter`, `security_scan`, `read_query`, `server-function-logs`, `tsc`, `vitest`.
2. Browser: navegar rotas críticas em mobile (411×742) e desktop (1366×768); screenshots quando algo suspeito.
3. Cross-check com runtime checks do `/admin/sistema`.
4. Não tocar em dados live: não completar pagamento, não apagar nada, não disparar emails reais.

## Output

Relatório estruturado:
- Tabela por área com PASS / WARN / FAIL + evidência (status, log, screenshot, query)
- Lista priorizada P0 / P1 / P2 de issues encontrados
- Veredicto final: **READY FOR PUBLIC LAUNCH** / **NEEDS FIX (Px)** / **BLOCKED**

## Não inclui
- Alterações de código (auditoria é read-only; correções ficam para build mode subsequente)
- Pagamento real EuPago (já validado como READY FOR LIVE PAYMENT)
- Edição de `/report.example`
