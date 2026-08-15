-- Keep the privileged implementation outside the API schema. The public RPC
-- remains SECURITY INVOKER and only service_role can cross into the private,
-- owner-executed implementation after Edge Auth has verified the user JWT.

alter function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) set schema private;

alter function private.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) security definer;

revoke all on function private.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function private.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) to service_role;

create function public.record_authenticated_device_observation(
  p_user_id uuid,
  p_auth_session_id uuid,
  p_installation_id text,
  p_platform text,
  p_network_value text,
  p_user_agent text,
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.record_authenticated_device_observation(
    p_user_id,
    p_auth_session_id,
    p_installation_id,
    p_platform,
    p_network_value,
    p_user_agent,
    p_request_id
  )
$$;

revoke all on function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) to service_role;

comment on function private.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) is 'Private Step 11 privileged HMAC and ingestion implementation.';
comment on function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) is 'Service-only SECURITY INVOKER facade for the private Step 11 implementation.';
