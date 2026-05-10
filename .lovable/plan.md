# Auditoria de Kill Switches — Beta Externa

## 1. Kill switches existentes

| Área | Flag | Comportamento atual |
|---|---|---|
| Apify (provider) | `APIFY_ENABLED="true"` + `APIFY_ALLOWLIST` | Hard kill-switch real em `src/lib/security/apify-allowlist.ts`. Sem `="true"` literal, nenhum perfil dispara provider call. |
| OpenAI (insights) | `OPENAI_ENABLED="true"` | Hard kill em `src/lib/security/openai-allowlist.ts`. |
| DataForSEO (keywords) | `DATAFORSEO_ENABLED="true"` | Hard kill em `src/lib/security/dataforseo-allowlist.ts`. |
| Comment scraper | `COMMENT_SCRAPER_ENABLED="true"` | Hard kill em `comment-scraper.server.ts`. |
| Brevo contact sync | — | **Sem flag.** Só falha se `BREVO_API_KEY` ou `LOVABLE_API_KEY` em falta (devolve `BREVO_API_KEY_MISSING`, fire-and-forget, não rebenta unlock). |
| Brevo transacional | — | **Sem flag.** Falha se `BREVO_FROM_EMAIL` ou `BREVO_API_KEY` em falta → cai para Resend. |
| Resend fallback | — | **Sem flag.** Só corre se `RESEND_API_KEY` E `RESEND_FROM` presentes; caso contrário marca `fallback_attempted: false`. |
| Lead-magnet sequence | — | **Sem flag.** Só `sendWelcome` flag por argumento (brand-new lead). Sequência sempre tenta enviar `report-summary` se snapshot tem KPIs. |

## 2. Comportamento por falha (atual, já robusto)

- **`BREVO_API_KEY` ausente**: contact sync devolve `BREVO_API_KEY_MISSING`; tx-email cai para Resend; unlock e relatório público continuam.
- **`BREVO_FROM_EMAIL` ausente**: tx-email salta Brevo, vai direto a Resend.
- **`RESEND_API_KEY` ou `RESEND_FROM` ausente**: sem fallback; flow regista `*_email_failed` com `missing_secret`. UI não rebenta.
- **`APIFY_TOKEN` ausente / `APIFY_ENABLED!=true`**: nenhuma chamada provider; analyze devolve cache ou erro controlado.
- **Brevo 4xx/5xx/timeout**: tx-email cai para Resend; sync regista `brevo_contact_sync_failed`. Unlock OK.
- **Resend 4xx/5xx/timeout**: regista `*_email_failed` com `brevo_reason` + `resend_reason`. Unlock OK.
- **Relatório público**: nunca depende destes — lê snapshot da BD.

## 3. Kill switches em falta (P1 antes da beta)

Quatro flags simples, idênticas em padrão às já existentes (literal `"true"`):

| Flag | Default seguro | Local de verificação | Efeito quando OFF |
|---|---|---|---|
| `BREVO_CONTACT_SYNC_ENABLED` | "true" em prod, "false" para travar | topo de `syncLeadToBrevo()` em `src/lib/brevo/sync.server.ts` | Devolve `{ok:false, reason:"DISABLED_BY_FLAG"}`, regista evento `brevo_contact_sync_skipped`. |
| `BREVO_TRANSACTIONAL_ENABLED` | "true" | topo de `sendViaBrevo()` em `transactional-email.server.ts` | Salta Brevo, vai direto a Resend (mantém entrega de emails críticos). |
| `RESEND_FALLBACK_ENABLED` | "true" | antes de `sendViaResend()` no orquestrador | Sem fallback; flow regista `*_email_failed` com `resend_reason="DISABLED_BY_FLAG"`. |
| `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` | "true" | topo de `sendLeadMagnetSequence()` em `lead-magnet-sequence.server.ts` | Devolve `{welcome:"skipped_disabled", summary:"skipped_disabled"}`, evento `lead_magnet_sequence_skipped`. Unlock e relatório intactos. |

Princípios:
- Comparação literal `=== "true"` (igual ao padrão Apify/OpenAI).
- Default = ON quando variável não definida (compatibilidade com prod atual). Para travar, basta definir `="false"`.
- Sempre fire-and-forget; nunca rebenta unlock nem report público.
- Cada salto regista evento dedicado em `product_events` para auditoria.

## 4. Matriz "como travar rapidamente"

| Sintoma | Variável a meter `="false"` | Impacto colateral |
|---|---|---|
| Brevo a poluir contactos | `BREVO_CONTACT_SYNC_ENABLED` | Nenhum no envio de emails. |
| Brevo a falhar entregas | `BREVO_TRANSACTIONAL_ENABLED` | Tudo passa por Resend. |
| Resend com bounce/spam | `RESEND_FALLBACK_ENABLED` | Se Brevo cair, emails falham com log. |
| Sequência lead magnet a incomodar | `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` | Welcome + summary deixam de sair. Personal-area-saved continua. |
| Custo Apify | `APIFY_ENABLED="false"` (já existe) | Sem fresh; cache continua a servir. |

## 5. Plano de implementação (proposto, não executado)

Edits mínimos (4 ficheiros, ~6 linhas cada):

1. `src/lib/brevo/sync.server.ts` — adicionar guard no topo de `syncLeadToBrevo`.
2. `src/lib/email/transactional-email.server.ts` — guard no topo de `sendViaBrevo` (devolve `reason: "BREVO_DISABLED_BY_FLAG"`); guard antes do `sendViaResend` (devolve `reason: "RESEND_DISABLED_BY_FLAG"`).
3. `src/lib/email/lead-magnet-sequence.server.ts` — guard no topo de `sendLeadMagnetSequence`.
4. Documentar as 4 flags em `LOCKED_FILES.md` ou novo `docs/KILL_SWITCHES.md` (lista única consultável).

Sem migrações. Sem mudança em UI. Sem alteração de assinatura pública das funções (resultados já contemplam `ok:false` + `reason`).

## 6. Próximo prompt sugerido (a executar depois de aprovado este audit)

> "Implementa as 4 flags `BREVO_CONTACT_SYNC_ENABLED`, `BREVO_TRANSACTIONAL_ENABLED`, `RESEND_FALLBACK_ENABLED`, `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` no padrão literal `=== "true"` com default ON. Adiciona guards no topo de `syncLeadToBrevo`, `sendViaBrevo`, antes do `sendViaResend`, e no topo de `sendLeadMagnetSequence`. Cada salto regista evento `*_skipped` em `product_events`. Cria `docs/KILL_SWITCHES.md` com a matriz de travagem. Não tocar em unlock, report público, nem schema."

## Checkpoint

- ☐ Aprovar audit
- ☐ Confirmar nomes das 4 flags (ou pedir alternativa)
- ☐ Confirmar default ON (alternativa: default OFF para máxima cautela na beta)
- ☐ Avançar para implementação no prompt seguinte
