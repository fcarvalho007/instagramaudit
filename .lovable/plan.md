
## Update Post Comparison Header

**File:** `src/components/report-redesign/v2/report-post-comparison.tsx`

**Change:** Replace the current header block (lines 81-95) with the new editorial hierarchy:

```
✦ PERFORMANCE                          ← eyebrow (text-eyebrow-sm)
MELHORES E PIORES PUBLICAÇÕES          ← headline (font-display, large serif, uppercase)
Os extremos do conteúdo                ← subtitle (text-content-secondary, smaller)
2 que voaram e 2 que caíram...         ← supporting line (even smaller, tertiary)
```

Current structure has the title/subtitle swapped — "MELHORES E PIORES PUBLICAÇÕES" is the eyebrow and "Os extremos do conteúdo" is the headline. This inverts them and adds the `✦ PERFORMANCE` eyebrow.

**What stays untouched:** VS bar, post cards, thumbnails (3:4), engagement percentages, ranking logic, AI reading card, multiplier calculation, central divider — everything below the header.
