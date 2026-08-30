# Ronda 4 — endurecer a conversão pós-valor

Grande parte do motor já foi construída na sessão anterior (`ConversionSheet`, `/api/public/lead-capture`, `runCommentUnlock`, `/api/public/report-relationship`, grant assinado). Esta ronda fecha as lacunas face à especificação: modelo de acesso, idempotência, terceiro CTA, nomes de eventos e testes.

## 1. Modelo de acesso antes da verificação de email

Verificado no código actual: um lead novo recebe o cookie global `lead_session` (90 dias, acesso a todos os `lead_reports` desse lead) e um lead existente não recebe cookie nenhum, apenas um grant devolvido em JSON que se perde no refresh.

Mudança:

- Deixar de emitir `lead_session` na captura de email. Nenhum email não verificado passa a ter sessão global.
- Emitir sempre um cookie novo `report_capture_session`: HttpOnly, assinado (HMAC `SESSION_SECRET`, reutilizando o padrão de `lead-cookie.server.ts`), com `leadId`, `cacheKey` e expiração de 24 h. Âmbito exclusivo do relatório actual.
- `/api/public/report-relationship` e `/api/public/unlock-comments` passam a aceitar: cookie `lead_session` (fluxo autenticado antigo) **ou** `report_capture_session` válido para aquele `cache_key`.
- Nenhum endpoint de histórico, área privada ou lista de relatórios aceita o cookie scoped.
- A promoção para sessão completa continua a acontecer apenas por verificação de email (`/api/public/verify-email`), que já existe e é o caminho da Ronda 5.

Resultado: o teste N passa por construção — nem email novo nem email existente dão acesso a relatórios anteriores.

## 2. Idempotência da associação e do unlock

`claimAnonymousBaselineReport` devolve `claimed: false` quando não encontra snapshot, e o endpoint só arranca o Level 2 quando `claimed === true`. Numa segunda submissão do mesmo email o `upsert` volta a correr, mas convém separar "existe associação" de "foi criada agora".

- Passar a devolver `{ associated, created, cacheKey, snapshotId }`.
- O unlock arranca sempre que `associated` for verdadeiro, mesmo em submissões repetidas — e `runCommentUnlock` já devolve `already_available` / `pending` sem criar segundo job.
- Snapshot inexistente ou expirado: lead na mesma é criado, resposta com estado recuperável e copy própria.

## 3. Terceiro ponto de entrada

Adicionar o CTA de fim de relatório ("Guardar e aprofundar gratuitamente") a seguir ao bloco de aprofundamento, ligado ao mesmo `ConversionSheet` com `conversion_entry_point = report_end`. Continuam a existir três CTAs e um único motor e formulário.

## 4. Analytics

- Remover o evento de visibilidade que dispara sem CTA visível.
- Renomear/alinhar para a lista pedida: `lead_cta_viewed`, `lead_cta_clicked`, `lead_capture_opened`, `email_field_started`, `email_submitted`, `email_validation_failed`, `lead_created`, `existing_lead_detected`, `snapshot_claimed`, `level2_unlock_started`, `relationship_question_viewed`, `relationship_answered`, `relationship_skipped`, `comment_intelligence_started|success|failed`.
- `conversion_entry_point` em todos os eventos do funil, com dedupe por snapshot já existente.
- Actualizar a allowlist do endpoint de eventos em conformidade.

## 5. Limpezas de segurança e privacidade

- Deixar de devolver `actor_hash` na resposta da captura.
- Não escrever `gdpr_consent_version` com a versão de marketing: registar consentimento operacional e opt-in de marketing em campos/timestamps separados.
- Manter o email de acesso apenas para leads existentes, onde o link só produz sessão depois de verificação.

## 6. Estados e erros

Cobrir explicitamente na folha de captura: email inválido (validação local, sem chamada), rate limit, falha de criação de lead, snapshot expirado, unlock indisponível, soft cap, provider em baixo. Regra fixa: falha de Comment Intelligence nunca perde o lead — mensagem "Guardámos a auditoria, mas não foi possível aprofundar esta parte agora."

## 7. Testes

Unitários e de integração para A–R: lead único por email, sem auth user nem password, associação por relatório, relações coexistentes por lead, segundo submit e segundo unlock idempotentes, opt-in independente, cookie scoped sem acesso a histórico, analytics sem duplicação. Validação manual em 320/375/390/430 px com teclado aberto.

## Fora de âmbito

Magic link definitivo, área privada, histórico sem verificação, novos cards, pagamentos, plano Pro. `PUBLIC_BASELINE_NO_EMAIL` mantém-se desactivado em produção.

## Detalhe técnico

Ficheiros novos: `src/lib/leads/report-capture-session.server.ts`. Alterados: `src/routes/api/public/lead-capture.ts`, `src/routes/api/public/report-relationship.ts`, `src/routes/api/public/unlock-comments.ts`, `src/lib/credits/lead-reports.server.ts`, `src/lib/analytics/anonymous-funnel.ts`, `src/routes/api/public/funnel-event.ts`, `src/components/conversion/conversion-sheet.tsx`, `src/components/product/instant-audit-bar.tsx`, `src/components/product/deepen-analysis-cta.tsx`, `src/routes/analyze.$username.tsx`, ficheiros de tradução `conversion.json` (PT/EN). Sem migração de base de dados: `lead_reports.profile_relationship` e `relationship_source` já existem da Ronda 2.
