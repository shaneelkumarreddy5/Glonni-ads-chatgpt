-- Glonni Ads Backend Step 2: secure authentication onboarding foundation.
-- Supabase Auth owns credentials, OTP verification and sessions. This migration
-- stores only the minimum application onboarding state and append-only consent evidence.

create type public.consent_kind as enum (
  'terms_of_use',
  'privacy_policy',
  'marketing'
);

alter table public.profiles
  add column birth_date date,
  add column interests text[] not null default '{}'::text[],
  add column onboarding_completed_at timestamptz,
  add column terms_accepted_at timestamptz,
  add column terms_version text,
  add column privacy_accepted_at timestamptz,
  add column privacy_version text,
  add constraint profiles_interests_limit
    check (cardinality(interests) <= 10),
  add constraint profiles_interests_total_length
    check (char_length(array_to_string(interests, ',')) <= 500),
  add constraint profiles_terms_version_length
    check (terms_version is null or char_length(terms_version) between 1 and 50),
  add constraint profiles_privacy_version_length
    check (privacy_version is null or char_length(privacy_version) between 1 and 50);

comment on column public.profiles.birth_date is
  'Date of birth collected for the 18+ eligibility rule; never used as authorization metadata.';
comment on column public.profiles.onboarding_completed_at is
  'Set only after required identity-neutral profile fields and policy consents are valid.';

create table public.user_consents (
  id bigint generated always as identity primary key,
  consent_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  kind public.consent_kind not null,
  policy_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now(),
  source text not null default 'onboarding',
  metadata jsonb not null default '{}'::jsonb,
  constraint user_consents_policy_version_length
    check (char_length(policy_version) between 1 and 50),
  constraint user_consents_source_length
    check (char_length(source) between 2 and 50),
  constraint user_consents_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index user_consents_user_timeline
  on public.user_consents (user_id, recorded_at desc);

comment on table public.user_consents is
  'Append-only evidence of policy and optional marketing consent decisions.';

create function private.validate_profile_onboarding()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if old.onboarding_completed_at is not null and new.birth_date is distinct from old.birth_date then
    raise exception 'birth date cannot be changed after onboarding';
  end if;

  if new.onboarding_completed_at is not null then
    if new.display_name is null or char_length(trim(new.display_name)) < 2 then
      raise exception 'display name is required to complete onboarding';
    end if;
    if new.birth_date is null or new.birth_date > (current_date - interval '18 years')::date then
      raise exception 'user must be at least 18 years old';
    end if;
    if new.terms_accepted_at is null or new.terms_version is null then
      raise exception 'terms acceptance is required';
    end if;
    if new.privacy_accepted_at is null or new.privacy_version is null then
      raise exception 'privacy policy acceptance is required';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_validate_onboarding
before update of birth_date, onboarding_completed_at, terms_accepted_at,
  terms_version, privacy_accepted_at, privacy_version
on public.profiles
for each row execute function private.validate_profile_onboarding();

create function private.capture_profile_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.terms_accepted_at is distinct from new.terms_accepted_at
     and new.terms_accepted_at is not null then
    insert into public.user_consents (user_id, kind, policy_version, granted, recorded_at)
    values (new.id, 'terms_of_use'::public.consent_kind, new.terms_version, true, new.terms_accepted_at);
  end if;

  if old.privacy_accepted_at is distinct from new.privacy_accepted_at
     and new.privacy_accepted_at is not null then
    insert into public.user_consents (user_id, kind, policy_version, granted, recorded_at)
    values (new.id, 'privacy_policy'::public.consent_kind, new.privacy_version, true, new.privacy_accepted_at);
  end if;

  if old.marketing_consent is distinct from new.marketing_consent then
    insert into public.user_consents (user_id, kind, policy_version, granted, recorded_at)
    values (new.id, 'marketing'::public.consent_kind, 'v1', new.marketing_consent, statement_timestamp());
  end if;

  if old.onboarding_completed_at is null and new.onboarding_completed_at is not null then
    insert into public.audit_events (
      actor_type, actor_id, action, resource_type, resource_id, metadata
    ) values (
      'user'::public.audit_actor_type,
      new.id,
      'auth.onboarding_completed',
      'profile',
      new.id::text,
      jsonb_build_object('terms_version', new.terms_version, 'privacy_version', new.privacy_version)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.validate_profile_onboarding() from public, anon, authenticated;
revoke all on function private.capture_profile_consent() from public, anon, authenticated;

create trigger profiles_capture_consent
after update of onboarding_completed_at, terms_accepted_at, privacy_accepted_at, marketing_consent
on public.profiles
for each row execute function private.capture_profile_consent();

create function private.reject_consent_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'consent records are append-only';
end;
$$;

create trigger user_consents_immutable
before update or delete on public.user_consents
for each row execute function private.reject_consent_mutation();

alter table public.user_consents enable row level security;
alter table public.user_consents force row level security;
revoke all on public.user_consents from anon, authenticated;

create policy user_consents_deny_client_access
on public.user_consents
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

grant update (
  birth_date,
  interests,
  onboarding_completed_at,
  terms_accepted_at,
  terms_version,
  privacy_accepted_at,
  privacy_version
) on public.profiles to authenticated;

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
  and status = 'active'::public.account_status
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
  and status = 'active'::public.account_status
);
