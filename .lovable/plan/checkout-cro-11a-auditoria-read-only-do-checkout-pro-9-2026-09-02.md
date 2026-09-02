# Checkout CRO 11A — auditoria read-only do checkout Pro (9€)

Auditoria feita sobre código + validação runtime do URL real de checkout. Nenhum ficheiro de produto foi alterado.

## A. Árvore exacta do checkout actual

```text
CTA Pro (end-of-free-block | sticky-unlock-bar)
  → /checkout/report-full?source&username&report_cache_key&return
    → loader: getLeadSessionStatus()   (cookie lead_session + existência da linha em leads)
      ├─ search.status=success → PostPurchaseSuccessPanel
      ├─ hasLead=false → CheckoutAccountGate → OnboardingModal (purpose="checkout")
      │     modal passo 1: email
      │     modal passo 2: qualificação
      │     modal passo 3: nome completo + password  (AUTH_MODE default = "password")
      │        └─ email já existente → ecrã de login (email + password)
      │     → /api/onboarding/start ou /api/onboarding/claim-existing → cookie lead_session
      │     → invalidate → CheckoutSteps
      └─ hasLead=true → CheckoutSteps
            passo 1  Confirmar desbloqueio: ReportPlanChooser (9€ / pack 5 / pack 10) + ConfirmUnlockCard
            passo 2  Objectivo: ReportPriorityForm, mínimo 1 escolha (bloqueante)
            passo 3  Upsell 97€: aceitar (troca selectedProduct) ou declinar
            passo 4  Facturação: nome, NIF (opc.), morada, CP, localidade, email de factura
            → createEupagoCheckout (server fn) → insere lead_payments pending → EuPago
            → return_path /checkout/report-full?status=success (ou /checkout/authority-diagnosis?status=success)
            → webhook /api/public/eupago-webhook → grantEntitlement / grantReportUnlockPack
```

## B. Percurso Estado B **sem** sessão (percurso comercial principal) — validado em runtime

Facto central confirmado: `/api/public/lead-capture` (ConversionSheet) emite **apenas** `report_capture_session`, com âmbito `(lead, cache_key)` e 24 h. **Nunca** emite `lead_session`. O comentário no ficheiro é explícito: um email não verificado não pode abrir a área privada.

Consequência, confirmada ao abrir `/checkout/report-full?...` sem cookie: aparece `CheckoutAccountGate` com o `OnboardingModal` já aberto e o contador **"PASSO 1 DE 3"**, a pedir de novo o email ("Indica o teu email para associarmos a compra à tua conta").

Portanto, para quem já deu email no relatório:
- existe `lead_session`? **Não.**
- `getLeadSessionStatus()` reconhece-o? **Não** — só lê `lead_session`; ignora `report_capture_session`.
- aparece account gate? **Sim.**
- email pedido outra vez? **Sim.**
- password? **Sim** (AUTH_MODE default `password`: passo 3 do modal cria password; email existente → login com password).
- OTP/magic link? Só em `AUTH_MODE=magic_link` (fallback, não é o default).
- passos extra antes do checkout real: **3** (modal) antes dos **4** passos do checkout.

## C. Percurso Estado B **autenticado** (tem `lead_session`)

Sem gate. 4 passos, 6 campos de facturação, 2 decisões comerciais (plano, upsell), 3 "Continuar" + "Confirmar e pagar".

## D. Account gate — hard vs legacy

O único ponto tecnicamente bloqueante é `createEupagoCheckout`: lê `getLeadFromCookie()`, aborta sem cookie, e insere `lead_payments.lead_id` (FK para `leads`). Tudo o resto depende de `lead_id`, não de conta com password.

- **HARD REQUIREMENT:** existir um `lead_id` verificável no servidor no momento de criar o pagamento (FK de `lead_payments`, ownership do pagamento, idempotência do webhook, `grantEntitlement`/`grantReportUnlockPack`).
- **POST-PURCHASE REQUIREMENT:** sessão global (`lead_session`) para área privada `/app/reports`, histórico e reuso de packs — `getLeadAudits`, `getMyReportEntitlement` via `resolveCurrentLeadId`.
- **LEGACY REQUIREMENT:** password + nome completo + qualificação do `OnboardingModal`. Nada no caminho de pagamento consome password ou nome; o `lead_id` do Estado B já existe em `leads` e já está ligado ao snapshot via `claimAnonymousBaselineReport`. É herança do fluxo antigo de conta.

Nota de segurança: `report_capture_session` é assinado, scoped ao `cache_key` e expira em 24 h — é um identificador tão forte quanto `lead_session` para efeitos de "quem é este lead", mas mais restrito. Não está a ser aceite pelo checkout.

## E. Plan chooser (passo 1)

3 opções (9€ / pack 5 40€ / pack 10 72€), default correcto (`report_full_9`), badge "Melhor valor" no pack 10, ~9 bullets + 3 preços + 3 preços unitários de leitura, seguido de `ConfirmUnlockCard` que repete os 6 benefícios já mostrados no Pro Gate. Reabre uma decisão de preço já tomada e introduz uma opção 8x mais cara imediatamente a seguir ao clique de 9€.
Classificação: **MAKE SECONDARY** (packs como linha discreta "compras mais do que um perfil?" dentro da confirmação), não um passo próprio.

## F. Objectivos (passo 2)

`report_goals` + `report_priority` são gravados apenas em `lead_payments.metadata` (e nos eventos). Não alteram o relatório entregue, nem prioridades, nem enrichment. Bloqueante (`nextDisabled` com 0 escolhas).
Classificação: **MOVE AFTER PAYMENT** — valor comercial real, zero valor no produto entregue, custo de fricção alto no momento errado.

## G. Upsell 97€ (passo 3)

`handleUpsellAccept` faz `setSelectedProduct("authority_diagnosis_97")` — **substitui** o produto. Não é add-on. Consequências factuais:
- o pagamento criado é só de 97€; não há linha de 9€;
- o entitlement concedido pelo webhook é o de `authority_diagnosis_97`; o desbloqueio Pro do relatório depende de o entitlement de 97€ cobrir `report_full_9` — a UI de checkout diz "Relatório completo incluído", mas o desbloqueio não é o mesmo entitlement técnico;
- o `return_path` muda para `/checkout/authority-diagnosis?status=success`, ou seja o comprador **não** volta ao relatório que queria desbloquear;
- se tinha escolhido pack 5/10, a escolha é silenciosamente descartada.

Classificação do bloco: **SHOW ONLY AFTER 9€ SUCCESS**. E marcar como **COMMERCIAL RISK** a ambiguidade "upgrade vs add-on" (copy diz incluído, sistema diz substituição), a verificar em 11B antes de qualquer mexida.

## H. Facturação (passo 4)

| Campo | Obrigatório | Exigência fiscal | Exigência EuPago | Particular | Empresa |
|---|---|---|---|---|---|
| nome/empresa | sim | recibo | não | sim | sim |
| NIF | não | só p/ dedução | não | opcional | sim |
| morada | sim | não p/ consumidor final | não | não | sim |
| código postal | sim (regex PT) | não | não | não | sim |
| localidade | sim | não | não | não | sim |
| email de factura | sim | entrega do recibo | email opcional | já conhecido | sim |

`createEupagoCheckout` recebe `billing` como **opcional** e passa ao provider apenas `customerEmail` (vindo de `leads.email`). Morada/CP/localidade não são enviados a EuPago; ficam em metadata. Ou seja: estamos a exigir facturação completa a um consumidor de 9€ sem exigência técnica nem fiscal comprovada, e o regex de CP exclui compradores fora de PT.

## I. Email de facturação

O servidor já resolve `leads.email` (usado como `customerEmail`). O formulário pede o email do zero, sem pré-preenchimento. Classificação: **AVOIDABLE** (herdar com opção de editar).

## J. Passos / campos / cliques

| Cenário | Ecrãs | Campos | Escolhas obrigatórias | Cliques "continuar" | Carga |
|---|---|---|---|---|---|
| Estado B sem sessão | 3 (modal) + 4 (checkout) = 7 | email + qualificação + nome + password + 6 de facturação = ~10 | plano, objectivo, upsell, qualificação | 6–7 | muito alta |
| Estado B autenticado | 4 | 6 | plano, objectivo, upsell | 4 | alta |

## K. Analytics disponíveis

Existem: `checkout_started`, `checkout_step_view` (1–4), `checkout_step_complete`, `checkout_plan_selected`, `checkout_onboarding_shown`, `checkout_onboarding_completed`, `checkout_upsell_seen/accepted/declined`, `checkout_payment_started`, `checkout_payment_failed`, `payment_checkout_created` (servidor), `post_purchase_view`.
Conclusão: **o funil por etapa já é mensurável** (view vs complete por passo). Falha coberta: não há evento de abandono explícito nem de campo de facturação com erro — mas dá para derivar por diferença. Não são precisos eventos novos para decidir 11B.

## L. Post-purchase

`PostPurchaseSuccessPanel` só depende de `?status=success` — é optimista e não confirma o webhook. O desbloqueio real chega por webhook (`grantEntitlement` / `grantReportUnlockPack`). Se o webhook demorar (Multibanco pode demorar horas), o utilizador vê "Relatório desbloqueado" e ao voltar ao relatório ainda vê o gate. Risco de suporte real, independente de qualquer simplificação.

## M. Hipóteses

- **H1** (ir directo a confirmação/facturação): **SUPPORTED** — o plano já vem determinado pelo CTA e o default é o correcto.
- **H2** (objectivo depois da compra): **SUPPORTED** — não é consumido a jusante.
- **H3** (upsell depois do pagamento): **PARTIALLY SUPPORTED** — a lógica de substituição e o `return_path` divergente reforçam a hipótese, mas não há dados históricos de conversão do upsell nesta posição; medir com os eventos existentes.
- **H4** (conta depois do pagamento): **PARTIALLY SUPPORTED** — o `lead_id` já existe e há cookie assinado (`report_capture_session`); falta apenas o checkout aceitá-lo. Continua **UNSAFE** aceitar checkout totalmente anónimo sem qualquer cookie assinado.
- **H5** (reduzir facturação): **SUPPORTED** para nome + email; **NOT SUPPORTED** remover NIF/morada para quem pede factura com NIF.

## N. Modelo recomendado

**Modelo intermédio.** Identidade mínima (aceitar `report_capture_session` ou `lead_session`; pedir só email a quem não tem nenhum), confirmação de 9€ com packs secundários, facturação enxuta, objectivo e upsell 97€ empurrados para pós-compra. Mantém intactos ownership do pagamento, webhook, `report_cache_key` e entitlements.

## O. Alterações mínimas propostas para 11B

1. `getLeadSessionStatus` e `createEupagoCheckout` passam a aceitar `report_capture_session` como identidade válida (sem promover a sessão global) — elimina os 3 passos de modal no percurso principal.
2. Fundir passo 1: confirmação de 9€ com packs como opção secundária colapsada; `ConfirmUnlockCard` reduzido a prova de confiança, sem repetir os benefícios do Pro Gate.
3. Objectivo: sair do checkout, passar a pergunta única pós-compra (não bloqueante).
4. Upsell 97€: sair do pré-pagamento, mostrar no ecrã de sucesso; e resolver a ambiguidade upgrade/add-on antes de qualquer reposicionamento.
5. Facturação: nome + email pré-preenchido obrigatórios; NIF/morada/CP/localidade atrás de "quero factura com NIF".
6. Sucesso: deixar de afirmar desbloqueio antes da confirmação do webhook; estado "a confirmar pagamento" com poll.
7. Taxonomias (consolidação futura, não em 11B): `PROFILE_RELATIONSHIPS` (owner/manages/client/competitor/research) vs `profile_ownership` do checkout (mine/my_brand/client/competitor) vs `ReportGoal` (4) vs `ReportPriority` (5, legado mapeado). Recomendação: `PROFILE_RELATIONSHIPS` como única taxonomia de relação, `ReportGoal` como única de objectivo, `ReportPriority` mantido só como campo derivado de compatibilidade.

READY FOR CHECKOUT CRO IMPLEMENTATION
