## Objetivo

1. Remover totalmente o rodapé do report que contém "Próximo nível", "Levar este relatório / Partilhar relatório" e "Feedback beta".
2. Garantir que a sidebar do report fica sempre presente e visível enquanto o utilizador faz scroll dentro do relatório.

---

## Ficheiros afetados

- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/report-diagnostic-cta.tsx` (CTA que aponta para a âncora `#leitura-completa` do bloco a remover)

---

## Alterações

### 1. Remover blocos de fim de relatório

Em `report-shell-v2.tsx`:

- Eliminar a renderização de:
  - `<TierComparisonBlock />` (bloco "Próximo nível · O que muda no relatório completo")
  - `<ReportFinalBlock />` (bloco "Levar este relatório / Partilhar")
  - `<BetaFeedbackBannerV2 />` (faixa "Feedback beta")
- Eliminar a função local `BetaFeedbackBannerV2` (já não usada).
- Eliminar os imports correspondentes:
  - `TierComparisonBlock`
  - `ReportFinalBlock`
  - `BETA_COPY`
- Manter `<ReportMethodology />` (não está incluído no pedido de remoção).
- Manter o spacer mobile `<div class="h-20 lg:hidden" />` (continua útil porque a bottom-tab nav mobile fica fixa).

### 2. Limpar CTA órfão do Bloco 02

`report-diagnostic-cta.tsx` aponta para `href="#leitura-completa"`, âncora que vive dentro do `TierComparisonBlock` removido. Para evitar um link a apontar para nada:

- Remover a renderização do `<ReportDiagnosticCta />` no Bloco 02. Isto é o caminho mais limpo, dado que o objetivo do CTA era enviar para a comparação free vs. PRO que deixa de existir.

Vou identificar o ponto exato de renderização durante a edição (provavelmente em `report-diagnostic-block.tsx`) e remover apenas a chamada + import; o ficheiro `report-diagnostic-cta.tsx` permanece (sem referências) para manter o histórico — pode ser apagado num passo seguinte se preferir.

### 3. Sidebar sempre visível

Verificação do comportamento atual:

- Desktop (`lg:`): `ReportBlockSidebar` já é `sticky top-24` com altura limitada e scroll interno. Permanece visível durante todo o scroll do report. Após remover os blocos de fim, a sidebar passa a acompanhar exatamente a área útil (sem mudança necessária).
- Mobile (`<lg`): existe `ReportBlockTopTabs` como bottom-nav fixa (`fixed bottom-0`), com botão "Menu" que abre o `Sheet` lateral com a lista completa de blocos. Já é persistente.

Não é necessária alteração de layout para a sidebar — após a remoção dos blocos no fundo, a sticky-sidebar mantém-se visível até ao final do conteúdo restante.

---

## Checkpoint

- ☐ Bloco "Próximo nível / relatório completo" removido do report
- ☐ Bloco "Levar este relatório / Partilhar" removido do report
- ☐ Faixa "Feedback beta" removida do report
- ☐ Função `BetaFeedbackBannerV2` e imports não usados apagados em `report-shell-v2.tsx`
- ☐ CTA do Bloco 02 que apontava para `#leitura-completa` deixa de ser renderizado
- ☐ Sidebar desktop continua sticky e visível durante todo o scroll do report
- ☐ Nav mobile (bottom-tabs + drawer) continua sempre visível

---

## Pergunta de confirmação

Quer também que eu remova a navegação mobile (bottom-tabs) e force a sidebar/drawer sempre visível em mobile? Hoje em ecrãs `<lg` a sidebar lateral não aparece — só a barra inferior com ícones e um botão "Menu" que abre o drawer. Se a intenção for ter exatamente o mesmo painel lateral também em mobile, indique e adapto o plano.
