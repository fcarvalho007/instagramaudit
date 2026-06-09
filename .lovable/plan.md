# Melhorias UX/UI do modal de onboarding (checkout e analyze)

Dois problemas a corrigir, isolados ao `OnboardingModal`. Sem mexer em lógica, server functions, i18n estrutural nem fluxo.

## 1. Indicador de passo no topo (em falta)

Hoje os passos do modal (`entry → qualification → final → otp`) não têm nenhum indicador visual de progresso. O utilizador pediu "falta inserir último passo no topo" — referindo-se ao badge "último passo" que existia no `unlock-modal` antigo e que sumiu na nova versão.

**Solução:** novo componente leve `OnboardingStepHeader` renderizado no topo de cada step (dentro de `EntryStepBody`, `QualificationStepBody` e do painel direito de `FinalStepBody`). Mostra:

- 3 pontos/segmentos pequenos (Inter, tokens semânticos) representando: `Email · Contexto · Conta`
- Segmento ativo a cheio (`bg-accent-primary`), passados a `bg-content-primary/40`, futuros `bg-border-default`
- À direita, badge discreto Inter uppercase: `Passo 1 de 3`, `Passo 2 de 3`, ou `Último passo` (no step `final`)
- No OTP não aparece (é confirmação fora do fluxo de 3 passos)

Strings reutilizam as chaves já existentes:
- `onboarding.stepBadgeLast` ("último passo") já existe no gate.json — basta adicionar irmãos `stepBadge` ("Passo {{n}} de {{total}}") e labels curtas `stepLabels.entry/qualification/final` em PT e EN.

Posicionamento:
- `EntryStepBody` e `QualificationStepBody`: acima do `DialogHeader`/eyebrow, com `mb-5`.
- `FinalStepBody`: no topo do painel branco direito (antes do campo "Nome"), para o utilizador perceber que está mesmo no último passo. Não é colocado por cima do painel navy (que já tem o eyebrow "Antes de pagar").

## 2. Botão CTA cortado em desktop/tablet/mobile

Na screenshot, "Gerar o meu relatório" aparece cortado à direita. Causa: no `FinalStepBody`, o submit button usa `w-full sm:flex-1` com `size="lg"` e a label inclui ícone + seta `→`. Em larguras intermédias (tablet, lg ~1024) o `flex-1` partilha espaço com o botão "Voltar" (`sm:w-auto`) e o ícone `Sparkles`/`Lock` + label "Gerar o meu relatório  →" estoura.

**Solução (apenas presentational, no `FinalStepBody`):**
- Adicionar `min-w-0` ao container de botões e a ambos os botões para permitir shrink.
- Trocar `sm:flex-1` por `sm:flex-1 sm:min-w-0` no submit e adicionar `whitespace-nowrap` ao label envolto em `<span className="truncate">` (assim em viewports apertados encolhe em vez de cortar do contentor).
- Reduzir padding lateral do painel direito de `sm:px-8` para `sm:px-7` para libertar ~8px no eixo crítico.
- Remover a seta `→` dentro de `cta` ("Gerar o meu relatório") — o ícone `Sparkles` à esquerda já comunica acção; a seta extra é o que mais aumenta a largura. Mantém-se a seta no `ctaCheckout` ("Criar conta e continuar") só se couber.
- O mesmo tratamento (`min-w-0` + `truncate` no span) é aplicado ao botão "Continuar" do `QualificationStepBody` por consistência.

Também reduzir `DialogContent` em mobile: já está `w-[calc(100vw-2rem)]`; adicionar `sm:w-[calc(100vw-3rem)]` antes de `sm:max-w-[820px]` para garantir margem visual em tablets estreitos (768–820px) onde o dialog encosta ao limite.

## Ficheiros a alterar

- `src/components/onboarding/onboarding-modal.tsx`
  - Novo componente local `OnboardingStepHeader({ current: 1|2|3 })`.
  - Renderizar no topo de `EntryStepBody`, `QualificationStepBody`, e no painel direito de `FinalStepBody`.
  - Aplicar fix de largura nos botões (Final + Qualification).
  - Ajustar `DialogContent` width.
- `src/i18n/locales/pt/gate.json` e `src/i18n/locales/en/gate.json`
  - Adicionar `onboarding.stepBadge` ("Passo {{n}} de {{total}}" / "Step {{n}} of {{total}}"), `onboarding.stepBadgeLast` já existe, e `onboarding.stepLabels.{entry,qualification,final}`.
  - Remover a seta `→` da string `onboarding.final.right.cta`.

## Fora do âmbito

- `unlock-modal.tsx`, lógica de submissão, validações, server payload, OTP, OAuth, checkout/EuPago.
- Mudança de copy fora do necessário para encurtar o CTA.
- Animação do stepper (mantém-se estático; transição vem do próprio re-render do step).

## QA manual

1. `/precos` → comprar → modal abre no Entry: topo mostra `● ○ ○  Passo 1 de 3`.
2. Avançar com email novo → Qualification: `● ● ○  Passo 2 de 3`, com 2 blocos de cartões.
3. Avançar → Final: `● ● ●  Último passo`, painel navy à esquerda intacto.
4. Botão "Gerar o meu relatório" / "Criar conta e continuar" totalmente visível em 1440px, 1024px, 820px, 768px, 414px, 375px (sem corte à direita).
5. Botão "Voltar" mantém-se à esquerda em sm+ e empilha por baixo em mobile.
6. OTP step continua sem stepper.
7. Modo analyze (a partir do home/análise) também mostra o stepper com as mesmas 3 etapas.
