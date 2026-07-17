create table if not exists public.webhook_events (
  id text primary key,
  provider text not null,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

revoke all on table public.webhook_events from anon, authenticated;

create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at desc);
