# Avaliação de bugs e correções

## Estado atual

**Fix do código já está commitado** em `src/lib/brevo/client.server.ts` (regex que retira `/v3/` antes de chamar o gateway). O sandbox local tem o código novo. Os testes (20) passam.

**Problema operacional:** o preview público (`project--{id}-dev.lovable.app`) **continua a servir o bundle antigo** mais de 10min após a edição. Todos os unlocks continuam a falhar com `BREVO_404`. Não é um bug de código — é o ciclo de build do preview que não propagou.

## Bugs identificados

### B1 — Fix Brevo aplicado mas sem deploy propagado (P0)
- 31 unlocks nos últimos 20min, 100% com `brevo_contact_sync_failed` + `brevo_email_failed` (mesma causa raiz: `/v3/` no path).
- Cobre dois fluxos: contact upsert (`/v3/contacts`) e transactional email (`/v3/smtp/email`). A normalização em `brevoFetch` resolve ambos.
- Acção: forçar restart do dev-server preview para garantir rebuild, depois validar com 1 unlock.

### B2 — Poluição de leads de teste (P1)
- 37 leads `frederico+brevotest1..37@…` na BD, dos quais 31 vieram da poll loop que fiz a aguardar o deploy.
- 31 destes têm também `report_requests` e `product_events` associados (FK constraints).
- Acção: migration que apaga em cascata (events → report_requests → leads) os 31 spam (`brevotest8..37` + `brevotest_*` se existir). Mantém `brevotest1..7` como amostra de teste original.

### B3 — Backfill dos 7 leads de teste originais (P1)
- `brevotest1..7` ainda não estão sincronizados no Brevo (exceto `brevotest6` que upserti manualmente como diagnóstico, id 263, mas sem atributos completos).
- Acção: script efémero que invoca `syncLeadToBrevo(leadId, "report_unlock_backfill")` para os 7. Só corre depois de B1 estar confirmado.

### B4 — `BREVO_DIRECT_API_KEY` órfão (P2)
- Foi adicionado na Fase 5 só para criar atributos custom via API direta. Já não é referenciado em nenhum lado do código (`rg` confirmará).
- Acção: remover via `delete_secret`.

### B5 — Documentação do quirk do gateway (P2)
- O strip de `/v3/` é silencioso e não-óbvio. Sem documentação, qualquer endpoint Brevo novo (lists, attributes management, transactional templates) vai cair na mesma armadilha.
- Acção: adicionar nota em `src/lib/brevo/client.server.ts` (já parcialmente feita no comentário) e no `.lovable/plan.md` em "Notas operacionais Brevo".

## Plano de execução

1. **Restart do dev-server** para forçar rebuild do preview com a nova `brevoFetch`.
2. **Validar** com `POST /api/public/report-unlock` para `frederico+brevotest_final@fredericocarvalho.pt` e confirmar em `product_events`:
   - `brevo_contact_synced` com `metadata.brevo_id` numérico
   - `brevo_email_sent` (welcome-beta) com `messageId`
3. **Inspecionar** o contacto no Brevo via `GET /brevo/contacts/{email}` (sem `/v3`):
   - `INSTAGRAM_HANDLE`, `REPORTS_COUNT`, `LAST_REPORT_URL`, `LAST_REPORT_AT`
   - `PROFILE_OWNERSHIP`, `GOAL`, `USER_TYPE`, `PRICING_PREFERENCE`
   - `LEAD_SOURCE=public_report_unlock`, `COMMERCIAL_STATUS=novo_pedido`, `IS_CUSTOMER=false`
   - presente em `listIds: [16]` (lead-magnet)
4. **Backfill** dos 7 leads originais (`brevotest1..7`).
5. **Limpeza** dos 31 leads `brevotest8..37` via migration (cascade delete).
6. **Remover** `BREVO_DIRECT_API_KEY`.
7. **Marcar Fase 6 ✅** em `.lovable/plan.md` e documentar quirk.

## Notas

- Não toca em `auth/storage/realtime`.
- Migration de B2 só apaga `email_normalized LIKE 'frederico+brevotest%'` com offset > 7 — sem risco de tocar dados reais.
- Se após restart o B1 ainda falhar, escalo para inspeção do build remoto (logs Cloudflare Worker) antes de continuar.

## Checkpoint

- ☑ B1: rebuild preview e unlock final retorna `brevo_contact_synced` (Brevo id 264, msg `<202605101902…@smtp-relay.mailin.fr>`)
- ☑ B3: 7 leads originais sincronizados (Brevo ids 263, 266–271)
- ☑ B2: 31 leads-spam apagados em cascata (events → report_requests → leads)
- ☑ B4: `BREVO_DIRECT_API_KEY` removido
- ☑ B5: quirk documentado abaixo

## Notas operacionais Brevo (Fase 6 ✅)

- O gateway Lovable (`https://connector-gateway.lovable.dev/brevo`) **remove silenciosamente o prefixo `/v3/`** dos paths antes de chamar a API upstream. Chamadas a `/v3/contacts` ou `/v3/smtp/email` devolvem `404 Invalid route/ method passed`.
- Solução central: `brevoFetch` em `src/lib/brevo/client.server.ts` normaliza qualquer path que comece por `/v3/` ou `v3/`, deixando o resto intacto. Qualquer endpoint Brevo novo deve ser escrito sem `/v3/` (ex.: `/contacts`, `/smtp/email`, `/contacts/lists`).
- Verificação rápida: `GET /brevo/account` deve devolver 200 com a conta Brevo. Falhas em massa com código `BREVO_404` indicam regressão deste fix.
