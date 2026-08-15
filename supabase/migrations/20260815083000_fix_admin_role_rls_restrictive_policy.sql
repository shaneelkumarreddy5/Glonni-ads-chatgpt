alter policy user_roles_deny_client_access
on public.user_roles
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
)
with check (false);

comment on policy user_roles_deny_client_access on public.user_roles is
  'Restrictive boundary permitting only self-read of active admin-console roles; all client writes remain denied.';
