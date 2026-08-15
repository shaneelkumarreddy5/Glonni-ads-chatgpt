-- Step 11: authenticated device-security ingestion boundary.
-- Raw installation, network, and user-agent values are accepted only by the
-- service role and are converted to project-local HMACs before persistence.

do $block$
begin
  if not exists (
    select 1 from vault.secrets where name = 'glonni_device_hmac_key_v1'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'glonni_device_hmac_key_v1',
      'HMAC key for privacy-preserving device security identifiers'
    );
  end if;
end
$block$;

create or replace function private.device_identifier_hmac(p_value text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(
    extensions.hmac(
      pg_catalog.convert_to(p_value, 'UTF8'),
      pg_catalog.convert_to(secret.decrypted_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  )
  from vault.decrypted_secrets as secret
  where secret.name = 'glonni_device_hmac_key_v1'
  limit 1
$$;

revoke all on function private.device_identifier_hmac(text)
from public, anon, authenticated;
grant execute on function private.device_identifier_hmac(text) to service_role;

create or replace function public.record_authenticated_device_observation(
  p_user_id uuid,
  p_auth_session_id uuid,
  p_installation_id text,
  p_platform text,
  p_network_value text,
  p_user_agent text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing_user_id uuid;
  v_result jsonb;
begin
  if p_user_id is null or p_request_id is null then
    raise exception 'user id and request id are required';
  end if;
  if p_installation_id is null
     or p_installation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'installation id is invalid';
  end if;
  if p_platform not in ('web', 'android', 'ios', 'unknown') then
    raise exception 'platform is invalid';
  end if;
  if p_network_value is not null and length(p_network_value) > 64 then
    raise exception 'network value is too long';
  end if;
  if p_user_agent is not null and length(p_user_agent) > 512 then
    raise exception 'user agent is too long';
  end if;

  select observation.user_id into v_existing_user_id
  from private.session_security_observations as observation
  where observation.request_id = p_request_id;

  if found and v_existing_user_id <> p_user_id then
    raise exception 'request id belongs to another user';
  end if;

  if not found and (
    select count(*)
    from private.session_security_observations as observation
    where observation.user_id = p_user_id
      and observation.observed_at >= statement_timestamp() - interval '1 minute'
  ) >= 12 then
    raise exception 'device observation rate limit exceeded' using errcode = 'P0001';
  end if;

  v_result := private.ingest_security_observation(
    p_user_id => p_user_id,
    p_auth_session_id => p_auth_session_id,
    p_fingerprint_hmac => private.device_identifier_hmac('installation:v1:' || lower(p_installation_id)),
    p_platform => p_platform,
    p_network_hmac => case when p_network_value is null then null
      else private.device_identifier_hmac('network:v1:' || p_network_value) end,
    p_user_agent_hmac => case when p_user_agent is null then null
      else private.device_identifier_hmac('user-agent:v1:' || p_user_agent) end,
    p_country_code => null,
    p_network_asn => null,
    p_vpn_detected => null,
    p_proxy_detected => null,
    p_tor_detected => null,
    p_emulator_detected => null,
    p_rooted_detected => null,
    p_evidence_verified => false,
    p_evidence_source => 'system',
    p_request_id => p_request_id,
    p_evidence => jsonb_build_object('collector', 'record-device-security', 'version', 1)
  );

  return v_result;
end;
$$;

revoke all on function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) to service_role;

comment on function public.record_authenticated_device_observation(
  uuid, uuid, text, text, text, text, uuid
) is 'Service-only Step 11 boundary. HMACs transient raw identifiers before Step 10 ingestion.';
