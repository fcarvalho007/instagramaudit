create table public.inline_report_feedback (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  snapshot_id uuid,
  block text not null check (block in ('overview','diagnostic','performance','content')),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.inline_report_feedback enable row level security;

create index idx_inline_fb_handle on public.inline_report_feedback(handle, created_at desc);
create index idx_inline_fb_snapshot on public.inline_report_feedback(snapshot_id) where snapshot_id is not null;