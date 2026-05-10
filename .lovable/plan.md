## Objetivo

Substituir o copy dos 7 templates de email beta pelo novo conjunto fornecido, mudando voz para "equipa InstaBench" (em vez de assinatura pessoal "Frederico"), removendo referências a revisão manual e P.S., e alinhando subjects/preheaders/CTAs.

## Decisão de assinatura

`[NOME]` no copy fornecido = `InstaBench` (constante `BRAND` em `src/lib/email/shared.ts`). Assinatura passa de `Frederico — InstaBench` para `equipa InstaBench`.

## Alterações por ficheiro

### 1. `src/lib/email/shared.ts`
- `signatureText()` → `["Até já,", "— equipa InstaBench"]` (variante neutra; alguns templates usam "Boa leitura," / "Obrigado pela ajuda," — esses passam a inline em vez de usar o helper).
- `signatureHtml()` → versão HTML equivalente.
- Manter `SIGNATURE_NAME` mas deixar de o usar nos novos textos (ou remover se nenhum template o referenciar após reescrita).
- Não mexer em `wrapHtml`, `p`, `pMuted`, `renderButtonHtml`, `renderUrlFallbackHtml`, `escapeHtml`.

### 2. `src/lib/email/templates/request-received.ts`
- SUBJECT: `Recebemos o teu pedido para @{handle}` (interpolar handle; fallback "o teu perfil").
- PREHEADER: `A análise está a ser preparada — recebes o relatório por email.`
- HEADLINE: `Pedido recebido` (manter).
- Body novo (3 parágrafos): confirmação + nota beta + aviso de pedido de feedback futuro.
- Sign-off inline: `Até já, — equipa InstaBench`.
- Remover qualquer menção a "revisto manualmente" / "horas ou um dia útil".

### 3. `src/lib/email/templates/report-ready.ts`
- SUBJECT: `O teu relatório de @{handle} está disponível`.
- PREHEADER: `Análise completa, com leitura editorial dos dados públicos.`
- HEADLINE: `Relatório pronto`.
- Body: intro + botão `Abrir relatório` (já existe `renderButtonHtml`) + URL fallback + parágrafo "leitura editorial" + bullets beta (pontas soltas / vai melhorar) + nota de feedback futuro.
- Sign-off: `Boa leitura, — equipa InstaBench`.

### 4. `src/lib/email/templates/feedback-request.ts`
- SUBJECT: `O relatório de @{handle} foi útil?`
- PREHEADER: `Duas ou três frases chegam — ajuda-nos a melhorar.`
- HEADLINE: `Pedido de feedback` (ou manter atual).
- Body: agradecimento + pedido de 2 min + botão `Dar feedback` (`{feedbackUrl}`) + descrição "três perguntas, três frases curtas" + link opcional para rever relatório.
- Sign-off: `Obrigado pela ajuda, — equipa InstaBench`.

### 5. `src/lib/email/templates/personal-area-saved.ts`
- SUBJECT: `O relatório foi guardado na tua área pessoal`.
- PREHEADER: `Acede sempre que precisares.`
- HEADLINE: `Área pessoal guardada`.
- Body: confirmação + botão `Abrir área pessoal` (`{appUrl}`) + URL fallback + nota beta (gratuito, sem prazo, condições de utilizador inicial).
- Verificar se `PersonalAreaSavedInput` já aceita `appUrl`; caso contrário, adicionar campo opcional (sem mexer em call sites — usam fallback).
- Sign-off: `Até já, — equipa InstaBench`.

### 6. `src/lib/email/templates/welcome-beta.ts`
- SUBJECT: `Bem-vindo à beta — o que esperar daqui`.
- PREHEADER: `O que está aberto, o que é premium e como ajudar a melhorar.`
- HEADLINE: `Bem-vindo à beta`.
- Body: agradecimento + parágrafo descritivo do produto + parágrafo de origem (Frederico Carvalho, em terceira pessoa) + lista do que esperar (3 grátis / 3 premium / só Instagram / interface muda) + convite a responder por email.
- Sign-off: `Bom trabalho, — equipa InstaBench`.

### 7. `src/lib/email/templates/report-summary.ts`
- SUBJECT: `Resumo da análise de @{handle}`.
- PREHEADER: `As 3 conclusões principais em 60 segundos.`
- HEADLINE: `Resumo do relatório`.
- Body: intro + lista numerada `{insight1}`/`{insight2}`/`{insight3}` (já existem na interface — confirmar) + botão `Ver relatório completo` + parágrafo de fecho.
- Sign-off: `— equipa InstaBench`.

### 8. `src/lib/email/templates/commercial-followup.ts`
- SUBJECT: `Próximos passos para o relatório completo`.
- PREHEADER: `Acesso vitalício, bundle de 5 análises e condições para docentes.`
- HEADLINE: `Próximos passos`.
- Body: agradecimento + duas opções (esta análise €3+IVA / bundle €13+IVA) + botão `Desbloquear` (`{checkoutUrl}`) + nota uso académico.
- Verificar se `CommercialFollowupInput` aceita `checkoutUrl`; adicionar se faltar.
- Sign-off: `— equipa InstaBench`.

## Out of scope

- Não alterar wiring/triggers (quando cada email é enviado).
- Não alterar `email-template-registry.ts` (preview deteta automaticamente; subjects/preheaders novos aparecem no `/admin/email-lab`).
- Não alterar testes; se algum snapshot/asserção falhar por copy, atualizar apenas a string esperada.
- Não tocar em ficheiros `*.server.ts` (sender, build-report-summary-data) salvo se um campo novo de input não tiver fallback razoável.

## Verificação final

- `code--exec` para confirmar que todos os 7 ficheiros compilam (build automático do harness).
- Abrir `/admin/email-lab` mentalmente: cada template deve mostrar novo subject/preheader e preview correto.
- Garantir que nenhum template mantém "Frederico" como assinatura (`rg "Frederico" src/lib/email/templates`).
