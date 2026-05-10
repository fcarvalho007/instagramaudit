## Lead magnet — desbloqueio progressivo do relatório público

### 1. Arquitetura actual (achados da auditoria)

**Rota pública:** `src/routes/analyze.$username.tsx` chama `/api/public/analysis-snapshot/$username` e renderiza `ReportPage` com `variant="public_mvp"`.

**Renderização:** `src/components/report/report-page.tsx` é uma sequência fixa de blocos dentro de um único `<Container>`:

```
ReportHeader
ReportKeyMetrics         ← "Envolvimento médio" (KPI)
AIInsightBox hero
ReportTemporalChart
AIInsightBox temporal
AIInsightBox marketSignals
ReportBenchmarkGauge     ← "Posicionamento face ao benchmark" (gauge da taxa de engagement)
…todos os restantes blocos
```

**Variantes:** `src/lib/report/report-variant.ts` (`VariantFeatures`) controla visibilidade por bloco — `full | lightweight | teaser | hidden`. Já existe `pro_preview` com `teaser` para alguns blocos. Não existe variante "locked".

**Gate antigo:** `src/components/product/report-gate-modal.tsx` (568 LOC) + `premium-locked-section.tsx` (com `filter: blur(6px)`) já existem mas estão ligados ao fluxo de `request-full-report` (PDF), não ao desbloqueio do próprio relatório online.

**Tabelas:**
- `leads` já tem `email`, `email_normalized`, `name`, `company`, `user_type`, `purpose`, `profile_ownership`, `beta_consent`, `commercial_status`. **Falta** `commercial_interest` e timestamp de unlock.
- `report_requests` tem `lead_id`, `analysis_snapshot_id`, `user_id`, `metadata jsonb`, `instagram_username`. Já liga lead ↔ snapshot.
- `product_events` aceita qualquer `event_type` (text), `lead_id`, `snapshot_id`, `metadata`.
- `link_user_to_existing_reports(p_user_id, p_email)` já liga `profiles.lead_id` e `report_requests.user_id` quando o utilizador faz signup com o email do lead.

**Auth/área pessoal:** Supabase Auth com password + Google OAuth. `/app/reports` (`src/routes/app.reports.tsx`) lista relatórios via `getUserReports()` filtrado por `user_id`. `/app/reports/$id` mostra detalhe.

**Email:** Resend está configurado; admin já envia `send-report-link` e `send-feedback-request`. Templates ficam em `src/lib/email/templates`.

**Tracking:** `src/lib/tracking.functions.ts` aceita um enum de event types — `unlock_clicked` já existe. Eventos novos precisam de ser adicionados ao enum.

### 2. Boundary do gate (decisão)

A frase "do card Taxa de Engagement em diante" é ambígua. Há dois candidatos:

- **A) Antes do `ReportBenchmarkGauge`** (recomendado). Visível: Header, KPIs (incluindo "Envolvimento médio"), AI Insight hero, gráfico temporal, AI Insight temporal/market. Bloqueado: gauge de benchmark + tudo abaixo.
- B) Antes do `ReportKeyMetrics`. Visível só Header.

A) entrega valor visível (KPI principal + gráfico temporal + 2 insights AI) antes de pedir email, alinhado com "lead magnet, não paywall". Adoto A) salvo indicação contrária.

### 3. Modelo de dados (mínimo viável)

**Migração 1 — campos novos em `leads`:**
- `commercial_interest text null` — resposta do passo 5.
- `unlocked_at timestamptz null` — primeiro desbloqueio bem-sucedido.

**Migração 2 — tabela `lead_unlock_grants`:**
- `id uuid pk`, `lead_id uuid not null`, `analysis_snapshot_id uuid not null`, `instagram_username text not null`, `created_at timestamptz default now()`, `unique (lead_id, analysis_snapshot_id)`.
- Sem RLS pública (tudo via endpoints `/api/public/*` com service role).

**Reutilizado sem mexer:** `leads.user_type`, `leads.purpose`, `leads.profile_ownership`, `report_requests.metadata`, `product_events`.

### 4. Fluxo UX (mobile-first, pt-PT)

```
[1] Hero + KPIs + Temporal + Insights (visível)
        │
        ▼
[2] Bloco "Taxa de Engagement" e abaixo → frosted overlay
        │  CTA central card: "Desbloquear relatório completo"
        │  benefícios (3 bullets), tempo estimado "30 segundos"
        ▼
[3] Sheet/Modal — Passo 1 de 5: Email
        │  → POST /api/public/unlock-check { email, snapshot_id, username }
        │     ↳ recognized=false → continua para passo 2
        │     ↳ recognized=true  → "Bem-vindo de volta, {nome}"
        │                          + salta perguntas já respondidas
        ▼
[4..7] Passos 2–5: profile_ownership, purpose, user_type, commercial_interest
        (cada passo grava parcial via /api/public/unlock-progress
         para não perder lead se abandonar)
        ▼
[8] Conclusão — "Acesso garantido"
        │  → POST /api/public/unlock-finalize
        │     ↳ marca unlocked_at, cria lead_unlock_grant, grava report_request,
        │       envia magic-link Supabase para o email
        ▼
[9] Página: relatório completo (sem blur) + toast "Enviámos um link
    para acederes à tua área pessoal e veres este relatório no futuro."
```

**Estado de unlock no cliente:**
- Cookie httpOnly assinado `ib_unlock={lead_id, snapshot_id}` com 30 dias, definido pelo `unlock-finalize`. O componente `<ReportLockGate>` lê este cookie via `loader` SSR e decide blur vs. full.
- Reentrada do mesmo email no mesmo browser: cookie já está → sem blur.
- Reentrada noutro browser: o utilizador clica magic-link da área pessoal e o `report_request` aparece em `/app/reports`.

### 5. Lógica de reconhecimento de email

`POST /api/public/unlock-check` (service role):
1. Normaliza email (`lower(trim(...))`).
2. `select * from leads where email_normalized = $1 limit 1`.
3. Se existe, devolve `{ recognized: true, name, missing_fields: [...] }` onde `missing_fields` é o subconjunto de `["profile_ownership","purpose","user_type","commercial_interest"]` que está `null`.
4. Se não existe, devolve `{ recognized: false, missing_fields: ["all"] }`.

O cliente só renderiza os passos em `missing_fields`. Se não faltar nada, o passo final é só o ecrã "Bem-vindo de volta — desbloquear este relatório?" com um botão.

### 6. Perguntas (opções pt-PT, AO90)

Mantenho exactamente as opções propostas pelo utilizador. Pequenos ajustes ortográficos:
- "Aumentar alcance", "Melhorar envolvimento", "Perceber que conteúdos funcionam", "Comparar com concorrentes", "Criar relatórios para clientes" (uso "envolvimento" para coerência com "Envolvimento médio" no KPI).
- Restantes opções: cópia exacta da spec.

### 7. Área pessoal

**Reutilizar `/app/reports` existente.** Mecanismo de entrada:

- O `unlock-finalize` chama `supabase.auth.admin.generateLink({ type: "magiclink", email })` e o backend envia via Resend com template novo `personal-area-access` (assunto: "O teu relatório fica guardado na tua área InstaBench").
- Quando o utilizador clica e faz login, o trigger `handle_new_user` → `link_user_to_existing_reports` já liga automaticamente `report_requests.user_id` ao novo `auth.users.id`.
- `/app/reports` lista todos os relatórios desbloqueados.

Sem signup com password explícito, sem fricção adicional.

### 8. Eventos a registar

Adicionar ao enum em `src/lib/tracking.functions.ts`:

| event_type | quando | payload |
|---|---|---|
| `unlock_gate_viewed` | overlay aparece no scroll | `{ snapshot_id, username }` |
| `unlock_email_submitted` | passo 1 OK | `{ recognized, missing_fields }` |
| `unlock_questions_started` | utilizador avança para passo 2 | `{ steps_remaining }` |
| `unlock_completed` | finalize OK | `{ lead_id, snapshot_id }` |
| `report_saved_to_account` | `lead_unlock_grants` insert | `{ lead_id, snapshot_id }` |
| `returning_lead_detected` | `unlock-check` recognized=true | `{ lead_id }` |
| `personal_area_email_sent` | magic-link enviado | `{ message_id }` |

### 9. Arquitectura técnica (resumo)

**Novos ficheiros:**
- `src/components/product/report-lock-gate.tsx` — overlay frosted + card CTA.
- `src/components/product/unlock-flow-sheet.tsx` — sheet/modal multi-passo (shadcn Sheet em mobile, Dialog em desktop).
- `src/components/product/unlock-step-*.tsx` — 5 passos.
- `src/routes/api/public/unlock-check.ts`
- `src/routes/api/public/unlock-progress.ts`
- `src/routes/api/public/unlock-finalize.ts`
- `src/lib/email/templates/personal-area-access.tsx`
- `src/lib/unlock/cookie.ts` — sign/verify do cookie `ib_unlock` (HMAC com `INTERNAL_API_TOKEN`).

**Ficheiros tocados:**
- `src/routes/analyze.$username.tsx` — wrap dos blocos pós-KPIs com `<ReportLockGate>`; loader lê cookie.
- `src/components/report/report-page.tsx` — aceitar prop `lockBoundary?: "benchmark"` que injecta o componente gate antes de `ReportBenchmarkGauge`.
- `src/lib/tracking.functions.ts` — enum estendido.

**Não tocar:** cálculo de relatório, PDF, `/report.example`, admin CRM, `report-gate-modal.tsx` antigo (deprecar numa fase futura).

### 10. Fases de implementação (uma por prompt)

- **Fase 0 — Schema:** migração `leads` (2 colunas) + nova tabela `lead_unlock_grants`. Sem código.
- **Fase 1 — Endpoints:** `unlock-check`, `unlock-progress`, `unlock-finalize` + helpers de cookie. Testes unit.
- **Fase 2 — Lock UI:** `ReportLockGate` com frosted overlay, isolado, integrado em `analyze.$username` atrás de uma flag (`?gate=1`).
- **Fase 3 — Flow Sheet:** componentes dos 5 passos, integração com endpoints, persistência parcial.
- **Fase 4 — Magic link + email:** template, envio via Resend, hook no finalize.
- **Fase 5 — Tracking:** estender enum, instrumentar todos os eventos, adicionar ao mapa do `lead-detail-sheet` (para a CRM ver).
- **Fase 6 — Remover flag e aceitação:** ligar para todos os utilizadores, deprecar `report-gate-modal` antigo.

### 11. Riscos

1. **Race entre `unlock-check` e `unlock-finalize`** se o utilizador abre dois separadores. Mitigar com `unique (lead_id, analysis_snapshot_id)` em `lead_unlock_grants` + upsert idempotente.
2. **Cookie perdido** entre dispositivos — coberto pela área pessoal via magic-link.
3. **Abandono no passo 2–4** — mitigado por `unlock-progress` que grava parcial; o lead já está em `leads` desde o passo 1, gerando lead utilizável mesmo sem unlock completo.
4. **Spam de emails** — `unlock-finalize` aplica rate-limit por `email_normalized` (1 magic-link por hora) e por IP hash.
5. **SEO** — overlay não deve esconder semântica; renderizar conteúdo bloqueado com `aria-hidden="true"` e `<noscript>` com CTA simples para crawlers.
6. **Confusão entre "free quota" antigo (`request-full-report`) e novo unlock** — fase 6 deve clarificar; a quota mensal pode evoluir para "1 PDF/mês" enquanto o unlock online é ilimitado por lead.

### 12. Próximo prompt sugerido

> **Fase 0 — Schema do unlock**
>
> Goal: criar migração para suportar o lead magnet do relatório público.
>
> 1. Adicionar a `leads` as colunas `commercial_interest text null` e `unlocked_at timestamptz null`.
> 2. Criar tabela `public.lead_unlock_grants` com `id`, `lead_id`, `analysis_snapshot_id`, `instagram_username`, `created_at`, índice único `(lead_id, analysis_snapshot_id)`, índices secundários por `lead_id` e por `analysis_snapshot_id`. Sem RLS pública (acesso só via service role).
> 3. Sem código de aplicação, sem endpoints, sem UI.
>
> Output: migração SQL revista e aplicada, confirmação de que `src/integrations/supabase/types.ts` regenerou.

### Checkpoint

- ☐ Confirmar boundary: gate começa antes do `ReportBenchmarkGauge` (opção A)
- ☐ Confirmar uso de magic-link Supabase (sem password) para área pessoal
- ☐ Confirmar nome `commercial_interest` para a 5.ª resposta
- ☐ Confirmar que o `report-gate-modal.tsx` antigo pode ser deprecado na fase 6