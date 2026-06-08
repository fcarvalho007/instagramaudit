# Plan — Editorial Comparison Hero (first card in comparison mode)

## Audit findings

**Current first card** = `ComparisonHero` (`src/components/report-redesign/v2/overview/comparison-hero.tsx`), mounted in `report-overview-block.tsx` lines 203–219 whenever `firstCompetitor` exists. The legacy "Identidade" `CompetitorOverviewCompare` follows immediately after with `scope="identity"` (followers + posts in sample), then `CompetitorBioCompare`.

**"Score editorial" row** in `ComparisonHero.buildRows()` (lines 195–207) uses:
```
computeEnvolvimento(engagementRate, p.engagementBenchmark)
  = min(100, round(engagementRate / tierBenchmark * 100))
```
For `nunomarkl`, both sides are scored against **primary's** tier benchmark and both can saturate at 100 → reader sees "100 vs 100" with zero explanation. This is the reported confusion. The metric isn't defensible as a side-by-side score (asymmetric tier baseline, cap at 100 hides spread, no methodology copy anywhere).

**Identity gaps:** the current hero shows `CompareHandleRow size="lg"` (handles + avatars) but no follower count, no sample size, no engagement next to each handle — the identity reads as a thin pill, not a card. Tabular rows below carry the data.

**Avatars:** `CompareHandleRow` already has gradient-initial fallback (previous turn). No code change needed there, but we must ensure the new identity cards reuse the same fallback.

## What changes

### 1. Remove "Score editorial" row from `ComparisonHero`
Score is asymmetric (uses primary's tier benchmark for both) and saturates at 100, so it cannot be honestly compared. No tooltip can rescue it — drop the row from `buildRows()`. No external consumer of the score in this card → no other refs to update.

### 2. Redesign the hero into an editorial duel header (replaces lines 67–93 of `comparison-hero.tsx`)

Layout (desktop ≥ md):

```
┌──────────────────────────────────────────────────────────────┐
│ COMPARAÇÃO PRO · 90 dias · [Concorrente em janela baseline]  │
│                                                              │
│ ┌────────────────────┐   vs   ┌────────────────────┐         │
│ │ [AV] @primary  ✓   │        │ [AV] @competitor ✓ │         │
│ │ Nome completo      │        │ Nome completo      │         │
│ │                    │        │                    │         │
│ │ 1,2 M seguidores   │        │ 480 K seguidores   │         │
│ │ 12 publ. amostra   │        │ 12 publ. amostra   │         │
│ │ 3,4 % envolvimento │        │ 5,1 % envolvimento │         │
│ │ 4,2 posts/semana   │        │ 2,8 posts/semana   │         │
│ └────────────────────┘        └────────────────────┘         │
│                                                              │
│ ▸ Verdict line (editorial, deterministic)                    │
│                                                              │
│ Comparação com base nas últimas 12 publicações disponíveis.  │
│ Concorrente em janela baseline. (opt.)                       │
└──────────────────────────────────────────────────────────────┘
```

Mobile (<md): stacks the two identity cards vertically with a centered "vs" chip between them. Verdict + methodology stay full-width.

Identity card composition:
- Avatar 56px (md) / 48px (sm) — reuse fallback gradient with initials from `CompareHandleRow` (extract a small `<CompareAvatar>` helper inside `compare/` or inline the existing logic).
- `@handle` (font-mono → no, use Inter SemiBold per project rules) + verified badge.
- Display name in `text-sm text-content-secondary`.
- 4-row metric stack: Seguidores / Publicações na amostra / Envolvimento médio / Publicações por semana. Inter, `text-base sm:text-lg tabular-nums`, label in `text-eyebrow-sm text-content-tertiary` above each value.
- Stronger side ranked by metric → value uses `text-accent-primary` (primary) or `text-compare-competitor` (competitor); weaker side stays `text-content-primary`. Same per-row "winner" logic that already exists.

Header strip stays as-is (eyebrow + window label + baseline pill).

### 3. Deterministic editorial verdict (under the identity cards)

Pure function `buildHeroVerdict(primary, competitor)` in the same file, no AI, no provider. Decision tree (first match wins):

- If `competitor.followers > 1.5×primary.followers` AND `primary.engagementRate > competitor.averageEngagementRate`:  
  *"O concorrente tem mais escala, mas este perfil gera uma resposta proporcionalmente superior por publicação."*
- If `primary.followers > 1.5×competitor.followers` AND `competitor.averageEngagementRate > primary.engagementRate`:  
  *"Este perfil tem mais escala, mas o concorrente gera uma resposta proporcionalmente superior."*
- Else if `competitor.averageEngagementRate > primary.engagementRate * 1.1`:  
  *"O concorrente regista um envolvimento médio superior por publicação."*
- Else if `primary.engagementRate > competitor.averageEngagementRate * 1.1`:  
  *"Este perfil regista um envolvimento médio superior por publicação."*
- Else if `competitor.estimatedPostsPerWeek > primary.postingFrequencyWeekly * 1.25`:  
  *"O concorrente publica com maior frequência semanal."*
- Else if `primary.postingFrequencyWeekly > competitor.estimatedPostsPerWeek * 1.25`:  
  *"Este perfil publica com maior frequência semanal."*
- Default: *"Os dois perfis apresentam dimensão e envolvimento comparáveis."*

Rendered with a `▸` lead accent, `font-serif text-lg sm:text-xl text-content-primary leading-snug`.

### 4. Explicit methodology footnote

Single line below verdict, `text-xs text-content-tertiary`:
- Base: *"Comparação com base nas últimas {N} publicações disponíveis."* where `N` = `min(primary.postsAnalyzed, competitor.postsAnalyzed)`. If unknown, fall back to "publicações disponíveis".
- Append, only when `competitor.windowAligned === false`: *" Concorrente em janela baseline."*

The window-aligned pill in the header stays for at-a-glance visibility; the footnote adds the prose explanation.

### 5. Downstream cleanup
- Keep `CompetitorOverviewCompare` (the "Identidade" card with Seguidores + Publicações analisadas) — it's now redundant with the new hero. **Remove it from `report-overview-block.tsx`** (lines 280–300) to avoid the same numbers twice. The component file stays for `scope="all"` consumers (none today, but file is unchanged).
- `CompetitorBioCompare` stays unchanged.
- No-competitor path (`!firstCompetitor`) is untouched (renders `EditorialIdentityCard`).
- Free / Public / locked modes untouched.

## Files touched

1. `src/components/report-redesign/v2/overview/comparison-hero.tsx` — full hero rewrite per §2–4, drop Score row.
2. `src/components/report-redesign/v2/report-overview-block.tsx` — pass `postsInSample` / `engagementRate` / `postingFrequencyWeekly` to `ComparisonHero` (already wired); **remove** the `<CompetitorOverviewCompare ... scope="identity" />` block.
3. (optional) tiny shared `<CompareAvatar>` helper extracted inside `src/components/report-redesign/v2/compare/compare-handle-row.tsx` for reuse — only if cleaner; otherwise duplicate the 6-line fallback.

## Constraints respected

- Deterministic logic only (verdict = decision tree).
- No AI, no provider calls, no backend / schema changes.
- Free/Public report untouched.
- No-competitor flow untouched.
- 2-font rule (Fraunces titles, Inter body), tokens only.
- Mobile-first: identity cards stack at <md; values use `tabular-nums`; no horizontal overflow at 375px.
- Avatars use existing gradient-initial fallback.

## Validation

- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` — first card opens in duel mode with two identity cards (avatars, handle, follower count, sample, engagement, cadence), deterministic verdict, methodology footnote. No "100 vs 100" score anywhere.
- `/admin/report-preview/frederico.m.carvalho` (no competitor) — unchanged, still `EditorialIdentityCard`.
- 375px viewport — identity cards stack cleanly, no horizontal scroll.
- `rg "Score editorial"` returns 0 hits in the comparison hero.
- No new network requests on render (verify in browser preview).
