-- Step 17.1 advisor hardening: cache the MFA JWT lookup per statement and
-- cover every foreign key used for administrator/history lookups.

create index agent_instructions_updated_by_idx
  on public.agent_instructions (updated_by);
create index agent_instruction_versions_changed_by_idx
  on public.agent_instruction_versions (changed_by)
  where changed_by is not null;
create index agent_instruction_messages_actor_id_idx
  on public.agent_instruction_messages (actor_id)
  where actor_id is not null;

alter policy agent_instructions_admin_read
on public.agent_instructions
using (
  (select auth.uid()) is not null
  and ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.is_active
      and r.revoked_at is null
      and r.role in ('owner'::public.app_role, 'finance'::public.app_role, 'support'::public.app_role, 'kyc_risk'::public.app_role, 'content'::public.app_role, 'analyst'::public.app_role)
  )
);

alter policy agent_instructions_owner_insert
on public.agent_instructions
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
);

alter policy agent_instructions_owner_update
on public.agent_instructions
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
)
with check (
  updated_by = (select auth.uid())
  and ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
);

alter policy agent_instruction_versions_admin_read
on public.agent_instruction_versions
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.is_active
      and r.revoked_at is null
      and r.role in ('owner'::public.app_role, 'finance'::public.app_role, 'support'::public.app_role, 'kyc_risk'::public.app_role, 'content'::public.app_role, 'analyst'::public.app_role)
  )
);

alter policy agent_instruction_messages_admin_read
on public.agent_instruction_messages
using (
  ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.is_active
      and r.revoked_at is null
      and r.role in ('owner'::public.app_role, 'finance'::public.app_role, 'support'::public.app_role, 'kyc_risk'::public.app_role, 'content'::public.app_role, 'analyst'::public.app_role)
  )
);

alter policy agent_instruction_messages_owner_insert
on public.agent_instruction_messages
with check (
  actor_type = 'admin'
  and actor_id = (select auth.uid())
  and ((select auth.jwt()) ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
);
