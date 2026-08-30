# Ronda 5.5 — Validação E2E passwordless e retorno ao relatório

Ronda de validação. O relatório não é redesenhado. Só se corrigem defeitos funcionais, de segurança ou copy enganadora encontrados durante os testes.

## Como vai ser validado

Percurso real no preview, com Playwright, em contextos de browser separados (um para a auditoria, outro "limpo" para abrir o magic link), mais consultas à base de dados para provar o estado (leads, `lead_reports`, `email_access_tokens`, `credit_ledger`, `auth.users`, `product_events`). Emails são verificados pelo registo de envio, não por caixa de entrada.

Cenários 1–15 do pedido, cada um com PASS/FAIL, evidência e correcção associada quando falhar.

## Defeitos já identificados na leitura de código (a confirmar em execução)

1. **Scanner de email invalida o link.** Em `src/routes/api/public/verify-email.ts`, o `GET` consome o `jti` em `email_access_tokens`. Um prefetch automático de scanner queima o link e a pessoa recebe "Link já utilizado". Exigência do pedido: o GET não pode inutilizar o link.
   Correcção prevista: o GET deixa de consumir; passa a emitir uma página de confirmação humana (`Confirmar acesso`) que faz o POST, e é o POST que consome o `jti` e emite `lead_session`. Bots que só fazem GET não gastam nada.

2. **Logout não limpa `lead_session`.** `app-topbar.tsx` e `app-sidebar.tsx` chamam apenas `supabase.auth.signOut()`. Um lead passwordless continua com sessão activa depois de "sair".
   Correcção prevista: o logout invoca também o encerramento de sessão de lead já existente em `src/lib/rpc/lead-session.functions.ts` e só depois redirecciona.

Ambas as correcções são pequenas e ficam dentro do âmbito de "defeito funcional/segurança".

## Pontos a decidir apenas se os testes falharem

- **Email mal escrito / "Alterar email"** (cenário 8): se não existir hoje um caminho seguro, a ronda documenta o gap e propõe a regra — corrigir antes da verificação nunca promove nem funde leads; se o novo endereço já existir, o acesso só é concedido pelo magic link desse endereço.
- **Email já existente** (cenário 7): confirmar que a resposta é indistinguível e que o histórico só aparece depois da verificação.
- **Sessões concorrentes** (cenário 11): confirmar precedência `auth` > `lead` > `report_capture_session`, sem mistura de identidades.
- **Créditos** (cenário 12): primeira verificação no máximo +2, replay +0, baseline e Comment Intelligence a zero consumo.
- **Analytics** (cenário 13): sequência real dos eventos, sem token, email ou IP em claro e sem duplicados.

## Entrega

- Tabela `Cenário | PASS/FAIL | Evidência | Bug/correcção` para os 15 cenários.
- Emails enviados, `auth.users` criados (esperado 0), sessões emitidas, créditos antes/depois, relatórios visíveis na área privada, eventos de analytics, screenshots a 375 e 390 px, riscos residuais.
- Confirmação de `PUBLIC_BASELINE_NO_EMAIL=true` e de que a baseline anónima e identificada continuam gratuitas.
- `READY FOR REPORT UX ROUND 6A` apenas se o retorno cross-browser ao relatório exacto, sem password, ficar realmente provado.

## Ficheiros que podem ser alterados

- `src/routes/api/public/verify-email.ts` (confirmação humana antes do consumo)
- `src/components/app/app-topbar.tsx`, `src/components/app/app-sidebar.tsx` (logout completo)
- Copy PT/EN dos estados de link expirado/inválido, se a validação mostrar texto enganador
- Testes novos para consumo apenas no POST e para logout de lead

## Riscos

- Corrigir o consumo one-time acrescenta um clique ao fluxo; é o custo de sobreviver a scanners de email.
- O rate limiting continua por isolate, não global — fica registado como risco residual.
- Tokens antigos sem `jti` continuam reutilizáveis por compatibilidade.
