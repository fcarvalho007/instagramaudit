## Auditoria dos pedidos recentes

Revi os 3 fluxos tocados nas últimas iterações: email transacional pós-unlock, refinamentos (índice único + race + RESEND_FROM) e Command Palette.

### O que está bem
- Template `personal-area-saved` correto, 18 testes verdes, escape HTML feito, fallback URL e text/plain consistentes.
- `sendPersonalAreaSavedEmail` é defensivo: nunca faz throw, timeout de 8s, devolve `reason` granular (`RESEND_API_KEY_MISSING`, `RESEND_<status>:<body>`, `RESEND_TIMEOUT`, `RESEND_NETWORK:...`).
- Eventos `personal_area_email_sent` / `_failed` registados em `ALLOWED_EVENTS`.
- Migração `report_requests_lead_snapshot_unique` aplicada (índice único parcial).
- Command Palette: `meta.label` incluído no `value` → pesquisa por estado comercial funcional.
- `firstName` em `unlock.server.ts` agora usa `data.name ?? existingLead?.name ?? null` (boa cobertura para leads recorrentes que não enviaram nome desta vez).

### Inconsistências e melhorias detetadas

**1. Indentação confusa no handler de race em `unlock.server.ts` (322–329)**
O bloco `else` que devolve 500 está mal indentado dentro do branch 23505. Funciona, mas é fácil partir num próximo edit.

```ts
        } else {
        console.error(...)   // ← indentação errada
        return ...;
        }
```

Reescrever para indentação coerente.

**2. Race path perde merge de `metadata` em `report_requests`**
Quando duas requisições concorrentes disputam o INSERT e a 23505 cai, o vencedor deixou metadados; o perdedor refaz lookup mas **não** atualiza `metadata` com os campos novos (profile_ownership, goal, user_type, pricing_preference). O caminho `existingRR` (linha 280) faz merge — o caminho de race deve fazer o mesmo para preservar a regra "existing keys win, novos campos preenchem buracos".

Aplicar o mesmo `merge + update` no branch de race.

**3. `send-report-email.ts` ignora `RESEND_FROM`**
O outro sender (PDF report email) tem `SENDER_FROM` hardcoded em `onboarding@resend.dev` (linha 32). Para consistência, deve usar o mesmo `resolveSender()` (ler `RESEND_FROM` com fallback para sandbox). Caso contrário, configurar `RESEND_FROM` resolve só metade do problema de deliverability.

Extrair `resolveSender()` para `src/lib/email/sender.ts` e reutilizar nos dois sites.

**4. Sender sandbox em produção — nota operacional**
`RESEND_FROM` **não consta** nos secrets atuais. Significa que ambos os senders estão a usar `onboarding@resend.dev`, que só entrega para o email da conta Resend. Para qualquer lead real, vai aparecer `personal_area_email_failed` com `reason = RESEND_403`.

A infraestrutura está pronta — falta apenas:
- verificar um domínio na Resend (ex.: `instagramaudit.pt`), e
- configurar a secret `RESEND_FROM` (ex.: `InstaBench <relatorios@instagramaudit.pt>`).

Não é alteração de código; é uma ação operacional. Vou flagar no fim da execução, não vou adicionar a secret automaticamente.

### Ficheiros tocados
- **EDIT** `src/lib/unlock.server.ts` — corrigir indentação + aplicar merge metadata no race path.
- **NEW** `src/lib/email/sender.ts` — `resolveSender()` partilhado.
- **EDIT** `src/lib/email/send-personal-area-saved.server.ts` — usar `resolveSender` partilhado.
- **EDIT** `src/routes/api/send-report-email.ts` — usar `resolveSender` partilhado (substitui constante hardcoded).

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run` (esperar 180/180 ainda)
- Inspeção visual da diff antes de fechar

### Checkpoint
☐ Indentação do race branch corrigida
☐ Merge de metadata no race path
☐ `resolveSender()` partilhado entre os dois senders
☐ Testes verdes
☐ Reportar estado e flagar a ação operacional sobre `RESEND_FROM` + verificação de domínio
