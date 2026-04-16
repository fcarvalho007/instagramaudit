

## Plan: Card + Input + Switch atomic components (Sprint 0, Prompt 2b)

Three production-grade atomics consuming design tokens only, plus showcase rows in pt-PT.

### Files

1. `src/components/ui/card.tsx` — full rewrite (compound + cva variants/padding)
2. `src/components/ui/input.tsx` — full rewrite (variants/sizes/states/icons + `InputLabel`, `InputHelper`)
3. `src/components/ui/switch.tsx` — full rewrite (Radix Switch with size variants)
4. `src/routes/index.tsx` — append three showcase sections (Card / Input / Switch)
5. `LOCKED_FILES.md` — new section "Container & Input Components (locked since Sprint 0, Prompt 2b)"
6. `.lovable/memory/constraints/locked-files.md` — mirror lock additions

### Card (`card.tsx`)

Compound exports: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

cva on `Card` root:
- `variant`: `default` | `glass` | `outline` | `elevated` | `interactive`
- `padding`: `none` | `sm` | `md` (default) | `lg`

Tokens:
- `bg-surface-elevated`, `bg-surface-elevated/60` (glass), `border-border-default`, `border-border-subtle`, `border-border-strong`, `shadow-md`, `shadow-lg`, `rounded-xl`, `backdrop-blur-md`
- Interactive: `hover:-translate-y-0.5 hover:shadow-lg hover:border-border-strong transition-all duration-slow ease-out-expo`
- Base transition on all variants: `transition-all duration-base ease-out-expo`

Sub-components:
- `CardHeader` — `flex flex-col space-y-1.5`. Optional `action` prop: when present, wraps children in a `flex items-start justify-between` row with `action` right-aligned.
- `CardTitle` — `font-display text-xl font-semibold tracking-tight text-content-primary`
- `CardDescription` — `font-sans text-sm text-content-secondary leading-normal`
- `CardContent` — base `pt-0` so it sits flush under the header (parent spacing controls rhythm)
- `CardFooter` — `flex items-center mt-auto`. Optional `bordered` prop adds `border-t border-border-subtle pt-4`.

### Input (`input.tsx`)

cva (`inputVariants`) on the `<input>`:
- `variant`: `default` (`bg-surface-secondary border border-border-default`) | `glass` (`bg-surface-elevated/40 backdrop-blur-md border border-border-subtle`) | `ghost` (transparent, `border-b border-border-default`, no other borders, `rounded-none`, `px-0`)
- `inputSize`: `sm` (h-9 px-3 text-sm) | `md` (h-11 px-4 text-base) | `lg` (h-14 px-5 text-lg)
- States via Tailwind: `text-content-primary placeholder:text-content-tertiary hover:border-border-strong focus:border-accent-primary focus:ring-[3px] focus:ring-accent-primary/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-base transition-colors duration-base ease-out-expo`
- Error (prop): when `error` true, override border to `border-signal-danger` and ring to `focus:ring-signal-danger/20`; sets `aria-invalid="true"`

Component wraps `<input>` in a `relative` div when `leftIcon`/`rightIcon` are provided:
- Icon wrapper: `absolute inset-y-0 [left|right]-3 flex items-center pointer-events-none text-content-tertiary peer-focus:text-content-secondary` (use group-focus-within instead of peer for reliability)
- Padding offset based on `inputSize` × side (`pl-10` md / `pl-9` sm / `pl-12` lg, mirror for right)
- Icon size resolved from `inputSize` and applied via `[&>svg]:h-4 [&>svg]:w-4` etc.

Helpers exported in same file:
- `InputLabel` — `<label>` with `font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2 block`
- `InputHelper` — `<p>` with `font-sans text-sm mt-2`. Prop `error: boolean` toggles color between `text-content-tertiary` and `text-signal-danger`.

Forwarded ref: `React.forwardRef<HTMLInputElement, ...>`. Accepts all native input attrs.

### Switch (`switch.tsx`)

Radix `@radix-ui/react-switch` (already installed). cva on `Root` for size:
- `sm`: `h-5 w-9`, thumb `h-4 w-4`, `data-[state=checked]:translate-x-4`
- `md`: `h-6 w-11`, thumb `h-5 w-5`, `data-[state=checked]:translate-x-5`
- `lg`: `h-7 w-[3.25rem]`, thumb `h-6 w-6`, `data-[state=checked]:translate-x-6`

Track classes: `inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-base ease-out-expo bg-surface-elevated border-border-default data-[state=checked]:bg-accent-primary data-[state=checked]:border-accent-primary data-[state=checked]:shadow-glow-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-luminous focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:opacity-50 disabled:cursor-not-allowed`

Thumb classes: `pointer-events-none block rounded-full bg-content-tertiary data-[state=checked]:bg-content-primary shadow-sm ring-0 transition-transform duration-base ease-out-expo data-[state=unchecked]:translate-x-0.5`

Size prop is the only addition; otherwise mirrors Radix Switch API. ForwardRef preserved.

### Showcase additions (`src/routes/index.tsx`)

Reuse existing `Section` helper. Three new sections appended after current ones:

1. **Card · Variants** — responsive grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` with the 5 cards using exact pt-PT copy from spec. Each card uses `flex flex-col` so footer sits at bottom; default footer button uses `variant="secondary"` ("Ver detalhes") except elevated (premium "Conhecer Pro") and interactive (primary "Analisar agora" with ArrowRight rightIcon).

2. **Input · Variants & States** — vertical stack `space-y-6 max-w-md` with the 6 examples. Each wrapped in a `<div>` with `InputLabel` + `Input` + optional `InputHelper`. Sizes example uses a horizontal flex with three inputs.

3. **Switch · Sizes & States** — `space-y-4 max-w-md` rows, each `flex items-center justify-between` with label `text-sm text-content-secondary` on the left and Switch on the right. The "on" defaults set via `defaultChecked`.

All copy verified pt-PT, impersonal/imperative preferred, "tu" avoided in this batch (only neutral imperatives needed).

### Lock governance

Append to `LOCKED_FILES.md`:
```
## Container & Input Components (locked since Sprint 0, Prompt 2b)
- /src/components/ui/card.tsx
- /src/components/ui/input.tsx
- /src/components/ui/switch.tsx
```
Mirror in `.lovable/memory/constraints/locked-files.md`.

### Out of scope (untouched)

- All previously locked files (tokens.css, styles.css, __root.tsx, button.tsx, badge.tsx, LOCKED_FILES.md content above the new section)
- No new dependencies (`@radix-ui/react-switch` already present)
- Existing showcase sections preserved verbatim

