## Checklist de atributos Brevo — pré-teste de unlock real

### TL;DR

✅ **Sem alteração de código.** O sync é resiliente: se um atributo não existir, Brevo cria-o automaticamente como **Text** e o upsert continua a funcionar. O risco é apenas perda de tipagem (filtros numéricos/data deixam de funcionar). **Recomenda-se criar manualmente os 14 atributos no painel Brevo antes do primeiro unlock real**, para garantir tipos corretos desde o início.

---

### 1. Atributos enviados pelo código

Inventário completo a partir de `src/lib/brevo/sync.server.ts`, `customer-sync.server.ts` e `lead-magnet-sequence.server.ts`:

| # | Atributo | Origem | Exemplo de valor |
|---|---|---|---|
| 1 | `INSTAGRAM_HANDLE` | `report_requests.instagram_username` | `"frederico.m.carvalho"` |
| 2 | `REPORTS_COUNT` | `count(report_requests)` | `3` |
| 3 | `LAST_REPORT_URL` | computado: `${baseUrl}/analyze/${handle}` | `"https://instagramaudit.lovable.app/analyze/joao"` |
| 4 | `LAST_REPORT_AT` | `report_requests.created_at` (ISO 8601) | `"2026-05-10T10:00:00Z"` |
| 5 | `PROFILE_OWNERSHIP` | `leads.profile_ownership` | `"own_profile"` / `"client_profile"` / `"competitor"` |
| 6 | `GOAL` | `leads.purpose` | `"improve_content"` / `"growth"` / `"benchmarking"` |
| 7 | `USER_TYPE` | `leads.user_type` | `"creator"` / `"agency"` / `"brand"` |
| 8 | `PRICING_PREFERENCE` | `leads.pricing_preference` | `"below_20"` / `"pago_unico_30_50"` / `"sub_mensal"` |
| 9 | `LEAD_SOURCE` | `leads.source` | `"public_report_unlock"` / `"public_report_gate"` |
| 10 | `COMMERCIAL_STATUS` | `leads.commercial_status` | `"lead"` / `"qualificado"` / `"convertido"` |
| 11 | `IS_CUSTOMER` | derivado | `false` (lead sync) / `true` (customer sync) |
| 12 | `PLAN` | `leads.pricing_preference` (apenas customer sync) | `"pago_unico_30_50"` |
| 13 | `LAST_PAYMENT_AT` | `now()` (apenas customer sync) | `"2026-05-10T10:00:00Z"` |
| 14 | `BETA_WELCOMED_AT` | `now()` (após welcome email) | `"2026-05-10T10:00:00Z"` |

**Não enviado:** `FIRSTNAME` / `LASTNAME` (built-in Brevo) — o `firstName` é usado apenas no template do email, não no contacto. Não bloqueia testes.

---

### 2. Tipos Brevo corretos

| Atributo | Tipo Brevo | Categoria | Justificação |
|---|---|---|---|
| `INSTAGRAM_HANDLE` | **Text** | Normal | Username livre |
| `REPORTS_COUNT` | **Number** | Normal | Inteiro (filtros: "≥ 2") |
| `LAST_REPORT_URL` | **Text** | Normal | URL livre |
| `LAST_REPORT_AT` | **Date** | Normal | ISO 8601 (filtros: "últimos 30 dias") |
| `PROFILE_OWNERSHIP` | **Text** | Category | Enum curto, ideal para segmentação por categoria |
| `GOAL` | **Text** | Category | Enum curto |
| `USER_TYPE` | **Text** | Category | Enum curto |
| `PRICING_PREFERENCE` | **Text** | Category | Enum curto |
| `LEAD_SOURCE` | **Text** | Category | Enum curto |
| `COMMERCIAL_STATUS` | **Text** | Category | Enum curto, base do funil comercial |
| `IS_CUSTOMER` | **Boolean** | Normal | true/false (filtros: "é cliente") |
| `PLAN` | **Text** | Category | Enum curto |
| `LAST_PAYMENT_AT` | **Date** | Normal | ISO 8601 |
| `BETA_WELCOMED_AT` | **Date** | Normal | ISO 8601 |

> **Nota sobre "Category" vs "Normal" em Brevo:**
> Brevo permite marcar atributos Text como "Category" — desbloqueia segmentação multi-valor e filtros mais limpos no UI. Não é obrigatório, mas recomendado para os 6 enums acima.

---

### 3. Checklist manual no painel Brevo

**Onde:** Brevo → **Contacts** → **Settings** (ícone engrenagem topo-direito) → **Contact Attributes**

**Como criar cada um:**
1. Clicar **"Add an attribute"**
2. **Attribute name:** copiar **exatamente** da coluna "Atributo" abaixo (case-sensitive, com underscores)
3. **Attribute type:** selecionar do dropdown
4. (Opcional) Para os 6 atributos Text marcados como Category: escolher **Category** em vez de **Text**
5. Guardar

**Lista para colar (14 atributos):**

```
☐ INSTAGRAM_HANDLE       Text
☐ REPORTS_COUNT          Number
☐ LAST_REPORT_URL        Text
☐ LAST_REPORT_AT         Date
☐ PROFILE_OWNERSHIP      Text (Category)
☐ GOAL                   Text (Category)
☐ USER_TYPE              Text (Category)
☐ PRICING_PREFERENCE     Text (Category)
☐ LEAD_SOURCE            Text (Category)
☐ COMMERCIAL_STATUS      Text (Category)
☐ IS_CUSTOMER            Boolean
☐ PLAN                   Text (Category)
☐ LAST_PAYMENT_AT        Date
☐ BETA_WELCOMED_AT       Date
```

⚠️ **Atenção ao formato Date:** Brevo aceita `YYYY-MM-DD` ou ISO 8601 completo. O código envia ISO 8601 com timezone (`2026-05-10T10:00:00Z`) — funciona em ambos os casos, mas se o atributo for criado como **Text** por engano, perde-se filtragem temporal.

---

### 4. Resiliência se atributos faltarem

✅ **Sim, o código continua a funcionar.** Comportamento confirmado por inspeção de `src/lib/brevo/contacts.server.ts`:

- `cleanAttributes()` remove apenas `null`/`undefined`/strings vazias antes do envio
- O endpoint `POST /v3/contacts` da Brevo cria atributos em falta automaticamente como **Text**
- Em caso de erro Brevo (rate-limit, 5xx, etc.), `upsertBrevoContact` devolve `{ ok: false, reason }` que é registado em `brevo_contact_sync_failed`
- O unlock é **fire-and-forget** (`unlock.server.ts:471-476`), nunca bloqueia

**Risco de não criar manualmente:**
- Sem perda de dados — todos os valores chegam à Brevo
- **Perda de tipagem:** `REPORTS_COUNT` como Text impede filtros "≥ X"; `LAST_REPORT_AT` como Text impede filtros "últimos 30 dias"; `IS_CUSTOMER` como Text obriga a comparar `"true"`/`"false"` em vez de booleano nativo
- **Difícil de corrigir depois:** Brevo não permite mudar o tipo de um atributo existente sem o apagar (e perder os valores em todos os contactos). Por isso, **é importante criar com tipo correto antes do primeiro upsert**

---

### 5. Criação automática de atributos

❌ **Não implementar agora.** O endpoint Brevo `POST /v3/contacts/attributes/{category}/{name}` permitiria criar via código, mas:
- Adiciona latência ao primeiro unlock
- Requer tracking de "já criou?" para idempotência
- Risco de race conditions
- Está **fora do âmbito** desta auditoria

A criação manual (5 min no painel) é mais segura e definitiva.

---

### Recomendação final

✅ **Avançar com teste manual de unlock real assim que os 14 atributos estiverem criados no painel Brevo com os tipos da tabela acima.**

Se preferires testar antes de criar (apenas para validar que o sync chega), o sync funcionará — mas será preciso apagar os atributos auto-criados como Text e recriá-los com tipo correto antes de qualquer segmentação real.

## Checkpoint

- ☑ 14 atributos inventariados a partir do código de produção
- ☑ Tipo Brevo correto definido para cada um (4 Date, 1 Number, 1 Boolean, 8 Text/Category)
- ☑ Checklist copy-paste pronta para o painel Brevo
- ☑ Confirmado que código não bloqueia se atributos faltarem (cria como Text)
- ☑ Sem alterações de código necessárias
- ☐ Utilizador cria os 14 atributos no painel Brevo antes do primeiro teste real