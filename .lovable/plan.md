
## Objetivo

Tornar o Bloco 2 puramente diagnóstico — sem sugestões de ação, prioridades ou CTAs. O report deve observar e classificar, não prescrever.

## Alterações

### 1. `report-diagnostic-block.tsx`
- Remover o import e renderização de `ReportDiagnosticPriorities` (linhas 35, 180-198)
- Remover o import e renderização de `ReportDiagnosticCta` (linhas 36, 200)
- Remover o import de `derivePriorities` e a variável `priorities` (linhas 15, 87+)
- Remover a função helper `injectCaptionImprovement` se existir e só servir as prioridades

### 2. `report-diagnostic-card.tsx` (P05 — Audiência)
- Remover a secção Z5 "Funciona / Falha / Próximo" (linhas 774-793) — são recomendações, não diagnóstico

### 3. Ficheiros não alterados
- Block 1, P03, P04, P06, P07 — intocados
- Backend, auth, admin, tokens, locked files — intocados
- Lógica de scoring e dados — intocada (os classificadores continuam a correr, apenas não se renderizam prioridades)

### Validação
- `bunx tsc --noEmit` e `bunx vitest run` sem erros
- Confirmar que nenhum ficheiro locked foi tocado
