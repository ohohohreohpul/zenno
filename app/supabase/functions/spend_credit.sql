-- Atomic credit spend/add with ledger entry.
-- Returns { success: bool, balance: int }
create or replace function spend_credit(
  p_agency_id uuid,
  p_delta     int,
  p_reason    text,
  p_ref_id    text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_current int;
  v_new     int;
begin
  -- Lock the row
  select credits into v_current
  from agencies
  where id = p_agency_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'balance', 0);
  end if;

  -- Reject spend if insufficient (negative delta = spend)
  if p_delta < 0 and v_current + p_delta < 0 then
    return jsonb_build_object('success', false, 'balance', v_current);
  end if;

  v_new := v_current + p_delta;

  -- Deduct/add
  update agencies
  set credits    = v_new,
      updated_at = now()
  where id = p_agency_id;

  -- Append to ledger
  insert into credit_ledger(agency_id, delta, reason, ref_id, balance)
  values (p_agency_id, p_delta, p_reason, p_ref_id, v_new);

  return jsonb_build_object('success', true, 'balance', v_new);
end;
$$;
