# Próximos passos — Brevo attributes + teste real

## Passo 5 — Criar 14 atributos custom via API direta

**Pré-requisito:** adicionar secret `BREVO_DIRECT_API_KEY` (formato `xkeysib-…`).
- Onde obter: painel Brevo → SMTP & API → API Keys → Generate a new API key.
- Permissões mínimas: Contacts (read/write).
- Após o teste, o secret pode ser removido (a sync runtime continua a usar o gateway com `BREVO_API_KEY`).

**Script one-shot** (executado via `code--exec`, não fica no repo):

1. `GET https://api.brevo.com/v3/contacts/attributes` → snapshot do estado atual.
2. Calcular diff vs lista canónica:

   | Categoria | Nome | Tipo | Enum |
   |---|---|---|---|
   | normal | INSTAGRAM_HANDLE | text | — |
   | normal | LAST_REPORT_URL | text | — |
   | normal | REPORTS_COUNT | float | — |
   | normal | LAST_REPORT_AT | date | — |
   | normal | LAST_PAYMENT_AT | date | — |
   | normal | BETA_WELCOMED_AT | date | — |
   | normal | IS_CUSTOMER | boolean | — |
   | category | PROFILE_OWNERSHIP | category | own_profile, competitor, client, prospect |
   | category | GOAL | category | improve_content, understand_competitors, grow_audience, monetize, other |
   | category | USER_TYPE | category | creator, agency, brand, freelancer, other |
   | category | PRICING_PREFERENCE | category | one_off, subscription, unsure |
   | category | LEAD_SOURCE | category | unlock, direct, referral, organic |
   | category | COMMERCIAL_STATUS | category | lead, customer, churned |
   | category | PLAN | category | free, one_off, pro, agency |

3. Para cada atributo em falta: `POST /v3/contacts/attributes/{category}/{name}` com body apropriado (`{type}` para normal/boolean/date/float; `{enumeration: [{value, label}]}` para category).
4. Skip atributos já existentes (idempotente). Avisar se algum já existe com tipo diferente.
5. `GET /v3/contacts/attributes` final → confirmar 14/14 ✅ e mostrar tabela resumo.

**Sem alterações ao código da app.** O script corre fora do repo.

## Passo 6 — Teste real de unlock

**Inputs fixos:**
- Email: `frederico+brevotest1@fredericocarvalho.pt`
- Handle: `frederico.m.carvalho`
- Snapshot: `683e4c21-60e0-4045-b43a-dfcd85fe9896` (já existente, sem regeneração)

**Sequência:**
1. `POST /api/public/report-unlock` com payload mínimo (email + handle + snapshot).
2. `project_debug--sleep` 5s para a sync assíncrona com Brevo concluir.
3. `supabase--read_query` em `product_events` (últimos 2 min) → procurar `brevo_contact_synced` com `metadata.brevoId` preenchido.
4. `GET https://api.brevo.com/v3/contacts/{email}` (via gateway com `BREVO_API_KEY`) → validar:
   - 16 attributes built-in presentes
   - Attributes custom populados com tipos corretos (REPORTS_COUNT como número, datas como ISO, IS_CUSTOMER boolean, categorias com valores válidos)
   - Listas: `BREVO_LEAD_MAGNET_LIST_ID` inclui o contacto
5. Verificar `supabase--edge_function_logs` da função de sync para garantir 0 erros.

**Sem mutações destrutivas, sem regeneração de report, sem chamadas a providers externos (Apify/DFS/OpenAI).**

## Detalhes técnicos

- O secret `BREVO_DIRECT_API_KEY` é apenas para o script de criação de atributos (one-shot). Não é referenciado em código de produção.
- A app continua a usar exclusivamente o gateway via `BREVO_API_KEY` para a sync runtime.
- Dry-run primeiro: o script imprime o diff e pede confirmação antes de fazer POSTs.
- Em caso de enum mismatch (atributo já existe com valores diferentes), o script reporta e não tenta sobrescrever — decidimos manualmente.

## Checkpoint

- ☐ Secret `BREVO_DIRECT_API_KEY` adicionado
- ☐ Script de auditoria + criação executado, 14/14 atributos confirmados via GET final
- ☐ Unlock test executado, `brevo_contact_synced` registado
- ☐ GET ao contacto na Brevo confirma todos os atributos com tipos corretos
- ☐ Secret `BREVO_DIRECT_API_KEY` removido após validação
