# Simplificar emails do registo — só o "relatório guardado" + contexto da plataforma

## O que está mesmo a acontecer hoje

Investiguei o fluxo real (não o que o painel `/admin/automacoes` sugere). Quem se regista pelo modal de onboarding recebe **no máximo dois emails**, dependendo do fluxo:

| Quando | Fluxo Analyze (handle → relatório) | Fluxo Checkout (compra) |
|---|---|---|
| Submete email no modal | **OTP do Supabase** (código de 6 dígitos) | **OTP do Supabase** |
| Confirma o código | — (sem email) | — (sem email, segue para pagamento) |
| Relatório fica guardado | **`report_saved`** ("O relatório de @handle ficou guardado") via `sendLeadMagnetSequence` | — (não há relatório nesta etapa) |

O **"Pedido recebido"** (`request_received`) que aparece em destaque no admin **não dispara no registo**. Só é enviado pelo formulário beta antigo (`submitBetaRequest`, `src/lib/beta.functions.ts:217`) — ficou no admin como "ativo" mas no fluxo real está sem trigger.

Portanto: **já não há email de "Pedido recebido" a chegar aos novos utilizadores.** O que tu queres ("receber apenas o report_saved com contexto da plataforma") já é quase a realidade — falta limpar o que confunde no admin e enriquecer o `report_saved` com o pequeno bloco de contexto.

## Mudanças propostas

### 1. Admin `/admin/automacoes` — refletir a verdade
- Mover o bloco **"Pedido recebido"** (Ciclo 01) da coluna `TRANSACCIONAL · ATIVO` para `LEGADO · SEM TRIGGER`, com nota "disparado apenas pelo formulário beta antigo; novos registos não recebem este email".
- O sub-bloco "Geração do relatório" (`beta_request_created`) também é legado — já está marcado `BLOQUEADO`, mantém-se mas com nota clara.
- Adicionar 1 cartão novo no Ciclo 01 (Captação) chamado **"Verificação por código"** (OTP do Supabase), `ATIVO · SISTEMA`, evento `onboarding_otp_sent`, para o operador perceber que o único email de registo é o código.
- Garantir que o Ciclo 02 "Relatório guardado" (`report_saved`) aparece como o único email transacional `ENTREGA PRINCIPAL · ATIVO` no fluxo Analyze.

Ficheiro alvo: `src/routes/admin/automacoes.tsx` (ou onde estiver a tabela — vou localizar antes de patchar).

### 2. Template `report_saved` — adicionar contexto da plataforma
O `report_saved` (`src/lib/email/templates/report-saved.ts`) já tem a variante `isWelcome` para new leads (substituiu o `welcome_beta`). Vou:

- Quando `isWelcome === true`, adicionar **um bloco curto e simpático** logo a seguir ao saluto, antes do botão de abrir o relatório:
  - 1 frase do que é a AuditProfiles ("é uma ferramenta de auditoria e benchmark de perfis de Instagram — comparas-te com concorrentes em segundos.").
  - 1 frase sobre o que pode fazer a seguir ("o relatório fica guardado na tua conta e podes analisar outros perfis a qualquer momento.").
  - Sem upsell, sem CTA secundário, sem promessa de "tips e benchmarks" (esse opt-in vive no checkbox de marketing).
- Quando `isWelcome === false` (lead já existente que regerou um relatório), mantém o corpo atual sem o bloco de contexto — não é preciso repetir a explicação a cada relatório.
- Não toco no `subject` nem na estrutura visual (header, CTA, footer); só acrescento o parágrafo de contexto dentro do mesmo `Section` editorial já existente.

### 3. Zero mudanças no envio
Não mexo em `sendLeadMagnetSequence`, `processReportUnlock`, `claim-existing`, `start.ts`, EuPago webhook, nem em nada do checkout. O fluxo já está como o user quer; só o conteúdo de um único template muda e o painel de admin deixa de mentir.

## Ficheiros a alterar

- `src/lib/email/templates/report-saved.ts` — adicionar bloco "o que é a AuditProfiles" condicionado a `isWelcome`.
- `src/routes/admin/automacoes.tsx` (ou o ficheiro que renderiza a página — confirmo na fase de build) — reclassificar "Pedido recebido" como legado, adicionar cartão "Verificação por código".

## Fora do âmbito

- Remover/apagar a server function `submitBetaRequest` ou o template `request-received` (ficheiros legados, sem caller no fluxo público — manter para o histórico).
- Mexer no OTP do Supabase (template de auth nativo, gerido fora do projeto).
- Adicionar sequência de drip / nurturing por email pós-registo (sai do "simplificar mantendo utilidade").
- Refactor das tabelas `email_send_log` / suppression.

## QA manual

1. Registo novo em `/precos` → checkout → confirmar OTP. Caixa de entrada: **só 1 email** (OTP). ✅
2. Registo novo em `/analyze/<handle>` → confirmar OTP → relatório gerado. Caixa de entrada: **2 emails** (OTP + `report_saved` com bloco de contexto novo). ✅
3. Lead existente faz novo unlock: recebe `report_saved` **sem** o bloco de contexto (não é "welcome"). ✅
4. Abrir `/admin/automacoes`: "Pedido recebido" aparece como `LEGADO · SEM TRIGGER`; "Verificação por código" aparece no Ciclo 01 como `ATIVO`; "Relatório guardado" é o único `ENTREGA PRINCIPAL · ATIVO` no Ciclo 02.
