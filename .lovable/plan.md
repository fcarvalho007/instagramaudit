# Plano — diagnóstico Brevo sync + fechar Fase 6

## Estado atual

- Fase 5 ✅ — 14 atributos custom criados na Brevo (verificado via GET).
- Fase 6 ⚠️ — 6 unlocks reais executados, 0 contactos chegaram à Brevo, 0 eventos `brevo_contact_synced` ou `brevo_contact_sync_failed` em `product_events`. Causa exata desconhecida porque os logs do worker não estão a chegar ao agregador.

## Objetivo deste plano

Isolar a causa real da falha do `syncLeadToBrevo` e completar Fase 6 (1 unlock end-to-end com contacto verificado na Brevo + atributos com tipos corretos).

## Passo A — Endpoint admin de diagnóstico (efémero)

Criar `src/routes/api/admin/brevo-test-sync.ts` (POST):

- Protegido por `INTERNAL_API_TOKEN` (header `x-internal-token`) — não público.
- Aceita `{ leadId: string, reason?: string }`.
- Chama diretamente `syncLeadToBrevo(leadId, reason ?? "admin_test")`.
- Retorna `{ outcome: BrevoSyncOutcome, env: { hasLovableKey, hasBrevoKey, hasListId } }` no body — sem mascarar para podermos ver `reason` exato (`BREVO_API_KEY_MISSING`, `BREVO_429:…`, `BREVO_TIMEOUT`, `BREVO_NETWORK:…`, etc.).
- Sem fire-and-forget, sem dynamic imports tardios.

Vou correr 1 chamada com `leadId=5024101c-…` (brevotest6) e ver o `reason`.

## Passo B — Aplicar fix conforme diagnóstico

Três cenários esperados e ação para cada:

| Diagnóstico | Fix |
|---|---|
| `BREVO_API_KEY_MISSING` | Secret de connector não está injetado no worker. Investigar se o template TanStack Start carrega `BREVO_API_KEY` ou se tem outro nome (`VITE_…`, namespace de connector). Pode exigir `update_secret` ou re-link via `standard_connectors--connect`. |
| `BREVO_4xx:…` | Atributo/lista mal-formado. Ajustar o payload em `sync.server.ts` (provavelmente formato dos campos `category` enviados como string label vs ID). |
| `BREVO_TIMEOUT` ou `BREVO_NETWORK:…` | Aumentar timeout, ou problema de rede no gateway — reportar e tentar de novo. |
| Outro (ex.: erro no insert de `product_events`) | Logar payload exato e corrigir no sítio certo. |

## Passo C — Validação end-to-end

Após o fix:
1. Novo unlock real: `frederico+brevotest7@fredericocarvalho.pt`.
2. Verificar `product_events` → `brevo_contact_synced` com `metadata.brevo_id`.
3. `GET /v3/contacts/{email}` direto → confirmar atributos populados:
   - `INSTAGRAM_HANDLE` = `frederico.m.carvalho`
   - `REPORTS_COUNT` = `1` (numérico)
   - `LAST_REPORT_URL` = URL completa
   - `LAST_REPORT_AT` = ISO date
   - `PROFILE_OWNERSHIP/GOAL/USER_TYPE/PRICING_PREFERENCE/LEAD_SOURCE/COMMERCIAL_STATUS` com valores válidos
   - `IS_CUSTOMER` = `false`
4. Confirmar contacto está na lista `BREVO_LEAD_MAGNET_LIST_ID`.

## Passo D — Cleanup

- Remover endpoint admin de diagnóstico (`brevo-test-sync.ts`).
- Remover `console.log` de debug que ficou em `unlock.server.ts`.
- Manter o `await` (substituição do fire-and-forget) — é o fix correto.
- Documentar nota no plan.md sobre lead-magnet sequence (passo 6 do unlock) que continua fire-and-forget e provavelmente também não corre — fica como follow-up separado.
- Pedir-te para remover `BREVO_DIRECT_API_KEY` (já não é preciso).

## Detalhes técnicos

- O endpoint admin não regenera reports nem chama providers Apify/DFS/OpenAI — apenas a Brevo via gateway.
- Não toca em `auth`, `storage`, ou outras schemas reservadas.
- Não há mudanças à BD nesta fase.

## Checkpoint

- ☐ Endpoint admin criado e protegido por token
- ☐ Diagnóstico com `reason` exato capturado
- ☐ Fix aplicado conforme diagnóstico
- ☐ Unlock end-to-end validado (evento + contacto Brevo + atributos com tipos corretos)
- ☐ Endpoint admin e console.log removidos
- ☐ Lead-magnet sequence documentada como follow-up
