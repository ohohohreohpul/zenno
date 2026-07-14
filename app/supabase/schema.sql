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
  timezone text not null default 'UTC', currency text not null default 'USD',
  business_hours jsonb not null default '{"days":[1,2,3,4,5],"start":"09:00","end":"17:00"}'::jsonb,
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
  kind text not null default 'regular' check (kind in ('trial','regular','consult')),
  schedule_slot_id text,
  created_at timestamptz not null default now()
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

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_schedule_slot_id_fkey') then
    alter table appointments add constraint appointments_schedule_slot_id_fkey
      foreign key (schedule_slot_id) references schedule_slots(id) on delete set null;
  end if;
end $$;

create table if not exists campaigns (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null, status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  campaign_type text not null default 'triggered' check (campaign_type in ('manual','triggered')),
  trigger_stage text, goal text not null default '', flow jsonb not null default '[]'::jsonb,
  audience jsonb not null default '{"stages":[],"tags":[],"inactiveDays":null,"lostOnly":false,"contactIds":[],"resumeBot":true}'::jsonb,
  follow_up_delays_days integer[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists campaign_runs (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','cancelled')),
  started_at timestamptz not null default now(), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select, insert, update, delete on table campaign_runs to anon, authenticated, service_role;

create table if not exists campaign_enrollments (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references campaigns(id) on delete cascade,
  run_id text references campaign_runs(id) on delete cascade,
  contact_id text not null references contacts(id) on delete cascade,
  step_index integer not null default 0, status text not null default 'active' check (status in ('active','completed','exited')),
  enrolled_at timestamptz not null default now(), next_run_at timestamptz,
  delivery_status text not null default 'queued' check (delivery_status in ('queued','sending','retry','delivered','failed','skipped')),
  attempt_count integer not null default 0, sends_completed integer not null default 0, last_attempt_at timestamptz, last_error text, sent_at timestamptz,
  message_content text, message_id text references messages(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists channel_connections (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references workspaces(id) on delete cascade,
  channel text not null, credentials jsonb not null default '{}'::jsonb, instance_name text not null,
  status text not null default 'disconnected' check (status in ('disconnected','pending_qr','connected')),
  phone_number text, warmup_started_at timestamptz,
  limits jsonb not null default '{"dailyCapBase":50,"dailyCapMax":500,"newContactCapBase":0,"newContactCapMax":50,"rampDays":60,"minDelaySeconds":15}'::jsonb,
  sent_date text, sent_today integer not null default 0,
  new_contact_date text, new_contacts_today integer not null default 0,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id, channel)
);

-- Atomically reserves both the total proactive-send allowance and, when the
-- recipient has never engaged, the stricter new-contact allowance.
create or replace function public.reserve_channel_send(
  connection_id_param text,
  send_date_param text,
  message_cap_param integer,
  is_new_contact_param boolean,
  new_contact_cap_param integer
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  affected integer;
begin
  update public.channel_connections
  set sent_date = send_date_param,
      sent_today = case when sent_date = send_date_param then sent_today + 1 else 1 end,
      new_contact_date = case when is_new_contact_param then send_date_param else new_contact_date end,
      new_contacts_today = case
        when not is_new_contact_param then new_contacts_today
        when new_contact_date = send_date_param then new_contacts_today + 1
        else 1
      end,
      last_sent_at = now()
  where id = connection_id_param
    and (case when sent_date = send_date_param then sent_today else 0 end) < greatest(message_cap_param, 0)
    and (
      not is_new_contact_param
      or (case when new_contact_date = send_date_param then new_contacts_today else 0 end) < greatest(new_contact_cap_param, 0)
    );
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke execute on function public.reserve_channel_send(text, text, integer, boolean, integer) from public;
grant execute on function public.reserve_channel_send(text, text, integer, boolean, integer) to anon, authenticated, service_role;

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
create index if not exists messages_contact_created_desc_idx on messages(contact_id, created_at desc);
create index if not exists appointments_contact_idx on appointments(contact_id);
create index if not exists appointments_slot_occurrence_idx on appointments(schedule_slot_id, starts_at);
create index if not exists deals_workspace_idx on deals(workspace_id);
create index if not exists deals_contact_idx on deals(contact_id);
create index if not exists deals_lost_contact_idx on deals(contact_id) where stage = 'lost';
create index if not exists tasks_workspace_idx on tasks(workspace_id);
create index if not exists tasks_contact_idx on tasks(contact_id);
create index if not exists schedule_slots_workspace_idx on schedule_slots(workspace_id);
create index if not exists campaign_enrollments_contact_idx on campaign_enrollments(contact_id);
create unique index if not exists campaign_enrollments_run_contact_key on campaign_enrollments(run_id, contact_id) where run_id is not null;
create unique index if not exists campaign_enrollments_trigger_contact_key on campaign_enrollments(campaign_id, contact_id) where run_id is null;
create index if not exists campaign_runs_campaign_idx on campaign_runs(campaign_id, created_at desc);
create index if not exists campaign_enrollments_message_idx on campaign_enrollments(message_id) where message_id is not null;
create index if not exists campaign_enrollments_due_idx on campaign_enrollments(next_run_at, created_at) where delivery_status in ('queued','retry');
create index if not exists comment_automations_workspace_idx on comment_automations(workspace_id);

create or replace function set_updated_at() returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['agencies','users','workspaces','contacts','deals','tasks','schedule_slots','campaigns','campaign_runs','campaign_enrollments','channel_connections','comment_automations','workspace_ai_configs'] loop
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

create or replace function public.book_schedule_slot(
  slot_id_param text, starts_at_param timestamptz, contact_id_param text,
  contact_name_param text, channel_param text, kind_param text
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, private as $$
declare slot public.schedule_slots; booked_count integer; created public.appointments;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtext(slot_id_param || starts_at_param::text));
  select * into slot from public.schedule_slots where id = slot_id_param;
  if slot.id is null then return null; end if;
  select count(*) into booked_count from public.appointments where schedule_slot_id = slot.id and starts_at = starts_at_param;
  if booked_count >= slot.capacity then return null; end if;
  insert into public.appointments (workspace_id,contact_id,contact_name,class_name,starts_at,duration_min,channel,kind,schedule_slot_id)
  values (slot.workspace_id,contact_id_param,contact_name_param,case when kind_param='trial' then slot.class_name || ' (Trial)' else slot.class_name end,starts_at_param,slot.duration_min,channel_param,kind_param,slot.id)
  returning * into created;
  return to_jsonb(created);
end $$;

revoke execute on function public.book_schedule_slot(text,timestamptz,text,text,text,text) from public;
grant execute on function public.book_schedule_slot(text,timestamptz,text,text,text,text) to anon, authenticated, service_role;

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
alter table campaign_runs enable row level security;
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
    'schedule_slots','campaigns','campaign_runs','campaign_enrollments','channel_connections',
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

create or replace function public.claim_campaign_enrollments(batch_size_param integer default 1)
returns setof public.campaign_enrollments
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  return query
  with due as (
    select id from public.campaign_enrollments
    where (delivery_status in ('queued','retry') or (delivery_status = 'sending' and last_attempt_at < now() - interval '5 minutes'))
      and coalesce(next_run_at, now()) <= now()
    order by coalesce(next_run_at, created_at), created_at
    for update skip locked
    limit greatest(1, least(batch_size_param, 10))
  )
  update public.campaign_enrollments as enrollment
  set delivery_status = 'sending', attempt_count = enrollment.attempt_count + 1,
      last_attempt_at = now(), last_error = null
  from due where enrollment.id = due.id returning enrollment.*;
end;
$$;

revoke execute on function public.claim_campaign_enrollments(integer) from public;
grant execute on function public.claim_campaign_enrollments(integer) to anon, authenticated, service_role;

create or replace function public.find_campaign_audience(
  workspace_id_param text, stages_param text[] default '{}', tags_param text[] default '{}',
  inactive_days_param integer default null, lost_only_param boolean default false,
  contact_ids_param text[] default '{}'
) returns setof public.contacts
language plpgsql security invoker set search_path = pg_catalog, public, private as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  return query select contact.* from public.contacts contact
  where contact.workspace_id = workspace_id_param and not contact.dnd
    and (coalesce(array_length(stages_param,1),0)=0 or contact.lifecycle_stage=any(stages_param))
    and (coalesce(array_length(tags_param,1),0)=0 or contact.tags && tags_param)
    and (coalesce(array_length(contact_ids_param,1),0)=0 or contact.id=any(contact_ids_param))
    and (inactive_days_param is null or inactive_days_param<=0 or not exists (
      select 1 from public.messages message where message.contact_id=contact.id
        and message.created_at > now() - make_interval(days => inactive_days_param)))
    and (not lost_only_param or exists (
      select 1 from public.deals deal where deal.contact_id=contact.id and deal.stage='lost'))
  order by contact.updated_at desc limit 1000;
end $$;

revoke execute on function public.find_campaign_audience(text,text[],text[],integer,boolean,text[]) from public;
grant execute on function public.find_campaign_audience(text,text[],text[],integer,boolean,text[]) to anon, authenticated, service_role;

-- Server routes use either the service role or a publishable key plus the private server header.
-- Never expose AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY to the browser.
