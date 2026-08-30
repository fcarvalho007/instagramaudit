# Kill Switches — AuditProfiles

Todas as flags usam comparação literal: definir como `"false"` desliga.
Default = ON (não definida = ligada). Nenhuma destas flags afeta o
relatório público nem o unlock — são apenas side effects.

## Matriz de travagem rápida

| Sintoma | Definir `="false"` | Efeito |
|---|---|---|
| Brevo a poluir contactos / sync com erro | `BREVO_CONTACT_SYNC_ENABLED` | `syncLeadToBrevo` devolve `DISABLED_BY_FLAG`, regista `brevo_contact_sync_skipped`. Email não afetado. |
| Brevo a falhar entregas transacionais | `BREVO_TRANSACTIONAL_ENABLED` | `sendViaBrevo` devolve `BREVO_DISABLED_BY_FLAG`, cai imediatamente para Resend. |
| Resend com bounce / spam complaints | `RESEND_FALLBACK_ENABLED` | Sem fallback. Falhas Brevo registam `resend_reason="RESEND_DISABLED_BY_FLAG"`. |
| Sequência lead-magnet a incomodar | `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED` | `sendLeadMagnetSequence` salta welcome + summary, regista `lead_magnet_sequence_skipped`. |
| Custo Apify | `APIFY_ENABLED` (NOT `="true"`) | Sem fresh provider call; cache continua. |
| OpenAI insights | `OPENAI_ENABLED` (NOT `="true"`) | Sem geração AI. |
| DataForSEO keywords | `DATAFORSEO_ENABLED` (NOT `="true"`) | Sem keywords. |
| Comment scraper | `COMMENT_SCRAPER_ENABLED` (NOT `="true"`) | Sem scraping de comentários. |

## Notas

- Apify / OpenAI / DataForSEO / Comment scraper usam o padrão **opt-in**
  (`=== "true"` para ligar). Default = OFF.
- Brevo / Resend / Lead-magnet usam o padrão **opt-out**
  (`=== "false"` para desligar). Default = ON.
- Todas registam evento dedicado em `product_events` para auditoria.
- Nenhum kill switch interrompe `unlock` ou o relatório público.
- **Consent layer (em cima do kill-switch)**: `syncLeadToBrevo` e
  `sendLeadMagnetSequence` verificam adicionalmente `lead.marketing_consent`.
  Sem opt-in expresso, ambos saltam mesmo com kill-switch ON, registando
  evento com `reason: "NO_MARKETING_CONSENT"`. Garante consistência com a
  política de privacidade (consentimento expresso para marketing/CRM).
- Localização dos guards:
  - `src/lib/brevo/sync.server.ts` → `syncLeadToBrevo`
  - `src/lib/email/transactional-email.server.ts` → `sendViaBrevo` + bloco fallback
  - `src/lib/email/lead-magnet-sequence.server.ts` → `sendLeadMagnetSequence`
  - `src/lib/security/apify-allowlist.ts`, `openai-allowlist.ts`, `dataforseo-allowlist.ts`, `analysis/comment-scraper.server.ts`
## Baseline anónimo (Ronda 3)

| Variável | Default | Efeito |
| --- | --- | --- |
| `PUBLIC_BASELINE_NO_EMAIL` | `false` | Semântica actual: **baseline gratuita** (`PUBLIC_BASELINE_FREE`). Com `true`, a Auditoria Instantânea (janela baseline, sem concorrentes) corre sem email **e sem consumo de créditos**, tanto para visitante anónimo como para lead identificado com saldo 0. Créditos/entitlements continuam a proteger concorrentes e janelas Pro. **Activa (`true`) em produção.** |
| `PUBLIC_ANON_MAX_FRESH_PER_IP_DAY` | `10` | Análises FRESH com sucesso por IP em 24h. Cache hits não contam. |
| `PUBLIC_ANON_MAX_FRESH_PER_IP_HOUR` | `4` | Tecto horário por IP, para travar rajadas. |
