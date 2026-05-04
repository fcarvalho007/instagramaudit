
# First Fold Premium Background

## What changes

**Single file edit:** `src/components/report-redesign/v2/report-shell-v2.tsx`

## Implementation

Wrap `ReportHeroV2` and `ComparisonHeader` (lines 90-96) in a new `<section>` with decorative background layers:

```text
<section className="relative overflow-hidden" style={{ backgroundColor: '#F8FBFF' }}>
  {/* Layer 1: subtle grid */}
  <div className="absolute inset-0 pointer-events-none"
       style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

  {/* Layer 2: top-right soft blue radial */}
  <div className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none"
       style={{ background: 'radial-gradient(circle at 70% 20%, rgba(6,182,212,0.08), transparent 70%)' }} />

  {/* Layer 3: top-left soft violet radial */}
  <div className="absolute top-0 left-0 w-[500px] h-[500px] pointer-events-none"
       style={{ background: 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.05), transparent 70%)' }} />

  {/* Layer 4: bottom fade to white */}
  <div className="absolute bottom-0 inset-x-0 h-24 pointer-events-none"
       style={{ background: 'linear-gradient(to bottom, transparent, #FAFBFD)' }} />

  {/* Content */}
  <div className="relative z-10">
    <ReportHeroV2 ... />
    <div className="mx-auto max-w-[1380px] px-5 md:px-6">
      <ComparisonHeader />
    </div>
  </div>
</section>
```

## What stays untouched

- All report cards, blocks (1-6), backend, admin, auth, loading
- All locked files
- All global tokens (tokens.css, tokens-light.css)
- No new dependencies
- ReportBlockTopTabs remains outside the background section (below)

## Responsive

- `overflow-hidden` on the section prevents any horizontal scroll from the radial layers
- Radial gradient divs use absolute positioning and won't affect layout
- Grid at 40px is subtle enough at 375px; opacity 0.035 keeps it imperceptible on small screens

## Validation

- `bunx tsc --noEmit` and `bunx vitest run` will be run after implementation
- Will confirm: files changed, layers added, cards untouched, blocks untouched, no global token changes, mobile safety, test results
