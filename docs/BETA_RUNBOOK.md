# Runbook Operacional — Beta Privada AuditProfiles

Documento operacional. Para uso interno do operador durante a fase de beta privada.

---

## 0. Estado atual e premissas

- **Acesso ao admin**: `ADMIN_ALLOWED_EMAILS` (CSV) — sem JWT, baseado em allowlist de email.
- **Autenticação pública**: nenhuma. O utilizador entra direto em `/analyze/{handle}`.
- **Email primário**: Brevo. Fallback: Resend. Kill-switches disponíveis (`BREVO_TRANSACTIONAL_ENABLED`, `RESEND_FALLBACK_ENABLED`, `BREVO_CONTACT_SYNC_ENABLED`, `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED`).
- **Apify**: `APIFY_ENABLED` + `APIFY_ALLOWLIST` controlam custo e perfis permitidos.
- **Sequência lead-magnet**: deve estar **OFF** durante a beta externa enquanto não houver link de unsubscribe.
- **Checkout pago (EuPago)**: fluxo validado até ao redirect EuPago (lead session, linha `lead_payments` pending, split upsell, metadata, sem chamadas de provider, sem duplicados). Validação real de pagamento + webhook + entitlement + receita admin **ainda não executada** — ver checklist "ANTES de abrir CTAs de pagamento ao público".

---

## 0.1 Email lifecycle — auditoria e plano de consolidação

> Snapshot do estado actual dos templates operacionais. Plano completo em
> `.lovable/plan.md` (secção "Auditoria do lifecycle de email"). Esta secção
> é apenas a fonte de verdade para o operador durante a transição.

**Estado actual (auditado)**

| Template (key)        | Trigger actual                                        | Wired | Notas |
|-----------------------|-------------------------------------------------------|-------|-------|
| `request_received`    | `beta.functions.ts` (submit do beta form)             | auto  | Apenas no fluxo beta; não dispara no unlock público. |
| `report_ready`        | `/api/admin/send-report-link` (admin manual)          | manual| Existe um 2.º path (`/api/send-report-email` com signed URL) fora do registry. |
| `report_saved`        | `lead-magnet-sequence` em cada unlock                 | auto  | **Step 3 concluído.** Substitui `welcome_beta` + `report_summary`. Idempotente por `(lead_id, report_request_id)`; dedup honra eventos legacy. |
| `welcome_beta`        | — (legacy)                                            | não   | **LEGACY** — renderer/sender mantidos para histórico de overrides; já não é chamado pelo orquestrador. |
| `report_summary`      | — (legacy)                                            | não   | **LEGACY** — renderer/sender mantidos para histórico de overrides; já não é chamado pelo orquestrador. |
| `personal_area_saved` | —                                                     | não   | Reservado para futuro signup de conta. |
| `feedback_request`    | `/api/admin/send-feedback-request` (admin manual)     | manual| Sem auto-trigger D+1 / após view. |
| `commercial_followup` | `/api/admin/send-commercial-followup` (admin manual)  | manual| Copy genérica; será reescrito sem alterar preços nem CTAs. |
| `payment_confirmed`   | —                                                     | **não existe** | EuPago webhook hoje só emite product events; nenhum email. |

**Lifecycle alvo (5 estados)**

1. **Request received** — pedido/análise iniciada antes do relatório estar pronto.
2. **Report saved / créditos / 3 insights** — substitui `welcome_beta` + `report_summary` no 1.º unlock. Mostra: 2 créditos iniciais · 1 usado · 1 restante · 3 insights personalizados · CTA "Analisar outro perfil" / "Abrir relatório".
3. **Feedback request** — auto D+1 de `report_summary_email_sent` **ou** após `report_viewed` (o que vier primeiro). Inclui 1 insight real.
4. **Commercial follow-up** — continuação narrativa do relatório gratuito; preserva preços e CTAs actuais.
5. **Payment confirmed** — disparado por `eupago-webhook` no branch `paid`, idempotente por `payment_id`. Confirma produto desbloqueado, valor (lido sem alterar), método/referência se disponíveis, CTA para abrir o relatório.

**Garantias de não-regressão (válidas para todos os passos do plano)**

- Preços de produto: intocáveis (`src/lib/payments/products.ts`, pricing, `lead_payments.amount_cents`, payload EuPago).
- Lógica de checkout e webhook EuPago: intocável. O passo "payment_confirmed" adiciona apenas um `void send...` no fim do branch `paid`, com try/catch interno.
- Créditos: apenas leitura para apresentar saldo no email.
- Geração de relatórios e snapshots: intocável.
- Schema: nenhum `ALTER`/`CREATE` planeado. Se algum dado necessário não existir no snapshot actual, parar e pedir aprovação antes de qualquer DDL.
- Todos os novos envios atrás de kill-switch (`*_EMAIL_ENABLED`) e idempotentes por `(lead_id|payment_id, template_key)`.

---

## QA URLs and Environments

> **QA URLs:**
> - Use `id-preview--...lovable.app` to validate the live editor preview.
> - Use `instagramaudit.lovable.app` to validate the published build.
> - Do not use `preview--instagramaudit.lovable.app`; it may serve a stale build.
> - The public `/analyze/$username` route intentionally shows onboarding/sign-up gate to anonymous users.

---

## 1. Como convidar um beta tester

1. Confirmar que o handle de teste está em `APIFY_ALLOWLIST` (admin → `/admin/sistema`).
2. Enviar mensagem direta (WhatsApp/email pessoal) com:
   - URL: `https://auditprofiles.com/`
   - 1 frase de contexto: "Estamos em beta privada de uma ferramenta de benchmark de Instagram. Demora ~1 minuto."
   - Aviso: "É beta — qualquer coisa estranha avisa-me."
3. **Não usar** newsletter, ads, ou qualquer canal massa.
4. Marcar internamente o convite (ficheiro/Notion) com data + handle convidado.

## 2. URL a enviar

- **Sempre**: `https://auditprofiles.com/` (homepage).
- **Nunca** enviar `/admin/*`, `/report.example`, ou link direto a `/analyze/{handle}` (perde o contexto do unlock e o tracking de origem).

## 3. O que o utilizador deve experienciar

| Passo | Esperado |
|---|---|
| 1 | Landing → introduz @ ou URL do Instagram |
| 2 | Vê preview do relatório com 3 secções abertas e blur nas premium |
| 3 | Clica "Desbloquear" → modal 5 passos: email, ownership, goal, user type, pricing |
| 4 | Aceita RGPD (obrigatório), opcional marketing |
| 5 | Após submit: relatório completo desbloqueia |
| 6 | Recebe email com link |

Tempo total: 1–3 min.

## 4. Emails que o utilizador deve receber

| Trigger | Template | Quando | Beta status |
|---|---|---|---|
| Unlock concluído | `report-ready` | Imediato (transacional) | ON |
| Welcome lead-magnet | `welcome-beta` | ~2 min após unlock | OFF na beta externa |
| Resumo do relatório | `report-summary` | ~24h depois | OFF na beta externa |
| Feedback request | `feedback-request` | Manual via admin | ON (manual) |
| Commercial follow-up | `commercial-followup` | Manual via admin | ON (manual) |

> Nota consent: para além do kill-switch global
> `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED`, a sequência lead-magnet **só é
> enviada a leads que marcaram o opt-in `marketing_consent`** no modal.
> Leads sem consent recebem apenas o `report-ready` transacional.
> O sync para Brevo (CRM) também só ocorre com consent — sem opt-in,
> regista `brevo_contact_sync_skipped` com `reason: NO_MARKETING_CONSENT`.

## 5. Onde verificar o lead em `/admin`

- **Visão geral** (`/admin/visao-geral`) — funil + kanban resumido.
- **Beta leads** (`/admin/beta-leads`) — kanban completo. Procurar por handle ou email.
- **Lead detail sheet** — clicar no card. Abas: Identidade, Engagement, Histórico, **Timeline**, Comunicação, Notas.

## 6. Como confirmar Brevo sync

1. Abrir lead em `/admin/beta-leads` → sheet de detalhe.
2. Procurar campo `brevo_contact_id` na secção Identidade.
3. Se preenchido → sync OK. Se vazio + lead recente → ver Timeline pelo evento `brevo_contact_synced` ou `brevo_contact_sync_failed`.
4. Para confirmação cruzada: `/admin/sistema` → cockpit Brevo (contagem de syncs hoje).

## 7. Como ler a Timeline do lead

Eventos relevantes por ordem cronológica:

- `unlock_started` — abriu modal
- `unlock_step_completed` — passos 1-5
- `unlock_completed` — submeteu form
- `report_link_sent` — email enviado
- `report_email_delivered` / `report_email_opened` (se webhook ativo)
- `brevo_contact_synced` ou `brevo_contact_sync_failed` / `brevo_contact_sync_skipped`
- `report_viewed` — abriu o relatório
- `report_section_opened` — interagiu

Se faltar `unlock_completed` mas existir `unlock_started` → desistiu no funil. Investigar passo.

## 8. Utilizador não recebeu emails

| Sintoma | Verificar | Ação |
|---|---|---|
| Sem `report-ready` | Timeline → `report_email_failed`? | Ver `error_message` na Timeline |
| Email no spam | Confirmar com utilizador | Pedir marcar "Não é spam"; logar |
| `report_email_failed` Brevo | Cockpit `/admin/sistema` → Brevo OK? | Se Brevo down: kill-switch fallback Resend já trata |
| Ambos falham | Logs em `email_send_log` (admin → sistema) | Reenviar manualmente após corrigir |
| Lead-magnet não chegou | Confirmar `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` | Esperado OFF na beta — não é bug |

## 9. Brevo sync falhou

1. Timeline mostra `brevo_contact_sync_failed` com `reason`.
2. Razões comuns:
   - `BREVO_API_KEY` ausente → `/admin/sistema` mostra alerta. Adicionar secret.
   - `DISABLED_BY_FLAG` → `BREVO_CONTACT_SYNC_ENABLED="false"`. Esperado se desativado de propósito.
   - 429 Brevo → rate limit. Tenta novamente em 1h.
3. **Não bloqueante**: o utilizador desbloqueou na mesma. Apenas falta CRM externo.
4. Não há retry automático: re-sync manual via botão "Forçar sync" no detalhe do lead (se disponível) ou ignorar até final da beta e fazer batch.

## 10. Relatório não desbloqueia

| Sintoma | Causa provável | Ação |
|---|---|---|
| Modal fica em "A desbloquear…" | Apify down / fora de allowlist | `/admin/sistema` → status Apify; adicionar handle ao allowlist |
| Erro "perfil privado" | Conta IG privada | Pedir handle público alternativo |
| Erro "perfil não existe" | Typo do utilizador | Confirmar URL |
| Modal trava no passo 1 | RGPD não aceite | Lembrar utilizador |
| Erro 500 | Edge function | Logs em `/admin/sistema` → recent errors |
| `APIFY_ENABLED="false"` | Kill-switch ativo | Reativar se a pausa não foi intencional |

## 11. Mover lead no kanban

Colunas disponíveis (drag & drop em `/admin/beta-leads`):

`link_enviado` → `relatorio_visto` → `feedback_pedido` → `feedback_recebido` → **`interessado`** → **`potencial_cliente`** → **`convertido`** → **`arquivado`**

- **Interessado**: respondeu positivamente, quer continuar a conversa.
- **Potencial cliente**: discussão comercial concreta (preço/scope).
- **Convertido**: pagou ou assinou contrato.
- **Arquivado**: sem interesse, duplicado, ou teste interno.

Adicionar nota interna no sheet sempre que se mover de coluna.

## 12. O que NÃO tocar durante a beta

- `/report.example` (mockup editorial — não ligar a dados reais).
- Schema de `leads`, `unlock_events`, `product_events` (quebra o funil histórico).
- Valores de `APIFY_ALLOWLIST` sem documentar (perde-se controlo de custo).
- Ativar `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED="true"` antes de o footer dos emails ter unsubscribe + identificação operador.
- Política de privacidade / Termos sem revisão.
- Templates de email (rebuild assíncrono, risco de envio inconsistente).
- Tabela `user_roles` (não usada agora, fica para auth futura).

## 13. Limitações conhecidas

- Apenas perfis públicos do Instagram.
- Snapshot expira em 24h (necessário re-analisar).
- Sem login: o relatório fica acessível por link assinado.
- Sem histórico no perfil do utilizador (área pessoal não está pronta).
- Sem export PDF (só link online).
- Insights gerados por IA podem ter pequenas imprecisões — pedir feedback.
- Sem unsubscribe nos emails de marketing → por isso a sequência lead-magnet está OFF.

---

## Checklist ANTES de abrir CTAs de pagamento ao público

> **Estado atual**: Checkout pronto até ao redirect EuPago. Validação de pagamento real / webhook / entitlement / receita admin **adiada**. Antes de ativar CTAs pagas em superfícies públicas, completar **um pagamento real de 9€** (`report_full_9`) e validar a cadeia completa pending → paid → entitlement → admin.

- [ ] Realizar 1 pagamento real de 9€ (`report_full_9`) via EuPago em produção
- [ ] `lead_payments` transita de `status='pending'` para `status='paid'` com `paid_at` preenchido
- [ ] Webhook cria exatamente 1 linha em `lead_entitlements` para `product_code='report_full_9'` (sem duplicados)
- [ ] Evento `payment_webhook_paid` registado em `product_events` para o lead
- [ ] Sem chamadas a Apify / OpenAI / DataForSEO disparadas pelo webhook (`provider_call_logs` limpo na janela)
- [ ] Receita de 9€ aparece em `/admin/receita`

---

## Checklist ANTES de convidar um tester

- [ ] Handle alvo está em `APIFY_ALLOWLIST`
- [ ] `APIFY_ENABLED="true"`
- [ ] `BREVO_TRANSACTIONAL_ENABLED="true"` (ou Resend fallback ON)
- [ ] `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED="false"` (até unsubscribe estar pronto)
- [ ] Cockpit `/admin/sistema` sem alertas vermelhos
- [ ] Saldo Apify > limite mínimo
- [ ] Política de privacidade publicada (`/privacidade` 200 OK)

## Checklist DEPOIS de cada teste

- [ ] Lead apareceu em `/admin/beta-leads`
- [ ] Timeline mostra `unlock_completed` + `report_link_sent`
- [ ] `brevo_contact_id` preenchido (ou `*_skipped` se intencional)
- [ ] Utilizador confirmou receção do email
- [ ] Lead movido para coluna correta no kanban
- [ ] Notas internas adicionadas (impressão do utilizador, bugs reportados)
- [ ] Custo Apify do run dentro do esperado (ver `provider_call_logs`)

---

## Tabela de troubleshooting rápida

| Problema | Local 1.º check | Local 2.º check | Decisão |
|---|---|---|---|
| Sem unlock | Browser console do tester | `/admin/sistema` errors | Reanalisar manualmente |
| Sem email | Timeline do lead | `email_send_log` | Reenviar via admin |
| Brevo sync KO | Timeline (`brevo_*`) | `/admin/sistema` Brevo | Ignorar até batch ou re-sync manual |
| Apify falhou | `/admin/sistema` provider | `provider_call_logs` | Confirmar allowlist + saldo |
| Kanban vazio | Refresh + filtros | `/api/admin/leads-kanban` 200? | Reportar incidente |
| Custo a disparar | `/admin/visao-geral` despesa | `provider_call_logs` hoje | Pausar `APIFY_ENABLED` |

## Regras de escalação

- **Sev-1 (parar a beta)**: relatório não desbloqueia para >50% dos testers, custo Apify >2× esperado, leak de dados, erro RGPD.
  - Ação: `APIFY_ENABLED="false"` + parar convites + post-mortem em 24h.
- **Sev-2 (avisar testers ativos)**: emails não saem, Brevo down >2h.
  - Ação: avisar manualmente os testers afetados; confirmar fallback Resend ativo.
- **Sev-3 (registo)**: bug visual, copy errado, métrica esquisita.
  - Ação: anotar em backlog. Não interromper.
