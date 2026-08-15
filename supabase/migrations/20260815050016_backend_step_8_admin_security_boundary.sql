create or replace function public.get_my_admin_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.account_status;
  v_roles text[] := array[]::text[];
begin
  if v_user_id is null then
    return jsonb_build_object('authorized', false, 'roles', jsonb_build_array());
  end if;

  select p.status into v_status
  from public.profiles p
  where p.id = v_user_id;

  select coalesce(array_agg(r.role::text order by r.role::text), array[]::text[])
  into v_roles
  from public.user_roles r
  where r.user_id = v_user_id
    and r.is_active
    and r.revoked_at is null
    and r.role in (
      'owner'::public.app_role,
      'finance'::public.app_role,
      'support'::public.app_role,
      'kyc_risk'::public.app_role,
      'content'::public.app_role,
      'analyst'::public.app_role
    );

  return jsonb_build_object(
    'authorized', v_status = 'active'::public.account_status and cardinality(v_roles) > 0,
    'roles', to_jsonb(v_roles)
  );
end;
$$;

revoke all on function public.get_my_admin_access() from public;
revoke all on function public.get_my_admin_access() from anon;
grant execute on function public.get_my_admin_access() to authenticated;
grant execute on function public.get_my_admin_access() to service_role;

create or replace function private.grant_admin_role(
  p_user_id uuid,
  p_role public.app_role,
  p_reason text,
  p_actor_id uuid,
  p_request_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id bigint;
  v_owner_exists boolean;
begin
  if p_role not in (
    'owner'::public.app_role,
    'finance'::public.app_role,
    'support'::public.app_role,
    'kyc_risk'::public.app_role,
    'content'::public.app_role,
    'analyst'::public.app_role
  ) then
    raise exception 'role_not_eligible_for_admin_console';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) < 8 then
    raise exception 'grant_reason_required';
  end if;

  if not exists (
    select 1 from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = p_user_id and p.status = 'active'::public.account_status
  ) then
    raise exception 'target_user_not_active';
  end if;

  select exists (
    select 1
    from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
      and p.status = 'active'::public.account_status
  ) into v_owner_exists;

  if p_actor_id is null then
    if v_owner_exists or p_role <> 'owner'::public.app_role then
      raise exception 'bootstrap_owner_grant_not_allowed';
    end if;
  elsif not exists (
    select 1
    from public.user_roles r
    join public.profiles p on p.id = r.user_id
    where r.user_id = p_actor_id
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
      and p.status = 'active'::public.account_status
  ) then
    raise exception 'active_owner_required';
  end if;

  select r.id into v_role_id
  from public.user_roles r
  where r.user_id = p_user_id and r.role = p_role and not r.is_active
  order by r.created_at desc
  limit 1
  for update;

  if v_role_id is null then
    insert into public.user_roles (user_id, role, is_active, granted_by, grant_reason)
    values (p_user_id, p_role, true, p_actor_id, btrim(p_reason))
    returning id into v_role_id;
  else
    update public.user_roles
    set is_active = true,
        granted_by = p_actor_id,
        grant_reason = btrim(p_reason),
        granted_at = now(),
        revoked_at = null
    where id = v_role_id;
  end if;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    reason, request_id, new_data, metadata
  ) values (
    case when p_actor_id is null then 'system'::public.audit_actor_type else 'admin'::public.audit_actor_type end,
    p_actor_id,
    'admin.role.granted',
    'user_role',
    v_role_id::text,
    btrim(p_reason),
    p_request_id,
    jsonb_build_object('user_id', p_user_id, 'role', p_role::text, 'is_active', true),
    jsonb_build_object('bootstrap', p_actor_id is null)
  );

  return v_role_id;
end;
$$;

revoke all on function private.grant_admin_role(uuid, public.app_role, text, uuid, uuid) from public;
revoke all on function private.grant_admin_role(uuid, public.app_role, text, uuid, uuid) from anon;
revoke all on function private.grant_admin_role(uuid, public.app_role, text, uuid, uuid) from authenticated;
grant execute on function private.grant_admin_role(uuid, public.app_role, text, uuid, uuid) to service_role;

comment on function public.get_my_admin_access() is
  'Returns only the caller own active admin-console authorization. MFA is enforced by the Next.js admin boundary.';
comment on function private.grant_admin_role(uuid, public.app_role, text, uuid, uuid) is
  'Service-only audited role grant. Allows exactly one bootstrap owner before an active owner exists.';
