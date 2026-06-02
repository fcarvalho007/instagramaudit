
## Âmbito

Refazer as 3 tabs da ficha de cliente — **Relatórios**, **Feedback**, **Histórico** — segundo os mockups. Cada tab responde a uma pergunta distinta:

- **Relatórios** = o que ele tem
- **Feedback** = o que ele acha
- **Histórico** = o que aconteceu

Sem sobreposição. Mantenho a tab Resumo intacta (mudámo-la no prompt anterior).

---

## TAB 1 — Relatórios

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 1 relatório · 1 crédito por usar       + Gerar para este lead │
├─────────────────────────────────────────────────────────────┤
│ ┌───┐  @webhspt  [Gerado]  01/06 · 07:15  · índice 41   ⎘ ↓ │
│ └───┘                                                        │
│       👁 Ainda não foi visto pelo lead.                      │
└─────────────────────────────────────────────────────────────┘
```

### Conteúdo

**Cabeçalho do bloco** (uma linha):
- Esquerda: `N relatório(s) · X / Y créditos por usar` (X = `credits_remaining`, Y = `credits_granted`). Inter SemiBold tabular-nums.
- Direita: link `+ Gerar para este lead` — abre o `GenerateReportDialog` existente, só visível quando o lead tem `report_request_id` e `report_status ∈ approved|pending_review|failed`. Caso contrário fica desactivado com tooltip.

**Cada relatório** (uma linha por `report_request`, dados via endpoint actual `/api/admin/report-requests?lead_id=...`):
- Avatar quadrado pequeno (Instagram glyph 32×32, bg `--admin-surface-muted`).
- `@handle` Inter SemiBold.
- Chip de estado: `Gerado` (verde) / `A processar` (azul) / `Por aprovar` (cinza) / `Falhou` (vermelho) — mapeado de `request_status`.
- Data curta `DD/MM · HH:MM`.
- ~~`· índice 41`~~ → **não temos `score`/`índice` em `analysis_snapshots`** (verifiquei em `types.ts`); mostro apenas a data e fica preparado para acrescentar quando o campo existir. Se quiseres já o índice, abre um prompt para adicionar a coluna.
- Ações à direita: ícone `Abrir` (link `/analyze/$handle`) e ícone `PDF` (download de `pdf_storage_path` quando `pdf_status='generated'`, senão desactivado com tooltip "PDF ainda não foi gerado").
- Linha abaixo (sub-meta cinzenta):
  - Se `report_views === 0` → 👁 *"Ainda não foi visto pelo lead."*
  - Se `report_views > 0` → ✓ *"Visto N vezes · última vez {data}"*

**Estado vazio**: "Este lead ainda não pediu nenhum relatório." + botão `+ Gerar para este lead` quando aplicável.

### Reaproveitamento
- A função `LeadReportsList` actual (linhas 1873–1984) já chama o endpoint correcto — reescrevo só o render para o layout novo, sem mexer no endpoint.

---

## TAB 2 — Feedback

### Layout

Dois estados possíveis no mesmo card grande, decididos por `lead.feedback`:

**(A) Sem feedback ainda** (estado actual da maioria dos leads):
```
        😊  (emoji grande, centrado)
   Ainda sem feedback deste lead.
   [ ✈ Pedir feedback por email ]   ← CTA primária (azul)
   ─────────────────────────────────
   COMO APARECE QUANDO RESPONDE
   ┌──────────────────────────────┐
   │ 😍  Muito útil               │
   │ sobre o relatório de @x · há 2 dias │
   │ "Adorei a clareza..."        │
   └──────────────────────────────┘   ← preview ilustrativo, etiquetado
```
- Botão "Pedir feedback por email" abre o `FeedbackRequestDialog` existente.
- Disabled + tooltip quando o lead não tem email ou não tem relatório pronto.
- Preview ilustrativo: card com bg `--admin-surface-muted` e badge "Exemplo" no canto, para o operador saber como vai parecer. Posso esconder este preview atrás de um `<details>` se preferires não ter exemplo permanente — diz só.

**(B) Com feedback recebido**:
```
┌────────────────────────────────────────────┐
│ 😍 Muito útil                  ▸ Alto      │
│ sobre o relatório de @handle · há 2 dias   │
│                                            │
│ "Adorei a clareza do diagnóstico.          │
│  Faltou comparar com concorrentes."        │
│                                            │
│ ── Disposto a pagar: Sim ──────────────    │
│ ── Opção preferida: Pack 5 (28€) ──────    │
│ ── Permite contacto: Sim ──────────────    │
└────────────────────────────────────────────┘

┌─ 💡 SINAL COMERCIAL ──────────────────────┐
│ Alto · feedback positivo + intenção de    │
│ compra → enviar follow-up com pack 5      │
└───────────────────────────────────────────┘
```

### Mapeamento score → emoji + label

| Score | Emoji | Label |
|---|---|---|
| 5 | 😍 | Muito útil |
| 4 | 😊 | Útil |
| 3 | 🙂 | Razoável |
| 2 | 😐 | Pouco útil |
| 1 | 😞 | Nada útil |

(Já existe `interpretFeedback` para o sinal comercial — reutilizo.)

### Reaproveitamento
- Refaço o `FeedbackBetaSection` (linhas 1757–1872) para o layout novo. Mantenho os campos `usefulness_score`, `purchase_intent`, `pricing_preference`, `clarity_text`, `missing_text`, `created_at` — todos já vêm da query existente.

---

## TAB 3 — Histórico

### Layout (timeline vertical com rail à esquerda)

```
●━━━ Criou conta e pediu análise de @webhspt
│      via modal de onboarding · 01/06, 07:15
│
●━━━ Relatório gerado · 1 crédito usado
│      01/06, 07:16
│
○━━━ Email com o link enviado
┊      01/06, 07:16
┊
◌╴╴╴ À espera de o lead abrir o relatório…
```

- **Cheio (●)** → evento já aconteceu.
- **Vazio com borda (○)** → evento aconteceu mas é informativo (envio automático).
- **Tracejado (◌)** → estado pendente / à espera (não é um evento, é uma projecção do próximo passo).
- Linha vertical a `1px solid` para concluídos, `1px dashed` entre o último concluído e o pendente.
- Sem ícones dentro dos bullets — só cor + forma (mais limpo que o `TimelineSection` actual).

### Fonte de dados

Pega no `timeline` actual (`/api/admin/lead-timeline/$id` → `product_events`) e mapeia para entradas humanas. Os eventos relevantes já são registados hoje (confirmei em `event-labels.ts`):

| Entrada UI | Evento(s) de origem |
|---|---|
| "Criou conta e pediu análise de @handle" | `beta_request_created` (ou `unlock_email_submitted` para leads via desbloqueio) |
| "Relatório gerado · N créditos usados" | `report_generated` (+ olhar `credit_ledger` para o `N`) |
| "Email com o link enviado" | `report_link_sent` |
| "Lead abriu o relatório" | `report_viewed` (agrupar consecutivos com count) |
| "Feedback pedido por email" | `feedback_requested` |
| "Feedback recebido" | `feedback_submitted` |
| "Pagou Xeur · pack/relatório" | `pricing_option_clicked` → ou um futuro `payment_confirmed` (ver nota) |
| "Follow-up comercial enviado" | `commercial_followup_sent` |

**Projecção do próximo passo** (último item tracejado): derivada de `suggestNextLeadAction(lead).label`. Quando o estado é terminal (`convertido`, `arquivado`), não mostro projecção.

### Reaproveitamento
- Crio novo componente `LeadHistoryTimeline` no mesmo ficheiro. **Não** uso o `TimelineSection` actual nesta tab (visual diferente). O `LeadCommunicationTimeline` desaparece desta tab — fica disponível só para uso interno de debug se quiseres mantê-lo, mas removo o import na tab.
- Mantenho o agrupamento de `report_viewed` consecutivos (`groupConsecutiveViews`) — só muda o render.

---

## O reparo honesto sobre eventos

Verifiquei `src/lib/admin/event-labels.ts` e os call-sites em `lead-events.server.ts` + `feedback.functions.ts` + endpoints de envio de email. Os eventos que a timeline da ficha precisa **já são registados hoje**:

- ✅ `beta_request_created` — criado em `/api/onboarding/start` e em `unlock.server.ts`.
- ✅ `report_generated` — registado em `generate-beta-report`.
- ✅ `report_link_sent` — registado em `send-report-link`.
- ✅ `report_viewed` — registado quando o relatório público é aberto.
- ✅ `feedback_requested` / `feedback_submitted` — registados nos endpoints respectivos.
- ✅ `commercial_followup_sent` — registado em `send-commercial-followup`.

**Buracos conhecidos**:
- ❌ Não há evento explícito de **pagamento confirmado** (`payment_confirmed`) — hoje só temos `pricing_option_clicked` (intenção, não confirmação) e a tabela `lead_payments`. Para a timeline, derivo o evento "Pagou X€" a partir do `payment_summary.paid_products` + `last_payment_at`, mas fica sem um `product_event` próprio. Se quiseres timeline e dashboard alinhados, abrir prompt separado para emitir `payment_confirmed` no webhook eupago — é o tracking de funil que mencionas.
- ❌ Não há evento `lead_created` específico para distinguir "via onboarding modal" vs "via desbloqueio direto" — uso `source` do lead + presença de `unlock_email_submitted` no timeline para inferir.

Não fecho estes buracos neste prompt — só os deixo documentados.

---

## Ficheiros tocados

1. **`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`**
   - Reescrever o conteúdo de `TabsContent value="relatorio"` (linhas 985–1052): drop dos `DetailRow`/`ProgressTracker`/`SectionTitle "Último relatório"` actuais. Fica apenas o cabeçalho compacto + lista nova de relatórios.
   - Reescrever `LeadReportsList` (linhas 1873–1984) com o card novo (avatar + meta + sub-linha "visto/não visto").
   - Reescrever `FeedbackBetaSection` (linhas 1757–1872) com os estados (A) sem feedback / (B) com feedback.
   - Substituir o conteúdo de `TabsContent value="historico"` (linhas 1059–1087) por um novo `LeadHistoryTimeline` (timeline vertical com rail). Remover `LeadCommunicationTimeline` desta tab.

2. **`src/components/admin/v2/beta-leads/__tests__/lead-history-timeline.test.tsx`** (novo)
   - Mapeia `beta_request_created`, `report_generated`, `report_link_sent`, `report_viewed` para entradas legíveis.
   - Última entrada tracejada quando o estado não é terminal.
   - Não mostra projecção quando `commercial_status ∈ {convertido, arquivado, expirado}`.

3. **`src/components/admin/v2/beta-leads/__tests__/feedback-beta-section.test.tsx`** (novo)
   - Estado A: emoji + CTA "Pedir feedback por email" + preview ilustrativo.
   - Estado B: emoji correcto por score, mostra `clarity_text` + `missing_text` + sinal comercial.

4. **Não tocar**: `kanban-columns.ts`, `event-labels.ts`, `/api/admin/lead-timeline/$id`, `/api/admin/report-requests`.

---

## Checkpoint

- ☐ TAB Relatórios: cabeçalho com créditos + CTA "Gerar para este lead"; cada linha com avatar, handle, estado, data, acções abrir/PDF, sub-linha "visto/não visto"
- ☐ TAB Feedback: estado A com emoji + CTA + preview etiquetado; estado B com emoji por score + texto + sinal comercial
- ☐ TAB Histórico: timeline vertical com bullets cheios/vazios/tracejados; sem `LeadCommunicationTimeline`
- ☐ Os 3 reparos honestos documentados (índice ausente, payment_confirmed ausente, source heurística)
- ☐ Testes novos passam (`bunx vitest run lead-history-timeline feedback-beta-section`)
