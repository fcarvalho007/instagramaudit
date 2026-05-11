## Bug — cards do Bloco 1 desaparecem após unlock

### Causa

Em `src/components/report-redesign/v2/report-shell-v2.tsx` (linhas 167–180 e 187–288), a lógica de render do Bloco 01 usa três caminhos:

```text
gated = lockBoundary === "engagement" && !unlocked

(A) lockBoundary === "engagement"     → ReportOverviewBlock mode="free"   (só Editorial Identity)
                                       → caso contrário                    → mode="all"

(B) gated === true                     → ReportLockGate { mode="locked" + restantes blocos }
(C) !gated                             → blocos 02–06 normais
```

Quando o utilizador faz **unlock** (`unlocked = true`):
- `lockBoundary` continua `"engagement"` → ramo (A) entra em `mode="free"` (só Editorial Identity).
- `gated` passa a `false` → ramo (B) deixa de renderizar.
- Resultado: **Engagement, Frequência, Formato e Best vs Worst Posts (mode="locked") nunca voltam a aparecer**. Os blocos 02–06 aparecem normalmente.

Os componentes `FrequencyCard`, `FormatCard`, `EngagementCardRefined` e `PostComparisonBlock` continuam vivos em `report-overview-block.tsx` — não foram removidos. Só não estão a ser pedidos.

### Correcção (1 ficheiro, 1 condição)

`src/components/report-redesign/v2/report-shell-v2.tsx`:

Trocar o ternário do bloco 01 (linhas 167–180) para considerar também `unlocked`:

```text
mode = lockBoundary === "engagement" && !unlocked  ? "free" : "all"
```

Assim:
- **Locked** (`!unlocked`) → `mode="free"` (só Editorial Identity acima do gate); o resto continua dentro do `ReportLockGate` com `mode="locked"`. Nada muda.
- **Unlocked** → `mode="all"` no bloco 01 → reaparecem Engagement, Frequência, Formato e Best vs Worst Posts.
- **Sem lockBoundary** → `mode="all"` (comportamento já correcto, preservado).

### Fora de scope

- Não alterar `ReportOverviewBlock`, `FrequencyCard`, `FormatCard`, nem `PostComparisonBlock`.
- Não tocar em `lockBoundary` nem na lógica de `gated`.
- Não tocar em rotas, schema, eventos ou tracking.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em `/analyze/<handle>`:
  - Antes do unlock: Editorial Identity visível, restante encoberto pelo lock gate (sem alterações).
  - Após unlock: voltam a aparecer Engagement, **Frequência**, **Formato** e Best vs Worst Posts dentro do Bloco 01, e os blocos 02–06 continuam visíveis.

### Entrega

- Ficheiro alterado: `src/components/report-redesign/v2/report-shell-v2.tsx`.
- Resultado de tsc + vitest.