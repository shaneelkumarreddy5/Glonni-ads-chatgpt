-- Step 1 advisor hardening: make locked-table intent explicit and cover the
-- administrative grantor foreign key used by future role-history queries.

create index user_roles_granted_by_lookup
  on public.user_roles (granted_by)
  where granted_by is not null;

create policy user_roles_deny_client_access
on public.user_roles
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create policy audit_events_deny_client_access
on public.audit_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

