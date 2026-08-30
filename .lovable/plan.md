# Ronda 4.5 — Validação E2E da conversão pós-valor

Ronda de validação. Sem redesenho, sem novas funcionalidades, sem alterações de arquitectura — apenas correcção de defeitos reais encontrados durante os testes. `PUBLIC_BASELINE_NO_EMAIL` permanece desactivado em produção; a validação corre em local/staging com a flag temporariamente activa e reposta no fim.

## Correcção já identificada antes da validação

A subcopy actual promete algo que a Ronda 5 ainda não entrega:

- PT: "Guarda o relatório, desbloqueia a análise das conversas e recebe um link para voltares quando quiseres."
- EN: equivalente.

Hoje só leads **já existentes** recebem email de acesso (com verificação); leads novos não recebem link nenhum. Substituir por:

- PT: "Guarda o relatório e desbloqueia gratuitamente a análise das conversas."
- EN: "Save the report and unlock the conversation analysis for free."

## Ponto a decidir durante a validação (potencial BLOCKER)

Um segundo email submetido no mesmo relatório cria hoje uma segunda linha em `lead_reports` para o mesmo `cache_key` e recebe cookie scoped para esse relatório. Não há remoção do primeiro lead nem transferência de ownership, mas há duas associações para o mesmo snapshot.

Comportamento a validar e, se necessário, endurecer:

- o primeiro lead nunca perde a associação nem a relação declarada;
- o segundo email não altera `profile_relationship` já declarada por outro lead;
- resposta controlada, sem revelar que o relatório já foi capturado por outra pessoa.

Se algum destes falhar, é BLOCKER e corrige-se nesta ronda (guarda no claim/relationship, sem mudar arquitectura).

## Plano de execução

### Fase 1 — Preparação
Ambiente local com flag anónima activa; identificar emails QA: novo, lead existente com relatório anterior, e email já presente em `auth.users`. Registar `created_at` inicial de `leads`, `auth.users`, `lead_reports`, `comment_enrichment_jobs` e `product_events` para diferenciar dados QA.

### Fase 2 — Percurso feliz e persistência (Casos A, 2)
Playwright em browser limpo: landing → handle → auditoria → CTA → email → submit. Verificar por SQL: 1 lead, 0 auth users, 1 `lead_report`, 1 job de comentários. Verificar cabeçalhos `Set-Cookie`: só `report_capture_session`, `HttpOnly`, sem `lead_session`. Refresh e reconfirmar ausência de duplicados e estado real do bloco.

### Fase 3 — Segurança do acesso scoped (3, 4)
Com apenas o cookie scoped, chamar `unlock-comments` e `report-relationship` para outra `cache_key`, e aceder a `/app/reports`, histórico e endpoints de créditos. Tudo negado excepto o relatório corrente. Adulterar `leadId`, `cacheKey`, assinatura e timestamp; confirmar recusa sem detalhes internos.

### Fase 4 — Leads existentes e auth users (5, 6)
Confirmar ausência de duplicados, associação correcta, histórico inacessível, sem sessão Supabase nem `lead_session`, e revisão da copy para evitar enumeração de utilizadores (mensagem neutra e igual nos dois casos).

### Fase 5 — Idempotência e três CTAs (7, 8)
Repetir submissão pelo mesmo e por outros CTAs; confirmar 1 lead / 1 associação / 1 job. Auditar o caso do segundo email conforme secção acima. Confirmar por leitura de código e rede que os três CTAs chamam o mesmo `ConversionSheet` e o mesmo endpoint.

### Fase 6 — Consentimentos e relação (9, 10)
Duas conversões com e sem opt-in; confirmar `marketing_consent`/`marketing_consent_at` e `gdpr_consent_version` operacional separado. Dois relatórios do mesmo lead com `owner` e `competitor`; confirmar coexistência, `relationship_source=user_declared`, e que nada é escrito como atributo global do lead. Testar "Agora não" → relação `null`.

### Fase 7 — Comment Intelligence real e falhas (11, 12)
Perfil público real: confirmar 5 posts × 4 comentários, sem replies, sem job duplicado, patch do snapshot e polling até `available`. Simular falha e snapshot inexistente: lead guardado, sem ownership falso, mensagem de erro recuperável correcta.

### Fase 8 — Rate limiting, analytics e mobile (13, 14, 16)
Confirmar limites reais dos três endpoints sem falsos bloqueios em refresh legítimo e que só é guardado hash de IP. Ler `product_events` e validar a sequência completa com `conversion_entry_point`, sem email em claro, sem IP em bruto, sem duplicados por rerender/refresh. Playwright a 320/375/390/430 px com teclado aberto.

### Fase 9 — Testes e limpeza (17)
`tsgo`, testes focados da Ronda 4, providers, onboarding e suite completa, separando regressões novas das 7 falhas pré-existentes conhecidas. Marcar/remover dados QA e confirmar a flag anónima desactivada em produção.

## Entrega

Tabela `Cenário | PASS/FAIL | Evidência | Alteração necessária`, seguida de contagens (leads QA, auth users — esperado 0, jobs, chamadas de provider), eventos observados, resultados dos testes ao cookie scoped, consentimentos, screenshots desktop/mobile, bugs corrigidos e riscos residuais.

`READY FOR ONBOARDING ROUND 5` apenas se todos os critérios do pedido forem cumpridos, incluindo ausência de takeover e ausência de promessa por cumprir.

## Notas técnicas

- Ficheiros que se prevê alterar: `src/i18n/locales/{pt,en}/conversion.json` (subcopy) e, apenas se a validação o exigir, `src/lib/credits/lead-reports.server.ts`, `src/routes/api/public/lead-capture.ts`, `src/routes/api/public/report-relationship.ts` e testes associados.
- Riscos já conhecidos e a reconfirmar, não a redesenhar: rate limiting por isolate (best-effort) e tecto global de runs com comportamento fail-open em erro de BD.
