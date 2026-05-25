## Problema

No hero do relatório (`src/components/report-redesign/v2/report-hero-v2.tsx`), o botão **PDF** mostra a etiqueta `Em breve · Julho 2026` e o tooltip `Funcionalidade em desenvolvimento · lançamento previsto para julho de 2026 no roadmap`. Na prática, o botão:

- não está desativado (só fica desativado se faltar `snapshotId`, o que nunca acontece nesta página),
- ao clicar, chama mesmo `/api/public/public-report-pdf` e abre o PDF assinado.

Ou seja, a promessa "só em julho de 2026" é contraditada por um clique normal. A feature já está pronta — a etiqueta é que está errada.

O botão **Comparar concorrente**, esse, abre apenas o `CompetitorModal` (teaser sem funcionalidade real). Aí a etiqueta `Em breve · Julho 2026` é honesta e fica.

## Alterações

Ficheiro único: `src/components/report-redesign/v2/report-hero-v2.tsx`.

1. **Botão PDF (linhas 131–156)**
   - Remover o atributo `title={t("hero.actions.coming_soon_tooltip")}` (passa a não ter tooltip ou pode ficar com um `title` neutro como `t("hero.actions.pdf")` para acessibilidade).
   - Remover o `<span>` da segunda linha que mostra `Em breve · Julho 2026` (linhas 153–155) e o respetivo wrapper `flex-col`.
   - Manter `disabled={actions.pdfDisabled || actions.pdfBusy}` e o `Loader2` para o estado de loading.
   - Ajustar o layout do botão para uma só linha (remover `flex-col items-center justify-center gap-0.5`, voltar a `inline-flex items-center justify-center gap-2`) para ficar alinhado visualmente com o botão Partilhar ao lado.

2. **Botão Comparar concorrente (linhas 111–128)** — sem alterações. Continua a abrir o `CompetitorModal` (teaser) e a mostrar a badge `Em breve · Julho 2026`, que aí corresponde à realidade.

3. **Chaves i18n** (`src/i18n/locales/{pt,en}/report.json`)
   - Não remover `hero.actions.coming_soon`, `coming_soon_detail`, `coming_soon_tooltip` — continuam a ser usados pelo botão Comparar.

## Validação

- `bunx tsc --noEmit`.
- Verificação visual no preview: o cartão PDF aparece compacto, sem segunda linha, e o clique continua a gerar o PDF (toast de sucesso).

## Fora de âmbito

- Não mexer no fluxo de geração do PDF (`/api/public/public-report-pdf`, `use-report-share-actions.ts`).
- Não alterar o `ReportGateModal` nem o lead magnet.
- Não tocar no botão Comparar concorrente nem no `CompetitorModal`.

## Checkpoint

- ☐ `report-hero-v2.tsx`: remover badge + tooltip do botão PDF e re-alinhar layout.
- ☐ `bunx tsc --noEmit` limpo.
- ☐ QA visual rápido: PDF aparece como ação ativa standard; Comparar continua com badge "Em breve · Julho 2026".
