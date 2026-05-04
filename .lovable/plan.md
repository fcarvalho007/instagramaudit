
## Copy Audit & Fixes

The report currently uses "O teu perfil" and "O teu escalão" — implying it's the viewer's own profile. Since the tool analyzes any profile (including competitors), all copy must be neutral/3rd-person.

### Changes by file

---

### 1. `src/components/report-redesign/v2/report-overview-engagement.tsx`

**Line 66** — Column 1 eyebrow:
- Current: `O teu perfil`
- New: `Taxa de engagement deste perfil`

**Line 77** — Column 1 subtitle:
- Current: `envolvimento médio`
- New: `média de gostos, comentários e partilhas a dividir por seguidores`

**Line 83** — Column 2 eyebrow:
- Current: `Referência do escalão`
- New: `% Média de perfis semelhantes`

**Line 95** — Column 2 subtitle:
- Current: `tier {activeTier?.tierLabel ?? "—"}`
- New: `Escalão de {tierRange}` (extract follower range from tierLabel)

**Lines 105, 132-133** — Column 3 eyebrow + gap label:
- Current: `Gap face à referência` + `acima/abaixo da média`
- New: `Diferença percentual: Perfil VS Média perfis` + keep `acima/abaixo da média` + add `gap ~{fmtPpSigned(gapPp)} pontos percentuais`

---

### 2. `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

**Line 64** — Chart header:
- Current: `Comparação entre escalões de seguidores`
- New: `Comparação de perfis com escalões de seguidores semelhantes`

**Lines 117-118** — Active tier badge:
- Current: `O teu escalão`
- New: `Escalão deste perfil`

**Line 217** — Legend:
- Current: `O teu escalão`
- New: `Escalão deste perfil`

---

### 3. `src/components/report-redesign/v2/report-overview-cards.tsx`

**Line 209** — Card title:
- Current: `Taxa de envolvimento`
- New: `Taxa de engagement deste perfil`

**Line 269** — Comparison eyebrow:
- Current: `Atual`
- New: `Este perfil`

**Line 275** — Benchmark eyebrow:
- Current: `Referência do escalão`
- New: `% Média de perfis semelhantes`

---

### 4. Global scan — any remaining "teu" / possessive

Run `rg "O teu|o teu|do teu" src/components/report-redesign/` to catch any other occurrences and replace with neutral forms.

---

### Validation

- `tsc` — zero errors
- Visual check at `/analyze/frederico.m.carvalho` to verify labels render correctly
- No truncation on mobile (375px)
