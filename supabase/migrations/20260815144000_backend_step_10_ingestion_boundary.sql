-- Keep risk/review tables inaccessible to service_role itself. High-risk
-- observations remain in the Step 10 review index; promotion into Step 5's
-- human decision queue will be performed later by a separately authorized
-- worker rather than widening the database privilege boundary here.

create or replace function private.ingest_security_observation(
  p_user_id uuid,
  p_auth_session_id uuid,
  p_fingerprint_hmac text,
  p_platform text,
  p_network_hmac text,
  p_user_agent_hmac text,
  p_country_code text,
  p_network_asn bigint,
  p_vpn_detected boolean,
  p_proxy_detected boolean,
  p_tor_detected boolean,
  p_emulator_detected boolean,
  p_rooted_detected boolean,
  p_evidence_verified boolean,
  p_evidence_source text,
  p_request_id uuid,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_device private.device_identities%rowtype;
  v_observation private.session_security_observations%rowtype;
  v_distinct_users smallint;
  v_score smallint := 0;
  v_level public.security_risk_level := 'unknown';
  v_blocked boolean := false;
begin
  if p_user_id is null or p_request_id is null then
    raise exception 'user id and request id are required';
  end if;
  if p_fingerprint_hmac is null or p_fingerprint_hmac !~ '^[a-f0-9]{64}$' then
    raise exception 'valid server-generated fingerprint HMAC is required';
  end if;
  if p_network_hmac is not null and p_network_hmac !~ '^[a-f0-9]{64}$' then
    raise exception 'network HMAC is invalid';
  end if;
  if p_user_agent_hmac is not null and p_user_agent_hmac !~ '^[a-f0-9]{64}$' then
    raise exception 'user-agent HMAC is invalid';
  end if;
  if p_platform not in ('web', 'android', 'ios', 'unknown') then
    raise exception 'platform is invalid';
  end if;
  if p_evidence_source not in ('system', 'fraud_provider', 'admin') then
    raise exception 'evidence source is invalid';
  end if;
  if p_country_code is not null and upper(p_country_code) !~ '^[A-Z]{2}$' then
    raise exception 'country code is invalid';
  end if;
  if jsonb_typeof(coalesce(p_evidence, '{}'::jsonb)) <> 'object' then
    raise exception 'evidence must be a JSON object';
  end if;
  if coalesce(p_evidence, '{}'::jsonb) ?| array[
    'ip', 'ip_address', 'user_agent', 'fingerprint', 'access_token',
    'refresh_token', 'authorization', 'cookie'
  ] then
    raise exception 'evidence contains a prohibited raw identifier or credential';
  end if;

  select * into v_observation
  from private.session_security_observations
  where request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'observation_id', v_observation.observation_id,
      'risk_score', v_observation.risk_score,
      'risk_level', v_observation.risk_level,
      'review_required', v_observation.review_required
    );
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found';
  end if;
  if p_auth_session_id is not null and not exists (
    select 1 from auth.sessions
    where id = p_auth_session_id and user_id = p_user_id
  ) then
    raise exception 'session does not belong to user';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint_hmac, 10));

  insert into private.device_identities (
    fingerprint_hmac, platform, first_seen_at, last_seen_at
  ) values (
    p_fingerprint_hmac, p_platform, statement_timestamp(), statement_timestamp()
  )
  on conflict (fingerprint_hmac) do update
    set platform = excluded.platform,
        last_seen_at = statement_timestamp(),
        updated_at = statement_timestamp()
  returning * into v_device;

  insert into private.device_user_links (
    device_id, user_id, link_state, first_seen_at, last_seen_at, observation_count
  ) values (
    v_device.id, p_user_id, 'active', statement_timestamp(), statement_timestamp(), 1
  )
  on conflict (device_id, user_id) do update
    set link_state = 'active',
        last_seen_at = statement_timestamp(),
        observation_count = private.device_user_links.observation_count + 1,
        updated_at = statement_timestamp();

  select count(*)::smallint into v_distinct_users
  from private.device_user_links
  where device_id = v_device.id and link_state = 'active';

  select exists (
    select 1 from private.security_blocklist_entries
    where status = 'active'
      and (
        (identity_kind = 'device' and identity_hmac = p_fingerprint_hmac)
        or (identity_kind = 'network' and identity_hmac = p_network_hmac)
        or (identity_kind = 'user_agent' and identity_hmac = p_user_agent_hmac)
      )
  ) into v_blocked;

  if v_blocked then
    v_score := 100;
  else
    if v_distinct_users = 2 then v_score := v_score + 15; end if;
    if v_distinct_users >= 3 then v_score := v_score + 40; end if;
    if p_evidence_verified then
      if coalesce(p_vpn_detected, false) then v_score := v_score + 25; end if;
      if coalesce(p_proxy_detected, false) then v_score := v_score + 25; end if;
      if coalesce(p_tor_detected, false) then v_score := v_score + 50; end if;
      if coalesce(p_emulator_detected, false) then v_score := v_score + 30; end if;
      if coalesce(p_rooted_detected, false) then v_score := v_score + 30; end if;
    end if;
    v_score := least(v_score, 100);
  end if;

  v_level := case
    when v_score >= 90 then 'critical'::public.security_risk_level
    when v_score >= 60 then 'high'::public.security_risk_level
    when v_score >= 25 then 'medium'::public.security_risk_level
    when v_score > 0 then 'low'::public.security_risk_level
    else 'unknown'::public.security_risk_level
  end;

  update private.device_identities
  set distinct_user_count = v_distinct_users,
      trust_state = case
        when v_blocked then 'blocked'::public.device_trust_state
        when v_score >= 60 then 'restricted'::public.device_trust_state
        else trust_state
      end,
      last_seen_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where id = v_device.id;

  insert into private.session_security_observations (
    request_id, user_id, auth_session_id, device_id, network_hmac,
    user_agent_hmac, country_code, network_asn, vpn_detected, proxy_detected,
    tor_detected, emulator_detected, rooted_detected, evidence_verified,
    evidence_source, risk_score, risk_level, review_required, observed_at, evidence
  ) values (
    p_request_id, p_user_id, p_auth_session_id, v_device.id, p_network_hmac,
    p_user_agent_hmac, upper(p_country_code), p_network_asn, p_vpn_detected,
    p_proxy_detected, p_tor_detected, p_emulator_detected, p_rooted_detected,
    p_evidence_verified, p_evidence_source, v_score, v_level,
    v_level in ('high', 'critical'), statement_timestamp(), coalesce(p_evidence, '{}'::jsonb)
  ) returning * into v_observation;

  return jsonb_build_object(
    'observation_id', v_observation.observation_id,
    'device_id', v_device.device_id,
    'distinct_user_count', v_distinct_users,
    'risk_score', v_score,
    'risk_level', v_level,
    'review_required', v_observation.review_required
  );
end;
$$;

revoke all on function private.ingest_security_observation(
  uuid, uuid, text, text, text, text, text, bigint,
  boolean, boolean, boolean, boolean, boolean, boolean, text, uuid, jsonb
) from public, anon, authenticated;
grant execute on function private.ingest_security_observation(
  uuid, uuid, text, text, text, text, text, bigint,
  boolean, boolean, boolean, boolean, boolean, boolean, text, uuid, jsonb
) to service_role;
