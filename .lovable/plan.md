
## QA Finding: Títulos do Block 1 sem fonte serifada

### Problema

Os dois títulos do card de engagement usam `font-sans` (Inter) em vez de `font-display` (Fraunces), quebrando a regra do projeto: "Fraunces display para headings".

Outros componentes do relatório (hero, diagnostic card, overview cards) já usam `font-display` consistentemente.

### Títulos afetados

1. **"Taxa de envolvimento"** — `report-overview-engagement.tsx` linha 45
2. **"Comparação entre escalões de seguidores"** — `report-engagement-benchmark-chart.tsx` linha 63

### O que NÃO muda

Os eyebrow labels ("O teu perfil", "Referência do escalão", "Gap face à referência") mantêm-se com `.text-eyebrow-sm` (Inter uppercase) — conforme a regra: "Eyebrows/labels/badges = Inter uppercase, nunca font-mono".

### Correções

**Ficheiro 1: `report-overview-engagement.tsx`** (linha 45)

Antes:
```
text-sm font-semibold text-content-primary block
```
Depois:
```
font-display text-sm font-semibold text-content-primary block tracking-tight
```

**Ficheiro 2: `report-engagement-benchmark-chart.tsx`** (linha 63)

Antes:
```
text-eyebrow-sm text-content-secondary
```
Depois:
```
font-display text-[13px] font-semibold text-content-secondary tracking-tight normal-case
```

Nota: Remove `text-eyebrow-sm` deste título porque essa classe aplica uppercase + Inter, e o título de secção deve ser Fraunces sentence-case.

### Correções adicionais do QA anterior (incluídas)

Enquanto editamos estes ficheiros, corrigimos também os 3 problemas "important" do audit:

3. **`text-white` hardcoded** (chart linha 163) — substituir por `text-surface-secondary` (branco semântico no light theme).

4. **Legend swatch mismatch** (chart linha 205) — separar em dois swatches: azul para benchmark, verde para gap.

5. **Tailwind `-translate-y-1/2` redundante** (chart linha 163) — remover da className, o inline `transform` já faz o trabalho.

### Ficheiros tocados

- `src/components/report-redesign/v2/report-overview-engagement.tsx`
- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

Nenhum outro ficheiro.
