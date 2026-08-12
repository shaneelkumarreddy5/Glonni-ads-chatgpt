-- Glonni Ads Backend Step 3: secure rewards, wallet ledger and balances.
-- Amounts are stored as integer paise. Reward lifecycle changes and wallet
-- movements are auditable; financial ledger rows are append-only.

create type public.reward_source_type as enum (
  'watch_ad',
  'survey',
  'app_install',
  'game',
  'shop_cashback',
  'referral',
  'goodwill_adjustment'
);

create type public.reward_status as enum (
  'estimated',
  'pending',
  'available',
  'held',
  'reversed',
  'paid'
);

create type public.wallet_bucket as enum (
  'pending',
  'available',
  'held',
  'paid'
);

create type public.wallet_entry_reason as enum (
  'reward_pending',
  'reward_confirmed',
  'reward_held',
  'reward_released',
  'reward_reversed',
  'reward_paid'
);

create table public.reward_claims (
  id bigint generated always as identity primary key,
  reward_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  source_type public.reward_source_type not null,
  provider_code text not null,
  provider_event_id text not null,
  description text not null,
  amount_paise bigint not null,
  currency text not null default 'INR',
  status public.reward_status not null,
  request_id uuid not null unique,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint reward_claims_provider_event_unique
    unique (provider_code, provider_event_id),
  constraint reward_claims_id_user_unique
    unique (id, user_id),
  constraint reward_claims_provider_code_length
    check (char_length(provider_code) between 2 and 80),
  constraint reward_claims_provider_event_id_length
    check (char_length(provider_event_id) between 1 and 250),
  constraint reward_claims_description_length
    check (char_length(description) between 2 and 250),
  constraint reward_claims_positive_amount
    check (amount_paise > 0),
  constraint reward_claims_currency_inr
    check (currency = 'INR'),
  constraint reward_claims_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint reward_claims_occurred_at_reasonable
    check (occurred_at <= created_at + interval '5 minutes')
);

create index reward_claims_user_timeline
  on public.reward_claims (user_id, created_at desc);
create index reward_claims_user_status_timeline
  on public.reward_claims (user_id, status, created_at desc);

comment on table public.reward_claims is
  'Canonical reward records with a guarded lifecycle; provider events and request IDs are idempotent.';
comment on column public.reward_claims.amount_paise is
  'Positive reward amount in paise; floating-point money is intentionally prohibited.';

create table public.reward_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  reward_claim_id bigint not null references public.reward_claims(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  previous_status public.reward_status,
  new_status public.reward_status not null,
  reason text not null,
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint reward_status_history_reason_length
    check (char_length(reason) between 3 and 500),
  constraint reward_status_history_real_transition
    check (previous_status is null or previous_status <> new_status),
  constraint reward_status_history_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint reward_status_history_claim_user_fkey
    foreign key (reward_claim_id, user_id)
    references public.reward_claims(id, user_id) on delete restrict,
  constraint reward_status_history_id_claim_user_unique
    unique (id, reward_claim_id, user_id)
);

create index reward_status_history_claim_timeline
  on public.reward_status_history (reward_claim_id, occurred_at desc);
create index reward_status_history_user_timeline
  on public.reward_status_history (user_id, occurred_at desc);
create index reward_status_history_actor_lookup
  on public.reward_status_history (actor_id)
  where actor_id is not null;

comment on table public.reward_status_history is
  'Append-only evidence for every reward creation and lifecycle transition.';

create table public.wallet_ledger_entries (
  id bigint generated always as identity primary key,
  entry_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  reward_claim_id bigint not null references public.reward_claims(id) on delete restrict,
  status_history_id bigint not null references public.reward_status_history(id) on delete restrict,
  bucket public.wallet_bucket not null,
  amount_paise bigint not null,
  reason public.wallet_entry_reason not null,
  description text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint wallet_ledger_non_zero_amount
    check (amount_paise <> 0),
  constraint wallet_ledger_description_length
    check (char_length(description) between 2 and 250),
  constraint wallet_ledger_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint wallet_ledger_transition_bucket_unique
    unique (status_history_id, bucket),
  constraint wallet_ledger_claim_user_fkey
    foreign key (reward_claim_id, user_id)
    references public.reward_claims(id, user_id) on delete restrict,
  constraint wallet_ledger_history_claim_user_fkey
    foreign key (status_history_id, reward_claim_id, user_id)
    references public.reward_status_history(id, reward_claim_id, user_id) on delete restrict
);

create index wallet_ledger_user_timeline
  on public.wallet_ledger_entries (user_id, occurred_at desc);
create index wallet_ledger_user_bucket_timeline
  on public.wallet_ledger_entries (user_id, bucket, occurred_at desc);
create index wallet_ledger_reward_lookup
  on public.wallet_ledger_entries (reward_claim_id);

comment on table public.wallet_ledger_entries is
  'Append-only bucket movements in paise. Balances are derived from these entries and are never directly edited.';

create function private.reject_financial_record_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'financial history is append-only';
end;
$$;

create trigger reward_status_history_immutable
before update or delete on public.reward_status_history
for each row execute function private.reject_financial_record_mutation();

create trigger wallet_ledger_entries_immutable
before update or delete on public.wallet_ledger_entries
for each row execute function private.reject_financial_record_mutation();

create function private.guard_reward_claim_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'reward claims cannot be deleted';
  end if;

  if new.reward_id is distinct from old.reward_id
     or new.user_id is distinct from old.user_id
     or new.source_type is distinct from old.source_type
     or new.provider_code is distinct from old.provider_code
     or new.provider_event_id is distinct from old.provider_event_id
     or new.description is distinct from old.description
     or new.amount_paise is distinct from old.amount_paise
     or new.currency is distinct from old.currency
     or new.request_id is distinct from old.request_id
     or new.occurred_at is distinct from old.occurred_at
     or new.created_at is distinct from old.created_at
     or new.metadata is distinct from old.metadata then
    raise exception 'immutable reward claim fields cannot be changed';
  end if;

  if new.status is not distinct from old.status then
    raise exception 'reward claim update must change status';
  end if;

  return new;
end;
$$;

create trigger reward_claims_guard_mutation
before update or delete on public.reward_claims
for each row execute function private.guard_reward_claim_mutation();

create function private.create_reward_claim(
  p_user_id uuid,
  p_source_type public.reward_source_type,
  p_provider_code text,
  p_provider_event_id text,
  p_description text,
  p_amount_paise bigint,
  p_initial_status public.reward_status,
  p_occurred_at timestamptz,
  p_request_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_claim public.reward_claims%rowtype;
  v_history_id bigint;
begin
  if p_initial_status not in ('estimated'::public.reward_status, 'pending'::public.reward_status) then
    raise exception 'new rewards must start as estimated or pending';
  end if;
  if p_request_id is null then
    raise exception 'request id is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_provider_code || ':' || p_provider_event_id, 0)
  );

  select * into v_claim
  from public.reward_claims
  where provider_code = p_provider_code
    and provider_event_id = p_provider_event_id;

  if found then
    if v_claim.user_id <> p_user_id
       or v_claim.source_type <> p_source_type
       or v_claim.amount_paise <> p_amount_paise
       or v_claim.request_id <> p_request_id then
      raise exception 'provider event already exists with different immutable data';
    end if;
    return v_claim.reward_id;
  end if;

  insert into public.reward_claims (
    user_id, source_type, provider_code, provider_event_id, description,
    amount_paise, status, occurred_at, request_id, metadata
  ) values (
    p_user_id, p_source_type, trim(p_provider_code), trim(p_provider_event_id),
    trim(p_description), p_amount_paise, p_initial_status, p_occurred_at,
    p_request_id, coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_claim;

  insert into public.reward_status_history (
    reward_claim_id, user_id, previous_status, new_status, reason,
    request_id, actor_type, occurred_at, metadata
  ) values (
    v_claim.id, v_claim.user_id, null, v_claim.status, 'Reward recorded',
    p_request_id, 'system'::public.audit_actor_type, statement_timestamp(),
    jsonb_build_object('provider_code', v_claim.provider_code)
  ) returning id into v_history_id;

  if v_claim.status = 'pending'::public.reward_status then
    insert into public.wallet_ledger_entries (
      user_id, reward_claim_id, status_history_id, bucket, amount_paise,
      reason, description
    ) values (
      v_claim.user_id, v_claim.id, v_history_id, 'pending'::public.wallet_bucket,
      v_claim.amount_paise, 'reward_pending'::public.wallet_entry_reason,
      v_claim.description
    );
  end if;

  insert into public.audit_events (
    actor_type, action, resource_type, resource_id, request_id, new_data, metadata
  ) values (
    'system'::public.audit_actor_type, 'reward.created', 'reward_claim',
    v_claim.reward_id::text, p_request_id,
    jsonb_build_object(
      'user_id', v_claim.user_id,
      'status', v_claim.status,
      'amount_paise', v_claim.amount_paise,
      'currency', v_claim.currency
    ),
    jsonb_build_object('source_type', v_claim.source_type, 'provider_code', v_claim.provider_code)
  );

  return v_claim.reward_id;
end;
$$;

create function private.transition_reward_claim(
  p_reward_id uuid,
  p_new_status public.reward_status,
  p_reason text,
  p_request_id uuid,
  p_actor_type public.audit_actor_type default 'system'::public.audit_actor_type,
  p_actor_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_claim public.reward_claims%rowtype;
  v_history_id bigint;
  v_transition_id uuid;
begin
  if p_request_id is null then
    raise exception 'request id is required';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'a transition reason is required';
  end if;
  if p_actor_type = 'user'::public.audit_actor_type and p_actor_id is null then
    raise exception 'user actor id is required';
  end if;

  select * into v_claim
  from public.reward_claims
  where reward_id = p_reward_id
  for update;

  if not found then
    raise exception 'reward claim not found';
  end if;

  select transition_id into v_transition_id
  from public.reward_status_history
  where request_id = p_request_id;

  if found then
    return v_transition_id;
  end if;

  if not (
    (v_claim.status = 'estimated' and p_new_status in ('pending', 'reversed'))
    or (v_claim.status = 'pending' and p_new_status in ('available', 'held', 'reversed'))
    or (v_claim.status = 'available' and p_new_status in ('held', 'paid', 'reversed'))
    or (v_claim.status = 'held' and p_new_status in ('available', 'reversed'))
  ) then
    raise exception 'invalid reward transition from % to %', v_claim.status, p_new_status;
  end if;

  update public.reward_claims
  set status = p_new_status, updated_at = statement_timestamp()
  where id = v_claim.id;

  insert into public.reward_status_history (
    reward_claim_id, user_id, previous_status, new_status, reason,
    request_id, actor_type, actor_id, occurred_at, metadata
  ) values (
    v_claim.id, v_claim.user_id, v_claim.status, p_new_status, trim(p_reason),
    p_request_id, p_actor_type, p_actor_id, statement_timestamp(),
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id, transition_id into v_history_id, v_transition_id;

  if v_claim.status = 'estimated' and p_new_status = 'pending' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, 'pending', v_claim.amount_paise, 'reward_pending', v_claim.description);
  elsif v_claim.status = 'pending' and p_new_status = 'available' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, 'pending', -v_claim.amount_paise, 'reward_confirmed', v_claim.description),
      (v_claim.user_id, v_claim.id, v_history_id, 'available', v_claim.amount_paise, 'reward_confirmed', v_claim.description);
  elsif v_claim.status = 'pending' and p_new_status = 'held' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, 'pending', -v_claim.amount_paise, 'reward_held', v_claim.description),
      (v_claim.user_id, v_claim.id, v_history_id, 'held', v_claim.amount_paise, 'reward_held', v_claim.description);
  elsif v_claim.status = 'available' and p_new_status = 'held' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, 'available', -v_claim.amount_paise, 'reward_held', v_claim.description),
      (v_claim.user_id, v_claim.id, v_history_id, 'held', v_claim.amount_paise, 'reward_held', v_claim.description);
  elsif v_claim.status = 'held' and p_new_status = 'available' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, 'held', -v_claim.amount_paise, 'reward_released', v_claim.description),
      (v_claim.user_id, v_claim.id, v_history_id, 'available', v_claim.amount_paise, 'reward_released', v_claim.description);
  elsif p_new_status = 'reversed' and v_claim.status <> 'estimated' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, v_claim.status::text::public.wallet_bucket,
       -v_claim.amount_paise, 'reward_reversed', v_claim.description);
  elsif v_claim.status = 'available' and p_new_status = 'paid' then
    insert into public.wallet_ledger_entries
      (user_id, reward_claim_id, status_history_id, bucket, amount_paise, reason, description)
    values
      (v_claim.user_id, v_claim.id, v_history_id, 'available', -v_claim.amount_paise, 'reward_paid', v_claim.description),
      (v_claim.user_id, v_claim.id, v_history_id, 'paid', v_claim.amount_paise, 'reward_paid', v_claim.description);
  end if;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id, reason,
    request_id, previous_data, new_data, metadata
  ) values (
    p_actor_type, p_actor_id, 'reward.status_changed', 'reward_claim',
    v_claim.reward_id::text, trim(p_reason), p_request_id,
    jsonb_build_object('status', v_claim.status),
    jsonb_build_object('status', p_new_status),
    jsonb_build_object('transition_id', v_transition_id)
  );

  return v_transition_id;
end;
$$;

revoke all on function private.reject_financial_record_mutation() from public, anon, authenticated;
revoke all on function private.guard_reward_claim_mutation() from public, anon, authenticated;
revoke all on function private.create_reward_claim(
  uuid, public.reward_source_type, text, text, text, bigint,
  public.reward_status, timestamptz, uuid, jsonb
) from public, anon, authenticated;
revoke all on function private.transition_reward_claim(
  uuid, public.reward_status, text, uuid, public.audit_actor_type, uuid, jsonb
) from public, anon, authenticated;

grant usage on schema private to service_role;
grant execute on function private.create_reward_claim(
  uuid, public.reward_source_type, text, text, text, bigint,
  public.reward_status, timestamptz, uuid, jsonb
) to service_role;
grant execute on function private.transition_reward_claim(
  uuid, public.reward_status, text, uuid, public.audit_actor_type, uuid, jsonb
) to service_role;

alter table public.reward_claims enable row level security;
alter table public.reward_claims force row level security;
alter table public.reward_status_history enable row level security;
alter table public.reward_status_history force row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.wallet_ledger_entries force row level security;

revoke all on public.reward_claims from anon, authenticated;
revoke all on public.reward_status_history from anon, authenticated;
revoke all on public.wallet_ledger_entries from anon, authenticated;

grant select on public.reward_claims to authenticated;
grant select on public.reward_status_history to authenticated;
grant select on public.wallet_ledger_entries to authenticated;

create policy reward_claims_select_own
on public.reward_claims for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy reward_status_history_select_own
on public.reward_status_history for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy wallet_ledger_entries_select_own
on public.wallet_ledger_entries for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create view public.wallet_balances
with (security_invoker = true)
as
select
  user_id,
  coalesce(sum(amount_paise) filter (where bucket = 'pending'), 0)::bigint as pending_paise,
  coalesce(sum(amount_paise) filter (where bucket = 'available'), 0)::bigint as available_paise,
  coalesce(sum(amount_paise) filter (where bucket = 'held'), 0)::bigint as held_paise,
  coalesce(sum(amount_paise) filter (where bucket = 'paid'), 0)::bigint as paid_paise,
  coalesce(sum(amount_paise) filter (where bucket in ('pending', 'available', 'held')), 0)::bigint as total_unpaid_paise,
  max(occurred_at) as last_activity_at
from public.wallet_ledger_entries
group by user_id;

comment on view public.wallet_balances is
  'RLS-respecting calculated balances; available_paise is the only withdrawable bucket.';

revoke all on public.wallet_balances from anon, authenticated;
grant select on public.wallet_balances to authenticated;
