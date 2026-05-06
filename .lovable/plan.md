
# Refine P04 — Diagnóstico de Legendas

## File to edit

`src/components/report-redesign/v2/caption-diagnostics-card.tsx` — single file, ~1171 lines.

No backend, migration, or other file changes needed.

## Current state (5 sections: A-E)

- **A** · Sobre o que fala (themes)
- **B** · Expressões recorrentes + comment engagement
- **C** · Como escreve (openings/endings/length)
- **D** · Diagnóstico editorial (AI synthesis + 3 columns)
- **E** · Quality cards (hook/voice/formulaic)

## Target state (3 sections: A-B-C)

### A · SOBRE O QUE FALA (themes — keep as-is with fixes)

Changes:
1. Replace fallback `"Evidência não disponível no payload atual."` with `"Evidência detalhada em desenvolvimento."` (line 482).
2. In `EvidenceRow`: if `thumbnail_url` is falsy or empty, skip the `<img>` entirely (already conditional, but also guard against empty string).
3. No structural changes to theme cards.

### B · COMO ESCREVE (merge current B + C sections)

Merge "Expressões recorrentes" + "Comment engagement" + "Writing patterns" (openings/endings/length) into one section under letter **B**.

Changes:
1. Section header: `B · COMO ESCREVE` with badge showing pattern count.
2. Sub-sections in order:
   - Opening patterns ("Como começam")
   - Ending patterns ("Como acabam")
   - Length distribution
   - Expressões recorrentes (expandable cards, moved from old Section B)
   - Comment engagement ("Pede comentários nos posts?")
3. Replace expression fallback text `"Evidência não disponível no payload atual."` (line 609) with `"Evidência detalhada em desenvolvimento."`.
4. CSV download button: already implemented and functional — keep as-is.

### C · LEITURA EDITORIAL (merge current D + E)

Merge AI synthesis + quality cards into one section.

Changes:
1. Section header: rename from `"DIAGNÓSTICO EDITORIAL"` to `"LEITURA EDITORIAL"`.
2. Replace diagnostic column labels:
   - `"FUNCIONA"` → `"Padrão forte"`
   - `"PONTO CRÍTICO"` → `"Risco editorial"`
   - `"A OBSERVAR"` → `"Sinal a acompanhar"`
3. Quality cards (hook/voice/formulaic) move inside this section, below the 3-column grid.
4. Neutralize tone in `buildDiagnosticStatement`, `buildWhatWorks`, `buildCriticalPoint`, `buildToWatch`:
   - Replace prescriptive phrasing ("pode limitar", "favorece") with observational phrasing ("o padrão sugere", "o perfil tende a")
   - Remove direct advice ("definir uma intenção", "convém")
5. SemanticPill labels stay descriptive (already neutral).

## Evidence matching

Already implemented via `matchPostsByTheme` and `matchPostsByTerms` — no changes needed. CSV export via `downloadEvidenceCsv` is fully functional.

## Thumbnail handling

`EvidenceRow` already conditionally renders `<img>` only when `thumbnail_url` is truthy. Will add guard for empty string.

## Rendering order in main component

```
<SectionThemes ... />           {/* A */}
<SectionWritingAndExpressions>  {/* B — merged */}
  - writing patterns (openings, endings, length)
  - expressions (expandable)
  - comment engagement
</SectionWritingAndExpressions>
<SectionEditorialReading>       {/* C — merged */}
  - AI synthesis
  - 3-column grid (neutral labels)
  - quality cards
  - footer note
</SectionEditorialReading>
```

## What stays unchanged

- Block header (`CardShell`)
- Evidence matching helpers
- CSV export logic
- Format badges
- All data sources (cached `normalized_payload` only)
- No provider calls, no backend changes
- No changes to other blocks (P01-P03, P05-P07)

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual check on cached profiles
- Confirm no `provider_call_logs` created
