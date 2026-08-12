-- Fix the shared decision-boundary trigger to compare heterogeneous status enums safely.

create or replace function private.enforce_step5_actor_boundaries()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.actor_type = 'ai_agent'::public.audit_actor_type then
    if not private.is_authorized_admin(new.actor_id, array['ai_agent']::public.app_role[]) then
      raise exception 'registered AI agent identity is required';
    end if;

    if tg_table_name = 'withdrawal_status_history'
       and new.new_status::text in (
         'approved', 'processing', 'paid', 'failed', 'cancelled', 'rejected'
       ) then
      raise exception 'AI agents cannot approve, reject, cancel, process or settle withdrawals';
    end if;

    if tg_table_name = 'kyc_status_history'
       and new.new_status::text in ('verified', 'rejected', 'expired', 'cancelled') then
      raise exception 'AI agents cannot make final KYC decisions';
    end if;

    if tg_table_name = 'appeal_status_history'
       and new.new_status::text in ('approved', 'partially_approved', 'upheld') then
      raise exception 'AI agents cannot decide appeals';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_step5_actor_boundaries()
from public, anon, authenticated, service_role;
