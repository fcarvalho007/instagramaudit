
# Tipografia · Reduzir a 2 fontes (Fraunces + Inter), com Mono só para números

## Diagnóstico

A regra está bem definida em `src/styles/tokens.css`:
- `--font-display: Fraunces` → headlines/display
- `--font-sans: Inter` → tudo o resto
- `--font-mono: JetBrains Mono` → só dados numéricos

O problema **não são os tokens**, é o uso. Um `rg "font-mono"` em `src/components/report*` revela ~80+ ocorrências, e a maioria **não é num número**. Está aplicada a:

1. **Eyebrows/section labels** (texto curto uppercase + tracking alargado): `BENCHMARKS`, `FONTE`, `SOBRE A ANÁLISE`, `LEITURA IA`, etc.
2. **Badges/pills/tags**: `SourceBadge`, `tier-tag`, format pills, share buttons.
3. **Footers e captions de chart**: `report-footer.tsx`, eixos do `market-signals-chart`.
4. **Glossário e dt/dl headings**: `report-enriched-glossary.tsx`, `report-enriched-ai-insights.tsx`.
5. **Username/handle e URLs** em alguns sítios.

A Mono está a ser usada como atalho para "tipografia técnica/uppercase". Esse efeito editorial pode (e deve) ser feito com **Inter uppercase + tracking alargado + peso medium**, que mantém o caracter cinematográfico sem partir a regra das 2 fontes.

A Mono só deve aparecer onde o utilizador lê **números crus**: `9.457`, `0,11%`, `+12,4%`, contadores de likes/comments/views, eixos numéricos, valores de KPI cards.

## Regra final (a documentar em memória)

| Elemento | Fonte | Notas |
|---|---|---|
| H1/H2 display do report | Fraunces | hero, block titles |
| Body, parágrafos, listas | Inter | regular/medium |
| Eyebrows / section labels | **Inter** uppercase, `tracking-[0.16em]`, `font-medium`, `text-[10–11px]` | substituem `font-mono` em labels |
| Badges, pills, chips | **Inter** uppercase + tracking | incl. `SourceBadge`, `tier-tag`, format pills |
| KPI numbers (9.457, 0,11%) | **JetBrains Mono** + `tabular-nums` | hero KPI grid, format counts, top posts likes/comments |
| Eixos numéricos de chart | **JetBrains Mono** + `tabular-nums` | só os ticks numéricos |
| Datas curtas tipo "12 NOV" | Inter | não é número puro |
| Username/handle (`@frederico…`) | Inter | é texto, não dado |

## Âmbito da migração

Converter `font-mono` → Inter uppercase em **todos os usos não-numéricos** dentro de:

- `src/components/report-redesign/**` (incl. v2)
- `src/components/report/**`
- `src/components/report-enriched/**`
- `src/components/report-market-signals/**`
- `src/components/report-share/**`
- `src/components/report-tier/**`
- `src/components/landing/**` (mockups e eyebrows)
- `src/components/admin/**` (cockpit + v2)
- `src/components/product/**` (analysis dashboard)
- `src/components/ui/**` (badge, chart, card, input — apenas onde aplicável)

**Manter `font-mono` apenas** nos pontos identificados como "número cru":
- `report-hero-v2.tsx` KPIs (já corrigido)
- `report-kpi-grid-v2.tsx` valores
- `report-top-posts.tsx` linhas 68, 72 (likes/comments) e badge ER% linha 75 (é %, mantém)
- `report-format-breakdown.tsx` linha 113 (valor numérico) — labels uppercase migram
- `report-chart-tooltip.tsx` linha 45 (valor numérico) — eyebrow migra
- `report-caption-intelligence.tsx` linhas com `tabular-nums` e número (151, 157, 210, 243, 280) — labels não
- `market-signals-chart.tsx` ticks dos eixos
- `analysis-metric-card.tsx` valor numérico
- `report-enriched-top-links.tsx` likes/comments numéricos

## Estratégia de implementação

1. **Definir um utilitário Tailwind helper class** (em `styles.css` `@layer components`) para o "eyebrow editorial":

   ```css
   .text-eyebrow {
     font-family: var(--font-sans);
     font-size: 0.6875rem; /* 11px */
     line-height: 1;
     letter-spacing: 0.16em;
     text-transform: uppercase;
     font-weight: 500;
   }
   ```

   E uma variante menor `.text-eyebrow-sm` (10px, tracking 0.14em). Isto garante consistência e evita repetir as classes em cada componente.

2. **Sweep ficheiro a ficheiro**: substituir
   `font-mono text-[10px] uppercase tracking-[0.x em] ...` →
   `text-eyebrow-sm ...` (mantendo cor/spacing).

3. **Auditar** cada match restante de `font-mono` para confirmar que envolve só dígitos. Se sim, adicionar `tabular-nums` se faltar.

4. **`SourceBadge`** e `tier-tag.tsx`: trocar `font-mono` por `text-eyebrow-sm` mantendo o ring/cor.

5. **`market-signals-chart.tsx`** linhas 85/96: o `fontFamily` aplica-se aos labels do eixo (que são números) — manter mono.

6. **Atualizar memória**:
   - `mem://design/tokens` → adicionar regra explícita de uso da Mono
   - `mem://index.md` Core → incluir "Mono apenas em números brutos. Eyebrows/labels/badges em Inter uppercase."

## Validação

- [ ] `bunx tsc --noEmit` passa
- [ ] `bunx vitest run` passa (51/51)
- [ ] Inspeção visual em `/report/example` (light) e em rota dark — eyebrows ainda lêem como editorial, não como Times New Roman
- [ ] `rg "font-mono" src/components` — todos os matches restantes envolvem apenas dígitos numéricos
- [ ] Mobile 375px sem regressões de layout (alguns labels ficam ligeiramente mais estreitos com Inter)

## Ficheiros previstos (sweep)

Estimativa ~25 ficheiros editados, alterações mecânicas (className swap). Sem mudanças de lógica nem de schema. Sem novas dependências.

## Não está no âmbito

- Trocar Fraunces por outra display
- Mexer em `tokens.css` / `tokens-light.css` (a definição já está correta)
- Editar `LOCKED_FILES.md` (é apenas re-uso de classes existentes/nova utility class)
- `/report.example` mockup permanece intacto ao nível visual — só altera a fonte das labels
