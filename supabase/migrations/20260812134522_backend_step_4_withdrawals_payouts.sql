-- Glonni Ads Backend Step 4: payout destinations, withdrawal requests and payout lifecycle.
-- Sensitive payout details are encrypted at rest. Users only receive masked summaries.
-- All money movements remain append-only and balances continue to be derived from the ledger.

create type public.payout_method_type as enum ('upi', 'bank_account');
create type public.payout_destination_status as enum (
  'pending_verification', 'verified', 'rejected', 'disabled'
);
create type public.withdrawal_status as enum (
  'submitted', 'security_hold', 'under_review', 'approved',
  'processing', 'paid', 'failed', 'cancelled', 'rejected'
);

create table public.payout_destinations (
  id bigint generated always as identity primary key,
  destination_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  method_type public.payout_method_type not null,
  display_name text not null,
  masked_identifier text not null,
  status public.payout_destination_status not null default 'pending_verification',
  is_default boolean not null default false,
  details_changed_at timestamptz not null default now(),
  withdrawal_eligible_at timestamptz not null default (now() + interval '24 hours'),
  verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint payout_destinations_id_user_unique unique (id, user_id),
  constraint payout_destinations_display_name_length
    check (char_length(display_name) between 2 and 100),
  constraint payout_destinations_masked_identifier_length
    check (char_length(masked_identifier) between 4 and 100),
  constraint payout_destinations_eligibility_after_change
    check (withdrawal_eligible_at >= details_changed_at + interval '24 hours'),
  constraint payout_destinations_verification_consistent
    check ((status = 'verified' and verified_at is not null) or status <> 'verified'),
  constraint payout_destinations_disabled_consistent
    check ((status = 'disabled' and disabled_at is not null) or status <> 'disabled'),
  constraint payout_destinations_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create unique index payout_destinations_one_default_per_user
  on public.payout_destinations (user_id) where is_default;
create index payout_destinations_user_timeline
  on public.payout_destinations (user_id, created_at desc);
create index payout_destinations_user_eligible
  on public.payout_destinations (user_id, status, withdrawal_eligible_at)
  where status = 'verified';

comment on table public.payout_destinations is
  'Non-sensitive payout destination summaries. Raw UPI/bank data is encrypted in the private schema.';

create table private.payout_destination_secrets (
  payout_destination_id bigint primary key
    references public.payout_destinations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  encrypted_details bytea not null,
  encryption_key_name text not null default 'glonni_payout_data_key_v1',
  created_at timestamptz not null default now(),
  constraint payout_destination_secrets_destination_user_fkey
    foreign key (payout_destination_id, user_id)
    references public.payout_destinations(id, user_id) on delete restrict
);

alter table private.payout_destination_secrets enable row level security;
alter table private.payout_destination_secrets force row level security;
revoke all on private.payout_destination_secrets from public, anon, authenticated;

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'glonni_payout_data_key_v1',
  'Application-level encryption key for Glonni Ads payout destination data.'
);

create table public.withdrawal_requests (
  id bigint generated always as identity primary key,
  withdrawal_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  payout_destination_id bigint not null,
  amount_paise bigint not null,
  currency text not null default 'INR',
  status public.withdrawal_status not null default 'submitted',
  request_id uuid not null unique,
  provider_code text,
  provider_reference text,
  failure_code text,
  failure_message text,
  submitted_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint withdrawal_requests_id_user_unique unique (id, user_id),
  constraint withdrawal_requests_destination_user_fkey
    foreign key (payout_destination_id, user_id)
    references public.payout_destinations(id, user_id) on delete restrict,
  constraint withdrawal_requests_minimum_amount check (amount_paise >= 10000),
  constraint withdrawal_requests_daily_maximum check (amount_paise <= 200000),
  constraint withdrawal_requests_currency_inr check (currency = 'INR'),
  constraint withdrawal_requests_provider_code_length
    check (provider_code is null or char_length(provider_code) between 2 and 80),
  constraint withdrawal_requests_provider_reference_length
    check (provider_reference is null or char_length(provider_reference) between 1 and 250),
  constraint withdrawal_requests_failure_code_length
    check (failure_code is null or char_length(failure_code) between 1 and 80),
  constraint withdrawal_requests_failure_message_length
    check (failure_message is null or char_length(failure_message) between 3 and 500),
  constraint withdrawal_requests_completed_consistent
    check ((status in ('paid', 'failed', 'cancelled', 'rejected') and completed_at is not null)
      or (status not in ('paid', 'failed', 'cancelled', 'rejected') and completed_at is null)),
  constraint withdrawal_requests_failure_consistent
    check ((status = 'failed' and failure_code is not null and failure_message is not null)
      or status <> 'failed'),
  constraint withdrawal_requests_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index withdrawal_requests_provider_reference_unique
  on public.withdrawal_requests (provider_code, provider_reference)
  where provider_code is not null and provider_reference is not null;
create index withdrawal_requests_user_timeline
  on public.withdrawal_requests (user_id, submitted_at desc);
create index withdrawal_requests_user_status_timeline
  on public.withdrawal_requests (user_id, status, submitted_at desc);
create index withdrawal_requests_review_queue
  on public.withdrawal_requests (status, submitted_at)
  where status in ('submitted', 'security_hold', 'under_review', 'approved', 'processing');
create index withdrawal_requests_destination_lookup
  on public.withdrawal_requests (payout_destination_id, user_id);

comment on table public.withdrawal_requests is
  'Idempotent withdrawal requests in paise. Funds are reserved atomically in the append-only wallet ledger.';

create table public.withdrawal_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  withdrawal_request_id bigint not null references public.withdrawal_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  previous_status public.withdrawal_status,
  new_status public.withdrawal_status not null,
  reason text not null,
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint withdrawal_status_history_reason_length check (char_length(reason) between 3 and 500),
  constraint withdrawal_status_history_real_transition
    check (previous_status is null or previous_status <> new_status),
  constraint withdrawal_status_history_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint withdrawal_status_history_request_user_fkey
    foreign key (withdrawal_request_id, user_id)
    references public.withdrawal_requests(id, user_id) on delete restrict,
  constraint withdrawal_status_history_id_request_user_unique
    unique (id, withdrawal_request_id, user_id)
);

create index withdrawal_status_history_request_timeline
  on public.withdrawal_status_history (withdrawal_request_id, occurred_at desc);
create index withdrawal_status_history_user_timeline
  on public.withdrawal_status_history (user_id, occurred_at desc);
create index withdrawal_status_history_actor_lookup
  on public.withdrawal_status_history (actor_id) where actor_id is not null;
create index withdrawal_status_history_request_user_lookup
  on public.withdrawal_status_history (withdrawal_request_id, user_id);

comment on table public.withdrawal_status_history is
  'Append-only evidence for every withdrawal creation and lifecycle transition.';

-- Extend the Step 3 ledger so it can represent reward or withdrawal movements.
alter table public.wallet_ledger_entries
  alter column reward_claim_id drop not null,
  alter column status_history_id drop not null,
  add column withdrawal_request_id bigint,
  add column withdrawal_history_id bigint;

alter table public.wallet_ledger_entries
  drop constraint wallet_ledger_transition_bucket_unique,
  add constraint wallet_ledger_withdrawal_request_fkey
    foreign key (withdrawal_request_id) references public.withdrawal_requests(id) on delete restrict,
  add constraint wallet_ledger_withdrawal_history_fkey
    foreign key (withdrawal_history_id) references public.withdrawal_status_history(id) on delete restrict,
  add constraint wallet_ledger_withdrawal_request_user_fkey
    foreign key (withdrawal_request_id, user_id)
    references public.withdrawal_requests(id, user_id) on delete restrict,
  add constraint wallet_ledger_withdrawal_history_request_user_fkey
    foreign key (withdrawal_history_id, withdrawal_request_id, user_id)
    references public.withdrawal_status_history(id, withdrawal_request_id, user_id) on delete restrict,
  add constraint wallet_ledger_exactly_one_source check (
    (reward_claim_id is not null and status_history_id is not null
      and withdrawal_request_id is null and withdrawal_history_id is null)
    or
    (reward_claim_id is null and status_history_id is null
      and withdrawal_request_id is not null and withdrawal_history_id is not null)
  );

create unique index wallet_ledger_reward_transition_bucket_unique
  on public.wallet_ledger_entries (status_history_id, bucket)
  where status_history_id is not null;
create unique index wallet_ledger_withdrawal_transition_bucket_unique
  on public.wallet_ledger_entries (withdrawal_history_id, bucket)
  where withdrawal_history_id is not null;
create index wallet_ledger_withdrawal_lookup
  on public.wallet_ledger_entries (withdrawal_request_id, user_id);
create index wallet_ledger_withdrawal_history_lookup
  on public.wallet_ledger_entries (withdrawal_history_id, withdrawal_request_id, user_id);

create function private.reject_withdrawal_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'withdrawal history is append-only';
end;
$$;

create trigger withdrawal_status_history_immutable
before update or delete on public.withdrawal_status_history
for each row execute function private.reject_withdrawal_history_mutation();

create function private.guard_payout_destination_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payout destinations cannot be deleted';
  end if;
  if new.destination_id is distinct from old.destination_id
     or new.user_id is distinct from old.user_id
     or new.method_type is distinct from old.method_type
     or new.display_name is distinct from old.display_name
     or new.masked_identifier is distinct from old.masked_identifier
     or new.details_changed_at is distinct from old.details_changed_at
     or new.withdrawal_eligible_at is distinct from old.withdrawal_eligible_at
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable payout destination fields cannot be changed';
  end if;
  return new;
end;
$$;

create trigger payout_destinations_guard_mutation
before update or delete on public.payout_destinations
for each row execute function private.guard_payout_destination_mutation();

create function private.guard_withdrawal_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'withdrawal requests cannot be deleted';
  end if;
  if new.withdrawal_id is distinct from old.withdrawal_id
     or new.user_id is distinct from old.user_id
     or new.payout_destination_id is distinct from old.payout_destination_id
     or new.amount_paise is distinct from old.amount_paise
     or new.currency is distinct from old.currency
     or new.request_id is distinct from old.request_id
     or new.submitted_at is distinct from old.submitted_at
     or new.created_at is distinct from old.created_at then
    raise exception 'immutable withdrawal fields cannot be changed';
  end if;
  if new.status is not distinct from old.status then
    raise exception 'withdrawal update must change status';
  end if;
  return new;
end;
$$;

create trigger withdrawal_requests_guard_mutation
before update or delete on public.withdrawal_requests
for each row execute function private.guard_withdrawal_mutation();

create function private.payout_data_key()
returns text
language sql
security definer
set search_path = pg_catalog
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'glonni_payout_data_key_v1'
  limit 1
$$;

create function private.register_payout_destination(
  p_user_id uuid,
  p_method_type public.payout_method_type,
  p_display_name text,
  p_details jsonb,
  p_request_id uuid,
  p_make_default boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_destination public.payout_destinations%rowtype;
  v_identifier text;
  v_normalized jsonb;
  v_masked text;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_user_id is null then raise exception 'user id is required'; end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception 'payout details must be an object';
  end if;
  if char_length(trim(p_display_name)) not between 2 and 100 then
    raise exception 'display name must contain 2 to 100 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 41));

  if p_method_type = 'upi' then
    v_identifier := lower(trim(p_details ->> 'upi_id'));
    if v_identifier !~ '^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$' then
      raise exception 'invalid UPI ID';
    end if;
    v_normalized := jsonb_build_object(
      'upi_id', v_identifier,
      'account_name', trim(coalesce(p_details ->> 'account_name', p_display_name))
    );
    v_masked := left(split_part(v_identifier, '@', 1), 2)
      || repeat('*', greatest(length(split_part(v_identifier, '@', 1)) - 2, 2))
      || '@' || split_part(v_identifier, '@', 2);
  else
    v_identifier := regexp_replace(coalesce(p_details ->> 'account_number', ''), '\\s', '', 'g');
    if v_identifier !~ '^[0-9]{6,34}$' then raise exception 'invalid bank account number'; end if;
    if upper(trim(coalesce(p_details ->> 'ifsc', ''))) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then
      raise exception 'invalid IFSC';
    end if;
    v_normalized := jsonb_build_object(
      'account_number', v_identifier,
      'ifsc', upper(trim(p_details ->> 'ifsc')),
      'account_name', trim(coalesce(p_details ->> 'account_name', p_display_name))
    );
    v_masked := repeat('*', greatest(length(v_identifier) - 4, 4)) || right(v_identifier, 4);
  end if;

  if p_make_default then
    update public.payout_destinations set is_default = false, updated_at = statement_timestamp()
    where user_id = p_user_id and is_default;
  end if;

  insert into public.payout_destinations (
    user_id, method_type, display_name, masked_identifier, is_default,
    details_changed_at, withdrawal_eligible_at
  ) values (
    p_user_id, p_method_type, trim(p_display_name), v_masked, p_make_default,
    statement_timestamp(), statement_timestamp() + interval '24 hours'
  ) returning * into v_destination;

  insert into private.payout_destination_secrets (
    payout_destination_id, user_id, encrypted_details
  ) values (
    v_destination.id,
    p_user_id,
    extensions.pgp_sym_encrypt(
      v_normalized::text,
      private.payout_data_key(),
      'cipher-algo=aes256, compress-algo=1'
    )
  );

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id, request_id, new_data
  ) values (
    'user', p_user_id, 'payout_destination.created', 'payout_destination',
    v_destination.destination_id::text, p_request_id,
    jsonb_build_object('method_type', p_method_type, 'masked_identifier', v_masked,
      'withdrawal_eligible_at', v_destination.withdrawal_eligible_at)
  );

  return v_destination.destination_id;
end;
$$;

create function private.set_payout_destination_status(
  p_destination_id uuid,
  p_new_status public.payout_destination_status,
  p_reason text,
  p_request_id uuid,
  p_actor_type public.audit_actor_type default 'system',
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_destination public.payout_destinations%rowtype;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if char_length(trim(p_reason)) < 3 then raise exception 'reason is required'; end if;

  select * into v_destination from public.payout_destinations
  where destination_id = p_destination_id for update;
  if not found then raise exception 'payout destination not found'; end if;
  if v_destination.status = p_new_status then return v_destination.destination_id; end if;
  if not (
    (v_destination.status = 'pending_verification' and p_new_status in ('verified', 'rejected', 'disabled'))
    or (v_destination.status = 'verified' and p_new_status = 'disabled')
    or (v_destination.status = 'rejected' and p_new_status = 'disabled')
  ) then raise exception 'invalid payout destination status transition'; end if;

  update public.payout_destinations
  set status = p_new_status,
      verified_at = case when p_new_status = 'verified' then statement_timestamp() else verified_at end,
      disabled_at = case when p_new_status = 'disabled' then statement_timestamp() else disabled_at end,
      is_default = case when p_new_status = 'disabled' then false else is_default end,
      updated_at = statement_timestamp()
  where id = v_destination.id;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id, reason,
    request_id, previous_data, new_data
  ) values (
    p_actor_type, p_actor_id, 'payout_destination.status_changed', 'payout_destination',
    v_destination.destination_id::text, trim(p_reason), p_request_id,
    jsonb_build_object('status', v_destination.status), jsonb_build_object('status', p_new_status)
  );
  return v_destination.destination_id;
end;
$$;

create function private.create_withdrawal_request(
  p_user_id uuid,
  p_destination_id uuid,
  p_amount_paise bigint,
  p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_existing public.withdrawal_requests%rowtype;
  v_destination public.payout_destinations%rowtype;
  v_withdrawal public.withdrawal_requests%rowtype;
  v_history_id bigint;
  v_available bigint;
  v_month_total bigint;
  v_month_start timestamptz;
  v_status public.account_status;
  v_onboarded timestamptz;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if p_amount_paise < 10000 then raise exception 'minimum withdrawal is INR 100'; end if;
  if p_amount_paise > 200000 then raise exception 'daily withdrawal limit is INR 2000'; end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then raise exception 'metadata must be an object'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 42));

  select * into v_existing from public.withdrawal_requests where request_id = p_request_id;
  if found then
    if v_existing.user_id <> p_user_id or v_existing.amount_paise <> p_amount_paise then
      raise exception 'request id already exists with different immutable data';
    end if;
    return v_existing.withdrawal_id;
  end if;

  select status, onboarding_completed_at into v_status, v_onboarded
  from public.profiles where id = p_user_id;
  if not found or v_status <> 'active' or v_onboarded is null then
    raise exception 'active completed account is required';
  end if;

  select * into v_destination from public.payout_destinations
  where destination_id = p_destination_id and user_id = p_user_id for update;
  if not found then raise exception 'payout destination not found'; end if;
  if v_destination.status <> 'verified' then raise exception 'verified payout destination is required'; end if;
  if statement_timestamp() < v_destination.withdrawal_eligible_at then
    raise exception 'payout destination security hold is active';
  end if;

  if exists (
    select 1 from public.withdrawal_requests
    where user_id = p_user_id and submitted_at > statement_timestamp() - interval '24 hours'
  ) then raise exception 'only one withdrawal request is allowed per 24 hours'; end if;

  v_month_start := date_trunc('month', timezone('Asia/Kolkata', statement_timestamp()))
    at time zone 'Asia/Kolkata';
  select coalesce(sum(amount_paise), 0)::bigint into v_month_total
  from public.withdrawal_requests
  where user_id = p_user_id and submitted_at >= v_month_start
    and status not in ('failed', 'cancelled', 'rejected');
  if v_month_total + p_amount_paise > 1000000 then
    raise exception 'monthly withdrawal limit is INR 10000';
  end if;

  select coalesce(sum(amount_paise) filter (where bucket = 'available'), 0)::bigint
  into v_available from public.wallet_ledger_entries where user_id = p_user_id;
  if v_available < p_amount_paise then raise exception 'insufficient available balance'; end if;

  insert into public.withdrawal_requests (
    user_id, payout_destination_id, amount_paise, status, request_id, metadata
  ) values (
    p_user_id, v_destination.id, p_amount_paise, 'submitted', p_request_id, p_metadata
  ) returning * into v_withdrawal;

  insert into public.withdrawal_status_history (
    withdrawal_request_id, user_id, previous_status, new_status, reason,
    request_id, actor_type, actor_id, occurred_at
  ) values (
    v_withdrawal.id, p_user_id, null, 'submitted', 'Withdrawal requested',
    p_request_id, 'user', p_user_id, statement_timestamp()
  ) returning id into v_history_id;

  insert into public.wallet_ledger_entries (
    user_id, withdrawal_request_id, withdrawal_history_id, bucket,
    amount_paise, reason, description, metadata
  ) values
    (p_user_id, v_withdrawal.id, v_history_id, 'available', -p_amount_paise,
      'withdrawal_reserved', 'Withdrawal funds reserved', jsonb_build_object('withdrawal_id', v_withdrawal.withdrawal_id)),
    (p_user_id, v_withdrawal.id, v_history_id, 'held', p_amount_paise,
      'withdrawal_reserved', 'Withdrawal funds reserved', jsonb_build_object('withdrawal_id', v_withdrawal.withdrawal_id));

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id, request_id, new_data
  ) values (
    'user', p_user_id, 'withdrawal.created', 'withdrawal_request',
    v_withdrawal.withdrawal_id::text, p_request_id,
    jsonb_build_object('amount_paise', p_amount_paise, 'currency', 'INR',
      'payout_destination_id', v_destination.destination_id, 'status', 'submitted')
  );
  return v_withdrawal.withdrawal_id;
end;
$$;

create function private.transition_withdrawal_request(
  p_withdrawal_id uuid,
  p_new_status public.withdrawal_status,
  p_reason text,
  p_request_id uuid,
  p_actor_type public.audit_actor_type default 'system',
  p_actor_id uuid default null,
  p_provider_code text default null,
  p_provider_reference text default null,
  p_failure_code text default null,
  p_failure_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_withdrawal public.withdrawal_requests%rowtype;
  v_history_id bigint;
  v_transition_id uuid;
begin
  if p_request_id is null then raise exception 'request id is required'; end if;
  if char_length(trim(p_reason)) < 3 then raise exception 'reason is required'; end if;
  if p_actor_type in ('user', 'admin', 'ai_agent') and p_actor_id is null then
    raise exception 'actor id is required';
  end if;

  select * into v_withdrawal from public.withdrawal_requests
  where withdrawal_id = p_withdrawal_id for update;
  if not found then raise exception 'withdrawal request not found'; end if;

  select transition_id into v_transition_id from public.withdrawal_status_history
  where request_id = p_request_id;
  if found then return v_transition_id; end if;

  if not (
    (v_withdrawal.status = 'submitted' and p_new_status in ('security_hold', 'under_review', 'approved', 'cancelled', 'rejected'))
    or (v_withdrawal.status = 'security_hold' and p_new_status in ('under_review', 'cancelled', 'rejected'))
    or (v_withdrawal.status = 'under_review' and p_new_status in ('approved', 'cancelled', 'rejected'))
    or (v_withdrawal.status = 'approved' and p_new_status in ('processing', 'cancelled'))
    or (v_withdrawal.status = 'processing' and p_new_status in ('paid', 'failed'))
  ) then raise exception 'invalid withdrawal transition from % to %', v_withdrawal.status, p_new_status; end if;

  if p_new_status in ('processing', 'paid')
     and (p_provider_code is null or p_provider_reference is null) then
    raise exception 'provider code and reference are required';
  end if;
  if p_new_status = 'failed' and (p_failure_code is null or p_failure_message is null) then
    raise exception 'failure details are required';
  end if;

  update public.withdrawal_requests
  set status = p_new_status,
      provider_code = coalesce(p_provider_code, provider_code),
      provider_reference = coalesce(p_provider_reference, provider_reference),
      failure_code = case when p_new_status = 'failed' then p_failure_code else failure_code end,
      failure_message = case when p_new_status = 'failed' then p_failure_message else failure_message end,
      completed_at = case when p_new_status in ('paid', 'failed', 'cancelled', 'rejected')
        then statement_timestamp() else null end,
      updated_at = statement_timestamp(), metadata = metadata || coalesce(p_metadata, '{}'::jsonb)
  where id = v_withdrawal.id;

  insert into public.withdrawal_status_history (
    withdrawal_request_id, user_id, previous_status, new_status, reason,
    request_id, actor_type, actor_id, occurred_at, metadata
  ) values (
    v_withdrawal.id, v_withdrawal.user_id, v_withdrawal.status, p_new_status,
    trim(p_reason), p_request_id, p_actor_type, p_actor_id,
    statement_timestamp(), coalesce(p_metadata, '{}'::jsonb)
  ) returning id, transition_id into v_history_id, v_transition_id;

  if p_new_status in ('failed', 'cancelled', 'rejected') then
    insert into public.wallet_ledger_entries (
      user_id, withdrawal_request_id, withdrawal_history_id, bucket,
      amount_paise, reason, description, metadata
    ) values
      (v_withdrawal.user_id, v_withdrawal.id, v_history_id, 'held', -v_withdrawal.amount_paise,
        'withdrawal_released', 'Withdrawal funds released', jsonb_build_object('withdrawal_id', v_withdrawal.withdrawal_id)),
      (v_withdrawal.user_id, v_withdrawal.id, v_history_id, 'available', v_withdrawal.amount_paise,
        'withdrawal_released', 'Withdrawal funds released', jsonb_build_object('withdrawal_id', v_withdrawal.withdrawal_id));
  elsif p_new_status = 'paid' then
    insert into public.wallet_ledger_entries (
      user_id, withdrawal_request_id, withdrawal_history_id, bucket,
      amount_paise, reason, description, metadata
    ) values
      (v_withdrawal.user_id, v_withdrawal.id, v_history_id, 'held', -v_withdrawal.amount_paise,
        'withdrawal_paid', 'Withdrawal paid', jsonb_build_object('withdrawal_id', v_withdrawal.withdrawal_id)),
      (v_withdrawal.user_id, v_withdrawal.id, v_history_id, 'paid', v_withdrawal.amount_paise,
        'withdrawal_paid', 'Withdrawal paid', jsonb_build_object('withdrawal_id', v_withdrawal.withdrawal_id));
  end if;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id, reason,
    request_id, previous_data, new_data, metadata
  ) values (
    p_actor_type, p_actor_id, 'withdrawal.status_changed', 'withdrawal_request',
    v_withdrawal.withdrawal_id::text, trim(p_reason), p_request_id,
    jsonb_build_object('status', v_withdrawal.status), jsonb_build_object('status', p_new_status),
    jsonb_build_object('transition_id', v_transition_id)
  );
  return v_transition_id;
end;
$$;

revoke all on function private.reject_withdrawal_history_mutation() from public, anon, authenticated;
revoke all on function private.guard_payout_destination_mutation() from public, anon, authenticated;
revoke all on function private.guard_withdrawal_mutation() from public, anon, authenticated;
revoke all on function private.payout_data_key() from public, anon, authenticated;
revoke all on function private.register_payout_destination(uuid, public.payout_method_type, text, jsonb, uuid, boolean)
  from public, anon, authenticated;
revoke all on function private.set_payout_destination_status(uuid, public.payout_destination_status, text, uuid, public.audit_actor_type, uuid)
  from public, anon, authenticated;
revoke all on function private.create_withdrawal_request(uuid, uuid, bigint, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function private.transition_withdrawal_request(uuid, public.withdrawal_status, text, uuid, public.audit_actor_type, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

grant usage on schema private to service_role;
grant execute on function private.register_payout_destination(uuid, public.payout_method_type, text, jsonb, uuid, boolean) to service_role;
grant execute on function private.set_payout_destination_status(uuid, public.payout_destination_status, text, uuid, public.audit_actor_type, uuid) to service_role;
grant execute on function private.create_withdrawal_request(uuid, uuid, bigint, uuid, jsonb) to service_role;
grant execute on function private.transition_withdrawal_request(uuid, public.withdrawal_status, text, uuid, public.audit_actor_type, uuid, text, text, text, text, jsonb) to service_role;

alter table public.payout_destinations enable row level security;
alter table public.payout_destinations force row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.withdrawal_requests force row level security;
alter table public.withdrawal_status_history enable row level security;
alter table public.withdrawal_status_history force row level security;

revoke all on public.payout_destinations from anon, authenticated;
revoke all on public.withdrawal_requests from anon, authenticated;
revoke all on public.withdrawal_status_history from anon, authenticated;
grant select on public.payout_destinations to authenticated;
grant select on public.withdrawal_requests to authenticated;
grant select on public.withdrawal_status_history to authenticated;

create policy payout_destinations_select_own
on public.payout_destinations for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy withdrawal_requests_select_own
on public.withdrawal_requests for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy withdrawal_status_history_select_own
on public.withdrawal_status_history for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
