## Resumo
Corrige 3 inconsistências de copy no fluxo onboarding-first antes do Publish. Apenas alterações de texto; nenhuma lógica de backend, rota ou schema é modificada.

## Detalhes

### 1. Homepage trust copy (`landing.json` PT + EN)
Atualmente os 3 micro-proof points dizem:
- PT: "Análise em 30 segundos" / "Conta grátis em 1 min" / "RGPD compliant"
- EN: "Analysis in 30 seconds" / "Free account in 1 min" / "GDPR compliant"

Substituir por (compacto, sem nova secção):
- PT: `microProof.fast` → "CONTA GRATUITA", `microProof.noSignup` → "2 RELATÓRIOS GRÁTIS", `microProof.gdpr` → "RGPD"
- EN: `microProof.fast` → "FREE ACCOUNT", `microProof.noSignup` → "2 FREE REPORTS", `microProof.gdpr` → "GDPR"

### 2. Phone field — onboarding Step 3 (`gate.json` PT + EN + hint no modal)
O label já mostra "Telemóvel — opcional" (sem asterisco obrigatório). Atualizar apenas a hint:
- PT `onboarding.steps.3.phoneHint`: "Opcional · ajuda-nos a confirmar o acesso em casos excepcionais."
- EN `onboarding.steps.3.phoneHint`: "Optional · helps us confirm access in exceptional cases."

### 3. Step 4 subtitle (`gate.json` PT + EN, chave `unlock.step4.subtitle`)
A cópia legada `unlock.step4.subtitle` diz "Última pergunta" / "Last question", mas existe `unlock.step5` a seguir — contradição. A `unlock-modal.tsx` ainda consome esta chave.
- PT: "Quase terminado"
- EN: "Almost done"

### 4. Defensive check
Não foram encontradas ocorrências de "sem registo", "no registration", "sem conta", "no account" no homepage ou onboarding ativo. Apenas `microProof.noSignup` (já tratado no ponto 1) e usos internos de "sem dados" (contexto diferente, não contradiz o modelo).

## Validação
- `bunx tsc --noEmit`
- Correr testes i18n/copy se existirem
- Verificar visual homepage + onboarding Step 3 desktop/mobile

## Ficheiros a alterar
- `src/i18n/locales/pt/landing.json`
- `src/i18n/locales/en/landing.json`
- `src/i18n/locales/pt/gate.json`
- `src/i18n/locales/en/gate.json`

Nenhum ficheiro de backend, provider, relatório ou schema é alterado.