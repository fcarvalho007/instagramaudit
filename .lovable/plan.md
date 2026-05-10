## Smoke test lead magnet — RESULTADO FINAL

**Data**: 2026-05-10 22:06 UTC
**Decisão**: 🟢 **GO para beta interno**

### Setup do teste
- **Email**: `frederico.carvalho@digitalfc.pt`
- **Snapshot**: `martimsilvai` (cache, sem provider calls)
- **Lead criado**: `3d12d5d7-f507-4e72-8e1d-867fe4a44f32`
- **Funnel stage final**: `relatorio_visto`

### Eventos `product_events` (todos × 1, idempotência OK)
| evento | timestamp |
|---|---|
| `unlock_email_submitted` | 22:06:58.974 |
| `report_saved_to_account` | 22:06:59.133 |
| `unlock_completed` | 22:06:59.214 |
| `lead_status_changed` (report_unlock) | 22:06:59.362 |
| `brevo_email_sent` (welcome) | 22:06:59.674 |
| `beta_welcome_email_sent` | 22:06:59.706 |
| `brevo_contact_synced` | 22:06:59.759 |
| `brevo_email_sent` (summary) | 22:07:00.019 |
| `report_summary_email_sent` | 22:07:00.055 |

- ✅ 0 fallbacks Resend (Brevo OK ambos os emails)
- ✅ 0 chamadas a Apify/OpenAI/DataForSEO
- ✅ Brevo contact `288` sincronizado na lista `16`

### Fix P0 aplicado
- `src/routes/analyze.$username.tsx` — `UnlockModal` agora recebe `instagram_username` corretamente extraído do `payload`.

### Refinamento de domínio (resolvido)
- `PUBLIC_APP_BASE_URL` aponta para `instagramaudit.lovable.app` — **correto**, pois **não há custom domain `instagramaudit.pt` configurado** neste projeto. Os links nos emails refletem o domínio público real.
- **Ação futura** (quando o utilizador conectar `instagramaudit.pt`): atualizar `PUBLIC_APP_BASE_URL` e o próximo unlock re-sincroniza `LAST_REPORT_URL` no Brevo automaticamente.

### Validação manual pendente (utilizador)
- ☐ Confirmar inbox de `frederico.carvalho@digitalfc.pt`:
  - Welcome-beta recebido, render OK, sender `relatorios@instagramaudit.pt`
  - Report-summary recebido, métricas e links funcionais
  - Sem ir para spam

### Constraints respeitados
- 1 unlock só, 1 email só
- Sem regenerar report
- Sem mutar leads não relacionados
- Sem campanhas Brevo manuais
