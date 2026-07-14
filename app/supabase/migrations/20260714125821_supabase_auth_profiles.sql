alter table public.users
  add column if not exists auth_user_id uuid;

alter table public.users
  alter column password_hash set default '';

create unique index if not exists users_auth_user_id_key
  on public.users(auth_user_id) where auth_user_id is not null;

create or replace function public.provision_authenticated_user(
  auth_user_id_param uuid,
  email_param text,
  name_param text,
  business_name_param text
) returns table(agency_id text, workspace_id text, user_name text)
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  profile public.users%rowtype;
  new_agency_id text;
  new_workspace_id text;
  clean_name text := coalesce(nullif(trim(name_param), ''), split_part(lower(email_param), '@', 1));
  clean_business_name text := coalesce(nullif(trim(business_name_param), ''), clean_name || '''s Business');
  base_slug text;
  unique_slug text;
begin
  if not private.is_server_request() then raise exception 'Unauthorized'; end if;

  select profile_row.* into profile
  from public.users profile_row
    where profile_row.auth_user_id = auth_user_id_param or lower(profile_row.email) = lower(email_param)
    order by (profile_row.auth_user_id = auth_user_id_param) desc
    limit 1;

  if profile.id is not null and profile.auth_user_id is not null and profile.auth_user_id <> auth_user_id_param then
    raise exception 'Email is already linked to another account';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(clean_business_name), '[^a-z0-9]+', '-', 'g'));
  if length(base_slug) < 2 then base_slug := 'business'; end if;
  unique_slug := left(base_slug, 28) || '-' || left(replace(auth_user_id_param::text, '-', ''), 8);

  if profile.id is not null and profile.agency_id is not null then
    new_agency_id := profile.agency_id;
    update public.users set auth_user_id = auth_user_id_param, name = clean_name, password_hash = '' where id = profile.id;
    update public.agencies set owner_id = auth_user_id_param::text where id = new_agency_id;
  else
    insert into public.agencies(name, slug, owner_id, credits, plan)
      values (clean_business_name, unique_slug, auth_user_id_param::text, 50, 'trial')
      returning id into new_agency_id;

    if profile.id is not null then
      update public.users set auth_user_id = auth_user_id_param, name = clean_name, password_hash = '', role = 'owner', agency_id = new_agency_id where id = profile.id;
    else
      insert into public.users(id, auth_user_id, email, password_hash, name, role, agency_id)
        values (auth_user_id_param::text, auth_user_id_param, lower(email_param), '', clean_name, 'owner', new_agency_id);
    end if;
  end if;

  select id into new_workspace_id from public.workspaces
    where public.workspaces.agency_id = new_agency_id order by created_at limit 1;

  if new_workspace_id is null then
    insert into public.workspaces(name, slug, agency_id)
      values (clean_business_name, unique_slug, new_agency_id)
      returning id into new_workspace_id;
  end if;

  return query select new_agency_id, new_workspace_id, clean_name;
end;
$$;

revoke execute on function public.provision_authenticated_user(uuid,text,text,text) from public;
grant execute on function public.provision_authenticated_user(uuid,text,text,text) to anon, authenticated, service_role;
