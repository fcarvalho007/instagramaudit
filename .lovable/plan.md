## Âmbito

Apenas correções low-risk identificadas na auditoria. Sem novas funcionalidades, sem alterações de schema, sem chamadas a providers.

## Fixes

### 1. Copy errada no unlock modal (`/me` → `/app/reports`)

**Ficheiro:** `src/components/product/unlock-modal.tsx:622`

Atual:
```
text="Acede sempre que quiseres em /me"
```

Nova:
```
text="Acede sempre que quiseres em /app/reports"
```

A rota `/me` não existe; a rota real autenticada é `/app/reports` (ficheiro `src/routes/app.reports.tsx`).

### 2. `EVENT_LABELS` incompleto em `lead-detail-sheet.tsx`

**Ficheiro:** `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx:134`

Eventos observados em `product_events` nos últimos 14 dias mas sem label (mostram a key crua na timeline):

| event_type | Label pt-PT a adicionar |
|---|---|
| `unlock_completed` | Desbloqueio concluído |
| `unlock_email_submitted` | Email submetido para desbloqueio |
| `brevo_contact_synced` | Contacto sincronizado com Brevo |
| `brevo_contact_sync_failed` | Falha na sincronização Brevo |
| `brevo_email_failed` | Falha no envio de email Brevo |
| `report_saved_to_account` | Relatório guardado na conta |
| `returning_lead_detected` | Lead recorrente detetado |

Adiciona-se ao objeto `EVENT_LABELS` existente, sem alterar a lógica de fallback (`EVENT_LABELS[ev.event_type] ?? ev.event_type`).

## Fora do âmbito (confirmado)

- Brevo sync (sem bug detetado — 8 leads = 8 contactos)
- Schema, migrations, RLS
- Cálculos de relatório
- Envio de emails / smoke test real (P0 manual do utilizador)
- `RESEND_FROM` secret (manual do utilizador)

## Validação

```
bunx tsc --noEmit
bunx vitest run
```

## Checkpoint

- ☐ `unlock-modal.tsx:622` atualizado para `/app/reports`
- ☐ 7 labels novas em `EVENT_LABELS`
- ☐ `tsc --noEmit` limpo
- ☐ `vitest run` 243/243 a passar
