## Contexto

A ação "Enviar link" está implementada e operacional. Estes refinamentos endereçam **regressão de estado**, **clareza de re-envio**, **diagnóstico de erro** e **deteção de sandbox** — sem alterar contrato público nem schema.

---

## Refinamentos

### R1 · Bloquear downgrade de `commercial_status`

**Problema:** se o admin reenvia o link após o lead já estar em `relatorio_visto` ou `feedback_pedido`, `updateLeadCommercialStatus({ status: "link_enviado" })` força o status a recuar — falsifica o funil.

**Verificação rápida em `lead-lifecycle.ts`:** já existe ordem lifecycle. Vou usá-la.

**Mudança no endpoint** (`send-report-link.ts`):
- Antes de chamar `updateLeadCommercialStatus`, ler status atual e só atualizar se for `novo_pedido` / `aguardar_aprovacao` / `relatorio_pronto` (i.e., **anteriores ou iguais a `link_enviado` na ordem lifecycle**). Caso contrário, manter status e devolver `status_changed: false, previous: <status atual>`.
- Idealmente expor um helper `isStatusDowngrade(prev, next): boolean` em `lead-lifecycle.ts` reutilizável (alternativa: lógica inline com array `LIFECYCLE_ORDER`).

**Impacto:** re-envios deixam de mentir sobre o estágio do lead.

### R2 · UI: deteção de re-envio + last-sent no modal

**Problema:** botão diz sempre "Enviar link" e o modal não mostra que já foi enviado antes — admin pode duplicar sem se aperceber.

**Mudança em `lead-detail-sheet.tsx`** (e helper `EnrichedLead` se existir o campo):
- Derivar `lastSentAt` a partir de `lead.timeline` (procurar último evento `report_link_sent`). Se já existe no `EnrichedLead`/payload do `leads-kanban`, usar; senão, computar no componente.
- Botão `SendLinkButton`:
  - Label muda para **"Reenviar link"** quando `lastSentAt != null`.
  - Cor permanece (mesma ação semântica).
- `SendLinkDialog`:
  - Quando `lastSentAt`, adicionar linha **"Último envio · há 3 dias (12/03 14:22)"** no grid de meta, com aviso visual subtil (cor amber).
  - Título do diálogo muda para **"Reenviar link ao beta tester"**.

**Impacto:** alta clareza, zero risco de duplicação acidental.

### R3 · Resend: deteção de sandbox mais robusta + bubbling de erro

**Problema:** a regex atual `/you can only send testing emails to your own email/i` só apanha uma das mensagens. A Resend também devolve variantes com **`verified domain`** ou **`testing emails`** consoante o estado da conta. Erros genéricos perdem a `error.message` — admin fica com `RESEND_FAILED · status 403` sem contexto.

**Mudança em `send-report-link.ts`:**
- Tentar parse JSON do body; extrair `error.message` ou `message`.
- Sandbox check: `/(testing emails|only send.*verified|verified (email|domain))/i` sobre `message ?? bodyText`.
- Em `RESEND_FAILED`, incluir `details: <message truncated 200 chars>` na resposta (não vaza chave; só a mensagem do provider).
- `mapSendLinkError` no UI passa a anexar `details` ao toast quando presente: `"Falha ao enviar email. Resend: <details>"`.

**Impacto:** desbloqueia diagnóstico em produção sem precisar de logs.

### R4 · Aviso visual quando snapshot expirou

**Problema (menor):** se `analysis_snapshots.expires_at < now()`, o link `/analyze/:handle` ainda funciona (o relatório regenera-se) mas o admin envia sem saber.

**Mudança:** o `select` do `report_request` passa a juntar `expires_at` do snapshot (via `analysis_snapshot_id` → `analysis_snapshots.expires_at`). Devolver `snapshot_expired: boolean` na resposta. **Não bloqueia.** No diálogo, se `snapshotExpired === true` (vindo da fila do `EnrichedLead` via timeline ou novo campo no leads-kanban), mostrar aviso amber: *"Snapshot expirou — abrir o link irá regenerar dados."*

**Alternativa pragmática (preferida):** se isto exige tocar `leads-kanban.ts` (extra scope), **deixar fora** deste plano e abrir como nice-to-have separado. Mantenho R4 como **opcional**, marcado abaixo.

---

## Detalhes técnicos

**Ficheiros tocados (R1–R3, must-have):**
- `src/lib/admin/lead-lifecycle.ts` — adicionar `LIFECYCLE_ORDER` (se ainda não exportado) e helper `isStatusDowngrade(prev, next)`
- `src/routes/api/admin/send-report-link.ts` — usar helper antes de update; melhorar parse de erro Resend; expor `details`
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — `SendLinkButton` label dinâmico; `SendLinkDialog` mostra `lastSentAt` quando re-envio; `mapSendLinkError` anexa `details`
- `src/lib/admin/__tests__/feedback-intent.test.ts` (ou novo `lead-lifecycle.test.ts`) — testes para `isStatusDowngrade` (apenas se helper for adicionado)

**Sem novos pacotes. Sem migrações. Sem alteração no template de email.**

**Não tocar:**
- Schema Supabase
- Pipeline PDF, geração de relatório, providers
- `report_requests` table, RLS
- `/analyze/:handle` UI

---

## Validação

- `bunx tsc --noEmit` limpo
- `bunx vitest run` — manter 15/15 + novos testes do `isStatusDowngrade` (3 casos: prev<next, prev=next, prev>next)
- Smoke manual:
  1. Lead com status `relatorio_visto` → clicar "Reenviar link" → email enviado, status fica `relatorio_visto` (não recua), evento `report_link_sent` registado
  2. Lead já enviado → botão diz "Reenviar link", modal mostra "Último envio · …"
  3. Forçar Resend a falhar (chave inválida) → toast mostra `details` da Resend
  4. Sandbox: enviar para email não-verificado → toast diz "modo sandbox", reconhecido mesmo que mensagem mude

---

## Não fazer agora

- R4 (aviso de snapshot expirado) — fica para iteração separada se exigir tocar `leads-kanban.ts`
- Bloqueio server-side de duplo envio (`force`/idempotency) — UI já gere `loading`; a auditoria via timeline é suficiente
- Mudar `SENDER_FROM` do sandbox `onboarding@resend.dev` — depende de domínio verificado, fora de scope

---

## Checkpoint

- ☐ `isStatusDowngrade` exportado e testado
- ☐ Endpoint não recua status se já está à frente
- ☐ Resend: parse de `error.message` + sandbox regex robusta + `details` bubbled
- ☐ Botão muda para "Reenviar link" quando há envio prévio
- ☐ Diálogo mostra "Último envio · …" e título "Reenviar"
- ☐ Toast inclui `details` quando provider falha
- ☐ `tsc --noEmit` limpo
- ☐ `vitest run` ≥ 15/15