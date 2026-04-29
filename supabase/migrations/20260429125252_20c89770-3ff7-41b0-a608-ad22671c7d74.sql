-- 1. Custos diários agregados por provedor.
create table public.cost_daily (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('apify','openai','dataforseo')),
  day date not null,
  amount_usd numeric(10,4) not null default 0,
  call_count integer not null default 0,
  details jsonb,
  collected_at timestamptz not null default now(),
  unique (provider, day)
);
create index idx_cost_daily_day on public.cost_daily (day desc);
create index idx_cost_daily_provider_day on public.cost_daily (provider, day desc);
alter table public.cost_daily enable row level security;

-- 2. Configuração admin (caps + flags futuras).
create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.app_config enable row level security;

insert into public.app_config (key, value) values
  ('cost_cap_apify_usd','29'),
  ('cost_cap_openai_usd','25'),
  ('cost_cap_dataforseo_usd','50');