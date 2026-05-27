## Plano corrigido — Acesso ao relatório público: só Visão geral grátis

### Correção obrigatória (pre-lead copy)
A frase pré-lead:
> "Desbloqueia o diagnóstico gratuito antes das secções premium."

está desalinhada com a decisão de produto. Substituir por:

**PT:** "Guarda a tua visão geral antes de veres as opções premium."
**EN:** "Save your overview before viewing the premium options."

### Causa raiz do desalinhamento anterior
O estado `unlocked` (lead-magnet completo) era tratado como **acesso premium** em dois sítios:
1. Sidebar — `diagnostico` marcado como `included`/`accessible` em `public_mvp`
2. Corpo — `gated = !unlocked` expunha blocos 02–06 após lead capture

A correção introduz `premiumUnlocked` (sempre `false` por agora) como gating real do conteúdo; `unlocked` controla apenas UI do lock-gate / sticky bar / CTA.

### Modelo de acesso final (public_mvp)

| Secção | Sidebar | Corpo | Badge |
|---|---|---|---|
| 01 Visão geral | acessível | sempre (modo free→full pós-lead) | GRÁTIS |
| 02 Diagnóstico editorial | locked | só se `premiumUnlocked` | PREMIUM |
| 03 Desempenho | locked | só se `premiumUnlocked` | PREMIUM |
| 04 Conteúdo | locked | só se `premiumUnlocked` | PREMIUM |
| 05 Procura | locked | só se `premiumUnlocked` | PREMIUM |
| 06 Comparação | locked | só se `premiumUnlocked` | PREMIUM |

### Ficheiros a alterar

1. **`src/i18n/locales/pt/report.json`** e **`src/i18n/locales/en/report.json`**
   - `sticky_unlock.body`: 3 → 5 secções premium
   - Remover `badge_included` (chave morta)
   - `nav.access_locked.trust`: nova copy alinhada (sem "diagnóstico gratuito")
   - `lead_magnet.transition/body/cta`: remover "diagnóstico gratuito", passar a "guardar visão geral completa"

2. **`src/components/report-redesign/v2/block-config.ts`**
   - `shortLabel` de "Diagnóstico" → "Diagnóstico editorial"

3. **`src/components/report-redesign/v2/report-block-nav.tsx`**
   - `public_mvp`: só `overview` é `accessible/free`; resto → `premium/locked`
   - Remover ramo `isIncluded` (badge INCLUÍDO + ícone Gift)
   - Remover `hasDiagnostico` + `beta_note`

4. **`src/components/report-redesign/v2/report-shell-v2.tsx`**
   - Adicionar `premiumUnlocked?: boolean` (default `false`)
   - `gated = lockBoundary === "engagement" && !premiumUnlocked`
   - Blocos 02–06: guarda `premiumUnlocked && features.xxx !== "hidden"`

5. **`src/components/report-redesign/v2/sticky-unlock-bar.tsx`**
   - Atualizar defaultValue para "5 secções premium por desbloquear"

6. **`src/routes/analyze.$username.tsx`**
   - Passar `premiumUnlocked={false}` ao `ReportShellV2`

7. **`src/i18n/locales/pt/pricing.json`** e **`src/i18n/locales/en/pricing.json`**
   - Remover referências a "diagnóstico gratuito" / "oferta de lançamento"
   - Atualizar steps de "Como funciona o acesso"

### CTA: pré-lead vs pós-lead

| Estado | Botão | Helper |
|---|---|---|
| **Pré-lead** | "Continuar leitura gratuita" | "Guarda a tua visão geral antes de veres as opções premium." |
| **Pós-lead** | "Desbloquear relatório completo" | "Acede ao Diagnóstico editorial e às restantes secções premium." |

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Preview manual: desktop 1460 pré/pós-lead + mobile 390

### Fora de scope
Apify, OpenAI, DataForSEO, scoring, pricing values, payments, emails, admin CRM, schema BD.