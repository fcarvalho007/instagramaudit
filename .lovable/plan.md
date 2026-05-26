## Resumo da Auditoria Fase 2

A maior parte da rebranding nos emails e admin **já foi feita durante a Fase 1**. Fiz um varrimento completo e a base de código já está consistente. Não há ficheiros visíveis a alterar.

### Evidência (zero ocorrências `InstaBench` em áreas user-facing)

```
src/lib/email/**           → 0 ocorrências InstaBench (tudo "AuditProfiles")
src/lib/admin/email-template-registry.ts → 0 ocorrências
src/components/admin/**    → 0 ocorrências
src/routes/admin*.tsx      → 0 ocorrências
```

Confirmado que:
- `src/lib/email/shared.ts` → `BRAND = "AuditProfiles"`, `SIGNATURE_NAME = "equipa AuditProfiles"`
- `src/lib/email/report-email-template.ts` → `BRAND = "AuditProfiles"`
- `src/lib/email/templates/welcome-beta.ts` → copy já usa "AuditProfiles"
- `src/lib/admin/email-template-registry.ts` linha 234 → preheader "relatório AuditProfiles"
- `src/lib/email/transactional-email.server.ts` linha 141 → fallback `BREVO_FROM_NAME` = `"AuditProfiles"`
- `src/lib/email/sender.ts` → docstring usa `"AuditProfiles <relatorios@auditprofiles.com>"`
- Tests em `src/lib/email/__tests__/templates.test.ts` e `transactional-email.test.ts` já validam `"equipa AuditProfiles"` e `RESEND_FROM` com domínio novo
- `app_config` em produção → nenhuma chave contém "instabench"

### Ocorrências remanescentes (todas intencionais — classificadas)

| Ficheiro | Linha | Tipo | Decisão |
|---|---|---|---|
| `supabase/migrations/20260429163700_*.sql` | 290 | Seed histórico ("InstaBench dataset interno") | Manter — migration imutável, dado interno admin |
| `src/i18n/index.ts` | 30 | `LANG_STORAGE_KEY = "instabench.lang"` | Manter — mudar invalida preferência de idioma de utilizadores existentes |
| `src/lib/analysis/cost.ts` | 66 | `IP_HASH_SALT` fallback `"instabench-default-salt"` | Manter — mudar quebra dedup de hashes históricos |

### Recomendações Manuais (fora de código)

Não tenho visibilidade dos valores dos secrets. **Pedido ao utilizador para verificar e, se aplicável, atualizar manualmente em Connectors/Secrets:**

- `BREVO_FROM_NAME` → garantir valor `AuditProfiles`
- `RESEND_FROM` → garantir formato `AuditProfiles <relatorios@auditprofiles.com>` (ou domínio verificado equivalente)
- `BREVO_FROM_EMAIL` → garantir que aponta para domínio AuditProfiles

Se algum destes ainda contiver "InstaBench" ou domínio antigo, os emails saem com sender errado mesmo com o código limpo.

## Plano de Execução

Como nenhum ficheiro tem alterações pendentes:

1. **Validação completa** — correr `bunx tsc --noEmit` e `bunx vitest run` para confirmar que tudo continua verde.
2. **Relatório final** — entregar o output pedido (lista de templates, sender info, secrets manuais, ocorrências classificadas, resultado de testes).
3. **Sem mudanças de código** a não ser que a validação revele uma falha relacionada com marca.

### Caso a validação revele algum problema

Aplicar correção cirúrgica e re-validar. Não tocar em:
- Migrations históricas
- `LANG_STORAGE_KEY`
- `IP_HASH_SALT`
- `personal_area_saved` wiring
- Secrets (apenas reportar)
- Infraestrutura de provider (Brevo/Resend gateway)

## Aprovar para executar a validação e gerar o relatório.