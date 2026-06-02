
# Refazer Step 0 do onboarding + caminho "Já tenho conta"

Implementa o mockup enviado: o IntroStep do `OnboardingModal` fica enxuto e ganha uma porta de regresso para quem já tem conta, sem repetir o questionário de 3 passos.

## Âmbito desta tarefa

- Frontend (modal + i18n): tudo aqui em baixo.
- Backend (lookup por email e geração de link): NÃO se implementa neste prompt — só se prepara o ponto de integração e fica explícito como decisão de produto a fechar a seguir (ver fim do plano).

## 1. IntroStep — versão simplificada

Ficheiro: `src/components/onboarding/onboarding-modal.tsx`, componente `IntroStepBody`.

Manter:
- Eyebrow "ANTES DE COMEÇAR".
- Caixa de contexto azul com o handle (`@{{handle}}`) e a linha dos créditos: "Começas com 2 créditos grátis. Esta usa 1."
- A linha-aviso sobre perfis públicos Creator/Empresa (compactada para 1 linha curta).
- CTA primário.
- Linha-rodapé de confiança.

Remover:
- Subtitle "3 perguntas rápidas (~1 min) e a tua conta fica criada".
- Bloco inteiro "O que recebes grátis" (eyebrow + lista de 3 bullets + nota premium).
- Menção a "Fomentar Sonhos, Lda." na trustLine (operador desaparece).

Alterar:
- Título passa a terminar em "grátis" destacado a verde: usar `<Trans>` com `<free>` envolvido por `<span className="text-emerald-600">`. Texto final: `Cria a tua conta e abre o relatório <free>grátis</free>`.
- CTA primário muda de "Começar" para "Começar grátis →".
- Trust line passa a `RGPD · sem spam` (sem `{{operator}}`), com um pequeno glifo de escudo opcional (`ShieldCheck` size-3) à esquerda.

Adicionar (novo, abaixo do CTA, separado por divisor fino):
- Divisor `border-t border-border-default/50`.
- Linha `Já tens conta? <button>Entrar</button>` — `<button>` é um link discreto que troca a vista interna do modal para o ecrã "Entrar" (variante de regresso, ver §2). Sem navegação de rota.

## 2. Nova vista interna: "Entrar" (cliente que regressa)

Mesmo `OnboardingModal`, sem nova rota. Introduz-se um estado `view: "intro" | "login"` (default `"intro"`). Quando `view === "login"`, em vez de `IntroStepBody`/`FormStepBody` renderiza-se `LoginStepBody`.

Comportamento:
- `step` continua a 0 enquanto se está em `login` (o tracking de `onboarding_step_view` para passo 1 só dispara quando se entra no questionário).
- Tecla Esc / clicar fora fecha o modal normalmente (`handleClose`).
- Tracking novo: `onboarding_login_view` quando entra na variante; `onboarding_login_submit` ao enviar; `onboarding_login_back` se voltar à intro. Eventos não levam email/telefone — só `handle`.

Conteúdo do `LoginStepBody` (corresponde ao segundo cartão do mockup):
- Eyebrow "BEM-VINDO DE VOLTA".
- Título `font-display`: "Entra e abre o relatório".
- Descrição: "Indica o email da tua conta. Vamos analisar `@{{handle}}` com os teus créditos."
- Campo único `email` (com label "Email da conta", placeholder `o-teu@email.pt`, validação básica de formato — usar `z.string().email()` num pequeno schema local).
- CTA primário "Entrar e analisar →" (full-width, mesmo estilo do CTA da intro).
- Hint cinza por baixo: "Enviamos um link de acesso seguro para o teu email."
- Divisor.
- Link discreto: "Ainda não tens conta? Criar conta grátis" → volta a `view = "intro"`.

Estados do submit:
- `loading`: spinner no botão + texto "A enviar link…".
- `success`: substitui o corpo do cartão por uma mensagem curta — "Verifica o teu email — enviámos um link de acesso para `{{emailMascarado}}`." + botão secundário "Voltar".
- `error`: `Alert` por cima do campo com mensagem do servidor (mapeada por código), sem PII.

Integração com o backend (placeholder, ver §4): o handler chama `fetch("/api/onboarding/login", …)` com `{ email, handle }` e `credentials: "include"`. Como o endpoint ainda não existe, isto fica preparado mas atrás de uma flag local `LOGIN_BACKEND_READY = false` — enquanto for `false`, o botão mostra o ecrã de "success" simulado e dispara `onboarding_login_pending_backend`. Isto evita criar uma promessa visível ao utilizador sem suporte real.

## 3. i18n

Ficheiros: `src/i18n/locales/pt/gate.json` e `src/i18n/locales/en/gate.json`.

Em `onboarding.intro`:
- Substituir `title` por "Cria a tua conta e abre o relatório <free>grátis</free>" (e equivalente EN).
- Apagar `subtitle`, `freeBadge`, `freeValueTitle`, `freeValue`, `premiumNote`.
- Reduzir `personalHint` a uma única frase curta.
- `cta` passa a "Começar grátis".
- `trustLine` passa a "RGPD · sem spam" (sem interpolação `{{operator}}`).
- Adicionar `haveAccount` ("Já tens conta?") e `haveAccountCta` ("Entrar").

Novo bloco `onboarding.login`:
- `eyebrow`, `title`, `subtitle` (com `<1>@{{handle}}</1>`), `emailLabel`, `emailPlaceholder`, `cta`, `submitting`, `secureHint`, `noAccount`, `noAccountCta`, `success.title`, `success.body`, `back`, `errors.notFound`, `errors.generic`, `errors.network`.

Remover do código qualquer leitura de `onboarding.intro.subtitle`, `freeValueTitle`, `freeValue`, `premiumNote`, `freeBadge`. Verificar com `rg` antes de fechar.

## 4. Decisão de produto a fechar (NÃO implementar aqui)

Documentar no fim do plano e no PR, sem código: quando o utilizador escreve no passo email (questionário) um endereço que já existe em `leads.email_normalized`, o `/api/onboarding/start` deve:

- Detectar duplicado e devolver `error_code: "ACCOUNT_EXISTS"` com `message` "Esta conta já existe. Queres entrar?" + acção sugerida no cliente para saltar para a vista `login`.
- Não criar segundo registo nem conceder 2 créditos extra.
- Reutiliza o saldo existente do lead (fecha o exploit do "email novo de cada vez").

Endpoint novo a especificar (próximo prompt): `POST /api/onboarding/login` recebe `{ email, handle }`, valida formato, encontra `lead` por `email_normalized`, gera token de acesso curto (assinado), envia email com link `https://…/r/login?token=…`, devolve `{ ok: true }` sem revelar se a conta existe (mesma resposta para email não encontrado, para não permitir enumeração). O endpoint de troca do token emite o `lead_session` cookie e redirecciona para `/analyze/{{handle}}`.

## 5. Testes

- Atualizar / adicionar `src/components/onboarding/__tests__/onboarding-modal.test.tsx`:
  - Intro renderiza novo título com "grátis" destacado.
  - Lista "O que recebes grátis" desapareceu.
  - Clicar "Entrar" troca para `LoginStepBody`.
  - Submeter `LoginStepBody` com email inválido mostra erro sem chamar `fetch`.
  - Submeter com email válido chama `fetch("/api/onboarding/login", …)` com `credentials: "include"`.
  - Clicar "Criar conta grátis" volta à intro.

## 6. Checklist

- ☐ `IntroStepBody` reduzido (sem subtitle, sem lista, sem operador).
- ☐ Título com "grátis" verde via `<Trans>`.
- ☐ CTA "Começar grátis →".
- ☐ Link "Já tens conta? Entrar" abaixo do CTA com divisor.
- ☐ Trust line "RGPD · sem spam" com ícone discreto.
- ☐ Estado interno `view: "intro" | "login"` no modal.
- ☐ Novo `LoginStepBody` com email + CTA + hint + link de regresso.
- ☐ Tracking `onboarding_login_view/submit/back` sem PII.
- ☐ Chamada a `/api/onboarding/login` por trás de flag `LOGIN_BACKEND_READY` (default `false`, com fallback de UI "verifica o teu email").
- ☐ `gate.json` PT e EN atualizados, chaves obsoletas removidas e referências em código eliminadas.
- ☐ Testes do modal verdes.
- ☐ Mobile-first verificado a 360px e 390px (sem overflow horizontal, CTA visível).
- ☐ Nota no PR sobre a decisão pendente do backend (`/api/onboarding/login` + `ACCOUNT_EXISTS`).
