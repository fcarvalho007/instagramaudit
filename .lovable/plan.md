# Plano — Auditoria + refinamentos do fluxo lead magnet (nome, telefone, Brevo)

## Resumo da auditoria (sem alterar nada ainda)

### 1. Email safety — ✅ já garantido
`sendLeadMagnetSequence` (`src/lib/email/lead-magnet-sequence.server.ts`) é totalmente independente de phone, `marketing_consent` e de `BREVO_NAME_PHONE_ATTRS_ENABLED`. Só `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED=false` bloqueia. `marketing_consent` apenas enriquece metadata. Os emails `welcome-beta` e `report-summary` são enviados qualquer que seja o estado do telefone. Nenhuma alteração necessária — apenas adicionar testes que congelem este comportamento.

### 2. Personalização por primeiro nome — ✅ já garantido
`deriveFirstName` em `src/lib/unlock.server.ts` (linhas 116-124) usa `first_name` direto se existir, senão `parseFullName(full_name).first_name`. `sendLeadMagnetSequence` recebe `firstName` (não `fullName`). `parseFullName` em `src/lib/names/parse-full-name.ts` já trata "Ana Marques" → "Ana", "Ana Rita Marques Silva" → "Ana", "Élia" → "Élia". Tests já existem em `src/lib/names/__tests__/parse-full-name.test.ts`. Sem alterações.

### 3. Normalização de telefone — ❌ a corrigir
`normalizePhone` em `src/lib/unlock.server.ts` (linhas 105-114) é mínimo: só mantém `+` e dígitos. Casos PT atuais:
- "912345678" → `"912345678"` (sem `+`) → Brevo skip `PHONE_NOT_E164`
- "912 345 678" → `"912345678"` → idem
- "00351912345678" → `"00351912345678"` → idem (`00` não convertido para `+`)
- "+351912345678" → `"+351912345678"` ✅

**Ação**: extrair `normalizePhone` para `src/lib/phone/normalize-pt.ts` com regras seguras para PT móvel + mantendo passthrough internacional:
- Se já começa por `+`: manter apenas `+` + dígitos.
- Se começa por `00`: substituir `00` por `+`.
- Se 9 dígitos e começa por `9` (móvel PT): prefixar `+351`.
- Se 12 dígitos e começa por `351`: prefixar `+`.
- Restantes casos: devolver `null` (e o sync Brevo logará `PHONE_NOT_E164` — já acontece).

Substituir o uso em `unlock.server.ts` (2 call-sites) pelo novo helper. Nunca rejeita o lead.

### 4. Mapeamento Brevo — ⚠️ ajuste menor
`src/lib/brevo/sync.server.ts` já:
- envia `FIRSTNAME`/`LASTNAME` quando `BREVO_NAME_PHONE_ATTRS_ENABLED=true` e nome existe;
- envia `SMS` só com E.164 (começa por `+`);
- regista `name_attrs_sent` e `sms_sent` no evento `brevo_contact_synced`;
- regista evento `brevo_contact_sync_skipped` com `skipped_field: "phone"` + `reason: "PHONE_NOT_E164"` quando aplicável (não armazena telefone em bruto — ✅);
- continua a sincronizar o contacto mesmo quando o SMS é saltado.

**Ação mínima**: também adicionar `sms_skipped_reason` no metadata do evento `brevo_contact_synced` para auditoria num único evento (pedido pelo utilizador). Sem mudanças de schema. Continua a não guardar telefone em bruto em `product_events`.

### 5. Admin — ✅ já garantido
`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` já mostra `lead.phone` com link `tel:` quando presente. `product_events` regista apenas `phone_provided: boolean` (linha 483 `unlock.server.ts`) e `skipped_field/reason` no skip event — nunca o número em bruto. Sem alterações.

### 6. Testes a adicionar/atualizar

**Novo**: `src/lib/phone/__tests__/normalize-pt.test.ts`
- "912345678" → "+351912345678"
- "912 345 678" → "+351912345678"
- "+351912345678" → "+351912345678"
- "00351912345678" → "+351912345678"
- "351912345678" → "+351912345678"
- "+44 7700 900000" (UK) → "+447700900000"
- inputs vazios/curtos → null
- nunca lança

**Atualizar**: `src/lib/brevo/__tests__/sync.test.ts`
- adicionar caso com `BREVO_NAME_PHONE_ATTRS_ENABLED=true`, nome "Ana Rita Marques" e `phone_normalized="+351912345678"` → atributos incluem `FIRSTNAME:"Ana"`, `LASTNAME:"Rita Marques"`, `SMS:"+351912345678"`; metadata do success event tem `name_attrs_sent:true` e `sms_sent:true`.
- caso com flag ON e telefone inválido (`"912345678"` sem `+`) → contacto sincronizado, sem `SMS` no payload, evento `brevo_contact_sync_skipped` emitido com `reason:"PHONE_NOT_E164"`, success event tem `sms_sent:false` e `sms_skipped_reason:"PHONE_NOT_E164"`.
- caso com flag OFF → nem `FIRSTNAME`/`LASTNAME`/`SMS` no payload (regression).

**Atualizar**: `src/lib/email/__tests__/lead-magnet-sequence.test.ts`
- caso explícito a chamar `sendLeadMagnetSequence` com `firstName: "Ana"` (e nada relacionado com phone) → `sendWelcomeBetaEmail` e `sendReportSummaryEmail` recebem `firstName: "Ana"`; nenhum dos mocks recebe `phone`/`fullName`. Garante que a sequência ignora telefone.
- caso com `marketing_consent=false` → ambos emails enviados (já está coberto indiretamente; tornar explícito).

## Ficheiros a alterar

1. **Novo** `src/lib/phone/normalize-pt.ts` — função `normalizePhonePT(raw)` pura.
2. **Novo** `src/lib/phone/__tests__/normalize-pt.test.ts`.
3. **Editar** `src/lib/unlock.server.ts` — substituir `normalizePhone` local pelo helper novo; manter assinatura (`string | null`).
4. **Editar** `src/lib/brevo/sync.server.ts` — adicionar `sms_skipped_reason` ao metadata do evento `brevo_contact_synced` quando aplicável.
5. **Editar** `src/lib/brevo/__tests__/sync.test.ts` — 3 casos novos.
6. **Editar** `src/lib/email/__tests__/lead-magnet-sequence.test.ts` — 2 asserts adicionais sobre `firstName` e independência de phone.

## Ficheiros NÃO alterados

- Schema da BD, `leads` table, `product_events` shape.
- Pricing, premium gates, geração de relatório.
- Providers (Apify/OpenAI/DataForSEO).
- Sender real de emails (mocks nos testes; não se envia nada real).
- `parseFullName`, `deriveFirstName`, modais e UI do lead magnet.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (com foco em `src/lib/phone`, `src/lib/brevo`, `src/lib/email`, `src/lib/names`)

## Checkpoint

- ☐ Helper PT criado e testado (4+ casos)
- ☐ `unlock.server.ts` usa o novo helper, sem mudança de comportamento internacional
- ☐ Brevo sync: `sms_skipped_reason` presente no `brevo_contact_synced` quando aplicável
- ☐ Sync continua mesmo com telefone inválido (SMS apenas é saltado)
- ☐ Testes provam: emails enviados com phone vazio / inválido / consent OFF / flag ON ou OFF
- ☐ Testes provam: emails usam só `first_name`
- ☐ `product_events` continua sem telefone em bruto
- ☐ `tsc` e `vitest` verdes
