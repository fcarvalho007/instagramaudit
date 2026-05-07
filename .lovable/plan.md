
# Refinar o Editorial Identity Card (Executive Summary)

## Ficheiro alvo

`src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

## Dependências de dados actuais (não mudam)

- `scores: Record<ScoreKey, { value; subtitle }>` — 3 sub-scores (envolvimento, frequência, interação)
- `aiHeroText?: string` — frase AI hero ou fallback determinístico
- Derivados internos: `globalScore` (0–100), `globalFamily` (danger/warning/success), `strength`, `weakness`

Todos os dados já existem — não é preciso alterar cálculos, props ou tipos.

## Problemas actuais identificados

1. **`bg-slate-50/60`** no Band 2 — viola regra "never use slate-*"
2. **`text-[11px]`** em dois sítios (score "de 100" e badge) — abaixo do mínimo 12px
3. Frase hero sem eyebrow "RESUMO EXECUTIVO" acima
4. Band 2 (strength/weakness) visualmente rígido, sem subtítulo explicativo
5. Gradient decorativo subtil mas frase hero podia ter mais impacto (tamanho)
6. Score ring "de 100" e badge label ficam demasiado pequenos

## Layout proposto

```text
Desktop (sm+):
┌─────────────────────────────────────────────────────────────┐
│  ┌─ Left (flex-1) ──────────────────┐ ┌─ Right ─────────┐  │
│  │  RESUMO EXECUTIVO (eyebrow)      │ │                  │  │
│  │                                  │ │   ┌──────────┐   │  │
│  │  "Perfil com bom potencial..."   │ │   │  Score    │   │  │
│  │  (Fraunces, 1.5–1.75rem)         │ │   │   67     │   │  │
│  │                                  │ │   └──────────┘   │  │
│  │  Supporting sentence (Inter)     │ │   /100           │  │
│  │  (text-sm/base, text-secondary)  │ │   [A MELHORAR]   │  │
│  │                                  │ │   Pontuação      │  │
│  └──────────────────────────────────┘ │   InstaBench     │  │
│                                       └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Ponto forte ──────────┐ ┌─ A melhorar ────────────────┐│
│  │ ✓ PONTO FORTE          │ │ ⚠ A MELHORAR               ││
│  │   Engagement           │ │   Conversa pública          ││
│  │   (subtitle from score)│ │   (subtitle from score)     ││
│  │   soft green bg        │ │   soft rose/amber bg        ││
│  └────────────────────────┘ └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────┐
│  RESUMO EXECUTIVO        │
│  "Perfil com bom..."     │
│                          │
│      ┌──────────┐        │
│      │  Score 67 │        │
│      └──────────┘        │
│      /100  [A MELHORAR]  │
│      Pontuação InstaBench│
│                          │
│  Supporting sentence...  │
├──────────────────────────┤
│  ✓ Ponto forte           │
│    Engagement · subtitle │
├──────────────────────────┤
│  ⚠ A melhorar            │
│    Conversa · subtitle   │
└──────────────────────────┘
```

## Alterações concretas

### 1. Band 1 — Editorial Portrait
- Adicionar eyebrow "RESUMO EXECUTIVO" com classe `text-eyebrow` acima da frase
- Aumentar frase hero para `text-[1.35rem] sm:text-[1.65rem] md:text-[1.85rem]`
- Separar a frase AI em headline (1ª frase) + supporting text (resto), quando possível
- Score ring: aumentar size para 110px, "de 100" para `text-xs` (12px), badge para `text-xs`
- Adicionar "Pontuação InstaBench" abaixo do badge em `text-xs text-content-tertiary`
- Remover `ScoreOrbitBackground` canvas (over-decorative para estilo Iconosquare)

### 2. Band 2 — Strength/Weakness
- Substituir `bg-slate-50/60` por `bg-surface-muted` (token semântico)
- Converter de row rígida para 2 mini-cards com `rounded-xl` dentro de um grid
- Cada card: fundo soft (emerald-50 / rose-50), ícone, eyebrow label, título, e subtítulo do score
- Adicionar `scores[key].subtitle` como linha explicativa (já existe nos dados)
- Padding mais generoso: `px-5 py-4`

### 3. Token compliance
- Eliminar `bg-slate-50/60` → `bg-surface-muted`
- Todos os `text-[11px]` → `text-xs` (12px mínimo)
- Manter `font-display` (Fraunces) apenas na frase hero
- Todos os números, labels e metadata em Inter (`font-sans`)

## Ficheiros afectados

- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` — alteração principal
- Nenhum outro ficheiro precisa de mudar (props e tipos mantêm-se)

## Riscos

- **Nenhum** — alteração puramente visual, dados e lógica intactos
- O component é usado apenas via `ReportOverviewBlock`, que não muda
- Não afecta PDF pipeline (PDF usa componentes próprios)

## Não se altera

- Cálculos de score, fallback sentence, strength/weakness derivation
- Provider logic, report generation, module visibility, Supabase schema
- Nenhuma análise fresh, nenhuma chamada a providers
