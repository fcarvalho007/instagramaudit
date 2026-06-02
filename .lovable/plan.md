
# Smoke test pré-Publish — AuditProfiles beta

Execução read-only (sem alterar código). Vai gerar 1 análise real Apify
para `frederico.m.carvalho` (~$0.0093) e 1 lead/sessão de teste na DB.

## Sequência

1. **Sessão fresca, mobile 390×844**
   - Browser limpo, `/`
   - Screenshot homepage; confirmar trust copy sem "sem registo"
   - Listar network: confirmar 0 chamadas a `/api/analyze-public-v1`
   - Submeter `frederico.m.carvalho`; confirmar abertura do modal de onboarding

2. **Onboarding 3 passos**
   - Intro → Step 1 (nome/email) → Step 2 → Step 3 (telefone opcional + GDPR)
   - Capturar request `/api/onboarding/start`:
     - status 200
     - payload com `gdpr_consent`, `_t` (timestamp), `website` (honeypot)
     - payload **sem** `user_type`
   - Confirmar cookie `lead_session` presente após resposta

3. **Análise**
   - Verificar `/api/analyze-public-v1` chamado **depois** do cookie
   - Confirmar render do relatório
   - Network/console limpo de `ONBOARDING_REQUIRED`, `ONBOARDING_SESSION_LOST`, `INSUFFICIENT_CREDITS`

4. **Credit ledger (DB)**
   - Query `credit_ledger` pelo `lead_id` recém-criado:
     - `initial_grant +2`, `reserve -1`, `confirm 0`, balance = 1
   - F5 no relatório, repetir query: sem nova linha `reserve`

5. **Mobile visual 360×800 + 390×844**
   - Screenshot Step 3 (sem overflow horizontal, CTA visível, telefone como opcional)
   - Screenshot relatório (header legível, period selector sem overflow)

6. **CTAs Premium**
   - Click sidebar "Desbloquear relatório completo"
   - Click chip locked no period selector
   - Click sticky unlock bar (se visível)
   - Cada um: mesma modal premium; **não** abre onboarding; **não** dispara Apify/OpenAI (verificar network)
   - Verificar `product_events` para `premium_cta_clicked`

7. **Tracking / admin**
   - Query `product_events` últimos 10 min: `onboarding_step_view`, `onboarding_step_complete`, `onboarding_success`, `premium_cta_clicked`
   - Abrir `/admin/sistema` e confirmar funil onboarding mostra os eventos

## Output

Veredicto **READY / READY WITH MINOR FIXES / BLOCKED** + tabelas:
- request sequence
- credit ledger
- mobile visual
- premium CTAs
- riscos remanescentes

Sem code edits seja qual for o resultado — bugs detectados ficam como
recomendações para o próximo prompt.
