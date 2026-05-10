## Conclusão Brevo — criar atributos em falta + teste de unlock real

### Estado atual das fases anteriores

| Fase | Estado | Pendente |
|---|---|---|
| 1. Implementação `upsertBrevoContact` | ✅ Concluída | — |
| 2. Hook no fluxo de unlock + `product_event` (`brevo_contact_synced` / `_failed`) | ✅ Concluída | — |
| 3. Checklist dos 14 atributos esperados (nome + tipo) | ✅ Concluída | — |
| 4. Auditoria GET aos atributos reais da conta Brevo | ✅ Concluída | — |
| 5. Criar os 14 atributos custom na Brevo com tipo correto | ❌ Em falta | **bloqueia teste real** |
| 6. Teste manual de unlock real + verificação no Brevo + `product_events` | ❌ Em falta | depende do passo 5 |

A auditoria mostrou que **nenhum** dos 14 atributos custom existe — só os built-in da Brevo. Avançar agora deixaria a Brevo criá-los todos como `text`, o que partiria segmentações por número, data, boolean e category. Refinamento necessário **antes** de fechar.

### Plano para concluir (2 passos)

#### Passo 5 — Criar os 14 atributos via API Brevo (script automatizado)

Em vez de criar manualmente no painel, corro um script one-shot que faz `POST /contacts/attributes/{category}/{name}` para cada um, com o tipo certo. É idempotente: a Brevo devolve erro se já existir, que tratamos como "OK, skip".

Mapeamento exato (resultado da auditoria):

| Atributo | Categoria Brevo | Tipo / Enum |
|---|---|---|
| `INSTAGRAM_HANDLE` | `normal` | `text` |
| `LAST_REPORT_URL` | `normal` | `text` |
| `REPORTS_COUNT` | `normal` | `float` |
| `LAST_REPORT_AT` | `normal` | `date` |
| `LAST_PAYMENT_AT` | `normal` | `date` |
| `BETA_WELCOMED_AT` | `normal` | `date` |
| `IS_CUSTOMER` | `normal` | `boolean` |
| `PROFILE_OWNERSHIP` | `category` | enum: `own_profile`, `competitor`, `client`, `prospect` |
| `GOAL` | `category` | enum: `improve_content`, `understand_competitors`, `grow_audience`, `monetize`, `other` |
| `USER_TYPE` | `category` | enum: `creator`, `agency`, `brand`, `freelancer`, `other` |
| `PRICING_PREFERENCE` | `category` | enum: `one_off`, `subscription`, `unsure` |
| `LEAD_SOURCE` | `category` | enum: `unlock`, `direct`, `referral`, `organic` |
| `COMMERCIAL_STATUS` | `category` | enum: `lead`, `customer`, `churned` |
| `PLAN` | `category` | enum: `free`, `one_off`, `pro`, `agency` |

Após criar, **re-executo o GET** `/contacts/attributes` para confirmar 14/14 ✅ com tipo correto. Output: tabela final de veredicto.

**Antes de avançar, preciso de confirmação dos enums** — os valores acima são derivados do código atual de `upsertBrevoContact`, mas a categoria é fechada na Brevo (não é livre). Se quiseres adicionar/remover algum valor, é melhor agora que depois.

#### Passo 6 — Teste de unlock real + verificação

Depois dos atributos confirmados:

1. Email de teste: `frederico+brevotest1@…` (alias dedicado — preciso que confirmes o domínio).
2. POST `/api/public/report-unlock` com snapshot `683e4c21-60e0-4045-b43a-dfcd85fe9896` e handle `frederico.m.carvalho`.
3. Esperar 5s pela sync assíncrona.
4. Ler `product_events` (últimos 2min para esse email): confirmar `brevo_contact_synced` com `metadata.brevoId`.
5. GET `/contacts/{email}` na Brevo: confirmar atributos populados com tipos corretos + presença na lista 16.
6. Output final: ✅ ou diagnóstico do que falhou.

Não toca em Apify / OpenAI / DataForSEO. Não regenera relatório. Único email enviado é o de unlock que já existe.

### Riscos e mitigação

- **Criação de atributos é write** mas reversível no painel Brevo, e idempotente.
- **Categoria errada (`normal` vs `category`)** é destrutivo para corrigir → script faz validação dry-run (lista atributos, calcula diff, pede confirmação antes de criar).
- **Enums fechados** → por isso peço confirmação dos valores antes de criar.

### Inputs que preciso de ti antes de avançar

1. **Confirmar / ajustar os enums** das 7 categorias acima.
2. **Domínio do alias de teste** (`frederico+brevotest1@<domínio>`) para o passo 6.

### Checkpoint

- ☐ Passo 5a: dry-run (listar atributos atuais + diff vs esperados) → output
- ☐ Passo 5b: criar 14 atributos via POST (após confirmação dos enums)
- ☐ Passo 5c: GET de verificação → tabela final 14/14 ✅
- ☐ Passo 6a: unlock real com alias + snapshot existente
- ☐ Passo 6b: ler `product_events` + GET contacto Brevo
- ☐ Passo 6c: output final consolidado