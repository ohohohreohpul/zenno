grant insert on table public.webhook_events to anon, authenticated, service_role;
grant select, delete on table public.webhook_events to service_role;

create policy server_insert on public.webhook_events
  for insert
  to anon, authenticated
  with check (private.is_server_request());
