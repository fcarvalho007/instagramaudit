# Auditoria + criação dos atributos Brevo em falta

## Diagnóstico

`syncLeadToBrevo` envia **11 atributos** ao gateway, mas Brevo descarta silenciosamente os que não existem no schema da conta. Auditando contacto 264 contra o que é enviado:

**Existentes (9):** `INSTAGRAM_HANDLE`, `REPORTS_COUNT`, `LAST_REPORT_URL`, `LAST_REPORT_AT`, `PROFILE_OWNERSHIP`, `GOAL`, `USER_TYPE`, `IS_CUSTOMER`, `BETA_WELCOMED_AT`

**Em falta (3):**
- `PRICING_PREFERENCE` → `text`
- `LEAD_SOURCE` → `text`
- `COMMERCIAL_STATUS` → `text`

Sem isto, segmentação por preferência de preço, origem do lead e estado comercial é impossível no Brevo, mesmo que o código envie corretamente os valores.

## Plano

1. **Script efémero** em `/tmp/brevo-attrs.ts` que:
   - Faz `GET /brevo/contacts/attributes` (via gateway, sem `/v3`) e lista os atributos atuais.
   - Define a lista esperada (11 nomes + tipos) inferida diretamente de `src/lib/brevo/sync.server.ts`.
   - Calcula o diff (esperado − existente).
   - Para cada em falta, faz `POST /brevo/contacts/attributes/normal/{NAME}` com `{type: "text"|"boolean"|"date"|"float"}`.
   - Imprime tabela final com estado de cada atributo (✓ existia, + criado, ✗ falhou + motivo).

2. **Re-sincronizar 1 contacto** após criação para validar que os 3 novos passam a aparecer:
   - `POST /api/public/report-unlock` para `frederico+brevotest_attrs@…` ou re-trigger no contacto 264.
   - `GET /brevo/contacts/{email}` confirma `attributes.PRICING_PREFERENCE`, `LEAD_SOURCE`, `COMMERCIAL_STATUS` populados.

3. **Backfill dos 7 leads originais** (`brevotest1..7`) para que herdem os 3 atributos novos (idempotente, mesmo endpoint público).

4. **Atualizar `.lovable/plan.md`** com nota: "schema Brevo agora alinhado com payload de `sync.server.ts` (11/11 atributos)".

## Mapa de tipos

| Atributo | Tipo Brevo | Notas |
|---|---|---|
| `INSTAGRAM_HANDLE` | text | já existe |
| `REPORTS_COUNT` | float | já existe (numérico) |
| `LAST_REPORT_URL` | text | já existe |
| `LAST_REPORT_AT` | date | já existe |
| `PROFILE_OWNERSHIP` | text | já existe (enum como string) |
| `GOAL` | text | já existe |
| `USER_TYPE` | text | já existe |
| `PRICING_PREFERENCE` | **text** | **criar** |
| `LEAD_SOURCE` | **text** | **criar** |
| `COMMERCIAL_STATUS` | **text** | **criar** |
| `IS_CUSTOMER` | boolean | já existe |
| `BETA_WELCOMED_AT` | date | já existe (do welcome flow) |

## Notas

- Endpoint Brevo: `POST /contacts/attributes/{category}/{name}` com body `{"type":"text"}`. Categoria é `normal` para atributos de contacto custom.
- Idempotente: se um atributo já existir, Brevo devolve `400 attribute_exists` — o script trata isso como ✓ não como falha.
- Tudo via gateway (sem `/v3/`), reaproveitando `LOVABLE_API_KEY` + `BREVO_API_KEY`.
- Não toca em código aplicacional — só em schema da conta Brevo.

## Checkpoint

- ☐ Auditoria lista os 9 existentes e identifica os 3 em falta
- ☐ 3 atributos criados via gateway (`PRICING_PREFERENCE`, `LEAD_SOURCE`, `COMMERCIAL_STATUS`)
- ☐ Re-sync de 1 contacto mostra 12/12 atributos populados
- ☐ Backfill dos 7 originais
- ☐ Nota adicionada ao `.lovable/plan.md`
