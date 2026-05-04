# Future PRO/Agency Tracking — Cost Controls

> **Status:** Planning only. No runtime logic, migrations, cron jobs, or provider calls exist for tracking yet.
> **Last updated:** 2026-05-04

---

## 1. Feature Overview

### Pro Plan
- Daily tracking for **1 Instagram profile**
- Weekly/monthly evolution charts
- Growth alerts (followers, engagement rate)
- Temporal comparison (this week vs last week)

### Agency Plan
- Daily tracking for **multiple profiles** (limit TBD, likely 5–10)
- Competitor tracking per profile (up to 3 competitors each)
- Side-by-side comparison
- Data export (CSV/PDF)
- Custom alert thresholds

---

## 2. Cost Risks

| Risk | Description | Severity |
|------|-------------|----------|
| **Daily scraping cost** | Each profile costs ~$0.01–0.05 per Apify run (Instagram Profile Scraper). At scale, 100 profiles × $0.03 = $3/day = ~$90/month. | High |
| **Competitor multiplier** | A Pro user tracking 1 profile + 3 competitors = 4 daily runs. An Agency user with 10 profiles × 4 = 40 daily runs. | High |
| **Failed jobs & retries** | Apify runs can fail (rate limits, profile private, network). Unlimited retries multiply cost with no data return. | Medium |
| **Alert processing** | If alerts trigger AI analysis (OpenAI) on every change, cost compounds. | Medium |
| **Automated PDF/export** | Weekly PDF generation per tracked profile adds PDFShift cost (~$0.005/page). | Low |
| **Stale data re-scraping** | If cache TTL is too short, unnecessary fresh runs occur. | Medium |

### Worst-case monthly estimate (uncontrolled)

```
100 Agency users × 10 profiles × 4 (with competitors) × $0.03 × 30 days
= $3,600/month in Apify alone
```

This is why safeguards are non-negotiable before enabling tracking.

---

## 3. Required Safeguards

### 3.1 Per-Plan Profile Limits

| Plan | Tracked profiles | Competitors per profile | Total daily runs |
|------|-----------------|------------------------|------------------|
| Free | 0 | 0 | 0 |
| Pro | 1 | 0 (v1), up to 2 (v2) | 1–3 |
| Agency | 5 (default), up to 10 | Up to 3 | 20–40 |

Enforce in `tracked_profiles` table with a check before insert.

### 3.2 Daily Max Cost Per User

- Pro: $0.10/day hard cap
- Agency: $1.00/day hard cap
- Calculated from `provider_call_logs.estimated_cost_usd` summed for the user's tracked profiles on the current day.
- If cap reached, skip remaining jobs and log `outcome = 'budget_exceeded'`.

### 3.3 Global Daily Provider Budget

- `app_config` key: `tracking_daily_budget_usd` (e.g. `5.00`)
- Before each tracking job, check sum of today's `provider_call_logs.estimated_cost_usd` where source = `'tracking'`.
- If exceeded, halt all tracking jobs and fire a `usage_alerts` entry with `kind = 'global_budget_exceeded'`.

### 3.4 Hard Cap Per Job

- Each individual Apify run must have `maxRequestRetries: 1` and `timeoutSecs: 120`.
- If run exceeds $0.10, flag and do not store result.

### 3.5 Retry Limit & Backoff

- Max 2 retries per profile per day.
- Exponential backoff: 5 min → 30 min → skip.
- After 3 consecutive days of failure, auto-pause the tracked profile and notify user.

### 3.6 Kill Switch

- Existing `APIFY_ENABLED` secret applies to tracking runs too.
- New `TRACKING_ENABLED` kill switch (default: `false`).
- Both must be `true` for any tracking job to execute.

### 3.7 provider_call_logs Integration

- Every tracking run must log to `provider_call_logs` with:
  - `actor`: the Apify actor used
  - `handle`: the tracked profile
  - `network`: `'instagram'`
  - A new field or tag distinguishing `source = 'tracking'` from `source = 'on_demand'`
- `analysis_events` should also record tracking events with `data_source = 'tracking'`.

### 3.8 Admin Visibility

- `/admin` must show:
  - Active tracked profiles count
  - Today's tracking cost (provider_call_logs)
  - Failed tracking jobs
  - Budget utilisation percentage
  - Per-user tracking cost breakdown

---

## 4. Suggested Schema (for later migration)

> Do NOT create these tables yet. This is a reference for when tracking is implemented.

### tracked_profiles

```sql
CREATE TABLE public.tracked_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network text NOT NULL DEFAULT 'instagram',
  handle text NOT NULL,
  competitor_handles jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  paused_reason text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, network, handle)
);
```

### tracking_jobs

```sql
CREATE TABLE public.tracking_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_profile_id uuid NOT NULL REFERENCES tracked_profiles(id) ON DELETE CASCADE,
  scheduled_for date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',  -- pending | running | success | failed | skipped
  skip_reason text,  -- budget_exceeded | kill_switch | paused | retry_exhausted
  provider_call_log_id uuid,
  snapshot_id uuid,
  attempt integer NOT NULL DEFAULT 1,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### tracking_snapshots

```sql
CREATE TABLE public.tracking_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_profile_id uuid NOT NULL REFERENCES tracked_profiles(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  followers bigint,
  following bigint,
  posts_count bigint,
  engagement_rate numeric,
  avg_likes numeric,
  avg_comments numeric,
  top_post_url text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tracked_profile_id, snapshot_date)
);
```

### tracking_alerts

```sql
CREATE TABLE public.tracking_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_profile_id uuid NOT NULL REFERENCES tracked_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  alert_type text NOT NULL,  -- follower_spike | follower_drop | engagement_change | milestone
  metric_name text NOT NULL,
  previous_value numeric,
  current_value numeric,
  change_pct numeric,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. Recommended Implementation Sequence

| Phase | Description | Dependencies |
|-------|-------------|-------------|
| **1. Schema** | Create `tracked_profiles`, `tracking_jobs`, `tracking_snapshots`, `tracking_alerts` tables with RLS. | None |
| **2. Manual tracking run** | Admin-only server function to trigger a single tracking run for a specific profile. Validate cost logging and snapshot storage. | Phase 1 |
| **3. Daily cron (internal)** | `pg_cron` job calling `/api/public/hooks/tracking-run` for 1 internal test profile. Monitor cost for 2 weeks. | Phase 2 |
| **4. Admin cost dashboard** | Add tracking cost section to `/admin` with daily/weekly views, budget utilisation, failed jobs. | Phase 3 |
| **5. Pro beta** | Enable for 5–10 beta users. Monitor cost closely. Per-user caps active. | Phase 4 |
| **6. Agency beta** | Enable multi-profile tracking for 2–3 agency testers. Validate competitor multiplier cost. | Phase 5 |
| **7. General availability** | Open to all paying users with full safeguards. | Phase 6 + payments |

---

## 6. Key Decisions Still Open

- [ ] Exact Apify actor for daily tracking (same as on-demand or lighter variant?)
- [ ] Whether competitors are tracked in same run or separate runs
- [ ] Alert delivery channel (in-app only vs email vs both)
- [ ] Tracking frequency flexibility (some users may want weekly, not daily)
- [ ] Data retention policy for `tracking_snapshots` (90 days? 1 year?)
- [ ] Whether to offer a "tracking credit" system instead of flat subscription
