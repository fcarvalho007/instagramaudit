# Ronda 4 — Captura de lead pós-valor e desbloqueio do Nível 2

O visitante já vê a Auditoria Instantânea sem registo. Esta ronda transforma esse
momento em conversão: **valor → email → valor imediato → qualificação progressiva**,
sem password e sem sair da página.

## Fluxo final

```text
Relatório anónimo
  └─ CTA (guardar / aprofundar / fim do relatório)
       └─ Sheet de conversão (1 campo: email)
            ├─ opt-in de marketing separado, não pré-seleccionado
            └─ submeter
                 ├─ lead criado/actualizado (sem conta, sem password)
                 ├─ sessão de leitura emitida
                 ├─ snapshot anónimo associado ao lead
                 ├─ Comment Intelligence arranca já
                 └─ pergunta contextual de relação (opcional, não bloqueia)
```

O utilizador permanece sempre na mesma página; o bloco de comentários passa por
`locked → unlocking → processing → available` (ou erro recuperável) e actualiza
sem recarregar.

## Um único motor de conversão

Criar `ConversionSheet` (bottom-sheet em mobile, diálogo em desktop) usado pelos
três pontos de entrada. Só variam headline/subcopy; o backend é o mesmo.

| Origem | `conversion_entry_point` |
| --- | --- |
| Guardar esta auditoria (`InstantAuditBar`) | `save_audit` |
| Aprofundar a análise (`DeepenAnalysisCta`) | `comment_intelligence` |
| CTA final do relatório | `report_end` |

Os dois primeiros componentes já existem como blocos informativos; ganham botão
real. O antigo `OnboardingModal` (nome + password + selects) não é reutilizado no
fluxo novo — só componentes visuais isolados.

## Copy (PT-PT / EN)

- Headline: “Aprofunda esta auditoria gratuitamente” / “Go deeper into this audit, for free”
- Subcopy: “Guarda o relatório, desbloqueia a análise das conversas e recebe um link para voltares quando quiseres.”
- CTA: “Desbloquear gratuitamente” / “Unlock for free”
- Microcopy: “Sem pagamento · Podes cancelar comunicações de marketing a qualquer momento”
- Opt-in separado: “Quero receber ocasionalmente conteúdos e novidades sobre marketing digital.”
- Processing: “Estamos a analisar as conversas das publicações recentes…”
- Qualificação: “Só para personalizarmos melhor a análise: qual é a tua relação com @handle?” + “Agora não”

Nada de “relatório 100% completo”; usa-se “Análise aprofundada”.

## Backend

Novo `POST /api/public/lead-capture` — `{ email, cache_key, marketing_consent, entry_point }`:

1. valida e normaliza o email (Zod), rate-limit por IP igual ao padrão já usado;
2. `leads` upsert por `email_normalized` (idempotente), com `source` e consentimento
   operacional e de marketing registados em separado (`marketing_consent`,
   `marketing_consent_at`, versão da copy);
3. emite cookie de sessão via `setLeadCookie` (novo lead) — ver secção de segurança;
4. `claimAnonymousBaselineReport` associa o snapshot desse `cache_key` ao lead
   (`relationship_source` fica por preencher até a pergunta ser respondida);
5. devolve `{ lead_status: "created" | "existing", scoped: boolean }`.

Depois, o cliente chama o `POST /api/public/unlock-comments` já existente
(ScrapeCreators primário, Apify fallback, índice único parcial garante
idempotência — segundo submit não cria job novo).

Relação declarada: novo `POST /api/public/report-relationship` sobre
`setReportRelationship` (`lead_reports.profile_relationship`,
`relationship_source = "user_declared"`), com derivação para
`leads.qualification` via `RELATIONSHIP_TO_QUALIFICATION`. Sem resposta →
fica `null`; nunca se infere propriedade a partir do perfil analisado. Perfil
analisado e lead mantêm-se separados no CRM.

## Lead existente (decisão de segurança)

Um email sozinho não pode dar acesso ao histórico de outra pessoa. Por isso:

- **email novo** → sessão normal, acesso completo ao que criar a partir daí;
- **email já existente** → sessão *scoped* ao `cache_key` corrente (cookie com
  âmbito limitado): permite guardar e desbloquear este relatório, sem expor
  relatórios, créditos ou dados anteriores. Em paralelo é enviado um link de
  acesso por email (reutiliza `send-report-access.server`) para obter a sessão
  completa. Nunca se mostra “Esta conta já existe. Faz login.” nem se pede password.

Esta limitação fica documentada na entrega.

## Analytics

Estender `AnonymousFunnelEvent` e o enum do endpoint `funnel-event` com:
`lead_cta_clicked`, `lead_modal_viewed`, `email_started`, `email_submitted`,
`lead_created`, `existing_lead_detected`, `snapshot_claimed`,
`relationship_question_viewed`, `relationship_answered`, `relationship_skipped`,
`comment_intelligence_started`, `comment_intelligence_success`,
`comment_intelligence_failed`. Todos com `conversion_entry_point` em metadata e
`dedupeKey` por snapshot para evitar duplicação em rerender/refresh/viewport.

## Estados tratados

Email inválido; lead existente; falha de associação do snapshot (o desbloqueio
não fica bloqueado por isso); Comment Intelligence já disponível ou já pendente;
soft cap/orçamento (degrada com mensagem); provider indisponível; relatório
expirado/stale; submissão repetida. Tudo idempotente — sem leads nem jobs
duplicados.

## Testes

Unitários/integração para A–N do pedido, incluindo: relatório sem email; CTA abre
sheet; email cria lead; snapshot associado; CI arranca sem password; relação
respondida depois ou saltada; email existente não duplica lead; segundo submit não
duplica job; refresh mantém estado; os três CTAs usam o mesmo motor; opt-in
independente; métricas do perfil analisado nunca atribuídas ao lead quando a
relação não é `owner`/`manages`. Mobile validado a 320/375/390/430 px com teclado
aberto (CTA sempre visível, foco preservado após submit).

## Fora de âmbito

Magic link definitivo, passwordless completo, área privada redesenhada, novos
cards, calendário editorial, pagamentos, plano Pro e automações comerciais —
Ronda 5+.

## Notas técnicas

- Ficheiros novos: `src/components/conversion/conversion-sheet.tsx`,
  `src/lib/leads/lead-capture.ts` (copy + tipos), `src/routes/api/public/lead-capture.ts`,
  `src/routes/api/public/report-relationship.ts`.
- Alterados: `instant-audit-bar.tsx`, `deepen-analysis-cta.tsx`, bloco final do
  relatório, `report-comment-intelligence.tsx` (máquina de estados + polling),
  `anonymous-funnel.ts`, `funnel-event.ts`, ficheiros de tradução PT/EN.
- Sem migração de base de dados: `lead_reports.profile_relationship`,
  `relationship_source` e os campos de consentimento em `leads` já existem.
- `PUBLIC_BASELINE_NO_EMAIL` continua desactivado em produção; a activação é
  decisão à parte.
