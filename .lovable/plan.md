## Auditoria Brevo — listar atributos reais da conta

### Objetivo

Confirmar que os 14 atributos esperados existem na tua conta Brevo com **nome exato** (case-sensitive) e **tipo correto**, antes do primeiro unlock real.

### O que vou fazer

Uma única chamada **read-only** ao gateway Brevo:

```
GET https://connector-gateway.lovable.dev/brevo/v3/contacts/attributes
Authorization: Bearer ${LOVABLE_API_KEY}
X-Connection-Api-Key: ${BREVO_API_KEY}
```

Esta endpoint devolve **todos** os atributos de contacto da conta Brevo (built-in + custom), com `name`, `type` e `category`.

### Como vou processar

Cruzar a resposta com a checklist dos 14 atributos esperados:

| Esperado | Tipo esperado |
|---|---|
| `INSTAGRAM_HANDLE` | text |
| `REPORTS_COUNT` | float / number |
| `LAST_REPORT_URL` | text |
| `LAST_REPORT_AT` | date |
| `PROFILE_OWNERSHIP` | text (category) |
| `GOAL` | text (category) |
| `USER_TYPE` | text (category) |
| `PRICING_PREFERENCE` | text (category) |
| `LEAD_SOURCE` | text (category) |
| `COMMERCIAL_STATUS` | text (category) |
| `IS_CUSTOMER` | boolean |
| `PLAN` | text (category) |
| `LAST_PAYMENT_AT` | date |
| `BETA_WELCOMED_AT` | date |

Para cada atributo, devolver veredicto:
- ✅ **OK** — existe + tipo correto
- ⚠️ **TIPO ERRADO** — existe mas tipo divergente (precisa apagar e recriar)
- ❌ **EM FALTA** — precisa criar manualmente no painel
- ℹ️ **EXTRA** — atributo na Brevo que o código não usa (informativo, sem ação)

### Riscos

Nenhum — é um GET, não cria, não modifica, não envia emails, não toca em contactos.

### Output

Tabela compacta com o veredicto por atributo + lista de ações concretas a tomar no painel Brevo (se existir gap).

## Checkpoint

- ☐ GET `/v3/contacts/attributes` via gateway
- ☐ Cruzar com lista de 14 esperados
- ☐ Devolver tabela de veredicto + ações