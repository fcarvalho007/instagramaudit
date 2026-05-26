## Auditoria — `personal_area_saved`

### Estado actual
- Template existe: `src/lib/email/templates/personal-area-saved.ts` (assunto: "O relatório foi guardado na tua área pessoal", CTA → `/app/reports`).
- Sender existe: `src/lib/email/send-personal-area-saved.server.ts` (transacional, Brevo→Resend, com `flowType: "personal-area-saved"`).
- Registry: `wired: false`, nota explícita "Reservado para o fluxo de criação de conta (a ligar em `handle_new_user` / `link_user_to_existing_reports`)".
- `unlock.server.ts` (linha 472) diz literalmente: *"The `personal-area-saved` email was deprecated (it duplicated report-summary without real KPIs)"*. Logo, no contexto **unlock** já foi conscientemente removido.
- Existe `ensureReportAssociation` em `src/server/account.functions.ts` que chama `link_user_to_existing_reports` no signup — é aí que um lead que já tinha relatórios passa a ter uma "área pessoal" real.

### Respostas às 6 perguntas

**1. Que evento deve disparar?**
O único evento onde o email faz sentido conceptualmente é a **criação de conta autenticada** que reclama (link) relatórios pré-existentes do lead — i.e. quando `ensureReportAssociation` resulta em `linked: true` com ≥1 relatório associado. É a primeira vez que existe de facto uma "área pessoal" para o utilizador. Não deve disparar no unlock (o unlock já é coberto por `welcome-beta` + `report-summary`, e nessa fase ainda não há conta).

**2. É redundante com `welcome_beta` ou `report_summary`?**
- Sobreposição com `report_summary`: **sim, se disparado no unlock** (foi por isso que se desligou — duplica sem KPIs).
- Sobreposição com `welcome_beta`: parcial — ambos dão boas-vindas, mas `welcome_beta` é "bem-vindo à beta após pedires o teu primeiro relatório" (pré-conta), enquanto `personal_area_saved` seria "a tua conta está pronta e o relatório X já lá está" (pós-signup).
- **Conclusão**: não é redundante **se e só se** o gatilho for signup com claim de relatórios. Em qualquer outro gatilho, é redundante.

**3. Transacional ou marketing?**
**Transacional.** É confirmação de um acto explícito do utilizador (criou conta / reclamou acesso). Não promocional, 1:1, esperado pelo destinatário. Não precisa de marketing consent, mas respeita suppression list como qualquer email transacional.

**4. Uma vez por user ou por relatório?**
**Uma vez por user** (não por relatório). A "área pessoal" é uma entidade única; mandar um email por cada relatório associado seria ruído. Se mais tarde o user adicionar mais relatórios (re-análise), isso fica para outro flow (ex.: `report_ready_for_user` ou simplesmente sem email, já que estará logado).

**5. Que product event emitir?**
Sugestão: `personal_area_saved_sent` (já reservado em `automation-flow-types.ts:234`). Em caso de falha: `personal_area_saved_failed`. Metadata mínima: `user_id`, `lead_id`, `linked_report_count`, `provider`, `message_id`.

**6. Regra de deduplicação**
Dedup contra `product_events` por **`user_id`** (não `lead_id` nem `report_request_id`) + `event_type = 'personal_area_saved_sent'`. Lookup único: se já existe ⇒ skip. Como fallback de defesa, manter `idempotencyKey = personal-area-saved:{user_id}` ao nível do `sendTransactionalEmail`. Pré-requisito adicional: só enviar se `link_user_to_existing_reports` devolver ≥1 relatório efectivamente associado (evita email vazio para signup sem relatórios prévios).

### Recomendação

**Opção A — Ligar a `ensureReportAssociation` (preferida)**
Disparar `sendPersonalAreaSavedEmail` dentro de `ensureReportAssociation` quando:
- `linked: true`
- count de relatórios associados ≥ 1
- não existe `personal_area_saved_sent` prévio para esse `user_id`

Pressupõe pequena alteração à RPC `link_user_to_existing_reports` (devolver count) ou um `SELECT count(*) FROM report_requests WHERE user_id = ?` imediatamente a seguir.

**Opção B — Deprecar formalmente**
Se o produto não vai exigir signup obrigatório a curto prazo, marcar template + sender como deprecated, remover do registry e do `automation-flow-types`. Hoje vive como código órfão a custar manutenção (testes, paridade, defaults).

**Recomendação final**: **Opção A**, porque o signup-com-claim já existe (`ensureReportAssociation`) e é o único momento em que o copy do template ("foi guardado na tua área pessoal") é verdadeiro e não duplica `report_summary`. Se em 2–3 semanas o signup continuar sem volume real, então Opção B.

### Fora de âmbito desta auditoria
- Não alterar `unlock.server.ts` — está correcto a não disparar este email.
- Não tocar em `welcome_beta` nem `report_summary`.
- Não alterar copy do template (já está alinhado com o gatilho recomendado).
- Não implementar a ligação agora — esta é uma recomendação, não um plano de execução.

### Próximo passo sugerido
Confirmar Opção A ou B. Se A, crio plano de implementação separado (alteração à RPC + hook em `ensureReportAssociation` + dedup + testes + flip de `wired: true`).
