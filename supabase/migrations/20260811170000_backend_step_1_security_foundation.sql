-- Glonni Ads Backend Step 1: database architecture and security foundation.
-- Business modules (rewards, wallets, withdrawals, KYC, offers) are intentionally
-- excluded and will be introduced in later migrations.

create type public.account_status as enum (
  'active',
  'restricted',
  'suspended',
  'closed'
);

create type public.app_role as enum (
  'user',
  'owner',
  'finance',
  'support',
  'kyc_risk',
  'content',
  'analyst',
  'ai_agent'
);

create type public.audit_actor_type as enum (
  'user',
  'admin',
  'ai_agent',
  'system',
  'provider'
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text,
  avatar_url text,
  locale text not null default 'en-IN',
  timezone text not null default 'Asia/Kolkata',
  status public.account_status not null default 'active',
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 100),
  constraint profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048),
  constraint profiles_locale_length
    check (char_length(locale) between 2 and 35),
  constraint profiles_timezone_length
    check (char_length(timezone) between 1 and 100),
  constraint profiles_marketing_consent_timestamp
    check (marketing_consent or marketing_consent_at is null)
);

comment on table public.profiles is
  'Non-sensitive application profile linked one-to-one with auth.users.';
comment on column public.profiles.status is
  'Server-controlled account status; users cannot update this column.';

create table public.user_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  grant_reason text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_roles_grant_reason_length
    check (grant_reason is null or char_length(grant_reason) between 3 and 500),
  constraint user_roles_revocation_state
    check ((is_active and revoked_at is null) or (not is_active and revoked_at is not null))
);

create unique index user_roles_one_active_role
  on public.user_roles (user_id, role)
  where is_active;
create index user_roles_active_lookup
  on public.user_roles (user_id, role)
  where is_active;

comment on table public.user_roles is
  'Protected authorization assignments. Never derive authorization from editable profile or user metadata.';

create table public.audit_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  occurred_at timestamptz not null default now(),
  actor_type public.audit_actor_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  request_id uuid,
  ip_hash text,
  user_agent_hash text,
  previous_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint audit_events_action_length check (char_length(action) between 2 and 100),
  constraint audit_events_resource_type_length check (char_length(resource_type) between 2 and 100),
  constraint audit_events_resource_id_length check (resource_id is null or char_length(resource_id) <= 250),
  constraint audit_events_reason_length check (reason is null or char_length(reason) between 3 and 1000),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_events_occurred_at_desc
  on public.audit_events (occurred_at desc);
create index audit_events_resource_lookup
  on public.audit_events (resource_type, resource_id, occurred_at desc);
create index audit_events_actor_lookup
  on public.audit_events (actor_id, occurred_at desc)
  where actor_id is not null;

comment on table public.audit_events is
  'Append-only security and business audit trail. Updates and deletes are blocked by a trigger.';

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 100), '')
  );

  insert into public.user_roles (user_id, role, grant_reason)
  values (new.id, 'user'::public.app_role, 'Default role assigned at account creation');

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create function private.reject_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'audit events are append-only';
end;
$$;

create trigger audit_events_immutable
before update or delete on public.audit_events
for each row execute function private.reject_audit_mutation();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, locale, timezone, marketing_consent, marketing_consent_at)
  on public.profiles to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

-- Role assignments and audit events intentionally have no client-facing RLS
-- policies or grants. Later server-side workflows will write them with a
-- protected secret key and will expose only explicitly reviewed projections.

