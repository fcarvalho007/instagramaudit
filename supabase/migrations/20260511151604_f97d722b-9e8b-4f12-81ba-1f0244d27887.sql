create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_request_id uuid unique,
  lead_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  source_analysis_snapshot_id uuid not null,
  instagram_username text not null,
  competitor_usernames jsonb not null default '[]'::jsonb,
  report_payload_jsonb jsonb not null,
  payload_schema_version text not null,
  report_version text not null,
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  expired_at timestamptz,
  pdf_storage_path text,
  metadata jsonb
);

create index report_snapshots_report_request_id_idx on public.report_snapshots(report_request_id);
create index report_snapshots_lead_id_idx on public.report_snapshots(lead_id);
create index report_snapshots_user_id_idx on public.report_snapshots(user_id);
create index report_snapshots_instagram_username_idx on public.report_snapshots(lower(instagram_username));
create index report_snapshots_expires_at_idx on public.report_snapshots(expires_at);

alter table public.report_snapshots enable row level security;

create policy "Users can read own report snapshots"
  on public.report_snapshots
  for select
  to authenticated
  using (user_id = auth.uid());

alter table public.report_requests
  add column if not exists report_snapshot_id uuid;

create index if not exists report_requests_report_snapshot_id_idx
  on public.report_requests(report_snapshot_id);