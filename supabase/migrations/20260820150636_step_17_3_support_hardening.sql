-- Step 17.3 hardening: cache authorization evaluation per statement and cover
-- support foreign keys used by joins, deletes and operational audit queries.

create function private.has_support_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and ((select auth.jwt()) ->> 'aal') = 'aal2'
    and exists (
      select 1
      from public.user_roles r
      where r.user_id = (select auth.uid())
        and r.is_active
        and r.revoked_at is null
        and r.role = any(p_roles)
    );
$$;
revoke all on function private.has_support_role(public.app_role[]) from public, anon, authenticated;
grant execute on function private.has_support_role(public.app_role[]) to authenticated;

alter policy support_tickets_admin_read on public.support_tickets
  using ((select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_tickets_admin_insert on public.support_tickets
  with check (created_by = (select auth.uid()) and updated_by = (select auth.uid()) and (select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_tickets_admin_update on public.support_tickets
  using ((select private.has_support_role(array['owner','support']::public.app_role[])))
  with check (updated_by = (select auth.uid()) and (select private.has_support_role(array['owner','support']::public.app_role[])));

alter policy support_messages_admin_read on public.support_ticket_messages
  using ((select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_messages_admin_insert on public.support_ticket_messages
  with check (actor_type = 'admin' and actor_id = (select auth.uid()) and (select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_events_admin_read on public.support_ticket_events
  using ((select private.has_support_role(array['owner','support']::public.app_role[])));

alter policy support_tasks_admin_read on public.support_tasks
  using ((select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_tasks_admin_insert on public.support_tasks
  with check (created_by = (select auth.uid()) and (select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_tasks_admin_update on public.support_tasks
  using ((select private.has_support_role(array['owner','support']::public.app_role[])))
  with check ((select private.has_support_role(array['owner','support']::public.app_role[])));

alter policy support_approvals_admin_read on public.support_approvals
  using ((select private.has_support_role(array['owner','support','finance','kyc_risk']::public.app_role[])));
alter policy support_approvals_request on public.support_approvals
  with check (requested_by = (select auth.uid()) and status = 'pending' and (select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_approvals_owner_decide on public.support_approvals
  using ((select private.has_support_role(array['owner']::public.app_role[])))
  with check (decided_by = (select auth.uid()) and status in ('approved','rejected','cancelled') and (select private.has_support_role(array['owner']::public.app_role[])));

alter policy support_automations_admin_read on public.support_automations
  using ((select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_automations_owner_insert on public.support_automations
  with check (created_by = (select auth.uid()) and (select private.has_support_role(array['owner']::public.app_role[])));
alter policy support_automations_owner_update on public.support_automations
  using ((select private.has_support_role(array['owner']::public.app_role[])))
  with check ((select private.has_support_role(array['owner']::public.app_role[])));

alter policy support_connections_admin_read on public.support_connections
  using ((select private.has_support_role(array['owner','support']::public.app_role[])));
alter policy support_connections_owner_insert on public.support_connections
  with check (configured_by = (select auth.uid()) and (select private.has_support_role(array['owner']::public.app_role[])));
alter policy support_connections_owner_update on public.support_connections
  using ((select private.has_support_role(array['owner']::public.app_role[])))
  with check ((select private.has_support_role(array['owner']::public.app_role[])));
alter policy support_reports_admin_read on public.support_reports
  using ((select private.has_support_role(array['owner','support','analyst']::public.app_role[])));

create index support_tickets_assigned_admin_idx on public.support_tickets (assigned_admin_id) where assigned_admin_id is not null;
create index support_tickets_created_by_idx on public.support_tickets (created_by) where created_by is not null;
create index support_tickets_updated_by_idx on public.support_tickets (updated_by) where updated_by is not null;
create index support_ticket_messages_actor_idx on public.support_ticket_messages (actor_id) where actor_id is not null;
create index support_ticket_events_actor_idx on public.support_ticket_events (actor_id) where actor_id is not null;
create index support_tasks_ticket_idx on public.support_tasks (ticket_id) where ticket_id is not null;
create index support_tasks_created_by_idx on public.support_tasks (created_by);
create index support_approvals_ticket_idx on public.support_approvals (ticket_id) where ticket_id is not null;
create index support_approvals_requested_by_idx on public.support_approvals (requested_by);
create index support_approvals_decided_by_idx on public.support_approvals (decided_by) where decided_by is not null;
create index support_automations_approved_by_idx on public.support_automations (approved_by) where approved_by is not null;
create index support_automations_created_by_idx on public.support_automations (created_by);
create index support_connections_configured_by_idx on public.support_connections (configured_by);

comment on function private.has_support_role(public.app_role[]) is
  'AAL2 and active admin-role check used by Step 17.3 RLS policies. Kept outside exposed schemas and callable only by authenticated sessions.';
