## Objetivo

Separar entrega transacional do consentimento de marketing. Hoje, `lead-magnet-sequence.server.ts` e `brevo/sync.server.ts` saltam tudo quando `marketing_consent !== true`, o que bloqueia 100% do email lead-magnet. A entrega do relatório é transacional (o utilizador pediu-a) e deve depender apenas do `gdpr_consent`.

---

## Estado actual auditado

- `src/lib/email/lead-magnet-sequence.server.ts` (linhas 103-134) — bloco "Consent gate" carrega `leads.marketing_consent` e emite `lead_magnet_sequence_skipped` com `reason: "NO_MARKETING_CONSENT"`, devolvendo `{ welcome: skipped_disabled, summary: skipped_no_data }`. Esta é a causa raiz.
- `src/lib/brevo/sync.server.ts` (linhas 92-116) — mesmo padrão: salta sync e regista `brevo_contact_sync_skipped` com `reason: "NO_MARKETING_CONSENT"`.
- `src/lib/unlock.server.ts` — já trata `gdpr_consent` e `marketing_consent` como campos distintos e persiste ambos em `leads` (`beta_consent` ↔ GDPR, `marketing_consent` ↔ opt-in newsletter). Nenhuma alteração de schema necessária.
- `src/lib/unlock-flow.ts` — schema Zod já exige `gdpr_consent: z.literal(true)` e mantém `marketing_consent: z.boolean().optional()`. OK.
- `src/components/product/unlock-modal.tsx` — UI já tem dois checkboxes separados; precisa só de revisão de copy para deixar claro que o opcional NÃO bloqueia a entrega.
- Testes existentes:
  - `src/lib/email/__tests__/lead-magnet-sequence.test.ts` — tem teste "consent gate" que assume bloqueio. Vai mudar de polaridade.
  - `src/lib/brevo/__tests__/sync.test.ts` — idem.

---

## Alterações

### 1. `src/lib/email/lead-magnet-sequence.server.ts`

- Substituir o bloco "Consent gate" (linhas 103-134) por uma leitura ao lead que recolhe `marketing_consent` apenas para enriquecer metadata, **sem** bloquear envio.
- Manter o kill-switch `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` (continua a ser o único bloqueador legítimo).
- Em vez de gating: anexar `transactional_delivery: true` e `marketing_consent: <boolean>` aos metadados de `beta_welcome_email_sent` e `report_summary_email_sent`. Isto preserva auditoria sem partir entrega.
- Remover emissão de `lead_magnet_sequence_skipped` com `reason: "NO_MARKETING_CONSENT"` (deixa de existir).
- Se a leitura do lead falhar, continuar com `marketing_consent = false` em metadata (fail-open, transacional).

> **Nota sobre copy do welcome-beta**: o template (`src/lib/email/send-welcome-beta.server.ts` e o seu .tsx em `templates/`) será revisto apenas se contiver linguagem promocional. Conteúdo permitido: contexto beta, confirmação de geração do relatório, link, prazo de disponibilidade. Será verificado e ajustado se houver linguagem marketing-like.

### 2. `src/lib/brevo/sync.server.ts`

- Remover o gate "NO_MARKETING_CONSENT" (linhas 92-116). Sync passa a ocorrer após GDPR consent (precondição implícita do unlock).
- Adicionar atributo Brevo `MARKETING_CONSENT: lead.marketing_consent === true` ao payload (linhas 141-160). Brevo passa a ter o flag para segmentação futura.
- Não adicionar o contacto a nenhuma lista de marketing — projecto usa uma só lista CRM operacional, sem segmentação por lista. O atributo `MARKETING_CONSENT` é o segmentador.
- Manter `recordProductEvent("brevo_contact_synced")` com metadata `marketing_consent` no payload.

### 3. `src/components/product/unlock-modal.tsx` + i18n

- `gate.json` PT/EN: ajustar `unlock.step1.consentText` para a frase pedida:
  - PT: "Aceito o tratamento dos meus dados para gerar, guardar e enviar este relatório."
  - EN: equivalente.
- Ajustar `unlock.step1.marketingText`:
  - PT: "Quero receber novidades e dicas sobre relatórios, benchmarks e funcionalidades futuras."
  - EN: equivalente.
- Manter "(cancelas quando quiseres)" como hint, mas remover qualquer ligação implícita a "necessário para receber o relatório".
- No `unlock-modal.tsx` não há referência textual a "marketing obrigatório"; apenas o badge OBRIG. fica no checkbox GDPR. Sem mudança estrutural.

### 4. Testes

- `src/lib/email/__tests__/lead-magnet-sequence.test.ts`:
  - Reescrever o teste "consent gate" para o oposto: `marketing_consent=false` → ambos os emails são enviados, metadata contém `transactional_delivery: true, marketing_consent: false`.
  - Adicionar teste: `marketing_consent=true` → emails enviados e metadata regista `marketing_consent: true`.
- `src/lib/brevo/__tests__/sync.test.ts`:
  - Reescrever teste "NO_MARKETING_CONSENT" para: `marketing_consent=false` → sync ok, atributo `MARKETING_CONSENT=false` enviado, evento `brevo_contact_synced` regista `marketing_consent=false`.
  - Adicionar teste `marketing_consent=true` → atributo `MARKETING_CONSENT=true`.
- Não criar testes E2E novos para o schema `gdpr_consent=false` (já coberto por `src/lib/__tests__/unlock-flow.test.ts` via Zod literal). Verificarei e adiciono caso falte.
- Dedup por `report_request_id` mantém-se intacto (não tocado).

---

## Resultado esperado por cenário

**A) `gdpr_consent=true`, `marketing_consent=false`**

Eventos emitidos:
- `unlock_completed`
- `report_saved_to_account`
- `beta_welcome_email_sent` *(metadata: `transactional_delivery: true, marketing_consent: false`)*
- `report_summary_email_sent` *(metadata idem)*
- `brevo_contact_synced` *(atributo `MARKETING_CONSENT=false`)*

Já **não** é emitido: `lead_magnet_sequence_skipped`, `brevo_contact_sync_skipped`.

**B) `gdpr_consent=true`, `marketing_consent=true`**

Idêntico a (A) mas com `marketing_consent: true` em metadata e `MARKETING_CONSENT=true` em Brevo.

---

## Constraints respeitadas

- Sem alterações de schema Supabase.
- Sem chamadas reais a Brevo / Email (apenas mocks nos testes).
- UI pública do relatório intacta.
- Copy pt-PT preservada e reforçada (Acordo Ortográfico).
- GDPR consent permanece obrigatório (Zod `z.literal(true)`).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (com foco em `lead-magnet-sequence.test.ts` e `brevo/__tests__/sync.test.ts`)

---

## Checkpoint

- ☐ `lead-magnet-sequence.server.ts` deixa de gatear por `marketing_consent`
- ☐ Metadados dos eventos passam a incluir `transactional_delivery` e `marketing_consent`
- ☐ `brevo/sync.server.ts` deixa de gatear; adiciona atributo `MARKETING_CONSENT`
- ☐ Copy do checkbox GDPR e marketing actualizada (PT + EN)
- ☐ Welcome-beta template revisto: sem linguagem marketing
- ☐ Testes ajustados em `lead-magnet-sequence.test.ts` e `brevo/__tests__/sync.test.ts`
- ☐ `tsc --noEmit` e `vitest run` passam
