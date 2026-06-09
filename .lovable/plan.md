# Bug confirmado: Pro não vê o Bloco 03 (Desempenho)

## O que está a acontecer

Em `src/routes/analyze.$username.tsx` (linha 449) a variant do relatório está **hardcoded** em `"public_mvp"`, independentemente de o utilizador ter desbloqueado o Pro.

Em `src/lib/report/report-variant.ts` (linha 73), para `public_mvp`, `blockPerformance` é `"hidden"`.

Em `src/components/report-redesign/v2/report-shell-v2.tsx` (linha 279), o Bloco 03 só renderiza com:

```
{premiumUnlocked && features.blockPerformance === "full" && ( … )}
```

Resultado: mesmo com `premiumUnlocked = true` (entitlement `report_full_9` confirmado pelo servidor), o Bloco 03 nunca aparece porque `features.blockPerformance === "hidden"` em `public_mvp`. O relatório termina em "07 · Prioridades de acção" — exactamente o sintoma reportado.

Nota lateral: blocos 02 / 04 / 05 / 06 usam `!== "hidden"`, por isso esses sobrevivem ao bug. Apenas o Bloco 03 tem a condição mais estrita `=== "full"`.

## Fix proposto (alteração mínima, sem mexer em UI nem em regras de produto)

1. Em `src/routes/analyze.$username.tsx`:
   - Derivar `effectiveVariant = premiumUnlocked ? "pro_preview" : "public_mvp"`.
   - Passar essa variant tanto para `<ReportShellV2 variant=… />` como para `getPublishedFeatures({ data: { variant: effectiveVariant } })` (refetch quando `premiumUnlocked` muda).
   - Refletir a mesma variant no `metadata` do `trackEvent("report_viewed")`.

2. Não alterar `report-variant.ts` (a matriz por variant continua correcta: `pro_preview` já tem todos os blocos a `"full"`).

3. Não alterar `report-shell-v2.tsx` (condição `=== "full"` do Bloco 03 fica consistente com a matriz uma vez que a variant comute).

## Porque é seguro

- Não muda preços, créditos, conteúdo do relatório nem fluxos de pagamento.
- Não altera UI: o Bloco 03 já existia, só estava a ser suprimido pelo gating errado.
- A decisão de "Pro vê tudo" continua server-side (`getMyReportEntitlement` → `lead_entitlements.report_full_9`). A variant local é apenas o switch de feature flags do shell.
- Free continua exactamente igual: `premiumUnlocked=false` ⇒ `effectiveVariant="public_mvp"`.

## Validação

- Abrir um relatório com lead que tem `report_full_9` activo → confirmar que aparecem os blocos 03 (Desempenho), 04 (Conteúdo), 05 (Procura) e 06 (Comparação) abaixo de "07 · Prioridades de acção".
- Abrir um relatório sem entitlement → confirmar que o gate Premium continua a aparecer como antes (sem blocos 02–06 fora do teaser).
- Verificar `/admin/report-lab?variant=pro_preview` continua a render igual (sem regressão).

## Risco residual

- Se `getPublishedFeatures` para `pro_preview` ainda não tiver overrides publicados, o fallback aplica os defaults de `pro_preview` em `report-variant.ts` — que é o comportamento desejado.
- Não há impacto em SSR/prerender: a lógica corre client-side no `useEffect` já existente.
