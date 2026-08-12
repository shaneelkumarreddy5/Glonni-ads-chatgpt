-- Glonni Ads Backend Step 5: KYC, fraud/risk review, restrictions and appeals.
-- KYC provider data is encrypted; raw identity documents are never stored here.
-- AI actors may record signals and recommendations but cannot make adverse decisions.

create type public.kyc_level as enum ('basic', 'enhanced');
create type public.kyc_status as enum (
  'not_started', 'submitted', 'provider_review', 'manual_review',
  'verified', 'rejected', 'expired', 'cancelled'
);
create type public.identity_document_type as enum (
  'pan', 'aadhaar', 'passport', 'driving_licence', 'voter_id'
);
create type public.risk_severity as enum ('low', 'medium', 'high', 'critical');
create type public.risk_signal_type as enum (
  'duplicate_identity', 'duplicate_payout_destination', 'device_anomaly',
  'location_anomaly', 'velocity_anomaly', 'provider_rejection',
  'automation_suspected', 'referral_abuse', 'survey_abuse',
  'refund_abuse', 'account_takeover', 'manual_report', 'other'
);
create type public.risk_case_status as enum ('open', 'under_review', 'resolved', 'dismissed');
create type public.risk_disposition as enum (
  'cleared', 'monitor', 'restriction_recommended',
  'suspension_recommended', 'closure_recommended'
);
create type public.restriction_type as enum (
  'earning_hold', 'withdrawal_hold', 'campaign_block',
  'account_restricted', 'account_suspended', 'account_closed'
);
create type public.restriction_status as enum ('active', 'lifted', 'expired');
create type public.appeal_type as enum (
  'kyc_rejection', 'withdrawal_hold', 'account_restriction',
  'account_suspension', 'account_closure'
);
create type public.appeal_status as enum (
  'submitted', 'under_review', 'approved', 'partially_approved',
  'upheld', 'withdrawn'
);
create type public.review_entity_type as enum ('kyc_case', 'risk_case', 'appeal');
create type public.review_queue_status as enum (
  'queued', 'assigned', 'in_review', 'completed', 'cancelled'
);

alter table public.profiles
  add column kyc_status public.kyc_status not null default 'not_started',
  add column kyc_level public.kyc_level,
  add column kyc_verified_at timestamptz,
  add column kyc_expires_at timestamptz,
  add constraint profiles_kyc_verified_consistent check (
    (kyc_status = 'verified' and kyc_level is not null and kyc_verified_at is not null)
    or kyc_status <> 'verified'
  ),
  add constraint profiles_kyc_expiry_consistent check (
    kyc_expires_at is null or (kyc_verified_at is not null and kyc_expires_at > kyc_verified_at)
  );

comment on column public.profiles.kyc_status is
  'User-visible KYC summary maintained only by protected KYC lifecycle functions.';

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'glonni_kyc_data_key_v1',
  'Application-level encryption key for minimal KYC provider evidence.'
);

create table public.kyc_cases (
  id bigint generated always as identity primary key,
  kyc_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  level public.kyc_level not null,
  status public.kyc_status not null default 'submitted',
  identity_document_type public.identity_document_type not null,
  masked_identity text not null,
  provider_code text not null,
  provider_case_reference text not null,
  reason_code text,
  user_message text,
  request_id uuid not null unique,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint kyc_cases_id_user_unique unique (id, user_id),
  constraint kyc_cases_provider_reference_unique unique (provider_code, provider_case_reference),
  constraint kyc_cases_provider_code_length check (char_length(provider_code) between 2 and 80),
  constraint kyc_cases_provider_reference_length check (char_length(provider_case_reference) between 1 and 250),
  constraint kyc_cases_masked_identity_length check (char_length(masked_identity) between 4 and 80),
  constraint kyc_cases_reason_code_length check (reason_code is null or char_length(reason_code) between 2 and 80),
  constraint kyc_cases_user_message_length check (user_message is null or char_length(user_message) between 3 and 500),
  constraint kyc_cases_decision_consistent check (
    (status in ('verified', 'rejected', 'expired', 'cancelled') and decided_at is not null)
    or (status not in ('verified', 'rejected', 'expired', 'cancelled') and decided_at is null)
  ),
  constraint kyc_cases_expiry_consistent check (expires_at is null or expires_at > submitted_at),
  constraint kyc_cases_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index kyc_cases_one_open_per_user
  on public.kyc_cases (user_id)
  where status in ('submitted', 'provider_review', 'manual_review');
create index kyc_cases_user_timeline on public.kyc_cases (user_id, created_at desc);
create index kyc_cases_review_queue on public.kyc_cases (status, updated_at)
  where status in ('submitted', 'provider_review', 'manual_review');

create table private.kyc_case_secrets (
  kyc_case_id bigint primary key references public.kyc_cases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  encrypted_provider_evidence bytea not null,
  evidence_sha256 text not null,
  encryption_key_name text not null default 'glonni_kyc_data_key_v1',
  created_at timestamptz not null default now(),
  constraint kyc_case_secrets_case_user_fkey
    foreign key (kyc_case_id, user_id)
    references public.kyc_cases(id, user_id) on delete restrict,
  constraint kyc_case_secrets_hash_format check (evidence_sha256 ~ '^[a-f0-9]{64}$')
);

create index kyc_case_secrets_user_lookup on private.kyc_case_secrets (user_id);
create index kyc_case_secrets_case_user_lookup on private.kyc_case_secrets (kyc_case_id, user_id);

create table public.kyc_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  kyc_case_id bigint not null references public.kyc_cases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  previous_status public.kyc_status,
  new_status public.kyc_status not null,
  reason_code text not null,
  user_message text not null,
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint kyc_status_history_case_user_fkey
    foreign key (kyc_case_id, user_id) references public.kyc_cases(id, user_id) on delete restrict,
  constraint kyc_status_history_id_case_user_unique unique (id, kyc_case_id, user_id),
  constraint kyc_status_history_real_transition check (previous_status is null or previous_status <> new_status),
  constraint kyc_status_history_reason_length check (char_length(reason_code) between 2 and 80),
  constraint kyc_status_history_message_length check (char_length(user_message) between 3 and 500),
  constraint kyc_status_history_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index kyc_status_history_case_timeline on public.kyc_status_history (kyc_case_id, occurred_at desc);
create index kyc_status_history_user_timeline on public.kyc_status_history (user_id, occurred_at desc);
create index kyc_status_history_actor_lookup on public.kyc_status_history (actor_id) where actor_id is not null;
create index kyc_status_history_case_user_lookup on public.kyc_status_history (kyc_case_id, user_id);

create table private.risk_cases (
  id bigint generated always as identity primary key,
  risk_case_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.risk_case_status not null default 'open',
  highest_severity public.risk_severity not null default 'low',
  risk_score smallint not null default 0,
  disposition public.risk_disposition,
  decision_reason text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_cases_id_user_unique unique (id, user_id),
  constraint risk_cases_score_range check (risk_score between 0 and 100),
  constraint risk_cases_decision_reason_length check (decision_reason is null or char_length(decision_reason) between 3 and 500),
  constraint risk_cases_resolution_consistent check (
    (status in ('resolved', 'dismissed') and resolved_at is not null and disposition is not null)
    or (status in ('open', 'under_review') and resolved_at is null)
  )
);

create unique index risk_cases_one_open_per_user on private.risk_cases (user_id)
  where status in ('open', 'under_review');
create index risk_cases_review_queue on private.risk_cases (highest_severity desc, risk_score desc, opened_at)
  where status in ('open', 'under_review');
create index risk_cases_user_timeline on private.risk_cases (user_id, created_at desc);

create table private.risk_signals (
  id bigint generated always as identity primary key,
  signal_id uuid not null default gen_random_uuid() unique,
  risk_case_id bigint not null references private.risk_cases(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  signal_type public.risk_signal_type not null,
  severity public.risk_severity not null,
  confidence numeric(4,3) not null,
  source text not null,
  basis text not null,
  evidence jsonb not null default '{}'::jsonb,
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  detected_at timestamptz not null default now(),
  constraint risk_signals_case_user_fkey
    foreign key (risk_case_id, user_id) references private.risk_cases(id, user_id) on delete restrict,
  constraint risk_signals_confidence_range check (confidence between 0 and 1),
  constraint risk_signals_source_length check (char_length(source) between 2 and 80),
  constraint risk_signals_basis_length check (char_length(basis) between 3 and 1000),
  constraint risk_signals_evidence_object check (jsonb_typeof(evidence) = 'object')
);

create index risk_signals_case_timeline on private.risk_signals (risk_case_id, detected_at desc);
create index risk_signals_user_timeline on private.risk_signals (user_id, detected_at desc);
create index risk_signals_actor_lookup on private.risk_signals (actor_id) where actor_id is not null;
create index risk_signals_case_user_lookup on private.risk_signals (risk_case_id, user_id);

create table public.account_restrictions (
  id bigint generated always as identity primary key,
  restriction_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  risk_case_id bigint references private.risk_cases(id) on delete restrict,
  restriction_type public.restriction_type not null,
  status public.restriction_status not null default 'active',
  reason_code text not null,
  user_message text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  ended_at timestamptz,
  applied_by uuid not null references auth.users(id) on delete restrict,
  ended_by uuid references auth.users(id) on delete restrict,
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint account_restrictions_id_user_unique unique (id, user_id),
  constraint account_restrictions_reason_length check (char_length(reason_code) between 2 and 80),
  constraint account_restrictions_message_length check (char_length(user_message) between 3 and 500),
  constraint account_restrictions_expiry_after_start check (expires_at is null or expires_at > starts_at),
  constraint account_restrictions_end_consistent check (
    (status in ('lifted', 'expired') and ended_at is not null and ended_by is not null)
    or (status = 'active' and ended_at is null and ended_by is null)
  ),
  constraint account_restrictions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index account_restrictions_one_active_type
  on public.account_restrictions (user_id, restriction_type) where status = 'active';
create index account_restrictions_user_timeline on public.account_restrictions (user_id, created_at desc);
create index account_restrictions_active_lookup on public.account_restrictions (user_id, restriction_type, expires_at)
  where status = 'active';
create index account_restrictions_risk_case_lookup on public.account_restrictions (risk_case_id)
  where risk_case_id is not null;
create index account_restrictions_applied_by_lookup on public.account_restrictions (applied_by);
create index account_restrictions_ended_by_lookup on public.account_restrictions (ended_by) where ended_by is not null;

create table public.restriction_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  restriction_id bigint not null references public.account_restrictions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  previous_status public.restriction_status,
  new_status public.restriction_status not null,
  reason_code text not null,
  user_message text not null,
  request_id uuid not null unique,
  actor_id uuid not null references auth.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  constraint restriction_history_restriction_user_fkey
    foreign key (restriction_id, user_id) references public.account_restrictions(id, user_id) on delete restrict,
  constraint restriction_history_real_transition check (previous_status is null or previous_status <> new_status),
  constraint restriction_history_reason_length check (char_length(reason_code) between 2 and 80),
  constraint restriction_history_message_length check (char_length(user_message) between 3 and 500)
);

create index restriction_history_restriction_timeline on public.restriction_status_history (restriction_id, occurred_at desc);
create index restriction_history_user_timeline on public.restriction_status_history (user_id, occurred_at desc);
create index restriction_history_actor_lookup on public.restriction_status_history (actor_id);
create index restriction_history_restriction_user_lookup on public.restriction_status_history (restriction_id, user_id);

create table public.case_appeals (
  id bigint generated always as identity primary key,
  appeal_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  appeal_type public.appeal_type not null,
  kyc_case_id bigint references public.kyc_cases(id) on delete restrict,
  restriction_id bigint references public.account_restrictions(id) on delete restrict,
  status public.appeal_status not null default 'submitted',
  user_statement text not null,
  user_message text,
  request_id uuid not null unique,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint case_appeals_id_user_unique unique (id, user_id),
  constraint case_appeals_exactly_one_subject check ((kyc_case_id is not null)::int + (restriction_id is not null)::int = 1),
  constraint case_appeals_statement_length check (char_length(user_statement) between 10 and 2000),
  constraint case_appeals_message_length check (user_message is null or char_length(user_message) between 3 and 500),
  constraint case_appeals_decision_consistent check (
    (status in ('approved', 'partially_approved', 'upheld', 'withdrawn') and decided_at is not null)
    or (status in ('submitted', 'under_review') and decided_at is null)
  ),
  constraint case_appeals_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index case_appeals_one_open_kyc on public.case_appeals (user_id, kyc_case_id)
  where kyc_case_id is not null and status in ('submitted', 'under_review');
create unique index case_appeals_one_open_restriction on public.case_appeals (user_id, restriction_id)
  where restriction_id is not null and status in ('submitted', 'under_review');
create index case_appeals_user_timeline on public.case_appeals (user_id, created_at desc);
create index case_appeals_review_queue on public.case_appeals (status, submitted_at)
  where status in ('submitted', 'under_review');
create index case_appeals_kyc_lookup on public.case_appeals (kyc_case_id) where kyc_case_id is not null;
create index case_appeals_restriction_lookup on public.case_appeals (restriction_id) where restriction_id is not null;

create table public.appeal_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  appeal_id bigint not null references public.case_appeals(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  previous_status public.appeal_status,
  new_status public.appeal_status not null,
  user_message text not null,
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint appeal_history_appeal_user_fkey
    foreign key (appeal_id, user_id) references public.case_appeals(id, user_id) on delete restrict,
  constraint appeal_history_real_transition check (previous_status is null or previous_status <> new_status),
  constraint appeal_history_message_length check (char_length(user_message) between 3 and 500)
);

create index appeal_history_appeal_timeline on public.appeal_status_history (appeal_id, occurred_at desc);
create index appeal_history_user_timeline on public.appeal_status_history (user_id, occurred_at desc);
create index appeal_history_actor_lookup on public.appeal_status_history (actor_id) where actor_id is not null;
create index appeal_history_appeal_user_lookup on public.appeal_status_history (appeal_id, user_id);

create table private.review_queue_items (
  id bigint generated always as identity primary key,
  review_item_id uuid not null default gen_random_uuid() unique,
  entity_type public.review_entity_type not null,
  entity_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.review_queue_status not null default 'queued',
  priority smallint not null default 3,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint review_queue_priority_range check (priority between 1 and 5),
  constraint review_queue_assignment_consistent check (
    (status in ('assigned', 'in_review') and assigned_to is not null)
    or status not in ('assigned', 'in_review')
  ),
  constraint review_queue_completion_consistent check (
    (status in ('completed', 'cancelled') and completed_at is not null)
    or (status not in ('completed', 'cancelled') and completed_at is null)
  ),
  constraint review_queue_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index review_queue_one_active_entity
  on private.review_queue_items (entity_type, entity_id)
  where status in ('queued', 'assigned', 'in_review');
create index review_queue_work_order on private.review_queue_items (priority, due_at, created_at)
  where status in ('queued', 'assigned', 'in_review');
create index review_queue_assignee on private.review_queue_items (assigned_to, status, due_at)
  where assigned_to is not null;
create index review_queue_user_timeline on private.review_queue_items (user_id, created_at desc);

create function private.reject_step5_history_mutation()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin raise exception 'compliance and risk history is append-only'; end;
$$;

create trigger kyc_status_history_immutable before update or delete on public.kyc_status_history
for each row execute function private.reject_step5_history_mutation();
create trigger risk_signals_immutable before update or delete on private.risk_signals
for each row execute function private.reject_step5_history_mutation();
create trigger restriction_status_history_immutable before update or delete on public.restriction_status_history
for each row execute function private.reject_step5_history_mutation();
create trigger appeal_status_history_immutable before update or delete on public.appeal_status_history
for each row execute function private.reject_step5_history_mutation();

create function private.is_authorized_admin(p_actor_id uuid, p_allowed_roles public.app_role[])
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select p_actor_id is not null and exists (
    select 1 from public.user_roles
    where user_id = p_actor_id and is_active and revoked_at is null and role = any(p_allowed_roles)
  )
$$;

create function private.encrypt_kyc_evidence(p_evidence jsonb)
returns bytea language sql security definer set search_path = pg_catalog as $$
  select extensions.pgp_sym_encrypt(
    p_evidence::text,
    (select decrypted_secret from vault.decrypted_secrets where name = 'glonni_kyc_data_key_v1' limit 1),
    'cipher-algo=aes256, compress-algo=1'
  )
$$;

create function private.enqueue_review(
  p_entity_type public.review_entity_type,
  p_entity_id uuid,
  p_user_id uuid,
  p_priority smallint,
  p_due_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_id uuid;
begin
  insert into private.review_queue_items (entity_type, entity_id, user_id, priority, due_at, metadata)
  values (p_entity_type, p_entity_id, p_user_id, p_priority, p_due_at, coalesce(p_metadata, '{}'::jsonb))
  on conflict (entity_type, entity_id) where status in ('queued', 'assigned', 'in_review')
  do update set priority = least(private.review_queue_items.priority, excluded.priority),
    due_at = least(private.review_queue_items.due_at, excluded.due_at), updated_at = statement_timestamp()
  returning review_item_id into v_id;
  return v_id;
end;
$$;

create function private.submit_kyc_case(
  p_user_id uuid,
  p_level public.kyc_level,
  p_document_type public.identity_document_type,
  p_masked_identity text,
  p_provider_code text,
  p_provider_case_reference text,
  p_provider_evidence jsonb,
  p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_case public.kyc_cases%rowtype;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_provider_evidence is null or jsonb_typeof(p_provider_evidence) <> 'object' then
    raise exception 'provider evidence must be an object';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 51));
  select * into v_case from public.kyc_cases where request_id = p_request_id;
  if found then
    if v_case.user_id <> p_user_id or v_case.provider_case_reference <> p_provider_case_reference then
      raise exception 'request id already exists with different KYC data';
    end if;
    return v_case.kyc_id;
  end if;
  if not exists (select 1 from public.profiles where id=p_user_id and status='active' and onboarding_completed_at is not null) then
    raise exception 'active completed account is required';
  end if;
  if exists (select 1 from public.kyc_cases where user_id=p_user_id and status in ('submitted','provider_review','manual_review')) then
    raise exception 'an active KYC case already exists';
  end if;
  insert into public.kyc_cases (
    user_id, level, status, identity_document_type, masked_identity,
    provider_code, provider_case_reference, request_id, metadata
  ) values (
    p_user_id, p_level, 'submitted', p_document_type, trim(p_masked_identity),
    trim(p_provider_code), trim(p_provider_case_reference), p_request_id, coalesce(p_metadata,'{}'::jsonb)
  ) returning * into v_case;
  insert into private.kyc_case_secrets (kyc_case_id,user_id,encrypted_provider_evidence,evidence_sha256)
  values (v_case.id,p_user_id,private.encrypt_kyc_evidence(p_provider_evidence),
    encode(extensions.digest(p_provider_evidence::text,'sha256'),'hex'));
  insert into public.kyc_status_history (
    kyc_case_id,user_id,previous_status,new_status,reason_code,user_message,
    request_id,actor_type,actor_id,occurred_at
  ) values (
    v_case.id,p_user_id,null,'submitted','KYC_SUBMITTED','Verification submitted.',
    p_request_id,'user',p_user_id,statement_timestamp()
  );
  update public.profiles set kyc_status='submitted',kyc_level=p_level,
    kyc_verified_at=null,kyc_expires_at=null,updated_at=statement_timestamp() where id=p_user_id;
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values ('user',p_user_id,'kyc.submitted','kyc_case',v_case.kyc_id::text,p_request_id,
    jsonb_build_object('level',p_level,'provider_code',p_provider_code,'status','submitted'));
  return v_case.kyc_id;
end;
$$;

create function private.transition_kyc_case(
  p_kyc_id uuid,
  p_new_status public.kyc_status,
  p_reason_code text,
  p_user_message text,
  p_request_id uuid,
  p_actor_type public.audit_actor_type,
  p_actor_id uuid default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_case public.kyc_cases%rowtype; v_transition uuid;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_actor_type='ai_agent' and p_new_status in ('verified','rejected','expired','cancelled') then
    raise exception 'AI agents cannot make final KYC decisions';
  end if;
  if p_new_status in ('verified','rejected') and p_actor_type not in ('provider','admin') then
    raise exception 'final KYC decisions require provider or authorized administrator';
  end if;
  if p_actor_type='admin' and not private.is_authorized_admin(p_actor_id,array['owner','kyc_risk']::public.app_role[]) then
    raise exception 'authorized KYC/Risk administrator is required';
  end if;
  select * into v_case from public.kyc_cases where kyc_id=p_kyc_id for update;
  if not found then raise exception 'KYC case not found'; end if;
  select transition_id into v_transition from public.kyc_status_history where request_id=p_request_id;
  if found then return v_transition; end if;
  if not (
    (v_case.status='submitted' and p_new_status in ('provider_review','manual_review','verified','rejected','cancelled'))
    or (v_case.status='provider_review' and p_new_status in ('manual_review','verified','rejected','cancelled'))
    or (v_case.status='manual_review' and p_new_status in ('verified','rejected','cancelled'))
    or (v_case.status='verified' and p_new_status='expired')
  ) then raise exception 'invalid KYC transition from % to %',v_case.status,p_new_status; end if;
  if p_new_status='verified' and p_expires_at is not null and p_expires_at <= statement_timestamp() then
    raise exception 'KYC expiry must be in the future';
  end if;
  update public.kyc_cases set status=p_new_status,reason_code=trim(p_reason_code),
    user_message=trim(p_user_message),
    decided_at=case when p_new_status in ('verified','rejected','expired','cancelled') then statement_timestamp() else null end,
    expires_at=case when p_new_status='verified' then p_expires_at else expires_at end,
    updated_at=statement_timestamp(),metadata=metadata||coalesce(p_metadata,'{}'::jsonb)
  where id=v_case.id;
  insert into public.kyc_status_history (
    kyc_case_id,user_id,previous_status,new_status,reason_code,user_message,
    request_id,actor_type,actor_id,occurred_at,metadata
  ) values (
    v_case.id,v_case.user_id,v_case.status,p_new_status,trim(p_reason_code),trim(p_user_message),
    p_request_id,p_actor_type,p_actor_id,statement_timestamp(),coalesce(p_metadata,'{}'::jsonb)
  ) returning transition_id into v_transition;
  update public.profiles set kyc_status=p_new_status,
    kyc_level=case when p_new_status='verified' then v_case.level else kyc_level end,
    kyc_verified_at=case when p_new_status='verified' then statement_timestamp()
      when p_new_status in ('rejected','expired','cancelled') then null else kyc_verified_at end,
    kyc_expires_at=case when p_new_status='verified' then p_expires_at
      when p_new_status in ('rejected','expired','cancelled') then null else kyc_expires_at end,
    updated_at=statement_timestamp() where id=v_case.user_id;
  if p_new_status='manual_review' then
    perform private.enqueue_review('kyc_case',v_case.kyc_id,v_case.user_id,2,
      statement_timestamp()+interval '1 day',jsonb_build_object('reason_code',p_reason_code));
  end if;
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,reason,request_id,previous_data,new_data)
  values (p_actor_type,p_actor_id,'kyc.status_changed','kyc_case',v_case.kyc_id::text,trim(p_reason_code),p_request_id,
    jsonb_build_object('status',v_case.status),jsonb_build_object('status',p_new_status));
  return v_transition;
end;
$$;

create function private.record_risk_signal(
  p_user_id uuid,
  p_signal_type public.risk_signal_type,
  p_severity public.risk_severity,
  p_confidence numeric,
  p_source text,
  p_basis text,
  p_evidence jsonb,
  p_request_id uuid,
  p_actor_type public.audit_actor_type,
  p_actor_id uuid default null
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_case private.risk_cases%rowtype; v_signal uuid; v_points int;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_actor_type not in ('system','provider','admin','ai_agent') then raise exception 'invalid risk-signal actor'; end if;
  if p_actor_type='ai_agent' and not private.is_authorized_admin(p_actor_id,array['ai_agent']::public.app_role[]) then
    raise exception 'registered AI agent identity is required';
  end if;
  if p_actor_type='admin' and not private.is_authorized_admin(p_actor_id,array['owner','kyc_risk','support']::public.app_role[]) then
    raise exception 'authorized administrator is required';
  end if;
  if p_confidence < 0 or p_confidence > 1 then raise exception 'confidence must be between 0 and 1'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,52));
  select signal_id into v_signal from private.risk_signals where request_id=p_request_id;
  if found then return v_signal; end if;
  select * into v_case from private.risk_cases
  where user_id=p_user_id and status in ('open','under_review') for update;
  if not found then
    insert into private.risk_cases (user_id,status,highest_severity,risk_score)
    values (p_user_id,'open',p_severity,0) returning * into v_case;
  end if;
  v_points := case p_severity when 'low' then 5 when 'medium' then 15 when 'high' then 30 else 50 end;
  insert into private.risk_signals (
    risk_case_id,user_id,signal_type,severity,confidence,source,basis,evidence,
    request_id,actor_type,actor_id,detected_at
  ) values (
    v_case.id,p_user_id,p_signal_type,p_severity,p_confidence,trim(p_source),trim(p_basis),
    coalesce(p_evidence,'{}'::jsonb),p_request_id,p_actor_type,p_actor_id,statement_timestamp()
  ) returning signal_id into v_signal;
  update private.risk_cases set
    highest_severity=case when array_position(enum_range(null::public.risk_severity),p_severity)
      > array_position(enum_range(null::public.risk_severity),highest_severity) then p_severity else highest_severity end,
    risk_score=least(100,risk_score+round(v_points*p_confidence)::int),
    status=case when p_severity in ('high','critical') then 'under_review' else status end,
    updated_at=statement_timestamp() where id=v_case.id;
  if p_severity in ('high','critical') then
    perform private.enqueue_review('risk_case',v_case.risk_case_id,p_user_id,
      case when p_severity='critical' then 1 else 2 end,
      statement_timestamp()+case when p_severity='critical' then interval '4 hours' else interval '1 day' end,
      jsonb_build_object('signal_type',p_signal_type,'severity',p_severity));
  end if;
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values (p_actor_type,p_actor_id,'risk.signal_recorded','risk_case',v_case.risk_case_id::text,p_request_id,
    jsonb_build_object('signal_type',p_signal_type,'severity',p_severity,'confidence',p_confidence));
  return v_signal;
end;
$$;

create function private.resolve_risk_case(
  p_risk_case_id uuid,
  p_new_status public.risk_case_status,
  p_disposition public.risk_disposition,
  p_reason text,
  p_request_id uuid,
  p_actor_id uuid
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_case private.risk_cases%rowtype;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner','kyc_risk']::public.app_role[]) then
    raise exception 'authorized KYC/Risk administrator is required';
  end if;
  if p_new_status not in ('resolved','dismissed') then raise exception 'risk case must be resolved or dismissed'; end if;
  if char_length(trim(p_reason)) < 3 then raise exception 'decision reason is required'; end if;
  select * into v_case from private.risk_cases where risk_case_id=p_risk_case_id for update;
  if not found then raise exception 'risk case not found'; end if;
  if v_case.status not in ('open','under_review') then return v_case.risk_case_id; end if;
  update private.risk_cases set status=p_new_status,disposition=p_disposition,
    decision_reason=trim(p_reason),resolved_at=statement_timestamp(),updated_at=statement_timestamp()
  where id=v_case.id;
  update private.review_queue_items set status='completed',completed_at=statement_timestamp(),updated_at=statement_timestamp()
  where entity_type='risk_case' and entity_id=v_case.risk_case_id and status in ('queued','assigned','in_review');
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,reason,request_id,previous_data,new_data)
  values ('admin',p_actor_id,'risk.case_resolved','risk_case',v_case.risk_case_id::text,trim(p_reason),p_request_id,
    jsonb_build_object('status',v_case.status),jsonb_build_object('status',p_new_status,'disposition',p_disposition));
  return v_case.risk_case_id;
end;
$$;

create function private.apply_account_restriction(
  p_user_id uuid,
  p_restriction_type public.restriction_type,
  p_reason_code text,
  p_user_message text,
  p_request_id uuid,
  p_actor_id uuid,
  p_risk_case_id uuid default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_restriction public.account_restrictions%rowtype; v_risk_pk bigint;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner','kyc_risk']::public.app_role[]) then
    raise exception 'authorized KYC/Risk administrator is required';
  end if;
  if p_restriction_type='account_closed'
     and not private.is_authorized_admin(p_actor_id,array['owner']::public.app_role[]) then
    raise exception 'only the owner may close an account';
  end if;
  if p_expires_at is not null and p_expires_at <= statement_timestamp() then raise exception 'expiry must be in the future'; end if;
  if p_restriction_type in ('earning_hold','withdrawal_hold','campaign_block') and p_expires_at is null then
    raise exception 'temporary operational restrictions require an expiry';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,53));
  select * into v_restriction from public.account_restrictions where request_id=p_request_id;
  if found then return v_restriction.restriction_id; end if;
  if p_risk_case_id is not null then
    select id into v_risk_pk from private.risk_cases where risk_case_id=p_risk_case_id and user_id=p_user_id;
    if not found then raise exception 'risk case not found for user'; end if;
  end if;
  insert into public.account_restrictions (
    user_id,risk_case_id,restriction_type,status,reason_code,user_message,
    starts_at,expires_at,applied_by,request_id,metadata
  ) values (
    p_user_id,v_risk_pk,p_restriction_type,'active',trim(p_reason_code),trim(p_user_message),
    statement_timestamp(),p_expires_at,p_actor_id,p_request_id,coalesce(p_metadata,'{}'::jsonb)
  ) returning * into v_restriction;
  insert into public.restriction_status_history (
    restriction_id,user_id,previous_status,new_status,reason_code,user_message,request_id,actor_id,occurred_at
  ) values (
    v_restriction.id,p_user_id,null,'active',trim(p_reason_code),trim(p_user_message),p_request_id,p_actor_id,statement_timestamp()
  );
  if p_restriction_type='account_restricted' then update public.profiles set status='restricted',updated_at=statement_timestamp() where id=p_user_id;
  elsif p_restriction_type='account_suspended' then update public.profiles set status='suspended',updated_at=statement_timestamp() where id=p_user_id;
  elsif p_restriction_type='account_closed' then update public.profiles set status='closed',updated_at=statement_timestamp() where id=p_user_id;
  end if;
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,reason,request_id,new_data)
  values ('admin',p_actor_id,'restriction.applied','account_restriction',v_restriction.restriction_id::text,
    trim(p_reason_code),p_request_id,jsonb_build_object('user_id',p_user_id,'restriction_type',p_restriction_type,
      'expires_at',p_expires_at));
  return v_restriction.restriction_id;
end;
$$;

create function private.lift_account_restriction(
  p_restriction_id uuid,
  p_new_status public.restriction_status,
  p_reason_code text,
  p_user_message text,
  p_request_id uuid,
  p_actor_id uuid
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_restriction public.account_restrictions%rowtype;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner','kyc_risk']::public.app_role[]) then
    raise exception 'authorized KYC/Risk administrator is required';
  end if;
  if p_new_status not in ('lifted','expired') then raise exception 'restriction must be lifted or expired'; end if;
  select * into v_restriction from public.account_restrictions where restriction_id=p_restriction_id for update;
  if not found then raise exception 'restriction not found'; end if;
  if v_restriction.status <> 'active' then return v_restriction.restriction_id; end if;
  update public.account_restrictions set status=p_new_status,ended_at=statement_timestamp(),ended_by=p_actor_id,
    updated_at=statement_timestamp() where id=v_restriction.id;
  insert into public.restriction_status_history (
    restriction_id,user_id,previous_status,new_status,reason_code,user_message,request_id,actor_id,occurred_at
  ) values (
    v_restriction.id,v_restriction.user_id,'active',p_new_status,trim(p_reason_code),trim(p_user_message),
    p_request_id,p_actor_id,statement_timestamp()
  );
  if v_restriction.restriction_type in ('account_restricted','account_suspended')
     and not exists (select 1 from public.account_restrictions where user_id=v_restriction.user_id
       and status='active' and id<>v_restriction.id and restriction_type in ('account_restricted','account_suspended','account_closed')) then
    update public.profiles set status='active',updated_at=statement_timestamp()
    where id=v_restriction.user_id and status in ('restricted','suspended');
  end if;
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,reason,request_id,previous_data,new_data)
  values ('admin',p_actor_id,'restriction.ended','account_restriction',v_restriction.restriction_id::text,
    trim(p_reason_code),p_request_id,jsonb_build_object('status','active'),jsonb_build_object('status',p_new_status));
  return v_restriction.restriction_id;
end;
$$;

create function private.create_case_appeal(
  p_user_id uuid,
  p_appeal_type public.appeal_type,
  p_kyc_id uuid,
  p_restriction_id uuid,
  p_user_statement text,
  p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_appeal public.case_appeals%rowtype; v_kyc_pk bigint; v_restriction_pk bigint;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if (p_kyc_id is not null)::int+(p_restriction_id is not null)::int<>1 then raise exception 'exactly one appeal subject is required'; end if;
  if char_length(trim(p_user_statement)) not between 10 and 2000 then raise exception 'appeal statement must contain 10 to 2000 characters'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,54));
  select * into v_appeal from public.case_appeals where request_id=p_request_id;
  if found then return v_appeal.appeal_id; end if;
  if p_kyc_id is not null then
    select id into v_kyc_pk from public.kyc_cases where kyc_id=p_kyc_id and user_id=p_user_id and status='rejected';
    if not found then raise exception 'eligible rejected KYC case not found'; end if;
    if p_appeal_type<>'kyc_rejection' then raise exception 'appeal type does not match KYC subject'; end if;
  else
    select id into v_restriction_pk from public.account_restrictions where restriction_id=p_restriction_id and user_id=p_user_id;
    if not found then raise exception 'restriction not found'; end if;
  end if;
  insert into public.case_appeals (
    user_id,appeal_type,kyc_case_id,restriction_id,status,user_statement,request_id,metadata
  ) values (
    p_user_id,p_appeal_type,v_kyc_pk,v_restriction_pk,'submitted',trim(p_user_statement),p_request_id,coalesce(p_metadata,'{}'::jsonb)
  ) returning * into v_appeal;
  insert into public.appeal_status_history (
    appeal_id,user_id,previous_status,new_status,user_message,request_id,actor_type,actor_id,occurred_at
  ) values (
    v_appeal.id,p_user_id,null,'submitted','Appeal submitted for review.',p_request_id,'user',p_user_id,statement_timestamp()
  );
  perform private.enqueue_review('appeal',v_appeal.appeal_id,p_user_id,2,
    statement_timestamp()+interval '2 days',jsonb_build_object('appeal_type',p_appeal_type));
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values ('user',p_user_id,'appeal.submitted','appeal',v_appeal.appeal_id::text,p_request_id,
    jsonb_build_object('appeal_type',p_appeal_type));
  return v_appeal.appeal_id;
end;
$$;

create function private.transition_case_appeal(
  p_appeal_id uuid,
  p_new_status public.appeal_status,
  p_user_message text,
  p_request_id uuid,
  p_actor_type public.audit_actor_type,
  p_actor_id uuid default null
)
returns uuid language plpgsql security invoker set search_path = pg_catalog as $$
declare v_appeal public.case_appeals%rowtype; v_transition uuid;
begin
  if p_actor_type='ai_agent' and p_new_status in ('approved','partially_approved','upheld') then
    raise exception 'AI agents cannot decide appeals';
  end if;
  if p_new_status in ('approved','partially_approved','upheld') then
    if p_actor_type<>'admin' or not private.is_authorized_admin(p_actor_id,array['owner','kyc_risk','support']::public.app_role[]) then
      raise exception 'authorized administrator is required for appeal decisions';
    end if;
  end if;
  select * into v_appeal from public.case_appeals where appeal_id=p_appeal_id for update;
  if not found then raise exception 'appeal not found'; end if;
  select transition_id into v_transition from public.appeal_status_history where request_id=p_request_id;
  if found then return v_transition; end if;
  if not ((v_appeal.status='submitted' and p_new_status in ('under_review','withdrawn','approved','partially_approved','upheld'))
    or (v_appeal.status='under_review' and p_new_status in ('approved','partially_approved','upheld','withdrawn'))) then
    raise exception 'invalid appeal transition from % to %',v_appeal.status,p_new_status;
  end if;
  if p_new_status='withdrawn' and not (p_actor_type='user' and p_actor_id=v_appeal.user_id) then
    raise exception 'only the user may withdraw an appeal';
  end if;
  update public.case_appeals set status=p_new_status,user_message=trim(p_user_message),
    decided_at=case when p_new_status in ('approved','partially_approved','upheld','withdrawn') then statement_timestamp() else null end,
    updated_at=statement_timestamp() where id=v_appeal.id;
  insert into public.appeal_status_history (
    appeal_id,user_id,previous_status,new_status,user_message,request_id,actor_type,actor_id,occurred_at
  ) values (
    v_appeal.id,v_appeal.user_id,v_appeal.status,p_new_status,trim(p_user_message),p_request_id,p_actor_type,p_actor_id,statement_timestamp()
  ) returning transition_id into v_transition;
  if p_new_status in ('approved','partially_approved','upheld','withdrawn') then
    update private.review_queue_items set status='completed',completed_at=statement_timestamp(),updated_at=statement_timestamp()
    where entity_type='appeal' and entity_id=v_appeal.appeal_id and status in ('queued','assigned','in_review');
  end if;
  insert into public.audit_events (actor_type,actor_id,action,resource_type,resource_id,request_id,previous_data,new_data)
  values (p_actor_type,p_actor_id,'appeal.status_changed','appeal',v_appeal.appeal_id::text,p_request_id,
    jsonb_build_object('status',v_appeal.status),jsonb_build_object('status',p_new_status));
  return v_transition;
end;
$$;

create function private.enforce_withdrawal_kyc_and_restrictions()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if not exists (select 1 from public.profiles where id=new.user_id and status='active'
      and kyc_status='verified' and (kyc_expires_at is null or kyc_expires_at>statement_timestamp())) then
    raise exception 'current verified KYC and active account are required for withdrawal';
  end if;
  if exists (select 1 from public.account_restrictions where user_id=new.user_id and status='active'
      and (expires_at is null or expires_at>statement_timestamp())
      and restriction_type in ('withdrawal_hold','account_restricted','account_suspended','account_closed')) then
    raise exception 'withdrawals are unavailable while an account restriction is active';
  end if;
  return new;
end;
$$;

create trigger withdrawal_requests_enforce_kyc_and_restrictions
before insert on public.withdrawal_requests
for each row execute function private.enforce_withdrawal_kyc_and_restrictions();

-- RLS and least privilege. All private tables are server-only with explicit deny policies.
alter table private.kyc_case_secrets enable row level security; alter table private.kyc_case_secrets force row level security;
alter table private.risk_cases enable row level security; alter table private.risk_cases force row level security;
alter table private.risk_signals enable row level security; alter table private.risk_signals force row level security;
alter table private.review_queue_items enable row level security; alter table private.review_queue_items force row level security;
alter table public.kyc_cases enable row level security; alter table public.kyc_cases force row level security;
alter table public.kyc_status_history enable row level security; alter table public.kyc_status_history force row level security;
alter table public.account_restrictions enable row level security; alter table public.account_restrictions force row level security;
alter table public.restriction_status_history enable row level security; alter table public.restriction_status_history force row level security;
alter table public.case_appeals enable row level security; alter table public.case_appeals force row level security;
alter table public.appeal_status_history enable row level security; alter table public.appeal_status_history force row level security;

revoke all on private.kyc_case_secrets, private.risk_cases, private.risk_signals, private.review_queue_items from public,anon,authenticated;
revoke all on public.kyc_cases,public.kyc_status_history,public.account_restrictions,
  public.restriction_status_history,public.case_appeals,public.appeal_status_history from anon,authenticated;
grant select on public.kyc_cases,public.kyc_status_history,public.account_restrictions,
  public.restriction_status_history,public.case_appeals,public.appeal_status_history to authenticated;

create policy kyc_case_secrets_deny_client on private.kyc_case_secrets as restrictive for all to anon,authenticated using(false) with check(false);
create policy risk_cases_deny_client on private.risk_cases as restrictive for all to anon,authenticated using(false) with check(false);
create policy risk_signals_deny_client on private.risk_signals as restrictive for all to anon,authenticated using(false) with check(false);
create policy review_queue_deny_client on private.review_queue_items as restrictive for all to anon,authenticated using(false) with check(false);
create policy kyc_cases_select_own on public.kyc_cases for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid())=user_id);
create policy kyc_status_history_select_own on public.kyc_status_history for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid())=user_id);
create policy account_restrictions_select_own on public.account_restrictions for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid())=user_id);
create policy restriction_history_select_own on public.restriction_status_history for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid())=user_id);
create policy case_appeals_select_own on public.case_appeals for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid())=user_id);
create policy appeal_history_select_own on public.appeal_status_history for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid())=user_id);

revoke all on function private.reject_step5_history_mutation() from public,anon,authenticated;
revoke all on function private.is_authorized_admin(uuid,public.app_role[]) from public,anon,authenticated;
revoke all on function private.encrypt_kyc_evidence(jsonb) from public,anon,authenticated;
revoke all on function private.enqueue_review(public.review_entity_type,uuid,uuid,smallint,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function private.submit_kyc_case(uuid,public.kyc_level,public.identity_document_type,text,text,text,jsonb,uuid,jsonb) from public,anon,authenticated;
revoke all on function private.transition_kyc_case(uuid,public.kyc_status,text,text,uuid,public.audit_actor_type,uuid,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function private.record_risk_signal(uuid,public.risk_signal_type,public.risk_severity,numeric,text,text,jsonb,uuid,public.audit_actor_type,uuid) from public,anon,authenticated;
revoke all on function private.resolve_risk_case(uuid,public.risk_case_status,public.risk_disposition,text,uuid,uuid) from public,anon,authenticated;
revoke all on function private.apply_account_restriction(uuid,public.restriction_type,text,text,uuid,uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function private.lift_account_restriction(uuid,public.restriction_status,text,text,uuid,uuid) from public,anon,authenticated;
revoke all on function private.create_case_appeal(uuid,public.appeal_type,uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function private.transition_case_appeal(uuid,public.appeal_status,text,uuid,public.audit_actor_type,uuid) from public,anon,authenticated;
revoke all on function private.enforce_withdrawal_kyc_and_restrictions() from public,anon,authenticated;

grant usage on schema private to service_role;
grant execute on function private.is_authorized_admin(uuid,public.app_role[]) to service_role;
grant execute on function private.encrypt_kyc_evidence(jsonb) to service_role;
grant execute on function private.enqueue_review(public.review_entity_type,uuid,uuid,smallint,timestamptz,jsonb) to service_role;
grant execute on function private.submit_kyc_case(uuid,public.kyc_level,public.identity_document_type,text,text,text,jsonb,uuid,jsonb) to service_role;
grant execute on function private.transition_kyc_case(uuid,public.kyc_status,text,text,uuid,public.audit_actor_type,uuid,timestamptz,jsonb) to service_role;
grant execute on function private.record_risk_signal(uuid,public.risk_signal_type,public.risk_severity,numeric,text,text,jsonb,uuid,public.audit_actor_type,uuid) to service_role;
grant execute on function private.resolve_risk_case(uuid,public.risk_case_status,public.risk_disposition,text,uuid,uuid) to service_role;
grant execute on function private.apply_account_restriction(uuid,public.restriction_type,text,text,uuid,uuid,uuid,timestamptz,jsonb) to service_role;
grant execute on function private.lift_account_restriction(uuid,public.restriction_status,text,text,uuid,uuid) to service_role;
grant execute on function private.create_case_appeal(uuid,public.appeal_type,uuid,uuid,text,uuid,jsonb) to service_role;
grant execute on function private.transition_case_appeal(uuid,public.appeal_status,text,uuid,public.audit_actor_type,uuid) to service_role;

