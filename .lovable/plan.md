## Blocos a remover do final dos relatórios

Identifiquei os blocos exatos que aparecem nas capturas:

1. **"Fonte do benchmark · Dataset v1.0…"** + **"Como ler os cartões"** (Dados / Auto / Mercado / IA)
   → vivem em `src/components/report-redesign/report-methodology.tsx`, linhas 87–102 e 104–121.

2. **"Comparação direta com concorrentes"** (com botão `Adicionar concorrente · Pro`)
   → mesmo ficheiro, linhas 188–224.

3. **"Próximo nível — O que muda no relatório completo"** (cartão com bullets + `Saber mais →`)
   → componente `ReportTierTeaser` (`src/components/report-redesign/report-tier-teaser.tsx`), renderizado em ambos os shells:
   - `src/components/report-redesign/report-shell.tsx` (linha 180)
   - `src/components/report-redesign/v2/report-shell-v2.tsx` (linha 243)

## O que vai mudar

- `report-methodology.tsx`: apagar os três `<div>` correspondentes a (1) Fonte do benchmark, (2) Como ler os cartões e (3) Comparação direta com concorrentes. Remover imports `Users` e `ReportSourceLabel` se ficarem sem uso.
- `report-shell.tsx` e `report-shell-v2.tsx`: remover `<ReportTierTeaser />` da árvore e o respetivo `import`.
- Não tocar em `TierComparisonBlock` (é um bloco diferente, não aparece nas capturas).
- Não tocar no resto da metodologia que **fica**: o grid das 4 fontes (Recolha automática / Referência de mercado / Leitura editorial / Sinais de pesquisa) e a lista "Fontes de referência" com o aviso sobre Databox.
- Sem alterações no servidor, dados ou tokens de design.

## Checkpoint final

☐ Bloco "Fonte do benchmark" removido.
☐ Bloco "Como ler os cartões" removido.
☐ Bloco "Comparação direta com concorrentes" removido.
☐ Cartão "Próximo nível — O que muda no relatório completo" removido em ambos os shells.
☐ Sem imports órfãos nem warnings.
☐ Restante metodologia (4 fontes + Fontes de referência) mantém-se intacta.