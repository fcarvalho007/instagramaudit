
# PRO Tracking Placeholder — Visual Only

## Current state

Both pages already have PRO tracking teasers:
- `/app/reports` — dashed-border text card with "Tracking contínuo — disponível em breve" (lines 305-327)
- `/app/plan` — tier cards already list Pro/Agency features + "Em breve" badges + info card (lines 180-195)

The foundation is there. The work is upgrading the teaser in `/app/reports` from a plain text blurb to a richer, Iconosquare-style locked card with a mini chart placeholder and clear PRO badge.

## Proposed placement

| Page | What | Where |
|------|------|-------|
| `/app/reports` | Replace existing dashed teaser with a `ProTrackingTeaser` component | Same position (after report list / empty state, before page end) |
| `/app/plan` | Keep as-is | Already well-structured with tiers, badges, and info card |

No new pages. No new routes.

## New component

**File:** `src/components/app/pro-tracking-teaser.tsx`

A single self-contained card:

```
+-------------------------------------------------------+
|  PRO badge (violet)         "Tracking diário"          |
|                                                        |
|  [mini sparkline placeholder — 7 grey bars/dots]       |
|                                                        |
|  "Evolução semanal, alertas de crescimento e           |
|   comparação temporal — incluído nos planos Pro         |
|   e Agency."                                           |
|                                                        |
|  [ Disponível em breve ]  (disabled button)            |
|  or                                                    |
|  [ Pedir acesso antecipado → ]  (link to /app/plan)    |
+-------------------------------------------------------+
```

Visual spec:
- White bg, `border border-slate-200/70`, `rounded-xl`, `shadow-sm`
- PRO badge: `bg-violet-50 text-violet-600 border-violet-200/60` pill
- Mini chart: 7 small bars (h-2 to h-5, `bg-slate-200 rounded-sm`) — pure CSS, no data
- CTA: Link to `/app/plan`, styled as `text-blue-500 hover:text-blue-600`
- Lock icon overlay on the chart area (optional, subtle)

## Copy (pt-PT, impersonal)

- **Title:** "Tracking diário"
- **Badge:** "PRO"
- **Body:** "Evolução semanal, alertas de crescimento e comparação temporal — incluído nos planos Pro e Agency."
- **CTA:** "Saber mais sobre os planos →"
- **Sub-note:** (none — the plan page already explains it's not active)

## What changes

| File | Action |
|------|--------|
| `src/components/app/pro-tracking-teaser.tsx` | Create — new component |
| `src/routes/app.reports.tsx` | Replace the existing dashed PRO teaser (lines 305-327) with `<ProTrackingTeaser />` |

## What does NOT change

- `/app/plan` — already well-structured, no changes needed
- No database tables, triggers, or migrations
- No server functions
- No Apify calls, cron jobs, or scheduled tasks
- No tracking writes
- No alerts system
- No payment/billing
- No locked files

## Future data model (informational only, NOT to implement now)

When tracking is activated later, the likely schema would be:
- `profile_tracking` — (profile_id, user_id, frequency, active, created_at)
- `tracking_snapshots` — (profile_id, date, followers, following, posts, engagement_rate, snapshot_data jsonb)
- `tracking_alerts` — (profile_id, alert_type, threshold, triggered_at)

This is documented here for reference. No tables will be created.

## Risk level

**Minimal.** One new presentational component + one import swap in an existing file. No backend, no data, no cost implications.
