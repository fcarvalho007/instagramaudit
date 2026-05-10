# Avaliação Final + Refinamentos Pendentes

## Estado da loop atual

| Tema | Estado | Notas |
|---|---|---|
| Mobile audit (admin 375px) | ✅ Concluído | Edits aplicados em topbar, kanban, lead sheet, beta-requests, report-lab |
| Kill switches (4 flags Brevo/Resend/Lead-magnet) | ✅ Concluído | `docs/KILL_SWITCHES.md` + guards em 3 ficheiros |
| Audit privacidade — itens 1, 2, 6, 7 | ✅ Concluído | Política atualizada com Brevo/OpenAI/DataForSEO + tracking + marketing; link checkbox corrigido; nota "beta privada" no modal |
| Runbook beta operacional | ✅ Concluído | `docs/BETA_RUNBOOK.md` |

## Pendências do audit privacidade (itens 3, 4, 5)

Estes itens foram **explicitamente diferidos** no prompt anterior para "prompt seguinte". São P0 antes de beta externa **se** os emails lead-magnet ficarem ON. Como o runbook recomenda mantê-los OFF via `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED="false"`, é possível adiar segurança-mente — **mas há um problema novo** identificado nesta avaliação:

**Brevo contact sync ignora `marketing_consent`.** Em `src/lib/brevo/sync.server.ts` o lead é adicionado à lista mesmo quando o utilizador não marcou o opt-in marketing. Isto contradiz a política recém-atualizada (que diz "apenas mediante consentimento expresso"). Tem de ser corrigido **antes** de divulgar a política em beta externa, mesmo com lead-magnet OFF, porque a sync para a lista Brevo já está ON por defeito.

## Refinamentos propostos para fechar agora

### R1 — Gating do Brevo sync por `marketing_consent` (P0)

`src/lib/brevo/sync.server.ts` em `syncLeadToBrevo`:
- Se `lead.marketing_consent !== true` E `BREVO_LEAD_MAGNET_LIST_ID` definido → **não adicionar à lista** (criar contacto sem `listIds`, ou pular).
- Registar evento `brevo_contact_sync_skipped` com `reason: "NO_MARKETING_CONSENT"`.
- Mantém o sync de attributos (nome, handle) para CRM interno se quisermos, mas sem listas de marketing.

Decisão a tomar: criar contacto sem lista, ou não criar de todo? **Proposta**: criar sem lista (continua a ser CRM útil) e re-adicionar à lista quando `marketing_consent` mudar para true.

### R2 — Gating do `sendLeadMagnetSequence` por `marketing_consent` (P0)

`src/lib/email/lead-magnet-sequence.server.ts`:
- Já tem kill-switch global. Adicionar verificação adicional: se `lead.marketing_consent !== true` → skip welcome + summary, retornar `{welcome:"skipped_no_consent", summary:"skipped_no_consent"}`, registar `lead_magnet_sequence_skipped` com `reason: "NO_MARKETING_CONSENT"`.
- Defesa em profundidade: mesmo que alguém ative o kill-switch, leads sem opt-in nunca recebem.

### R3 — Refinamentos de copy (P2 do audit anterior)

- `src/components/product/unlock-modal.tsx` linha ~672: trocar "Sem spam." por "Cancela quando quiseres." (não promete absoluto).

### R4 — Atualizar runbook + KILL_SWITCHES com a nova lógica de consent

- `docs/BETA_RUNBOOK.md`: secção 4 (emails), nota explícita "lead-magnet só sai se utilizador marcou opt-in marketing".
- `docs/KILL_SWITCHES.md`: adicionar nota "verificação adicional de `marketing_consent` aplica-se em cima do kill-switch".

### R5 — Não fazer agora (continuar a deferir)

Estes 3 itens precisam de infraestrutura nova e ficam para sprint dedicado:

- ❌ Footer email com identificação operador (NIF + morada) — precisa decisão legal/dados do operador
- ❌ Rota pública `/email/cancelar?token=…` + tabela de tokens — sprint dedicado
- ❌ Linha "Recebes este email porque…" nos templates — só faz sentido com unsubscribe

Mitigação: lead-magnet permanece OFF via env flag até estes 3 ficarem prontos. Os transacionais (`report-ready`, `personal-area-saved`, `request-received`, `feedback-request`, `commercial-followup`) saem ao abrigo de execução de contrato e interesse legítimo, não exigem unsubscribe.

## Ficheiros tocados

| Ficheiro | Mudança | Linhas estimadas |
|---|---|---|
| `src/lib/brevo/sync.server.ts` | Guard `marketing_consent` antes de adicionar à lista | ~15 |
| `src/lib/email/lead-magnet-sequence.server.ts` | Guard adicional `marketing_consent` antes do kill-switch atual | ~10 |
| `src/components/product/unlock-modal.tsx` | "Sem spam" → "Cancela quando quiseres" | 1 |
| `docs/BETA_RUNBOOK.md` | Nota gating consent na secção 4 | ~3 |
| `docs/KILL_SWITCHES.md` | Nota sobre layered consent | ~5 |

Sem migrações. Sem novas dependências. Sem mudanças de UI pública (exceto micro-copy do modal).

## Checkpoint

- ☐ Aprovar R1 (Brevo gating)
- ☐ Aprovar R2 (lead-magnet gating)
- ☐ Aprovar R3 (copy modal)
- ☐ Aprovar R4 (atualizar docs)
- ☐ Confirmar que R5 (footer + unsubscribe) fica para sprint dedicado pós-beta inicial

Após esta sequência, o produto fica **consistente entre o que promete na política e o que executa**, e pronto para beta privada/restrita com handles convidados.
