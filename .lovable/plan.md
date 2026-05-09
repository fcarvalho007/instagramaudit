# Roadmap de Correções — Pós-Auditoria InstaBench

Score atual da auditoria: **78/100**. Objetivo deste roadmap: chegar a **≥92/100** antes do beta sair para os primeiros 10 utilizadores, sem desestabilizar o MVP.

Cada batch é **pequeno, isolado e validável de forma independente**. Nada se mistura com refactors maiores nem com importações do CRM Webinar.

---

## Resumo dos buckets

| Prioridade | Bloqueia o quê | Nº batches | Risco agregado |
|---|---|---|---|
| **P0** | Lançamento beta (segurança/dados expostos) | 2 | Médio |
| **P1** | Primeiros 10 utilizadores (qualidade/observabilidade) | 3 | Baixo |
| **P2** | Refinamento pós-beta | 2 | Baixo |
| **P3** | Nice-to-have | 1 | Muito baixo |

---

## P0 — Bloqueia o beta (resolver primeiro)

### Batch P0-A — RLS explícito em `leads`, `report_requests`, `product_events`, `beta_feedback`

- **Problema:** As tabelas `leads`, `report_requests` (só tem 1 policy SELECT), `product_events` e `beta_feedback` **não têm policies completas**. Hoje só funcionam porque o admin usa `supabaseAdmin` (service role, bypass RLS). Mas:
  - O publishable key + utilizador autenticado podem chegar a estas tabelas via `supabase.from(...)` no browser.
  - `report_requests` aceita `INSERT` sem policy explícita → bloqueado por defeito, mas não há `WITH CHECK` que confirme `lead_id` pertence ao user.
  - Sem RLS estrita, qualquer fuga de chave ou bug em loader isomórfico expõe dados de leads.
- **Ficheiros afetados:** apenas migration SQL. Código aplicacional não muda (continua a usar `supabaseAdmin` para escritas).
- **Risco:** **Médio.** Se a policy estiver errada, pode partir o `/admin/beta-leads` (que usa admin client, portanto **não deve partir** se o admin client ignora RLS, mas há que validar). Risco real: alguma query feita pelo browser (autenticado) deixar de funcionar.
- **Proposta de fix:**
  - `leads`: deny-all para `anon` e `authenticated`. Só service role lê/escreve. (Lead nunca é lida diretamente pelo cliente.)
  - `report_requests`: manter SELECT própria (já existe), bloquear INSERT/UPDATE/DELETE para `authenticated` e `anon`.
  - `product_events`: deny-all para `anon` e `authenticated`. Eventos só inseridos via server functions com service role.
  - `beta_feedback`: permitir INSERT anónimo **com `WITH CHECK` apertado** (`report_request_id` e `lead_id` têm de existir e ser consistentes), bloquear SELECT/UPDATE/DELETE para todos exceto service role. Form de feedback público precisa de inserir.
- **Migration DB:** **Sim.** 1 migration com 4 blocos `CREATE POLICY` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` defensivo.
- **Providers/email:** Não.
- **Validação:**
  - `supabase--linter` antes/depois (esperar 0 critical).
  - `bunx tsc --noEmit` + `bunx vitest run`.
  - Manual: abrir `/admin/beta-leads` (deve continuar a funcionar — service role).
  - Manual: submeter feedback no relatório público (deve funcionar com publishable key).
  - Manual: tentar `supabase.from('leads').select('*')` na consola do browser autenticado → deve retornar 0 linhas.

### Batch P0-B — Limpar allowlist de eventos não usados

- **Problema:** `src/lib/tracking.functions.ts` aceita `pro_teaser_clicked` e `email_clicked` na allowlist mas **nenhum call site os emite**. Risco: alguém adiciona um disparo errado e contamina `product_events` com eventos inúteis que nunca terão handler de lifecycle.
- **Ficheiros afetados:** `src/lib/tracking.functions.ts` (apenas remover do array de allowlist).
- **Risco:** **Muito baixo.** Apenas remover constantes de uma lista. Nenhum call site usa estes eventos.
- **Proposta de fix:** remover `pro_teaser_clicked` e `email_clicked` da `ALLOWED_EVENTS`. Adicionar comentário a explicar a regra: "se voltar a ser usado, adicionar aqui + handler em `lead-lifecycle.ts`".
- **Migration DB:** Não.
- **Providers/email:** Não.
- **Validação:** `bunx tsc --noEmit` + `bunx vitest run` + `rg "pro_teaser_clicked|email_clicked" src/` deve devolver 0 hits após a alteração.

---

## P1 — Antes dos primeiros 10 utilizadores

### Batch P1-A — Smoke tests para envio de email

- **Problema:** `send-report-link` e `send-feedback-request` (server functions críticas) **não têm testes**. Um regression silencioso pode quebrar a entrega do relatório sem alarmes. Já temos 163 testes a passar — basta adicionar 4–6 testes focados.
- **Ficheiros afetados:** novo `src/lib/__tests__/send-report-link.test.ts` e `src/lib/__tests__/send-feedback-request.test.ts`.
- **Risco:** **Baixo.** Só adiciona ficheiros. Mockar Supabase + Resend.
- **Proposta de fix:** testes que validam:
  - Resposta `unauthorized` sem `INTERNAL_API_TOKEN` válido.
  - Skip quando `RESEND_KILL_SWITCH` ativo.
  - Skip quando lead não existe ou snapshot não está pronto.
  - Path feliz: chama `recordProductEvent` com o `event_type` certo.
- **Migration DB:** Não.
- **Providers/email:** **Não** — providers são mocked.
- **Validação:** `bunx vitest run` → 165–169 testes a passar.

### Batch P1-B — Wiring ou remoção de `commercial-followup`

- **Problema:** `src/lib/email/templates/commercial-followup.ts` existe e está exportado em `index.ts` mas **não é importado por nenhum endpoint**. Órfão.
- **Ficheiros afetados:** `src/lib/email/templates/commercial-followup.ts`, `src/lib/email/templates/index.ts`, possivelmente `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (se decidirmos adicionar botão).
- **Risco:** **Baixo.** Decisão binária: ou (a) wired a um botão manual no Lead Detail Sheet ("Enviar follow-up comercial"), ou (b) eliminar.
- **Proposta de fix:** **wired manual.** Adicionar botão no `lead-detail-sheet.tsx` que aparece **apenas** quando `commercial_status ∈ {feedback_recebido, interessado, potencial_cliente}`. O botão chama um novo server function `send-commercial-followup` análogo a `send-feedback-request`.
- **Migration DB:** Não.
- **Providers/email:** Sim (Resend) — mas só quando admin clica manualmente, sem auto-disparo.
- **Validação:** `bunx tsc --noEmit` + `bunx vitest run` + teste manual em `/admin/beta-leads` (escolher lead em estado correto e enviar para o próprio email).

### Batch P1-C — Índice composto em `product_events`

- **Problema:** Auditoria detetou `product_events` sem índice em `(lead_id, event_type, created_at DESC)`. Queries de lifecycle e dedup já fazem ~3 SELECTs por evento. Com volume de beta isto continua rápido (<10ms), mas num cenário de 1000 leads × 12 eventos × loops de re-render fica notório.
- **Ficheiros afetados:** apenas migration SQL.
- **Risco:** **Muito baixo.** `CREATE INDEX CONCURRENTLY` é seguro em produção; em Supabase managed basta `CREATE INDEX` (a migration corre numa transação curta sobre tabela ainda pequena).
- **Proposta de fix:**
  - `CREATE INDEX idx_product_events_lead_event_created ON product_events(lead_id, event_type, created_at DESC);`
  - `CREATE INDEX idx_product_events_snapshot_event ON product_events(snapshot_id, event_type) WHERE snapshot_id IS NOT NULL;` (acelera dedup de `report_viewed`).
- **Migration DB:** **Sim.**
- **Providers/email:** Não.
- **Validação:** `supabase--linter` (0 novos warnings) + `bunx tsc --noEmit` + `bunx vitest run`.

---

## P2 — Pós-beta (refinamento UX)

### Batch P2-A — Colapsar `report_viewed` repetidos na timeline

- **Problema:** Mesmo com dedup ativo, leads que abrem o relatório múltiplas vezes ao longo de dias geram vários `report_viewed`. A timeline do `lead-detail-sheet.tsx` mostra-os todos, criando ruído visual.
- **Ficheiros afetados:** `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`.
- **Risco:** **Baixo.** Só apresentação.
- **Proposta de fix:** agrupar runs consecutivos de `report_viewed` num único item da timeline com badge `×N` e tooltip com primeira/última data.
- **Migration DB:** Não.
- **Providers/email:** Não.
- **Validação:** `bunx tsc --noEmit` + visual em `/admin/beta-leads`.

### Batch P2-B — Suprimir `lead_status_changed` redundantes na UI

- **Problema:** Cada transição de lifecycle emite o evento que a despoletou (e.g. `report_viewed`) **e** um `lead_status_changed`. A timeline mostra ambos com o mesmo timestamp, duplicando informação.
- **Ficheiros afetados:** `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (filtro de apresentação) ou helper em `src/lib/admin/lead-events.server.ts`.
- **Risco:** **Baixo.** Só apresentação — eventos continuam a ser registados em DB para auditoria.
- **Proposta de fix:** colapsar `lead_status_changed` quando há outro evento no mesmo segundo para o mesmo lead, mostrando o evento original com badge a indicar a transição.
- **Migration DB:** Não.
- **Providers/email:** Não.
- **Validação:** visual + `bunx vitest run`.

---

## P3 — Nice-to-have

### Batch P3-A — Tipo `Database` exato em `recordProductEvent`

- **Problema:** `recordProductEvent` usa `event_type: string` em vez de tipo união derivado da allowlist. Erros de typo só aparecem em runtime.
- **Ficheiros afetados:** `src/lib/tracking.functions.ts`, `src/lib/tracking.server.ts`, possivelmente call sites.
- **Risco:** **Muito baixo.**
- **Proposta de fix:** exportar `type AllowedEvent = typeof ALLOWED_EVENTS[number]` e tipar argumentos.
- **Migration DB:** Não.
- **Providers/email:** Não.
- **Validação:** `bunx tsc --noEmit` (deve continuar verde, ou apanhar typos existentes).

---

## Ordem de execução recomendada (mais segura)

```text
Dia 1 (antes de qualquer outra coisa):
  1. P0-B  (limpeza allowlist)         — 5 min,   risco ~0
  2. P0-A  (RLS migration)             — 30 min,  risco médio (validar manualmente)

Dia 2 (qualidade pré-beta):
  3. P1-C  (índices)                   — 10 min,  risco ~0
  4. P1-A  (smoke tests)               — 45 min,  risco ~0
  5. P1-B  (commercial-followup wire)  — 1h,      risco baixo

Pós-beta (sem pressa):
  6. P2-A  (colapsar report_viewed)
  7. P2-B  (suprimir lead_status_changed redundantes)
  8. P3-A  (tipos)
```

**Justificação da ordem:**
- P0-B vai antes de P0-A porque é trivial e elimina ruído.
- P0-A (RLS) é o único batch com risco médio — fazer cedo, validar com calma.
- P1-C antes de P1-A porque migrations e índices não dependem de testes.
- P1-A antes de P1-B para que o novo `send-commercial-followup` já nasça testado.

---

## Detalhes técnicos relevantes (para a fase de Build)

- Nenhum batch importa código do CRM Webinar — esses são roadmap separado (auditoria anterior).
- Todas as migrations devem usar a tool de migration do Supabase, **uma por batch**, nunca combinadas.
- O batch P0-A é o único que pode revelar bugs aplicacionais latentes (queries do browser que dependiam de RLS desligada). Validar `/relatorio/$username` (público) e `/perfil` (autenticado) após aplicar.
- Tests novos em P1-A devem mockar `supabaseAdmin` e `Resend` — não fazer chamadas reais.
- `commercial_status` só pode transitar via `lead-lifecycle.ts` — o novo botão de P1-B **não muda status**, só dispara email + regista evento `commercial_followup_sent`.

---

## Primeiro prompt de implementação (para usar quando aprovares)

> **Goal:** Implement Batch P0-B — remove unused events from tracking allowlist.
>
> **Context:** Audit found `pro_teaser_clicked` and `email_clicked` are in the `ALLOWED_EVENTS` allowlist in `src/lib/tracking.functions.ts` but no call site in the codebase emits them. They have no lifecycle handler. Risk of contaminating `product_events` with stale event types.
>
> **Scope:**
> 1. Open `src/lib/tracking.functions.ts`.
> 2. Remove `"pro_teaser_clicked"` and `"email_clicked"` from `ALLOWED_EVENTS`.
> 3. Add a one-line comment above the array: `// Adding a new event requires a corresponding handler in src/lib/admin/lead-lifecycle.ts`.
> 4. Confirm via `rg "pro_teaser_clicked|email_clicked" src/` that no call site references these strings (should return 0 hits).
>
> **Constraints:**
> - Do not change any other file.
> - Do not touch lifecycle code.
> - Do not touch DB schema.
> - Do not call Apify, OpenAI, DataForSEO, or Resend.
>
> **Validation:**
> - `bunx tsc --noEmit` (0 errors).
> - `bunx vitest run` (163/163 still passing).
> - `rg "pro_teaser_clicked|email_clicked" src/` returns 0 hits.
>
> **Return:**
> - Files changed (expect 1).
> - Output of the three validation commands.
