-- Promote eligible Step 10 observations across the deliberately narrow Step 5
-- risk boundary. The ingestion service role still receives no direct access to
-- risk cases, risk signals, review queues, or review-route records.

create function private.promote_verified_security_observation(
  p_observation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observation private.session_security_observations%rowtype;
  v_device private.device_identities%rowtype;
  v_existing_signal uuid;
  v_signal_type public.risk_signal_type;
  v_signal_severity public.risk_severity;
  v_signal_basis text;
begin
  select observation.* into v_observation
  from private.session_security_observations as observation
  where observation.observation_id = p_observation_id;

  if not found then
    raise exception 'security observation not found';
  end if;

  -- Only independently verified provider/admin evidence can cross into the
  -- human risk queue. Client/system-only claims remain observations.
  if not v_observation.review_required
     or v_observation.risk_level not in ('high', 'critical')
     or not v_observation.evidence_verified
     or v_observation.evidence_source not in ('fraud_provider', 'admin') then
    return null;
  end if;

  select signal_id into v_existing_signal
  from private.risk_signals
  where request_id = v_observation.request_id;
  if found then
    return v_existing_signal;
  end if;

  select device.* into v_device
  from private.device_identities as device
  where device.id = v_observation.device_id;

  if coalesce(v_observation.emulator_detected, false)
     or coalesce(v_observation.rooted_detected, false) then
    v_signal_type := 'automation_suspected';
    v_signal_basis := 'Verified device-integrity evidence requires administrator review.';
  elsif coalesce(v_observation.vpn_detected, false)
        or coalesce(v_observation.proxy_detected, false)
        or coalesce(v_observation.tor_detected, false) then
    v_signal_type := 'location_anomaly';
    v_signal_basis := 'Verified network-risk evidence requires administrator review.';
  else
    v_signal_type := 'device_anomaly';
    v_signal_basis := 'Verified high-risk session evidence requires administrator review.';
  end if;

  v_signal_severity := case v_observation.risk_level
    when 'critical' then 'critical'::public.risk_severity
    else 'high'::public.risk_severity
  end;

  return private.record_risk_signal(
    v_observation.user_id,
    v_signal_type,
    v_signal_severity,
    1.000,
    'device_security',
    v_signal_basis,
    jsonb_build_object(
      'observation_id', v_observation.observation_id,
      'device_id', v_device.device_id,
      'risk_score', v_observation.risk_score,
      'risk_level', v_observation.risk_level,
      'evidence_verified', true,
      'decision_required', 'human'
    ),
    v_observation.request_id,
    case
      when v_observation.evidence_source = 'fraud_provider'
        then 'provider'::public.audit_actor_type
      else 'system'::public.audit_actor_type
    end,
    null
  );
end;
$$;

create function private.promote_verified_security_observation_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.promote_verified_security_observation(new.observation_id);
  return new;
end;
$$;

create trigger session_security_observation_human_review
after insert on private.session_security_observations
for each row execute function private.promote_verified_security_observation_trigger();

revoke all on function private.promote_verified_security_observation(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.promote_verified_security_observation_trigger()
  from public, anon, authenticated, service_role;

comment on function private.promote_verified_security_observation(uuid) is
  'Private Step 12 worker: verified high-risk evidence may create a human review case, never an account restriction.';

-- Backfill eligible observations present before the trigger was installed.
select private.promote_verified_security_observation(observation_id)
from private.session_security_observations
where review_required
  and risk_level in ('high', 'critical')
  and evidence_verified
  and evidence_source in ('fraud_provider', 'admin');
