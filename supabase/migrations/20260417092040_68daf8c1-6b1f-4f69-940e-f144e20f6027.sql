create table public.report_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  name text not null,
  email text not null,
  company text,
  rgpd_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.report_requests enable row level security;

create policy "Anyone can submit report requests"
  on public.report_requests
  for insert
  to anon, authenticated
  with check (true);

create index idx_report_requests_email on public.report_requests(email);
create index idx_report_requests_created_at on public.report_requests(created_at desc);