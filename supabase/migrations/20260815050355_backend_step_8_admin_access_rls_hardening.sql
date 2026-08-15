grant select (user_id, role, is_active, revoked_at)
on public.user_roles to authenticated;

create policy user_roles_select_own_admin_access
on public.user_roles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and is_active
  and revoked_at is null
  and role in (
    'owner'::public.app_role,
    'finance'::public.app_role,
    'support'::public.app_role,
    'kyc_risk'::public.app_role,
    'content'::public.app_role,
    'analyst'::public.app_role
  )
);

alter function public.get_my_admin_access() security invoker;

comment on function public.get_my_admin_access() is
  'Security-invoker RPC returning only the caller own active admin-console authorization through self-only RLS. MFA is enforced by the Next.js admin boundary.';
