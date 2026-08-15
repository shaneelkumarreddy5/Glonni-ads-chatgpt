-- Glonni Ads Backend Step 10: device and fraud-security foundation.
--
-- Identifiers are keyed HMAC digests produced by a trusted server/Edge Function;
-- raw fingerprints, IP addresses and user-agent strings are never stored here.
-- Client-reported VPN/emulator/root signals are retained as observations but only
-- verified provider/system evidence contributes to risk decisions.

create type public.device_trust_state as enum (
  'observed', 'trusted', 'restricted', 'blocked'
);

create type public.security_risk_level as enum (
  'unknown', 'low', 'medium', 'high', 'critical'
);

create table private.device_identities (
  id bigint generated always as identity primary key,
  device_id uuid not null default gen_random_uuid() unique,
  fingerprint_hmac text not null unique,
  platform text not null default 'unknown',
  trust_state public.device_trust_state not null default 'observed',
  distinct_user_count smallint not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint device_identities_fingerprint_hmac_format
    check (fingerprint_hmac ~ '^[a-f0-9]{64}$'),
  constraint device_identities_platform_valid
    check (platform in ('web', 'android', 'ios', 'unknown')),
  constraint device_identities_user_count_valid
    check (distinct_user_count >= 0),
  constraint device_identities_seen_order
    check (last_seen_at >= first_seen_at),
  constraint device_identities_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index device_identities_review_queue
  on private.device_identities (trust_state, distinct_user_count desc, last_seen_at desc)
  where trust_state in ('restricted', 'blocked') or distinct_user_count >= 2;

create table private.device_user_links (
  id bigint generated always as identity primary key,
  device_id bigint not null references private.device_identities(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  link_state text not null default 'active',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  observation_count bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_user_links_device_user_unique unique (device_id, user_id),
  constraint device_user_links_state_valid check (link_state in ('active', 'revoked')),
  constraint device_user_links_observation_count_valid check (observation_count > 0),
  constraint device_user_links_seen_order check (last_seen_at >= first_seen_at)
);

create index device_user_links_user_timeline
  on private.device_user_links (user_id, last_seen_at desc);
create index device_user_links_active_device
  on private.device_user_links (device_id, user_id)
  where link_state = 'active';

create table private.security_blocklist_entries (
  id bigint generated always as identity primary key,
  blocklist_entry_id uuid not null default gen_random_uuid() unique,
  identity_kind text not null,
  identity_hmac text not null,
  status text not null default 'active',
  reason_code text not null,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  revoked_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint security_blocklist_identity_kind_valid
    check (identity_kind in ('device', 'network', 'user_agent')),
  constraint security_blocklist_identity_hmac_format
    check (identity_hmac ~ '^[a-f0-9]{64}$'),
  constraint security_blocklist_status_valid check (status in ('active', 'revoked')),
  constraint security_blocklist_reason_length
    check (char_length(reason_code) between 2 and 80),
  constraint security_blocklist_notes_length
    check (notes is null or char_length(notes) between 3 and 500),
  constraint security_blocklist_revocation_consistent check (
    (status = 'active' and revoked_at is null and revoked_by is null)
    or (status = 'revoked' and revoked_at is not null and revoked_by is not null)
  ),
  constraint security_blocklist_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index security_blocklist_one_active_identity
  on private.security_blocklist_entries (identity_kind, identity_hmac)
  where status = 'active';
create index security_blocklist_creator_timeline
  on private.security_blocklist_entries (created_by, created_at desc);
create index security_blocklist_revoker_lookup
  on private.security_blocklist_entries (revoked_by)
  where revoked_by is not null;

create table private.session_security_observations (
  id bigint generated always as identity primary key,
  observation_id uuid not null default gen_random_uuid() unique,
  request_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  auth_session_id uuid references auth.sessions(id) on delete set null,
  device_id bigint not null references private.device_identities(id) on delete restrict,
  network_hmac text,
  user_agent_hmac text,
  country_code text,
  network_asn bigint,
  vpn_detected boolean,
  proxy_detected boolean,
  tor_detected boolean,
  emulator_detected boolean,
  rooted_detected boolean,
  evidence_verified boolean not null default false,
  evidence_source text not null,
  risk_score smallint not null default 0,
  risk_level public.security_risk_level not null default 'unknown',
  review_required boolean not null default false,
  observed_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  constraint session_security_network_hmac_format
    check (network_hmac is null or network_hmac ~ '^[a-f0-9]{64}$'),
  constraint session_security_user_agent_hmac_format
    check (user_agent_hmac is null or user_agent_hmac ~ '^[a-f0-9]{64}$'),
  constraint session_security_country_code_format
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint session_security_asn_valid check (network_asn is null or network_asn > 0),
  constraint session_security_source_valid
    check (evidence_source in ('system', 'fraud_provider', 'admin')),
  constraint session_security_score_range check (risk_score between 0 and 100),
  constraint session_security_evidence_object check (jsonb_typeof(evidence) = 'object'),
  constraint session_security_evidence_redacted check (
    not (evidence ?| array[
      'ip', 'ip_address', 'user_agent', 'fingerprint', 'access_token',
      'refresh_token', 'authorization', 'cookie'
    ])
  )
);

create index session_security_user_timeline
  on private.session_security_observations (user_id, observed_at desc);
create index session_security_session_timeline
  on private.session_security_observations (auth_session_id, observed_at desc)
  where auth_session_id is not null;
create index session_security_device_timeline
  on private.session_security_observations (device_id, observed_at desc);
create index session_security_review_queue
  on private.session_security_observations (risk_level, risk_score desc, observed_at)
  where review_required;

comment on table private.device_identities is
  'Pseudonymous device identities. fingerprint_hmac must be generated with a server-held pepper.';
comment on table private.session_security_observations is
  'Append-only server observations; unverified client signals never contribute to risk scoring.';
comment on column private.session_security_observations.evidence is
  'Redacted provider evidence only. Never store raw IPs, user agents, tokens or device fingerprints.';

create trigger session_security_observations_immutable
before update or delete on private.session_security_observations
for each row execute function private.reject_step5_history_mutation();

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
  v_signal_type public.risk_signal_type;
  v_signal_severity public.risk_severity;
  v_signal_basis text;
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
    select 1
    from private.security_blocklist_entries
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
    -- Only verified server/provider evidence affects these scores.
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

  if v_blocked then
    v_signal_type := 'device_anomaly';
    v_signal_severity := 'critical';
    v_signal_basis := 'A server-derived identifier matched the active security blocklist.';
  elsif v_distinct_users >= 3 then
    v_signal_type := 'device_anomaly';
    v_signal_severity := 'high';
    v_signal_basis := 'The same pseudonymous device is linked to three or more accounts.';
  elsif p_evidence_verified and (
    coalesce(p_emulator_detected, false) or coalesce(p_rooted_detected, false)
  ) then
    v_signal_type := 'automation_suspected';
    v_signal_severity := case when v_level in ('high', 'critical') then 'high' else 'medium' end;
    v_signal_basis := 'Verified device-integrity evidence requires review.';
  elsif p_evidence_verified and (
    coalesce(p_vpn_detected, false) or coalesce(p_proxy_detected, false)
    or coalesce(p_tor_detected, false)
  ) then
    v_signal_type := 'location_anomaly';
    v_signal_severity := case when v_level in ('high', 'critical') then 'high' else 'medium' end;
    v_signal_basis := 'Verified network-risk evidence requires review.';
  elsif v_distinct_users = 2 then
    v_signal_type := 'device_anomaly';
    v_signal_severity := 'medium';
    v_signal_basis := 'The same pseudonymous device is linked to two accounts; shared-device use may be legitimate.';
  end if;

  if v_signal_type is not null then
    perform private.record_risk_signal(
      p_user_id,
      v_signal_type,
      v_signal_severity,
      case when p_evidence_verified or v_blocked or v_distinct_users >= 2 then 1.000 else 0.500 end,
      'device_security',
      v_signal_basis,
      jsonb_build_object(
        'observation_id', v_observation.observation_id,
        'device_id', v_device.device_id,
        'distinct_user_count', v_distinct_users,
        'risk_score', v_score,
        'risk_level', v_level,
        'evidence_verified', p_evidence_verified
      ),
      p_request_id,
      case when p_evidence_source = 'fraud_provider' then 'provider'::public.audit_actor_type else 'system'::public.audit_actor_type end,
      null
    );
  end if;

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

create or replace function private.set_security_blocklist_entry(
  p_identity_kind text,
  p_identity_hmac text,
  p_reason_code text,
  p_notes text,
  p_actor_id uuid,
  p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry private.security_blocklist_entries%rowtype;
begin
  if not private.is_authorized_admin(
    p_actor_id,
    array['owner', 'kyc_risk']::public.app_role[]
  ) then
    raise exception 'authorized risk administrator is required';
  end if;
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_identity_kind not in ('device', 'network', 'user_agent') then
    raise exception 'identity kind is invalid';
  end if;
  if p_identity_hmac is null or p_identity_hmac !~ '^[a-f0-9]{64}$' then
    raise exception 'identity HMAC is invalid';
  end if;
  if char_length(trim(p_reason_code)) not between 2 and 80 then
    raise exception 'reason code is invalid';
  end if;

  select * into v_entry
  from private.security_blocklist_entries
  where identity_kind = p_identity_kind
    and identity_hmac = p_identity_hmac
    and status = 'active';
  if found then return v_entry.blocklist_entry_id; end if;

  insert into private.security_blocklist_entries (
    identity_kind, identity_hmac, reason_code, notes, created_by, metadata
  ) values (
    p_identity_kind, p_identity_hmac, trim(p_reason_code), nullif(trim(p_notes), ''),
    p_actor_id, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_entry;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    reason, request_id, new_data
  ) values (
    'admin', p_actor_id, 'security.blocklist_entry_created', 'security_blocklist_entry',
    v_entry.blocklist_entry_id::text, trim(p_reason_code), p_request_id,
    jsonb_build_object('identity_kind', p_identity_kind, 'status', 'active')
  );

  return v_entry.blocklist_entry_id;
end;
$$;

create or replace function private.revoke_security_blocklist_entry(
  p_blocklist_entry_id uuid,
  p_reason text,
  p_actor_id uuid,
  p_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry private.security_blocklist_entries%rowtype;
begin
  if not private.is_authorized_admin(
    p_actor_id,
    array['owner', 'kyc_risk']::public.app_role[]
  ) then
    raise exception 'authorized risk administrator is required';
  end if;
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_reason is null or char_length(trim(p_reason)) not between 3 and 500 then
    raise exception 'revocation reason is invalid';
  end if;

  select * into v_entry
  from private.security_blocklist_entries
  where blocklist_entry_id = p_blocklist_entry_id
  for update;
  if not found then raise exception 'blocklist entry not found'; end if;
  if v_entry.status = 'revoked' then return v_entry.blocklist_entry_id; end if;

  update private.security_blocklist_entries
  set status = 'revoked', revoked_by = p_actor_id, revoked_at = statement_timestamp()
  where id = v_entry.id;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    reason, request_id, previous_data, new_data
  ) values (
    'admin', p_actor_id, 'security.blocklist_entry_revoked', 'security_blocklist_entry',
    v_entry.blocklist_entry_id::text, trim(p_reason), p_request_id,
    jsonb_build_object('status', 'active'), jsonb_build_object('status', 'revoked')
  );

  return v_entry.blocklist_entry_id;
end;
$$;

alter table private.device_identities enable row level security;
alter table private.device_identities force row level security;
alter table private.device_user_links enable row level security;
alter table private.device_user_links force row level security;
alter table private.security_blocklist_entries enable row level security;
alter table private.security_blocklist_entries force row level security;
alter table private.session_security_observations enable row level security;
alter table private.session_security_observations force row level security;

create policy device_identities_deny_client
  on private.device_identities as restrictive for all to anon, authenticated
  using (false) with check (false);
create policy device_user_links_deny_client
  on private.device_user_links as restrictive for all to anon, authenticated
  using (false) with check (false);
create policy security_blocklist_deny_client
  on private.security_blocklist_entries as restrictive for all to anon, authenticated
  using (false) with check (false);
create policy session_security_observations_deny_client
  on private.session_security_observations as restrictive for all to anon, authenticated
  using (false) with check (false);

revoke all on private.device_identities, private.device_user_links,
  private.security_blocklist_entries, private.session_security_observations
  from public, anon, authenticated;

revoke all on function private.ingest_security_observation(
  uuid, uuid, text, text, text, text, text, bigint,
  boolean, boolean, boolean, boolean, boolean, boolean, text, uuid, jsonb
) from public, anon, authenticated;
revoke all on function private.set_security_blocklist_entry(
  text, text, text, text, uuid, uuid, jsonb
) from public, anon, authenticated;
revoke all on function private.revoke_security_blocklist_entry(
  uuid, text, uuid, uuid
) from public, anon, authenticated;

grant select, insert, update on private.device_identities,
  private.device_user_links, private.security_blocklist_entries
  to service_role;
grant select, insert on private.session_security_observations to service_role;
grant usage, select on all sequences in schema private to service_role;

grant execute on function private.ingest_security_observation(
  uuid, uuid, text, text, text, text, text, bigint,
  boolean, boolean, boolean, boolean, boolean, boolean, text, uuid, jsonb
) to service_role;
grant execute on function private.set_security_blocklist_entry(
  text, text, text, text, uuid, uuid, jsonb
) to service_role;
grant execute on function private.revoke_security_blocklist_entry(
  uuid, text, uuid, uuid
) to service_role;

comment on function private.ingest_security_observation(
  uuid, uuid, text, text, text, text, text, bigint,
  boolean, boolean, boolean, boolean, boolean, boolean, text, uuid, jsonb
) is 'Service-only, idempotent device/session risk ingestion. High-confidence signals enter the existing human review queue; this function never applies an adverse account restriction.';
