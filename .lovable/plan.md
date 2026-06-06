## Objetivo
Corrigir `/admin/report-lab` e `/admin/report-preview` para que as variantes internas voltem a mostrar os cards/blocos completos já existentes.

## Correção proposta
1. Em `/admin/report-lab`, calcular quando a variante é interna:
   - `internal_lab`
   - `pro_preview`

2. Passar esse estado para `ReportShellV2`:
   - `premiumUnlocked={true}` para `internal_lab` e `pro_preview`
   - `unlocked={true}` para `internal_lab` e `pro_preview`
   - manter `false` para `public_mvp`

3. Aplicar a mesma regra em `/admin/report-preview/$username`, para que o preview fullscreen não continue preso à versão pública.

4. Aplicar também em `/admin/report-preview/snapshot/$snapshotId`, que hoje força `internal_lab` mas não desbloqueia os blocos premium.

## Resultado esperado
- `public_mvp`: continua igual à versão pública, com gate/CTA.
- `internal_lab`: mostra os blocos 01–06 completos para revisão interna.
- `pro_preview`: mostra os blocos 01–06 como pré-visualização Pro.

## Ficheiros a alterar
- `src/routes/admin.report-lab.tsx`
- `src/routes/admin.report-preview.$username.tsx`
- `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`

## Fora do escopo
- Não vou redesenhar cards nesta correção.
- Não vou alterar dados, base de dados, snapshots, pagamentos ou email gates.
- Não vou tocar em `/report.example`.