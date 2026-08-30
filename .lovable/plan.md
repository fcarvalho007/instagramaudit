# Ronda 5B — Magic link e área privada sem password

Plano mínimo derivado da auditoria 5A. Reutiliza toda a infraestrutura existente; não cria uma segunda arquitectura de autenticação.

## 1. Email de acesso para todos os leads

`/api/public/lead-capture` passa a enviar o email de acesso em todas as capturas (lead novo e lead existente), imediatamente após `email_submitted` — opção A. O Comment Intelligence continua assíncrono; uma falha nunca impede a verificação. A resposta HTTP mantém-se indistinguível entre email novo e existente.

Guarda: no máximo 1 envio por (lead, cache_key) por hora, para evitar reenvios em submissões repetidas.

## 2. Token de acesso endurecido

Em `verification-token.server`: acrescentar `purpose: "report_access"` e `jti` ao payload, mantendo HMAC-SHA256 e o formato actual. Acrescentar `reportRef` (a `cache_key` do relatório que originou o email).

Consumo one-time: registar o `jti` consumido numa tabela dedicada (`email_access_tokens`, com `expires_at`) e recusar reutilização. Cliques repetidos passam a devolver uma página neutra com opção de pedir novo link, em vez de reemitirem sessão.

## 3. verify-email

- Rate limiting por IP (por exemplo 20/hora) antes de qualquer trabalho.
- `Cache-Control: no-store` também nas respostas de erro.
- Redirect canónico: resolver o destino a partir de `reportRef` (`cache_key` → `lead_reports` → snapshot). Sem `reportRef`, cair em `/app/reports`. Nunca aceitar destino vindo do cliente; se existir `return_to`, restringir a uma allowlist de caminhos internos.
- Após emitir `lead_session`, limpar o cookie `report_capture_session`.
- Emitir os eventos de acesso descritos abaixo.

## 4. Área privada acessível com lead_session

Adicionar um caminho de leitura baseado em `lead_session`, sem tocar no caminho Supabase Auth existente:

- Novo servidor de dados que resolve o lead pelo cookie (reutilizando `resolve-lead.server`) e lista `lead_reports` + `report_requests` do lead.
- `/app` passa a aceitar sessão de lead **ou** sessão Supabase; sem nenhuma delas, redirecciona para a homepage.
- `/app/reports` mostra as auditorias de `lead_reports` (hoje ausentes), com estado real do Comment Intelligence.
- Logout limpa `lead_session` e, quando existir, termina a sessão Supabase.

Utilizadores antigos com Supabase Auth continuam a funcionar sem alteração.

## 5. Créditos

Manter `grantInitialCredits` (+2, idempotente) na verificação. Os créditos deixam de ser o gate da auditoria base assim que a baseline gratuita for activada, e passam a cobrir apenas concorrentes e janelas 30d/90d.

## 6. Analytics

Acrescentar a `ANONYMOUS_FUNNEL_EVENTS`: `access_email_queued`, `access_email_sent`, `access_email_failed`, `magic_link_clicked`, `email_verified`, `magic_link_invalid`, `magic_link_expired`, `full_session_created`, `private_area_viewed`, `report_reopened`, `access_email_resend_requested`, `access_email_resend_rate_limited`. Nenhum evento transporta token nem email em claro — apenas `lead_id`, `handle` e hash de `cache_key`.

## 7. Copy do email (proposta, sem implementar)

PT — Assunto: `A auditoria de @handle está pronta`. Preheader: `Guarda o acesso e consulta a análise quando quiseres.`
Corpo: identificação de `@handle`; 2–3 indicadores da Auditoria Instantânea; nota de que a análise aprofundada está disponível ou em processamento; CTA `Ver a minha auditoria`; frase final a explicar que o botão confirma o endereço e dá acesso seguro às auditorias associadas a esse email. Sem linguagem de posse do perfil, sem dados de outros relatórios.

EN — Subject: `The audit for @handle is ready`. Preheader: `Save your access and open the analysis whenever you want.` CTA: `View my audit`.

A promessa "recebe um link para voltares quando quiseres" só entra na UI depois do E2E validado. Até lá a copy da Ronda 4 mantém-se.

## Ficheiros que seriam alterados

- `src/lib/email/verification-token.server.ts`
- `src/lib/email/send-report-access.server.ts`, `src/lib/email/templates/report-access.ts`
- `src/routes/api/public/verify-email.ts`
- `src/routes/api/public/lead-capture.ts`
- `src/routes/api/public/funnel-event.ts`
- `src/lib/leads/report-capture-session.server.ts` (limpeza pós-verificação)
- `src/lib/credits/lead-reports.server.ts` (listagem por lead)
- `src/routes/app.tsx`, `src/routes/app.reports.tsx`
- Nova migração: `email_access_tokens`, com GRANTs e RLS
- Novos testes: token one-time, allowlist de redirect, envio unificado, listagem por `lead_session`

## Riscos

- Consumo one-time exige escrita em base de dados no caminho do clique; em falha de BD a decisão tem de ser fail-closed.
- Sessão de 90 dias sem revogação continua a ser o ponto mais fraco; mitigação futura é uma tabela de sessões revogáveis, fora do âmbito da 5B.
- A área privada dual (lead vs auth) tem de ter regras de precedência claras para não misturar históricos.

READY FOR ONBOARDING ROUND 5B — não existe bloqueio estrutural que obrigue a redesenhar a autenticação.
