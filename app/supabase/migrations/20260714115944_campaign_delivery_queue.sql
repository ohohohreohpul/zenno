alter table public.workspaces
  add column if not exists timezone text not null default 'UTC',
  add column if not exists currency text not null default 'USD',
  add column if not exists business_hours jsonb not null default '{"days":[1,2,3,4,5],"start":"09:00","end":"17:00"}'::jsonb;

alter table public.campaign_enrollments
  add column if not exists delivery_status text not null default 'queued',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists last_error text,
  add column if not exists sent_at timestamptz,
  add column if not exists message_content text,
  add column if not exists message_id text references public.messages(id) on delete set null;

alter table public.appointments
  add column if not exists schedule_slot_id text references public.schedule_slots(id) on delete set null;

create index if not exists appointments_slot_occurrence_idx
  on public.appointments(schedule_slot_id, starts_at);

create or replace function public.book_schedule_slot(
  slot_id_param text,
  starts_at_param timestamptz,
  contact_id_param text,
  contact_name_param text,
  channel_param text,
  kind_param text
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  slot public.schedule_slots;
  booked_count integer;
  created public.appointments;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then raise exception 'Unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtext(slot_id_param || starts_at_param::text));
  select * into slot from public.schedule_slots where id = slot_id_param;
  if slot.id is null then return null; end if;
  select count(*) into booked_count from public.appointments
    where schedule_slot_id = slot.id and starts_at = starts_at_param;
  if booked_count >= slot.capacity then return null; end if;
  insert into public.appointments (
    workspace_id, contact_id, contact_name, class_name, starts_at, duration_min, channel, kind, schedule_slot_id
  ) values (
    slot.workspace_id, contact_id_param, contact_name_param,
    case when kind_param = 'trial' then slot.class_name || ' (Trial)' else slot.class_name end,
    starts_at_param, slot.duration_min, channel_param, kind_param, slot.id
  ) returning * into created;
  return to_jsonb(created);
end;
$$;

revoke execute on function public.book_schedule_slot(text,timestamptz,text,text,text,text) from public;
grant execute on function public.book_schedule_slot(text,timestamptz,text,text,text,text) to anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_enrollments_delivery_status_check'
  ) then
    alter table public.campaign_enrollments
      add constraint campaign_enrollments_delivery_status_check
      check (delivery_status in ('queued','sending','retry','delivered','failed','skipped'));
  end if;
end $$;

create index if not exists campaign_enrollments_due_idx
  on public.campaign_enrollments(next_run_at, created_at)
  where delivery_status in ('queued','retry');

create or replace function public.claim_campaign_enrollments(batch_size_param integer default 1)
returns setof public.campaign_enrollments
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not private.is_server_request() then
    raise exception 'Unauthorized';
  end if;

  return query
  with due as (
    select id
    from public.campaign_enrollments
    where (
        delivery_status in ('queued', 'retry')
        or (delivery_status = 'sending' and last_attempt_at < now() - interval '5 minutes')
      )
      and coalesce(next_run_at, now()) <= now()
    order by coalesce(next_run_at, created_at), created_at
    for update skip locked
    limit greatest(1, least(batch_size_param, 10))
  )
  update public.campaign_enrollments as enrollment
  set delivery_status = 'sending',
      attempt_count = enrollment.attempt_count + 1,
      last_attempt_at = now(),
      last_error = null
  from due
  where enrollment.id = due.id
  returning enrollment.*;
end;
$$;

revoke execute on function public.claim_campaign_enrollments(integer) from public;
grant execute on function public.claim_campaign_enrollments(integer) to anon, authenticated, service_role;
