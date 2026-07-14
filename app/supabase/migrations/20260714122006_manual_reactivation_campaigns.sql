alter table public.campaigns
  add column if not exists campaign_type text not null default 'triggered',
  add column if not exists audience jsonb not null default '{"stages":[],"tags":[],"inactiveDays":null,"lostOnly":false,"contactIds":[],"resumeBot":true}'::jsonb,
  add column if not exists follow_up_delays_days integer[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'campaigns_campaign_type_check') then
    alter table public.campaigns add constraint campaigns_campaign_type_check
      check (campaign_type in ('manual','triggered'));
  end if;
end $$;

create table if not exists public.campaign_runs (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaign_enrollments
  add column if not exists run_id text references public.campaign_runs(id) on delete cascade,
  add column if not exists sends_completed integer not null default 0;

alter table public.campaign_enrollments
  drop constraint if exists campaign_enrollments_campaign_id_contact_id_key;

create unique index if not exists campaign_enrollments_run_contact_key
  on public.campaign_enrollments(run_id, contact_id) where run_id is not null;
create unique index if not exists campaign_enrollments_trigger_contact_key
  on public.campaign_enrollments(campaign_id, contact_id) where run_id is null;
create index if not exists campaign_runs_campaign_idx
  on public.campaign_runs(campaign_id, created_at desc);

alter table public.campaign_runs enable row level security;
drop policy if exists server_access on public.campaign_runs;
create policy server_access on public.campaign_runs for all to anon, authenticated
  using (private.is_server_request()) with check (private.is_server_request());
grant select, insert, update, delete on table public.campaign_runs to anon, authenticated, service_role;

drop trigger if exists set_updated_at on public.campaign_runs;
create trigger set_updated_at before update on public.campaign_runs
  for each row execute function public.set_updated_at();

create or replace function public.find_campaign_audience(
  workspace_id_param text,
  stages_param text[] default '{}',
  tags_param text[] default '{}',
  inactive_days_param integer default null,
  lost_only_param boolean default false,
  contact_ids_param text[] default '{}'
) returns setof public.contacts
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  return query
  select contact.* from public.contacts contact
  where contact.workspace_id = workspace_id_param
    and not contact.dnd
    and (coalesce(array_length(stages_param, 1), 0) = 0 or contact.lifecycle_stage = any(stages_param))
    and (coalesce(array_length(tags_param, 1), 0) = 0 or contact.tags && tags_param)
    and (coalesce(array_length(contact_ids_param, 1), 0) = 0 or contact.id = any(contact_ids_param))
    and (
      inactive_days_param is null or inactive_days_param <= 0 or not exists (
        select 1 from public.messages message
        where message.contact_id = contact.id
          and message.created_at > now() - make_interval(days => inactive_days_param)
      )
    )
    and (
      not lost_only_param or exists (
        select 1 from public.deals deal
        where deal.contact_id = contact.id and deal.stage = 'lost'
      )
    )
  order by contact.updated_at desc
  limit 1000;
end;
$$;

revoke execute on function public.find_campaign_audience(text,text[],text[],integer,boolean,text[]) from public;
grant execute on function public.find_campaign_audience(text,text[],text[],integer,boolean,text[]) to anon, authenticated, service_role;

create index if not exists messages_contact_created_desc_idx on public.messages(contact_id, created_at desc);
create index if not exists deals_lost_contact_idx on public.deals(contact_id) where stage = 'lost';
