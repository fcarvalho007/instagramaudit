## 1. Auditoria do estado atual

| Área | Estado | Observações |
|---|---|---|
| Modal de unlock (`unlock-modal.tsx`) | 4 passos: email → profile_ownership → goal → user_type. Pricing já saiu (foi para sheet pós-valor). | Mesmo para **leads recorrentes** o modal pede sempre as 4 perguntas. Só a copy do success state muda. **Gap funcional.** |
| Backend unlock (`unlock.server.ts`) | Persiste lead + report_request, deduplica por `(email_normalized)` e por `(lead_id, snapshot_id)`. | Já dispara `syncLeadToBrevo(leadId, "report_unlock")` fire-and-forget para a lista 16. |
| Emails existentes (`src/lib/email/templates/`) | `personal-area-saved`, `report-ready`, `feedback-request`, `request-received`, `commercial-followup`. | Estilo consistente (greeting + button + signature). Falta um **email de boas-vindas à beta** e um **resumo visual do relatório**. |
| Email atualmente enviado pós-unlock | `personal-area-saved` (link para `/app/reports`). | Não é um welcome editorial nem explica a beta. Precisa de mudar de propósito. |
| Brevo | Lista 16 (lead magnet) já sincronizada via `sync.server.ts` com 11 atributos. | Falta enviar `BETA_WELCOMED_AT` e `LAST_SUMMARY_SENT_AT` para futura segmentação. |
| Área pessoal | `/app/reports`, `/app/reports/$id`, `/app/account`, `/app/plan`. | Funcional. URL canónico para "abrir relatório" continua a ser `/analyze/$username` (público) ou `/app/reports/$id` (autenticado). |
| Snapshot/report payload | `snapshot-to-report-data.ts` expõe followers_count, avg_engagement_pct, dominant_format, format_stats, top posts, posting timeline, benchmark deltas. | **Tudo o que precisamos para um summary visual real existe**. |
| Eventos existentes | `unlock_email_submitted`, `unlock_completed`, `report_saved_to_account`, `returning_lead_detected`, `personal_area_email_sent/failed`, `brevo_contact_synced/failed`, `report_viewed`, `pricing_clicked`, `pricing_feedback_submitted`. | Falta sinalizar **engajamento real** (scroll-deep, tempo no relatório) e **gating dos emails** (welcome enviado, summary enviado). |

## 2. Jornada funcional final (alvo)

```text
[Público] /analyze/{user}
  ├── Header + métricas básicas (sempre visíveis)
  ├── Engagement section ──────── BLUR a partir daqui
  ├── Benchmarks                  ↓ overlay com CTA "Desbloquear"
  ├── Concorrência                ↓
  └── Recomendações IA            ↓
        │
        ▼ click "Desbloquear"
[Modal Unlock]
  ├── (Lead novo)        → email → 3 perguntas curtas → submit
  └── (Lead recorrente)  → só email → submit  (skip qualification)
        │
        ▼ unlock.server (já existente)
        ├── lead + report_request guardados
        ├── Brevo lista 16 (sync existente, +2 attrs novos)
        └── Email 1 enviado (Welcome Beta) ←── NOVO
        │
        ▼ user vê o relatório completo
[Engajamento real detectado]
  ├── scroll > 60% OU tempo > 45s OU click CTA → emit `report_engaged`
  └── pricing-feedback-sheet aparece UMA vez (já existe)
        │
        ▼ +24h (cron diário)  ─── NOVO
[Email 2 — Resumo Visual]
  ├── lê snapshot mais recente do lead
  ├── extrai 4 KPIs reais + top post
  └── manda summary partial com link para o relatório completo
        │
        ▼ +N dias
[Feedback request, commercial follow-up — fluxos já existentes]
```

## 3. O que muda agora vs depois

**Agora (esta fase, 5 prompts pequenos):**
1. Modal: skip qualification para leads recorrentes (detecção via endpoint `lookup-by-email` antes do step 2).
2. Renomear/repurpose: `personal-area-saved` → continua, mas adicionar **novo template `welcome-beta`** disparado em `createdReportRequest === true && !returningLead`.
3. Sync Brevo passa a enviar `BETA_WELCOMED_AT` quando welcome é enviado com sucesso.
4. Adicionar eventos `welcome_beta_email_sent/failed`, `report_summary_email_sent/failed`, `report_engaged`.
5. Criar template `report-summary` (preparado mas **NÃO ligado a cron** — disparo manual via admin nesta fase, automação fica para fase seguinte).

**Depois (fora desta fase):**
- Cron diário que selecciona leads com `unlock_completed` há 24-72h sem `report_summary_email_sent` e dispara o resumo.
- Trigger automático do pricing-feedback-sheet por `report_engaged` (atualmente é por scroll/tempo já implementado, mas convém centralizar).
- Lista Brevo 18 (Intenção Alta) populada por `pricing_feedback_submitted` com `pricing_preference !== free_only`.

## 4. Email 1 — Welcome Beta (estrutura)

- **Subject:** "Bem-vindo à beta do InstaBench, {firstName}"
- **Preheader:** "Estamos a validar o produto e o teu feedback conta."
- **Headline:** "A tua análise está desbloqueada"
- **Body (3 blocos curtos):**
  1. *"Acabaste de desbloquear a análise completa de @{handle}. Bem-vindo à beta privada do InstaBench."*
  2. *"O que é o InstaBench:"* — 2 frases sobre benchmark Instagram em pt-PT, sem claims exagerados.
  3. *"Estamos em validação MVP. Daqui a uns dias vamos pedir-te 2 minutos de feedback. Se já tiveres ideias, responde a este email."*
- **CTA:** botão "Abrir o meu relatório" → `/analyze/{handle}` (público, persistente).
- **URL fallback** + **signature** (reutiliza `shared.ts`).
- Sem mocks de métricas.

## 5. Email 2 — Resumo Visual (estrutura)

- **Subject:** "O teu raio-X de @{handle} em 60 segundos"
- **Preheader:** "4 números reais e o post que mais resultou."
- **Headline:** "Resumo da tua análise"
- **Body:**
  1. **KPI grid (2×2)** com tabular nums, **só valores reais do snapshot:**
     - Seguidores
     - Engagement médio (%)
     - Formato dominante
     - Δ vs benchmark do tier (pp)
  2. **Top post card:** thumb (via `/api/public/ig-thumb` já existente), formato, engagement %.
  3. **Microcopy:** *"Este é um snapshot parcial. O relatório completo tem benchmarks por formato, comparação com concorrência e recomendações."*
- **CTA:** "Ver relatório completo" → `/analyze/{handle}`.
- Footer: link "Não quero o resumo" → unsubscribe (Brevo gere; usar list 16 unsubscribe nativo).
- **Hard rule:** se algum dos 4 KPIs não estiver disponível no snapshot, o email **não é enviado** (evita números vazios).

## 6. Dados necessários para o summary email

Tudo já vem do `analysis_snapshots.normalized_payload` via `snapshotToReportData()`:

| Campo email | Origem |
|---|---|
| followers | `snapshot.followers_count` |
| avg_engagement_pct | `snapshot.avg_engagement_pct` |
| dominant_format | `snapshot.dominant_format` (já normalizado pt-PT) |
| benchmark_delta_pp | `keyMetrics.engagementDelta` |
| top_post.thumb_url | `posts[0].thumbnail_url` (proxy via `/api/public/ig-thumb?url=...`) |
| top_post.format | normaliseFormat do post |
| top_post.engagement_pct | `posts[0].engagement_pct` |
| handle | `snapshot.instagram_username` |
| report_url | `${PUBLIC_APP_BASE_URL}/analyze/${handle}` |

Nada novo a calcular. Nada de Apify/OpenAI.

## 7. Lógica de lead recorrente

**Hoje:** detectado server-side, mas o modal pede sempre as perguntas.

**Alvo:**
- Novo endpoint público `POST /api/public/lookup-lead` recebe `{ email }`, devolve `{ exists: boolean, has_qualification: boolean }` (sem PII além do echo).
- Modal chama-o no submit do step 1 (email):
  - `exists && has_qualification === true` → salta steps 2-4, vai direto para submit final com payload mínimo (só email + snapshot_id + handle).
  - Caso contrário, pede as 3 perguntas.
- `unlock.server.ts` já lida com merge conservador (não regrida), nada muda no backend.
- Welcome email **só é enviado se `returning_lead === false`**. Recorrentes recebem o `personal-area-saved` atual (já existente).

## 8. Sync Brevo — pontos de disparo

| Trigger | Lista | Atributos atualizados |
|---|---|---|
| `unlock_completed` (já existe) | 16 | atributos atuais + `LAST_REPORT_AT`, `REPORTS_COUNT` |
| `welcome_beta_email_sent` (novo) | 16 | + `BETA_WELCOMED_AT = now` |
| `report_summary_email_sent` (novo) | 16 | + `LAST_SUMMARY_SENT_AT = now` |
| `pricing_feedback_submitted` com intent alto (futuro) | 18 (Intenção Alta) | fora desta fase |
| `commercial_status → convertido` (já implementado em prompt anterior) | 17 (se secret existir) | `IS_CUSTOMER=true` |

Reusa `upsertBrevoContact` — só envia os atributos novos como deltas. **Não cria atributos na Brevo automaticamente** — o user tem de os pré-criar (Date) na UI Brevo. Isto fica documentado, não é código.

## 9. Plano de eventos (`product_events`)

Adicionar a `ALLOWED_EVENTS`:
- `welcome_beta_email_sent`
- `welcome_beta_email_failed`
- `report_summary_email_sent`
- `report_summary_email_failed`
- `report_engaged` (scroll>60% OR dwell>45s OR scroll-to-CTA)

Eventos existentes que continuamos a usar inalterados: `unlock_email_submitted`, `unlock_completed`, `report_saved_to_account`, `returning_lead_detected`, `report_viewed`, `pricing_feedback_submitted`, `brevo_contact_synced/failed`.

## 10. Sequência de implementação (5 prompts pequenos)

**Prompt 1 — Welcome email (sem cron, sem lookup ainda)**
- Criar template `welcome-beta.ts` em `src/lib/email/templates/`.
- Adicionar evento `welcome_beta_email_sent/failed` ao `ALLOWED_EVENTS`.
- Em `unlock.server.ts`: quando `createdReportRequest && !returningLead`, enviar **welcome-beta em vez de** `personal-area-saved`. Lead recorrente continua a receber `personal-area-saved`.
- Adicionar `BETA_WELCOMED_AT` ao payload Brevo se welcome enviou OK.
- Validação: `tsc --noEmit`, `vitest run`, smoke manual com 1 lead novo + 1 recorrente.

**Prompt 2 — Lookup endpoint + skip qualification para recorrentes**
- `POST /api/public/lookup-lead` (rate-limited; só responde `exists` + `has_qualification`).
- Modal salta steps 2-4 quando `has_qualification === true`.
- Validação: testes do endpoint + unit do form-flow.

**Prompt 3 — Summary email template + admin trigger manual**
- Criar template `report-summary.ts` com KPI grid + top post.
- Helper `buildReportSummaryEmailData(snapshotId)` que extrai os 4 KPIs do `normalized_payload` e devolve `null` se algum faltar.
- Botão em admin lead-detail-sheet: "Enviar resumo" (só ativo se data disponível e ainda não enviado).
- Eventos `report_summary_email_sent/failed`. Atributo Brevo `LAST_SUMMARY_SENT_AT`.

**Prompt 4 — Evento `report_engaged` no frontend**
- Hook `useReportEngagement(snapshotId)` na página `/analyze/$username`: dispara uma vez por sessão quando scroll>60% OU dwell>45s.
- Já alimenta o pricing-feedback-sheet existente (sem mudar a lógica do sheet).

**Prompt 5 — Automação do summary (cron)**
- pg_cron diário: leads com `unlock_completed` >24h E sem `report_summary_email_sent` E `LAST_SUMMARY_SENT_AT` null E snapshot disponível → fila batch (10/run) → envia summary.
- Esta fase fica para depois, requer cron e queue (fora do âmbito desta auditoria).

## Riscos

1. **Welcome substitui personal-area-saved para novos leads** — perdemos a copy "guardado na tua área". Mitigação: o welcome refere a área pessoal num pMuted + link.
2. **Atributos Brevo novos podem cair como Text** se não forem pré-criados como Date na UI. Mitigação: documentar checklist na primeira execução do Prompt 1; sync nunca falha por isso.
3. **Lookup endpoint pode ser usado para enumerar emails.** Mitigação: rate-limit por IP-hash (5/min), resposta constant-time, sem revelar `name`/`handle`.
4. **Summary email com KPIs em falta** parece pobre. Mitigação: gate hard — se faltar 1 dos 4, não envia (silencioso, log evento `report_summary_skipped_no_data`).
5. **Returning lead com qualification antiga incompleta** entra em loop de skip. Mitigação: `has_qualification = true` só se **os 3 campos** estiverem preenchidos.

## Primeiro prompt de implementação (pronto a colar)

> Implement Prompt 1 — Welcome Beta email on first unlock.
>
> Goal: substituir o email `personal-area-saved` enviado a leads novos por um novo email `welcome-beta`, mantendo `personal-area-saved` para leads recorrentes.
>
> Scope:
> 1. Criar `src/lib/email/templates/welcome-beta.ts` (subject/preheader/headline/copy conforme secção 4 do plano).
> 2. Registar o template em `src/lib/email/templates/index.ts` e em `src/lib/admin/email-template-registry.ts` (preview admin).
> 3. Adicionar `welcome_beta_email_sent` e `welcome_beta_email_failed` a `ALLOWED_EVENTS` em `src/lib/tracking.functions.ts`.
> 4. Criar `src/lib/email/send-welcome-beta.server.ts` espelhando `send-personal-area-saved.server.ts`, usando `sendTransactionalEmail` (Brevo→Resend fallback), com `reportUrl = ${PUBLIC_APP_BASE_URL}/analyze/${handle}`.
> 5. Em `src/lib/unlock.server.ts`, no bloco `if (createdReportRequest)`: se `!returningLead` chama `sendWelcomeBetaEmail`, senão chama `sendPersonalAreaSavedEmail` (comportamento atual).
> 6. Em `src/lib/brevo/sync.server.ts`: aceitar `extraAttributes` opcional. Quando welcome enviado OK, fazer um segundo `syncLeadToBrevo(leadId, "welcome_sent")` ou (preferido) chamar `upsertBrevoContact` directo só com `{ BETA_WELCOMED_AT: now }`. Decisão a tomar no prompt.
>
> Constraints:
> - Sem novos providers, sem Apify/OpenAI/DataForSEO.
> - Sem alterações de schema.
> - Não alterar a lógica de persistência do unlock.
> - Falha do welcome nunca bloqueia o unlock nem o sync Brevo.
> - Copy em pt-PT (Acordo 1990).
>
> Validation:
> - `bunx tsc --noEmit`
> - `bunx vitest run`
> - Smoke manual: 1 unlock novo → recebe welcome; 1 unlock com email já existente → recebe personal-area-saved (não welcome).
>
> Return: ficheiros alterados, exemplo do payload Brevo com `BETA_WELCOMED_AT`, evento `welcome_beta_email_sent` no `product_events`, validação.

## Checkpoint

☐ Confirmas que o welcome email **substitui** o personal-area-saved para leads novos (e não vai em duplicado)?
☐ Confirmas que o summary email fica disparado **manualmente pelo admin** nesta fase, e que a automação por cron entra em fase posterior?
☐ Confirmas que o lookup endpoint pode devolver `exists/has_qualification` (mínima exposição) sem necessidade de auth?
