-- Glonni Ads Backend Step 12: verified fraud observations route to human review.
--
-- This migration deliberately does not create account restrictions. A verified,
-- high-risk device/session observation may open or update a risk case and queue
-- it for an administrator, but only an active owner/KYC-risk administrator may
-- apply an account restriction.

create table private.security_review_routes (
  id bigint generated always as identity primary key,
  route_id uuid not null default gen_random_uuid() unique,
  observation_id uuid not null unique
    references private.session_security_observations(observation_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  risk_case_id bigint not null references private.risk_cases(id) on delete restrict,
  risk_signal_id uuid not null unique
    references private.risk_signals(signal_id) on delete restrict,
  review_item_id uuid not null
    references private.review_queue_items(review_item_id) on delete restrict,
  routing_basis text not null,
  routed_at timestamptz not null default now(),
  automatic_enforcement boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  constraint security_review_routes_basis_length
    check (char_length(routing_basis) between 3 and 500),
  constraint security_review_routes_case_user_fkey
    foreign key (risk_case_id, user_id)
    references private.risk_cases(id, user_id) on delete restrict,
  constraint security_review_routes_human_decision_only
    check (automatic_enforcement = false),
  constraint security_review_routes_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index security_review_routes_user_timeline
  on private.security_review_routes (user_id, routed_at desc);
create index security_review_routes_case_lookup
  on private.security_review_routes (risk_case_id);
create index security_review_routes_review_item_lookup
  on private.security_review_routes (review_item_id);

comment on table private.security_review_routes is
  'Immutable trace from a verified high-risk security observation to its human review queue item. Never performs enforcement.';
comment on column private.security_review_routes.automatic_enforcement is
  'Hard-checked false: Step 12 routes evidence for human review and cannot ban, suspend, close, or restrict an account.';

create function private.route_verified_security_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_observation private.session_security_observations%rowtype;
  v_review_item private.review_queue_items%rowtype;
  v_route private.security_review_routes%rowtype;
begin
  -- Only the device-security pipeline and high-confidence, high-severity signals
  -- are eligible. Lower-confidence client observations remain evidence only.
  if new.source <> 'device_security'
     or new.severity not in ('high', 'critical')
     or new.confidence < 0.999 then
    return new;
  end if;

  select observation.* into v_observation
  from private.session_security_observations as observation
  where observation.observation_id = case
      when new.evidence ->> 'observation_id'
        ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (new.evidence ->> 'observation_id')::uuid
      else null
    end
    and observation.user_id = new.user_id
    and observation.request_id = new.request_id
    and observation.review_required
    and observation.risk_level in ('high', 'critical')
    and observation.evidence_verified
    and observation.evidence_source in ('fraud_provider', 'admin');

  if not found then
    return new;
  end if;

  select queue.* into v_review_item
  from private.review_queue_items as queue
  join private.risk_cases as risk_case
    on risk_case.risk_case_id = queue.entity_id
  where queue.entity_type = 'risk_case'
    and risk_case.id = new.risk_case_id
    and queue.status in ('queued', 'assigned', 'in_review')
  order by queue.created_at desc
  limit 1;

  if not found then
    raise exception 'verified security signal has no active human review item';
  end if;

  insert into private.security_review_routes (
    observation_id, user_id, risk_case_id, risk_signal_id, review_item_id,
    routing_basis, automatic_enforcement, metadata
  ) values (
    v_observation.observation_id,
    new.user_id,
    new.risk_case_id,
    new.signal_id,
    v_review_item.review_item_id,
    'Verified high-risk device/session evidence routed for administrator review.',
    false,
    jsonb_build_object(
      'risk_level', v_observation.risk_level,
      'risk_score', v_observation.risk_score,
      'evidence_source', v_observation.evidence_source,
      'decision_required', 'human'
    )
  )
  on conflict (observation_id) do nothing
  returning * into v_route;

  if found then
    insert into public.audit_events (
      actor_type, action, resource_type, resource_id, request_id, new_data
    ) values (
      'system',
      'security.observation_routed_for_human_review',
      'security_review_route',
      v_route.route_id::text,
      new.request_id,
      jsonb_build_object(
        'observation_id', v_route.observation_id,
        'risk_signal_id', v_route.risk_signal_id,
        'review_item_id', v_route.review_item_id,
        'automatic_enforcement', false
      )
    );
  end if;

  return new;
end;
$$;

-- The risk-signal function enqueues the review after inserting the signal, so
-- defer routing until transaction end to link the completed review chain.
create constraint trigger verified_security_signal_route
after insert on private.risk_signals
deferrable initially deferred
for each row execute function private.route_verified_security_signal();

create function private.require_human_restriction_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_authorized_admin(
    new.applied_by,
    array['owner', 'kyc_risk']::public.app_role[]
  ) then
    raise exception 'an active owner or KYC/Risk administrator must apply every restriction';
  end if;

  if new.restriction_type = 'account_closed'
     and not private.is_authorized_admin(
       new.applied_by,
       array['owner']::public.app_role[]
     ) then
    raise exception 'only an active owner may close an account';
  end if;

  return new;
end;
$$;

create trigger account_restrictions_require_human_actor
before insert on public.account_restrictions
for each row execute function private.require_human_restriction_actor();

alter table private.security_review_routes enable row level security;
alter table private.security_review_routes force row level security;

create policy security_review_routes_deny_client
  on private.security_review_routes as restrictive for all to anon, authenticated
  using (false) with check (false);

revoke all on private.security_review_routes
  from public, anon, authenticated, service_role;
revoke all on function private.route_verified_security_signal()
  from public, anon, authenticated, service_role;
revoke all on function private.require_human_restriction_actor()
  from public, anon, authenticated, service_role;

-- Backfill only already-verified eligible signals. Existing installations are
-- normally empty at this stage; this makes deployment deterministic and safe.
insert into private.security_review_routes (
  observation_id, user_id, risk_case_id, risk_signal_id, review_item_id,
  routing_basis, automatic_enforcement, metadata
)
select
  observation.observation_id,
  signal.user_id,
  signal.risk_case_id,
  signal.signal_id,
  queue.review_item_id,
  'Verified high-risk device/session evidence routed for administrator review.',
  false,
  jsonb_build_object(
    'risk_level', observation.risk_level,
    'risk_score', observation.risk_score,
    'evidence_source', observation.evidence_source,
    'decision_required', 'human'
  )
from private.risk_signals as signal
join private.session_security_observations as observation
  on observation.observation_id = case
      when signal.evidence ->> 'observation_id'
        ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (signal.evidence ->> 'observation_id')::uuid
      else null
    end
 and observation.user_id = signal.user_id
 and observation.request_id = signal.request_id
join private.risk_cases as risk_case
  on risk_case.id = signal.risk_case_id
join lateral (
  select item.review_item_id
  from private.review_queue_items as item
  where item.entity_type = 'risk_case'
    and item.entity_id = risk_case.risk_case_id
    and item.status in ('queued', 'assigned', 'in_review')
  order by item.created_at desc
  limit 1
) as queue on true
where signal.source = 'device_security'
  and signal.severity in ('high', 'critical')
  and signal.confidence >= 0.999
  and observation.review_required
  and observation.risk_level in ('high', 'critical')
  and observation.evidence_verified
  and observation.evidence_source in ('fraud_provider', 'admin')
on conflict (observation_id) do nothing;
