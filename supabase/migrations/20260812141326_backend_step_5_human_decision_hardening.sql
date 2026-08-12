-- Enforce protected human/provider decision boundaries at the history-table layer.
-- A rejected history insert rolls back the entire lifecycle transaction atomically.

create function private.enforce_step5_actor_boundaries()
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
       and new.new_status in (
         'approved'::public.withdrawal_status,
         'processing'::public.withdrawal_status,
         'paid'::public.withdrawal_status,
         'failed'::public.withdrawal_status,
         'cancelled'::public.withdrawal_status,
         'rejected'::public.withdrawal_status
       ) then
      raise exception 'AI agents cannot approve, reject, cancel, process or settle withdrawals';
    end if;

    if tg_table_name = 'kyc_status_history'
       and new.new_status in (
         'verified'::public.kyc_status,
         'rejected'::public.kyc_status,
         'expired'::public.kyc_status,
         'cancelled'::public.kyc_status
       ) then
      raise exception 'AI agents cannot make final KYC decisions';
    end if;

    if tg_table_name = 'appeal_status_history'
       and new.new_status in (
         'approved'::public.appeal_status,
         'partially_approved'::public.appeal_status,
         'upheld'::public.appeal_status
       ) then
      raise exception 'AI agents cannot decide appeals';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_step5_actor_boundaries()
from public, anon, authenticated, service_role;

create trigger withdrawal_history_actor_boundaries
before insert on public.withdrawal_status_history
for each row execute function private.enforce_step5_actor_boundaries();

create trigger kyc_history_actor_boundaries
before insert on public.kyc_status_history
for each row execute function private.enforce_step5_actor_boundaries();

create trigger appeal_history_actor_boundaries
before insert on public.appeal_status_history
for each row execute function private.enforce_step5_actor_boundaries();
