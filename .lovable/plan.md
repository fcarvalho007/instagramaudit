# Bio e pontos de saída — editorial panels redesign

Scope: `src/components/report-redesign/v2/competitor-bio-compare.tsx` only. No data/schema/provider changes. Single-profile path untouched.

## Layout

Inside the existing `CompareCardShell`, replace `CompareTable` with two side-by-side **profile panels** + a compact **comparison summary strip** below.

```text
┌──────────────────────────────┬──────────────────────────────┐
│  @primary (azul)             │  @competitor (indigo)        │
│  ────────────────────        │  ────────────────────        │
│  ● Link na bio       Sim     │  ● Link na bio       Sim     │
│  ● Nº de links       2       │  ● Nº de links       4       │
│  ● Conta verificada  Não     │  ● Conta verificada  Sim     │
│  ● Bio preenchida    Sim     │  ● Bio preenchida    Sim     │
└──────────────────────────────┴──────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  3 pontos de saída a mais no concorrente · Verificação +1   │
└─────────────────────────────────────────────────────────────┘
Footer (editorial verdict, full sentence)
```

- Grid: `grid-cols-1 gap-4 md:grid-cols-2 md:gap-6`. Panels stack on mobile.
- Each panel: `rounded-lg border border-default bg-surface-muted/40 p-5`, with side-tinted top accent (1px) and side-tinted `@handle` eyebrow.
- Each row: `flex items-center justify-between text-sm`, generous `py-2` spacing, a leading **icon** (lucide) carrying the meaning so colour is never the only channel.

## Row rendering (4 rows per panel)

| Field | Icon | Value style |
|---|---|---|
| Link na bio | `Link2` | "Sim" / "Não" |
| Nº de links | `ListOrdered` | number (Inter SemiBold, tabular-nums) |
| Conta verificada | `BadgeCheck` | "Sim" / "Não" |
| Bio preenchida | `FileText` | "Sim" / "Não" |

**Signal logic (deterministic, label always present alongside the colour):**
- `value-positive` (green tone, `--signal-positive`): bio preenchida = Sim, verificada = Sim, ≥1 link.
- `value-neutral` (`content-secondary`): default for non-comparative values.
- `value-attention` (amber `--signal-attention`): bio vazia, sem links, não verificada.
- Never red — these are friction signals, not failures.
- Each value renders `<Icon /> <span>label</span>` so screen readers + monochrome read fine.

Use small chip-style background only when signalled (`bg-signal-attention/10`, `bg-signal-positive/10`), text always carries the word — no colour-only encoding.

## Comparison summary strip

A single horizontal row of up to 3 micro-deltas (only those with a real gap), separated by `·`:

- Links: `"+N pontos de saída no concorrente"` / `"+N pontos de saída neste perfil"` when diff ≠ 0.
- Verificação: `"Verificação só no concorrente"` / `"Verificação só neste perfil"` when they differ.
- Bio: `"Concorrente sem bio preenchida"` / `"Este perfil sem bio preenchida"` when they differ.

Empty → strip hides. `text-xs text-content-secondary` on a thin `border-t border-default pt-3`.

## Editorial verdict (footer)

`buildEditorialVerdict({ primaryLinks, competitorLinks, primaryVerified, competitorVerified, primaryHasBio, competitorHasBio })`:

Scoring (deterministic):
- `score = links + (verified ? 1 : 0) + (hasBio ? 1 : 0)` for each side.
- Diff = `compScore - primaryScore`.

Cases (EU-PT, first match wins):
1. `competitorLinks - primaryLinks >= 2` → **"O concorrente apresenta mais pontos de saída."**
2. `primaryLinks - competitorLinks >= 2` → **"Este perfil tem menos fricção na bio, com mais pontos de saída."**
3. `diff >= 2` → **"O concorrente projeta uma bio mais completa e credível."**
4. `diff <= -2` → **"Este perfil tem uma bio mais completa que o concorrente."**
5. `|diff| <= 1` AND `|linksDiff| <= 1` → **"Ambos têm uma base semelhante na bio."**
6. fallback → keep current "sinais de bio semelhantes." line.

## Typography & a11y

- Row labels: `text-sm text-content-secondary`.
- Values: `text-sm font-semibold tabular-nums` for numbers; `text-sm font-medium` for Sim/Não.
- Panel header: `.text-eyebrow-sm` with side-tinted colour (`--accent-primary` / `--accent-secondary`).
- Verdict footer reuses `CompareCardShell` footer slot (no styling change).
- Each value cell `aria-label` includes the label + value (e.g. "Bio preenchida: Sim").

## Constraints

- No tokens added; reuse existing `--signal-positive`, `--signal-attention`, `--accent-primary`, `--accent-secondary`, `--border-default`, `--surface-muted`.
- No new packages.
- `CompareTable` import removed; `CompareCardShell` kept.
- Single-profile bio card untouched.

## Validation

- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` — panels render side-by-side, deltas strip shows real diffs.
- Both sides identical → strip hides, verdict = "base semelhante".
- 375px mobile — panels stack, no row overflow.
- Screen-reader pass: each row reads "<label>: <value>".
- Colour-blind sim: meaning still conveyed by icon + word.
