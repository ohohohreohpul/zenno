create extension if not exists "pgcrypto";
create schema if not exists private;

create table if not exists agencies (
  id text primary key default gen_random_uuid()::text,
  name text not null, slug text not null unique, owner_id text not null,
  logo_url text, custom_domain text unique, brand_color text not null default '#000000',
  credits integer not null default 0 check (credits >= 0),
  plan text not null default 'trial' check (plan in ('trial','starter','pro','enterprise')),
  stripe_customer_id text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique, password_hash text not null, name text not null,
  role text not null default 'staff' check (role in ('owner','admin','staff')),
  agency_id text references agencies(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists workspaces (
  id text primary key default gen_random_uuid()::text,
  name text not null, slug text not null unique, logo_url text,
  agency_id text references agencies(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  external_id text not null, channel text not null,
  name text, phone text, instagram_handle text,
  lifecycle_stage text not null default 'inquiry' check (lifecycle_stage in ('inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip')),
  tags text[] not null default '{}', bot_active boolean not null default true, dnd boolean not null default false,
  chat_status text not null default 'open' check (chat_status in ('open','closed')),
  attention_required boolean not null default false, unread integer not null default 0,
  notes text not null default '', memory_summary text not null default '', memory_updated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id, external_id, channel)
);

create table if not exists messages (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  channel text not null, direction text not null check (direction in ('inbound','outbound')),
  content text not null, ai_generated boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists appointments (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  contact_id text references contacts(id) on delete set null, contact_name text not null, class_name text not null,
  starts_at timestamptz not null, duration_min integer not null default 60, channel text not null,
  kind text not null default 'regular' check (kind in ('trial','regular','consult')), created_at timestamptz not null default now()
);

create table if not exists deals (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  contact_id text references contacts(id) on delete set null, contact_name text not null, name text not null,
  value numeric not null default 0, currency text not null default 'THB',
  stage text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  channel text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  contact_id text references contacts(id) on delete set null, title text not null, contact_name text,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'todo' check (status in ('todo','in_progress','waiting','done')),
  due_date timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists schedule_slots (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  class_name text not null, day_of_week integer not null check (day_of_week between 0 and 6), time text not null,
  duration_min integer not null default 60, capacity integer not null check (capacity > 0),
  booked integer not null default 0 check (booked >= 0 and booked <= capacity), instructor text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null, status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  trigger_stage text, goal text not null default '', flow jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists campaign_enrollments (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  step_index integer not null default 0, status text not null default 'active' check (status in ('active','completed','exited')),
  enrolled_at timestamptz not null default now(), next_run_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(campaign_id, contact_id)
);

create table if not exists channel_connections (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  channel text not null, credentials jsonb not null default '{}'::jsonb, instance_name text not null,
  status text not null default 'disconnected' check (status in ('disconnected','pending_qr','connected')),
  phone_number text, warmup_started_at timestamptz,
  limits jsonb not null default '{"dailyCapBase":20,"dailyCapMax":200,"minDelaySeconds":15}'::jsonb,
  sent_date text, sent_today integer not null default 0, last_sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id, channel)
);

create table if not exists comment_automations (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  keyword text not null, post_label text not null, opening_dm text not null,
  status text not null default 'active' check (status in ('active','paused')),
  stats jsonb not null default '{"commentsCaptured":0,"dmsSent":0,"booked":0}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists workspace_ai_configs (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade unique,
  system_prompt text, knowledge_summary text,
  guardrails jsonb not null default '{"alwaysEscalateTopics":[],"maxDiscountPercent":null,"businessHoursOnly":false}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id text primary key default gen_random_uuid()::text,
  agency_id text not null references agencies(id) on delete cascade,
  delta integer not null, reason text not null, ref_id text, balance integer not null, created_at timestamptz not null default now()
);

create table if not exists stripe_events (
  id text primary key, type text not null, processed boolean not null default false, created_at timestamptz not null default now()
);

-- Stores only a SHA-256 hash of the server credential used with a publishable key.
-- This provides a secure server-only fallback when a service-role key is unavailable.
create table if not exists server_secrets (
  id text primary key check (id = 'primary'),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

alter table server_secrets enable row level security;
revoke all on table server_secrets from anon, authenticated;

create or replace function private.is_server_request() returns boolean
language sql stable security definer
set search_path = pg_catalog, public, private, extensions
as $$
  select exists (
    select 1
    from public.server_secrets
    where id = 'primary'
      and secret_hash = encode(
        digest(
          coalesce(
            (coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-zenno-server-secret'),
            ''
          ),
          'sha256'
        ),
        'hex'
      )
  )
$$;

revoke all on function private.is_server_request() from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_server_request() to anon, authenticated, service_role;

create index if not exists contacts_workspace_idx on contacts(workspace_id, updated_at desc);
create index if not exists messages_contact_idx on messages(contact_id, created_at);
create index if not exists appointments_workspace_idx on appointments(workspace_id, starts_at);
create index if not exists campaigns_workspace_idx on campaigns(workspace_id, status, trigger_stage);
create index if not exists channel_instance_idx on channel_connections(instance_name);
create index if not exists ledger_agency_idx on credit_ledger(agency_id, created_at desc);
create index if not exists users_agency_idx on users(agency_id);
create index if not exists workspaces_agency_idx on workspaces(agency_id);
create index if not exists messages_workspace_idx on messages(workspace_id);
create index if not exists appointments_contact_idx on appointments(contact_id);
create index if not exists deals_workspace_idx on deals(workspace_id);
create index if not exists deals_contact_idx on deals(contact_id);
create index if not exists tasks_workspace_idx on tasks(workspace_id);
create index if not exists tasks_contact_idx on tasks(contact_id);
create index if not exists schedule_slots_workspace_idx on schedule_slots(workspace_id);
create index if not exists campaign_enrollments_contact_idx on campaign_enrollments(contact_id);
create index if not exists comment_automations_workspace_idx on comment_automations(workspace_id);

create or replace function set_updated_at() returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['agencies','users','workspaces','contacts','deals','tasks','schedule_slots','campaigns','campaign_enrollments','channel_connections','comment_automations','workspace_ai_configs'] loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

create or replace function spend_credits(agency_id_param text, cost_param integer) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, private as $$
declare new_balance integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  update agencies set credits = credits - cost_param where id = agency_id_param and credits >= cost_param returning credits into new_balance;
  if new_balance is null then return jsonb_build_object('ok', false, 'balance', coalesce((select credits from agencies where id = agency_id_param), 0)); end if;
  return jsonb_build_object('ok', true, 'balance', new_balance);
end $$;

create or replace function add_credits(agency_id_param text, amount_param integer) returns integer language plpgsql security invoker set search_path = pg_catalog, public, private as $$
declare new_balance integer;
begin
if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
update agencies set credits = credits + amount_param where id = agency_id_param returning credits into new_balance;
if new_balance is null then raise exception 'Agency not found'; end if; return new_balance; end $$;

create or replace function increment_slot_booking(slot_id text, expected_booked integer) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, private as $$
declare updated schedule_slots;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  update schedule_slots set booked = booked + 1 where id = slot_id and booked = expected_booked and booked < capacity returning * into updated;
  if updated.id is null then return null; end if; return to_jsonb(updated);
end $$;

alter table agencies enable row level security;
alter table users enable row level security;
alter table workspaces enable row level security;
alter table contacts enable row level security;
alter table messages enable row level security;
alter table appointments enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table schedule_slots enable row level security;
alter table campaigns enable row level security;
alter table campaign_enrollments enable row level security;
alter table channel_connections enable row level security;
alter table comment_automations enable row level security;
alter table workspace_ai_configs enable row level security;
alter table credit_ledger enable row level security;
alter table stripe_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'agencies','users','workspaces','contacts','messages','appointments','deals','tasks',
    'schedule_slots','campaigns','campaign_enrollments','channel_connections',
    'comment_automations','workspace_ai_configs','credit_ledger','stripe_events'
  ] loop
    execute format('drop policy if exists server_access on %I', t);
    execute format(
      'create policy server_access on %I for all to anon, authenticated using (private.is_server_request()) with check (private.is_server_request())',
      t
    );
  end loop;
end $$;

drop function if exists public.is_server_request();

-- Server routes use either the service role or a publishable key plus the private server header.
-- Never expose AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY to the browser.
