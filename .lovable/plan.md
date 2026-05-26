## Diagnóstico

### a) Caixa de feedback aparece "por cima" do Bloco 2

Em `src/components/report-redesign/v2/report-shell-v2.tsx` (linhas 232-242 e 325-335), o `<BlockFeedback block="overview" />` está renderizado **dentro** do `ReportBlockSection` do **Bloco 2 — Diagnóstico Editorial**, como primeiro filho. Como o `ReportBlockSection` já renderiza o cabeçalho (`02 · DIAGNÓSTICO EDITORIAL · O que explica estes resultados?`) acima dos children, a caixa de feedback acaba a aparecer sob o título do Bloco 2 — visualmente "colada por cima" do Bloco 2, embora seja feedback sobre o Bloco 1.

O resultado na captura: o utilizador vê a caixa de feedback no espaço do Bloco 2, sem perceber que se refere ao Bloco 1.

### b) CTA "Escolher 1 relatório" / "Escolher pack de 5" não abre nada

A captura é do `PremiumInterestDialog` (`src/components/report-redesign/v2/premium-interest-dialog.tsx`, linhas 40-58). O `handleSelect` apenas:
- guarda `selected` em estado local;
- dispara `trackEvent`;
- fecha o dialog se for `free`;
- para `single_report` / `pack_5_reports` **não acontece nada visualmente** — o utilizador clica e o dialog continua igual, sem confirmação, sem modal de interesse, sem feedback.

Existe já um componente pronto (`PricingInterestModal` em `src/components/pricing/pricing-interest-modal.tsx`) que recolhe interesse (would_pay, fairness, email, comentário) e dá feedback de sucesso, e que é usado por `pricing-page.tsx`. O `PremiumInterestDialog` nunca foi ligado a ele.

## Objectivo

1. Tirar a caixa de feedback de dentro do Bloco 2 e posicioná-la associada ao Bloco 1 (sem mudar a lógica de `block="overview"` nem o endpoint).
2. Garantir que clicar em "Escolher 1 relatório" ou "Escolher pack de 5" abre o `PricingInterestModal` (mesmo fluxo da página `/precos`), em vez de não acontecer nada.

Sem tocar em Apify, DFS, IA, gates, autenticação, leads, report_requests, pricing copy ou estrutura do report.

## Alterações propostas

### 1. `src/components/report-redesign/v2/report-shell-v2.tsx`
- **Caso gated** (linha 232-242): mover o `<BlockFeedback …/>` para FORA do `ReportBlockSection` do `diagnostico`, colocando-o entre o final do `ReportOverviewBlock` (Bloco 1) e o início do `ReportBlockSection` do diagnostico. Mantém-se `block="overview"`.
- **Caso não-gated** (linha 325-335): aplicar a mesma reorganização — mover `<BlockFeedback />` para fora do `ReportBlockSection` do diagnostico, posicionando-o depois do `ReportOverviewBlock` correspondente.
- Ajustar `className` da caixa para garantir margem visual clara (`mt-6 md:mt-8 mb-2`) entre Bloco 1 e Bloco 2, para que se perceba que pertence ao Bloco 1.

### 2. `src/components/report-redesign/v2/premium-interest-dialog.tsx`
- Importar `PricingInterestModal` e `PricingInterestOption` de `@/components/pricing/pricing-interest-modal`.
- Adicionar estado local: `const [interestOption, setInterestOption] = useState<...>(null)` e `const [interestOpen, setInterestOpen] = useState(false)`.
- No `handleSelect`, para `single_report` / `pack_5_reports`:
  - manter o `trackEvent` actual (intenção é preservar analytics);
  - fechar o `PremiumInterestDialog` (`onOpenChange(false)`) antes de abrir o modal de interesse — evita problema de dialog-dentro-de-dialog do Radix (focus trap, z-index, scroll lock duplo);
  - usar `setTimeout(..., 200)` para abrir o `PricingInterestModal` após a animação de saída do primeiro dialog.
- Renderizar `<PricingInterestModal>` como irmão do `<Dialog>` actual (ambos a nível do componente), com `planLabel` / `planPrice` derivados das mesmas chaves i18n já usadas (`premium.dialog.single.title|price`, `premium.dialog.pack.title|price`).

### 3. Verificação
- Visual no preview:
  - Bloco 1 termina → caixa de feedback (com bordura, claramente associada a "este bloco") → divisor visual → Bloco 2 `02 · DIAGNÓSTICO EDITORIAL` começa limpo.
  - Clicar em "Escolher 1 relatório" / "Escolher pack de 5" no `PremiumInterestDialog` (acessível a partir do `report-block-nav` e `premium-callout`) fecha esse dialog e abre o `PricingInterestModal` com a label/preço corretos; submeter mostra success state.
- `bunx vitest run` para garantir nenhum teste partido (não há testes dedicados a estes componentes, mas correr a suite por segurança).

## Ficheiros tocados

- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/premium-interest-dialog.tsx`

## Fora de scope

- Não mexer em `BlockFeedback` (lógica de submit, endpoints, storage local de "já enviei").
- Não mexer em `PricingInterestModal` (já funciona em `/precos`).
- Não alterar copy/i18n dos preços, badges ou bullets.
- Não alterar o endpoint `/api/public/pricing-interest`.
- Não tocar em `pricing-page.tsx`.

## Checkpoint

- ☐ Mover `<BlockFeedback />` para fora do `ReportBlockSection` do Bloco 2 (gated + não-gated).
- ☐ Ligar CTAs do `PremiumInterestDialog` ao `PricingInterestModal` com fecho-e-abre sequencial.
- ☐ Validar visualmente no preview: feedback associado ao Bloco 1; modal abre ao clicar nos planos.
- ☐ Correr `bunx vitest run`.
