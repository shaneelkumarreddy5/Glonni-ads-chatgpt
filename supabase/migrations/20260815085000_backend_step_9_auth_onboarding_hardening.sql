-- Glonni Ads Backend Step 9: production auth and onboarding hardening.
-- Phone OTP delivery remains provider-managed by Supabase Auth. This migration
-- makes onboarding completion atomic, self-only, and server-timestamped.

create or replace function private.validate_profile_onboarding()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_accepted_at timestamptz := statement_timestamp();
begin
  if old.onboarding_completed_at is not null
     and new.birth_date is distinct from old.birth_date then
    raise exception 'birth date cannot be changed after onboarding';
  end if;

  if old.onboarding_completed_at is not null and (
    new.onboarding_completed_at is distinct from old.onboarding_completed_at
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.terms_version is distinct from old.terms_version
    or new.privacy_accepted_at is distinct from old.privacy_accepted_at
    or new.privacy_version is distinct from old.privacy_version
  ) then
    raise exception 'onboarding acceptance evidence is immutable';
  end if;

  if old.onboarding_completed_at is null
     and new.onboarding_completed_at is not null then
    if new.display_name is null or char_length(trim(new.display_name)) < 2 then
      raise exception 'display name is required to complete onboarding';
    end if;
    if new.birth_date is null
       or new.birth_date > (current_date - interval '18 years')::date
       or new.birth_date < (current_date - interval '120 years')::date then
      raise exception 'a valid adult birth date is required';
    end if;
    if new.terms_accepted_at is null then
      raise exception 'terms acceptance is required';
    end if;
    if new.privacy_accepted_at is null then
      raise exception 'privacy policy acceptance is required';
    end if;

    -- Never trust consent timestamps or policy versions supplied by a client.
    new.terms_accepted_at := v_accepted_at;
    new.terms_version := '2026-08-12';
    new.privacy_accepted_at := v_accepted_at;
    new.privacy_version := '2026-08-12';
    new.onboarding_completed_at := v_accepted_at;
  end if;

  return new;
end;
$$;

create or replace function public.complete_my_onboarding(
  p_display_name text,
  p_birth_date date,
  p_interests text[],
  p_accept_terms boolean,
  p_accept_privacy boolean
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_now timestamptz := statement_timestamp();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if nullif(auth.jwt() ->> 'phone', '') is null then
    raise exception 'verified phone authentication required';
  end if;
  if p_display_name is null
     or char_length(trim(p_display_name)) < 2
     or char_length(trim(p_display_name)) > 100 then
    raise exception 'display name must contain 2 to 100 characters';
  end if;
  if p_birth_date is null
     or p_birth_date > (current_date - interval '18 years')::date
     or p_birth_date < (current_date - interval '120 years')::date then
    raise exception 'a valid adult birth date is required';
  end if;
  if not coalesce(p_accept_terms, false)
     or not coalesce(p_accept_privacy, false) then
    raise exception 'terms and privacy acceptance are required';
  end if;
  if cardinality(coalesce(p_interests, array[]::text[])) > 10
     or exists (
       select 1
       from unnest(coalesce(p_interests, array[]::text[])) as interest(value)
       where char_length(trim(interest.value)) not between 1 and 50
     ) then
    raise exception 'interests are invalid';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = v_user_id;

  if not found or v_profile.status <> 'active'::public.account_status then
    raise exception 'active profile required';
  end if;

  -- Safe retry: never rewrite consent evidence after onboarding succeeds.
  if v_profile.onboarding_completed_at is not null then
    return jsonb_build_object(
      'display_name', v_profile.display_name,
      'interests', to_jsonb(v_profile.interests),
      'onboarding_completed_at', v_profile.onboarding_completed_at
    );
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      birth_date = p_birth_date,
      interests = coalesce(p_interests, array[]::text[]),
      terms_accepted_at = v_now,
      terms_version = '2026-08-12',
      privacy_accepted_at = v_now,
      privacy_version = '2026-08-12',
      onboarding_completed_at = v_now
  where id = v_user_id
    and status = 'active'::public.account_status
    and onboarding_completed_at is null
  returning * into v_profile;

  if not found then
    raise exception 'onboarding could not be completed';
  end if;

  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'interests', to_jsonb(v_profile.interests),
    'onboarding_completed_at', v_profile.onboarding_completed_at
  );
end;
$$;

revoke all on function public.complete_my_onboarding(text, date, text[], boolean, boolean)
  from public, anon;
grant execute on function public.complete_my_onboarding(text, date, text[], boolean, boolean)
  to authenticated;

comment on function public.complete_my_onboarding(text, date, text[], boolean, boolean) is
  'Completes the signed-in phone user own onboarding atomically through existing profile RLS.';
