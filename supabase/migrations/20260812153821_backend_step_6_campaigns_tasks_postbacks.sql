-- Backend Step 6: provider campaigns, earning tasks, signed postbacks and verified rewards.
-- Money is stored as integer paise. Provider events and budget movements are append-only.

create type public.earning_provider_status as enum ('draft','active','degraded','paused','disabled');
create type public.earning_campaign_status as enum ('draft','scheduled','active','paused','exhausted','ended','cancelled');
create type public.earning_attempt_status as enum ('started','tracked','pending','approved','rejected','reversed','expired','cancelled');
create type public.provider_conversion_status as enum ('pending','approved','rejected','reversed');
create type public.provider_event_processing_status as enum ('received','verified','processed','rejected','manual_review');
create type public.campaign_budget_bucket as enum ('available','reserved','spent');
create type public.campaign_budget_reason as enum ('funded','reward_reserved','reward_confirmed','reservation_released','reward_reversed');

create table private.earning_providers (
  id bigint generated always as identity primary key,
  provider_id uuid not null default gen_random_uuid() unique,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  status public.earning_provider_status not null default 'draft',
  timestamp_tolerance_seconds integer not null default 300 check (timestamp_tolerance_seconds between 30 and 900),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create table private.earning_provider_secrets (
  id bigint generated always as identity primary key,
  provider_id bigint not null references private.earning_providers(id),
  encrypted_secret bytea not null,
  secret_fingerprint text not null check (secret_fingerprint ~ '^[0-9a-f]{64}$'),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);

create unique index earning_provider_one_current_secret_idx
  on private.earning_provider_secrets(provider_id) where valid_until is null;
create index earning_provider_secrets_provider_valid_idx
  on private.earning_provider_secrets(provider_id, valid_from desc, valid_until);

create table public.earning_campaigns (
  id bigint generated always as identity primary key,
  campaign_id uuid not null default gen_random_uuid() unique,
  provider_code text not null references private.earning_providers(code),
  external_campaign_id text not null,
  source_type public.reward_source_type not null,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 3 and 1000),
  status public.earning_campaign_status not null default 'draft',
  reward_paise bigint not null check (reward_paise > 0),
  total_budget_paise bigint not null check (total_budget_paise > 0),
  max_conversions bigint check (max_conversions is null or max_conversions > 0),
  per_user_lifetime_cap integer not null default 1 check (per_user_lifetime_cap between 1 and 10000),
  per_user_daily_cap integer not null default 1 check (per_user_daily_cap between 1 and 1000),
  task_duration_seconds integer not null default 3600 check (task_duration_seconds between 60 and 2592000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  terms_version text not null check (char_length(trim(terms_version)) between 1 and 50),
  requirements jsonb not null default '{}'::jsonb check (jsonb_typeof(requirements) = 'object'),
  allowed_countries text[] not null default array['IN']::text[],
  allowed_platforms text[] not null default array['web','android','ios']::text[],
  pause_reason text,
  published_at timestamptz,
  published_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(provider_code, external_campaign_id),
  check (ends_at > starts_at),
  check (per_user_daily_cap <= per_user_lifetime_cap),
  check (total_budget_paise >= reward_paise),
  check (cardinality(allowed_countries) > 0),
  check (cardinality(allowed_platforms) > 0)
);

comment on table public.earning_campaigns is 'Published earning opportunities. Economics become immutable at publication.';

create index earning_campaigns_discovery_idx
  on public.earning_campaigns(status, starts_at, ends_at);
create index earning_campaigns_provider_idx on public.earning_campaigns(provider_code);
create index earning_campaigns_source_idx on public.earning_campaigns(source_type, status);

create table public.earning_task_attempts (
  id bigint generated always as identity primary key,
  attempt_id uuid not null default gen_random_uuid() unique,
  campaign_id bigint not null references public.earning_campaigns(id),
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.earning_attempt_status not null default 'started',
  reward_claim_id bigint,
  request_id uuid not null unique,
  reward_paise_snapshot bigint not null check (reward_paise_snapshot > 0),
  source_type_snapshot public.reward_source_type not null,
  provider_code_snapshot text not null,
  external_campaign_id_snapshot text not null,
  terms_version_snapshot text not null,
  requirements_snapshot jsonb not null check (jsonb_typeof(requirements_snapshot) = 'object'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  platform text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(id,user_id),
  foreign key (reward_claim_id,user_id) references public.reward_claims(id,user_id),
  check (expires_at > started_at)
);

comment on table public.earning_task_attempts is 'User task starts with immutable campaign economics and terms snapshots.';

create unique index earning_attempts_one_open_idx
  on public.earning_task_attempts(campaign_id,user_id)
  where status in ('started','tracked','pending');
create index earning_attempts_user_started_idx on public.earning_task_attempts(user_id,started_at desc);
create index earning_attempts_campaign_status_idx on public.earning_task_attempts(campaign_id,status,started_at);
create index earning_attempts_reward_idx on public.earning_task_attempts(reward_claim_id) where reward_claim_id is not null;

create table public.earning_task_status_history (
  id bigint generated always as identity primary key,
  transition_id uuid not null default gen_random_uuid() unique,
  attempt_id bigint not null,
  user_id uuid not null,
  previous_status public.earning_attempt_status,
  new_status public.earning_attempt_status not null,
  reason_code text not null,
  request_id uuid not null unique,
  actor_type public.audit_actor_type not null,
  actor_id uuid,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  foreign key (attempt_id,user_id) references public.earning_task_attempts(id,user_id)
);

create index earning_task_history_user_idx on public.earning_task_status_history(user_id,occurred_at desc);
create index earning_task_history_attempt_idx on public.earning_task_status_history(attempt_id,occurred_at);

create table private.campaign_budget_entries (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.earning_campaigns(id),
  attempt_id bigint references public.earning_task_attempts(id),
  bucket public.campaign_budget_bucket not null,
  amount_paise bigint not null check (amount_paise <> 0),
  reason public.campaign_budget_reason not null,
  request_id uuid not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index campaign_budget_campaign_bucket_idx on private.campaign_budget_entries(campaign_id,bucket);
create index campaign_budget_attempt_idx on private.campaign_budget_entries(attempt_id) where attempt_id is not null;
create unique index campaign_budget_unique_leg_idx
  on private.campaign_budget_entries(request_id,bucket,reason);

create table private.provider_postback_events (
  id bigint generated always as identity primary key,
  event_uuid uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.earning_providers(id),
  webhook_id text not null,
  webhook_timestamp bigint not null,
  signature_fingerprint text not null,
  raw_body_sha256 text not null check (raw_body_sha256 ~ '^[0-9a-f]{64}$'),
  encrypted_payload bytea not null,
  processing_status public.provider_event_processing_status not null default 'received',
  conversion_status public.provider_conversion_status,
  campaign_id bigint references public.earning_campaigns(id),
  attempt_id bigint references public.earning_task_attempts(id),
  rejection_code text,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(provider_id,webhook_id)
);

create index provider_events_received_idx on private.provider_postback_events(provider_id,received_at desc);
create index provider_events_attempt_idx on private.provider_postback_events(attempt_id,received_at) where attempt_id is not null;
create index provider_events_processing_idx on private.provider_postback_events(processing_status,received_at);

-- Private data remains inaccessible to the Data API roles.
alter table private.earning_providers enable row level security;
alter table private.earning_provider_secrets enable row level security;
alter table private.campaign_budget_entries enable row level security;
alter table private.provider_postback_events enable row level security;
alter table public.earning_campaigns enable row level security;
alter table public.earning_task_attempts enable row level security;
alter table public.earning_task_status_history enable row level security;

revoke all on private.earning_providers, private.earning_provider_secrets,
  private.campaign_budget_entries, private.provider_postback_events from public,anon,authenticated;
revoke all on public.earning_campaigns, public.earning_task_attempts,
  public.earning_task_status_history from public,anon,authenticated;

grant select on public.earning_campaigns, public.earning_task_attempts,
  public.earning_task_status_history to authenticated;

create policy earning_campaigns_authenticated_discovery
on public.earning_campaigns for select to authenticated
using (
  status = 'active'::public.earning_campaign_status
  and starts_at <= statement_timestamp() and ends_at > statement_timestamp()
);

create policy earning_attempts_own_read
on public.earning_task_attempts for select to authenticated
using ((select auth.uid()) = user_id);

create policy earning_task_history_own_read
on public.earning_task_status_history for select to authenticated
using ((select auth.uid()) = user_id);

-- Reuse Vault for a project-local encryption key. Plaintext provider secrets never enter public tables.
do $block$
begin
  if not exists (select 1 from vault.secrets where name='step6_provider_encryption_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),
      'step6_provider_encryption_key','Encrypts earning provider webhook secrets and payload evidence');
  end if;
end
$block$;

create function private.step6_encryption_key() returns text
language sql stable security definer set search_path='pg_catalog'
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name='step6_provider_encryption_key' limit 1
$$;

create function private.encrypt_provider_value(p_value text) returns bytea
language sql security definer set search_path='pg_catalog'
as $$ select extensions.pgp_sym_encrypt(p_value,private.step6_encryption_key(),'cipher-algo=aes256,compress-algo=1') $$;

create function private.decrypt_provider_value(p_value bytea) returns text
language sql stable security definer set search_path='pg_catalog'
as $$ select extensions.pgp_sym_decrypt(p_value,private.step6_encryption_key()) $$;

revoke all on function private.step6_encryption_key(), private.encrypt_provider_value(text),
  private.decrypt_provider_value(bytea) from public,anon,authenticated;

create function private.reject_step6_mutation() returns trigger
language plpgsql set search_path='pg_catalog'
as $$ begin raise exception '% is append-only',tg_table_name; end $$;

create trigger earning_task_history_immutable before update or delete on public.earning_task_status_history
for each row execute function private.reject_step6_mutation();
create trigger campaign_budget_immutable before update or delete on private.campaign_budget_entries
for each row execute function private.reject_step6_mutation();
create trigger provider_events_no_delete before delete on private.provider_postback_events
for each row execute function private.reject_step6_mutation();
create function private.guard_provider_secret_mutation() returns trigger
language plpgsql set search_path='pg_catalog'
as $$
begin
  if tg_op='DELETE' then raise exception 'provider secrets cannot be deleted'; end if;
  if old.valid_until is null and new.valid_until is not null
    and new.id=old.id and new.provider_id=old.provider_id
    and new.encrypted_secret=old.encrypted_secret and new.secret_fingerprint=old.secret_fingerprint
    and new.valid_from=old.valid_from and new.created_by=old.created_by and new.created_at=old.created_at
  then return new; end if;
  raise exception 'provider secrets are immutable except for retirement';
end $$;

create trigger provider_secrets_guard before update or delete on private.earning_provider_secrets
for each row execute function private.guard_provider_secret_mutation();

create function private.protect_published_campaign_economics() returns trigger
language plpgsql set search_path='pg_catalog'
as $$
begin
  if old.published_at is not null and (
    new.provider_code is distinct from old.provider_code or
    new.external_campaign_id is distinct from old.external_campaign_id or
    new.source_type is distinct from old.source_type or
    new.reward_paise is distinct from old.reward_paise or
    new.total_budget_paise is distinct from old.total_budget_paise or
    new.max_conversions is distinct from old.max_conversions or
    new.per_user_lifetime_cap is distinct from old.per_user_lifetime_cap or
    new.per_user_daily_cap is distinct from old.per_user_daily_cap or
    new.task_duration_seconds is distinct from old.task_duration_seconds or
    new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or
    new.terms_version is distinct from old.terms_version or
    new.requirements is distinct from old.requirements or
    new.allowed_countries is distinct from old.allowed_countries or
    new.allowed_platforms is distinct from old.allowed_platforms
  ) then raise exception 'published campaign economics and eligibility are immutable'; end if;
  new.updated_at := statement_timestamp();
  return new;
end $$;

create trigger protect_published_campaign_economics before update on public.earning_campaigns
for each row execute function private.protect_published_campaign_economics();

create function private.register_earning_provider(
  p_code text,p_display_name text,p_secret_base64 text,p_timestamp_tolerance_seconds integer,
  p_actor_id uuid,p_request_id uuid,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_provider private.earning_providers%rowtype; v_decoded bytea;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner']::public.app_role[]) then raise exception 'owner authorization required'; end if;
  if p_request_id is null then raise exception 'request id is required'; end if;
  begin v_decoded := decode(trim(p_secret_base64),'base64'); exception when others then raise exception 'secret must be valid base64'; end;
  if octet_length(v_decoded) < 32 then raise exception 'provider secret must contain at least 32 bytes'; end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then raise exception 'metadata must be an object'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(trim(p_code)),60));
  select * into v_provider from private.earning_providers where code=lower(trim(p_code)) for update;
  if found then
    update private.earning_providers set display_name=trim(p_display_name),timestamp_tolerance_seconds=p_timestamp_tolerance_seconds,
      updated_by=p_actor_id,updated_at=statement_timestamp(),metadata=coalesce(p_metadata,'{}'::jsonb) where id=v_provider.id returning * into v_provider;
    update private.earning_provider_secrets set valid_until=statement_timestamp() where provider_id=v_provider.id and valid_until is null;
  else
    insert into private.earning_providers(code,display_name,timestamp_tolerance_seconds,created_by,updated_by,metadata)
    values(lower(trim(p_code)),trim(p_display_name),p_timestamp_tolerance_seconds,p_actor_id,p_actor_id,coalesce(p_metadata,'{}'::jsonb)) returning * into v_provider;
  end if;
  insert into private.earning_provider_secrets(provider_id,encrypted_secret,secret_fingerprint,created_by)
  values(v_provider.id,private.encrypt_provider_value(trim(p_secret_base64)),encode(extensions.digest(v_decoded,'sha256'),'hex'),p_actor_id);
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('admin',p_actor_id,'earning_provider.secret_rotated','earning_provider',v_provider.provider_id::text,p_request_id,
    jsonb_build_object('code',v_provider.code,'status',v_provider.status));
  return v_provider.provider_id;
end $$;

create function private.set_earning_provider_status(
  p_provider_id uuid,p_status public.earning_provider_status,p_reason text,p_actor_id uuid,p_request_id uuid
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_provider private.earning_providers%rowtype;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner']::public.app_role[]) then raise exception 'owner authorization required'; end if;
  if p_status='draft' then raise exception 'provider cannot return to draft'; end if;
  update private.earning_providers set status=p_status,updated_by=p_actor_id,updated_at=statement_timestamp()
    where provider_id=p_provider_id returning * into v_provider;
  if not found then raise exception 'provider not found'; end if;
  if p_status in ('degraded','paused','disabled') then
    update public.earning_campaigns set status='paused',pause_reason='PROVIDER_'||upper(p_status::text),updated_by=p_actor_id
    where provider_code=v_provider.code and status in ('active','scheduled');
  end if;
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,reason,request_id,new_data)
  values('admin',p_actor_id,'earning_provider.status_changed','earning_provider',p_provider_id::text,trim(p_reason),p_request_id,jsonb_build_object('status',p_status));
  return p_provider_id;
end $$;

create function private.create_earning_campaign(
  p_provider_code text,p_external_campaign_id text,p_source_type public.reward_source_type,
  p_title text,p_description text,p_reward_paise bigint,p_total_budget_paise bigint,
  p_max_conversions bigint,p_per_user_lifetime_cap integer,p_per_user_daily_cap integer,
  p_task_duration_seconds integer,p_starts_at timestamptz,p_ends_at timestamptz,
  p_terms_version text,p_requirements jsonb,p_allowed_countries text[],p_allowed_platforms text[],
  p_actor_id uuid,p_request_id uuid,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_campaign public.earning_campaigns%rowtype;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner']::public.app_role[]) then raise exception 'owner authorization required'; end if;
  if p_request_id is null then raise exception 'request id is required'; end if;
  if not exists(select 1 from private.earning_providers where code=lower(trim(p_provider_code))) then raise exception 'provider not found'; end if;
  insert into public.earning_campaigns(provider_code,external_campaign_id,source_type,title,description,reward_paise,total_budget_paise,
    max_conversions,per_user_lifetime_cap,per_user_daily_cap,task_duration_seconds,starts_at,ends_at,terms_version,
    requirements,allowed_countries,allowed_platforms,created_by,updated_by,metadata)
  values(lower(trim(p_provider_code)),trim(p_external_campaign_id),p_source_type,trim(p_title),trim(p_description),p_reward_paise,p_total_budget_paise,
    p_max_conversions,p_per_user_lifetime_cap,p_per_user_daily_cap,p_task_duration_seconds,p_starts_at,p_ends_at,trim(p_terms_version),
    coalesce(p_requirements,'{}'::jsonb),p_allowed_countries,p_allowed_platforms,p_actor_id,p_actor_id,coalesce(p_metadata,'{}'::jsonb))
  returning * into v_campaign;
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('admin',p_actor_id,'earning_campaign.created','earning_campaign',v_campaign.campaign_id::text,p_request_id,
    jsonb_build_object('provider_code',v_campaign.provider_code,'reward_paise',v_campaign.reward_paise,'total_budget_paise',v_campaign.total_budget_paise));
  return v_campaign.campaign_id;
end $$;

create function private.publish_earning_campaign(p_campaign_id uuid,p_actor_id uuid,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_campaign public.earning_campaigns%rowtype; v_status public.earning_campaign_status;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner']::public.app_role[]) then raise exception 'owner authorization required'; end if;
  select * into v_campaign from public.earning_campaigns where campaign_id=p_campaign_id for update;
  if not found then raise exception 'campaign not found'; end if;
  if v_campaign.status<>'draft' then
    if v_campaign.published_at is not null then return p_campaign_id; end if;
    raise exception 'only draft campaigns can be published';
  end if;
  if not exists(select 1 from private.earning_providers where code=v_campaign.provider_code and status='active') then raise exception 'active provider required'; end if;
  if v_campaign.ends_at<=statement_timestamp() then raise exception 'campaign has already ended'; end if;
  v_status:=case when v_campaign.starts_at<=statement_timestamp() then 'active'::public.earning_campaign_status else 'scheduled'::public.earning_campaign_status end;
  insert into private.campaign_budget_entries(campaign_id,bucket,amount_paise,reason,request_id)
  values(v_campaign.id,'available',v_campaign.total_budget_paise,'funded',p_request_id);
  update public.earning_campaigns set status=v_status,published_at=statement_timestamp(),published_by=p_actor_id,updated_by=p_actor_id
  where id=v_campaign.id;
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('admin',p_actor_id,'earning_campaign.published','earning_campaign',p_campaign_id::text,p_request_id,
    jsonb_build_object('status',v_status,'reward_paise',v_campaign.reward_paise,'total_budget_paise',v_campaign.total_budget_paise));
  return p_campaign_id;
end $$;

create function private.set_earning_campaign_status(
  p_campaign_id uuid,p_status public.earning_campaign_status,p_reason text,p_actor_id uuid,p_request_id uuid
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_campaign public.earning_campaigns%rowtype; v_available bigint;
begin
  if not private.is_authorized_admin(p_actor_id,array['owner']::public.app_role[]) then raise exception 'owner authorization required'; end if;
  if p_status not in ('active','paused','cancelled') then raise exception 'unsupported manual campaign status'; end if;
  select * into v_campaign from public.earning_campaigns where campaign_id=p_campaign_id for update;
  if not found then raise exception 'campaign not found'; end if;
  if v_campaign.published_at is null then raise exception 'campaign must be published first'; end if;
  if p_status='active' then
    if v_campaign.ends_at<=statement_timestamp() then raise exception 'campaign has ended'; end if;
    if v_campaign.starts_at>statement_timestamp() then raise exception 'campaign has not started'; end if;
    if not exists(select 1 from private.earning_providers where code=v_campaign.provider_code and status='active') then raise exception 'active provider required'; end if;
    select coalesce(sum(amount_paise),0)::bigint into v_available from private.campaign_budget_entries where campaign_id=v_campaign.id and bucket='available';
    if v_available<v_campaign.reward_paise then raise exception 'campaign budget exhausted'; end if;
  end if;
  update public.earning_campaigns set status=p_status,pause_reason=case when p_status='active' then null else trim(p_reason) end,updated_by=p_actor_id where id=v_campaign.id;
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,reason,request_id,previous_data,new_data)
  values('admin',p_actor_id,'earning_campaign.status_changed','earning_campaign',p_campaign_id::text,trim(p_reason),p_request_id,
    jsonb_build_object('status',v_campaign.status),jsonb_build_object('status',p_status));
  return p_campaign_id;
end $$;

create function private.refresh_earning_campaign_states() returns integer
language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_changed integer:=0; v_count integer;
begin
  update public.earning_campaigns c set status='ended',pause_reason='END_TIME_REACHED',updated_at=statement_timestamp()
  where c.status in ('scheduled','active','paused') and c.ends_at<=statement_timestamp();
  get diagnostics v_changed=row_count;
  update public.earning_campaigns c set status='active',pause_reason=null,updated_at=statement_timestamp()
  where c.status='scheduled' and c.starts_at<=statement_timestamp() and c.ends_at>statement_timestamp()
    and exists(select 1 from private.earning_providers p where p.code=c.provider_code and p.status='active')
    and (select coalesce(sum(b.amount_paise),0) from private.campaign_budget_entries b where b.campaign_id=c.id and b.bucket='available')>=c.reward_paise;
  get diagnostics v_count=row_count;
  return v_changed+v_count;
end $$;

create function private.campaign_bucket_balance(p_campaign_id bigint,p_bucket public.campaign_budget_bucket)
returns bigint language sql stable set search_path='pg_catalog'
as $$ select coalesce(sum(amount_paise),0)::bigint from private.campaign_budget_entries where campaign_id=p_campaign_id and bucket=p_bucket $$;

create function private.move_campaign_budget(
  p_campaign_id bigint,p_attempt_id bigint,p_from public.campaign_budget_bucket,p_to public.campaign_budget_bucket,
  p_amount bigint,p_reason public.campaign_budget_reason,p_request_id uuid
) returns void language plpgsql set search_path='pg_catalog'
as $$
begin
  if p_amount<=0 or p_from=p_to then raise exception 'invalid budget movement'; end if;
  if private.campaign_bucket_balance(p_campaign_id,p_from)<p_amount then raise exception 'campaign budget unavailable'; end if;
  insert into private.campaign_budget_entries(campaign_id,attempt_id,bucket,amount_paise,reason,request_id)
  values(p_campaign_id,p_attempt_id,p_from,-p_amount,p_reason,p_request_id),(p_campaign_id,p_attempt_id,p_to,p_amount,p_reason,p_request_id);
end $$;

create function private.start_earning_task_core(
  p_user_id uuid,p_campaign_id uuid,p_request_id uuid,p_country_code text,p_platform text,p_context jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path='pg_catalog'
as $$
declare v_campaign public.earning_campaigns%rowtype; v_attempt public.earning_task_attempts%rowtype; v_now timestamptz:=statement_timestamp();
begin
  if p_user_id is null or p_request_id is null then raise exception 'user and request id are required'; end if;
  if p_context is null or jsonb_typeof(p_context)<>'object' or pg_column_size(p_context)>16384 then raise exception 'context must be an object up to 16KB'; end if;
  select * into v_attempt from public.earning_task_attempts where request_id=p_request_id;
  if found then
    if v_attempt.user_id<>p_user_id then raise exception 'request id belongs to another user'; end if;
    return v_attempt.attempt_id;
  end if;
  select * into v_campaign from public.earning_campaigns where campaign_id=p_campaign_id for update;
  if not found then raise exception 'campaign not found'; end if;
  if v_campaign.status<>'active' or v_campaign.starts_at>v_now or v_campaign.ends_at<=v_now then raise exception 'campaign is not active'; end if;
  if not exists(select 1 from private.earning_providers where code=v_campaign.provider_code and status='active') then raise exception 'provider is unavailable'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and status='active' and onboarding_completed_at is not null) then raise exception 'active completed account required'; end if;
  if exists(select 1 from public.account_restrictions where user_id=p_user_id and status='active' and starts_at<=v_now
    and (expires_at is null or expires_at>v_now) and restriction_type in ('earning_hold','campaign_block','account_restricted','account_suspended','account_closed'))
  then raise exception 'earning is restricted'; end if;
  if upper(trim(p_country_code))<>all(v_campaign.allowed_countries) then raise exception 'country is not eligible'; end if;
  if lower(trim(p_platform))<>all(v_campaign.allowed_platforms) then raise exception 'platform is not eligible'; end if;
  update public.earning_task_attempts set status='expired',updated_at=v_now
    where campaign_id=v_campaign.id and user_id=p_user_id and status in ('started','tracked') and expires_at<=v_now;
  if exists(select 1 from public.earning_task_attempts where campaign_id=v_campaign.id and user_id=p_user_id and status in ('started','tracked','pending')) then raise exception 'an open attempt already exists'; end if;
  if (select count(*) from public.earning_task_attempts where campaign_id=v_campaign.id and user_id=p_user_id and status in ('pending','approved'))>=v_campaign.per_user_lifetime_cap then raise exception 'lifetime task cap reached'; end if;
  if (select count(*) from public.earning_task_attempts where campaign_id=v_campaign.id and user_id=p_user_id and status in ('pending','approved') and started_at>=date_trunc('day',v_now))>=v_campaign.per_user_daily_cap then raise exception 'daily task cap reached'; end if;
  if v_campaign.max_conversions is not null and (select count(*) from public.earning_task_attempts where campaign_id=v_campaign.id and status in ('pending','approved'))>=v_campaign.max_conversions then
    update public.earning_campaigns set status='exhausted',pause_reason='CONVERSION_CAP_REACHED',updated_by=v_campaign.updated_by where id=v_campaign.id;
    raise exception 'campaign conversion cap reached';
  end if;
  if private.campaign_bucket_balance(v_campaign.id,'available')<v_campaign.reward_paise then
    update public.earning_campaigns set status='exhausted',pause_reason='BUDGET_EXHAUSTED',updated_by=v_campaign.updated_by where id=v_campaign.id;
    raise exception 'campaign budget exhausted';
  end if;
  insert into public.earning_task_attempts(campaign_id,user_id,request_id,reward_paise_snapshot,source_type_snapshot,
    provider_code_snapshot,external_campaign_id_snapshot,terms_version_snapshot,requirements_snapshot,country_code,platform,expires_at,metadata)
  values(v_campaign.id,p_user_id,p_request_id,v_campaign.reward_paise,v_campaign.source_type,v_campaign.provider_code,v_campaign.external_campaign_id,
    v_campaign.terms_version,v_campaign.requirements,upper(trim(p_country_code)),lower(trim(p_platform)),least(v_campaign.ends_at,v_now+make_interval(secs=>v_campaign.task_duration_seconds)),p_context)
  returning * into v_attempt;
  insert into public.earning_task_status_history(attempt_id,user_id,previous_status,new_status,reason_code,request_id,actor_type,actor_id)
  values(v_attempt.id,p_user_id,null,'started','TASK_STARTED',p_request_id,'user',p_user_id);
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('user',p_user_id,'earning_task.started','earning_task_attempt',v_attempt.attempt_id::text,p_request_id,
    jsonb_build_object('campaign_id',p_campaign_id,'reward_paise',v_attempt.reward_paise_snapshot));
  return v_attempt.attempt_id;
end $$;

create function public.start_earning_task(p_campaign_id uuid,p_request_id uuid,p_country_code text,p_platform text,p_context jsonb default '{}'::jsonb)
returns uuid language sql security definer set search_path='pg_catalog'
as $$ select private.start_earning_task_core((select auth.uid()),p_campaign_id,p_request_id,p_country_code,p_platform,p_context) $$;

revoke all on function public.start_earning_task(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.start_earning_task(uuid,uuid,text,text,jsonb) to authenticated;

create function private.record_attempt_transition(
  p_attempt_id bigint,p_new_status public.earning_attempt_status,p_reason text,p_request_id uuid,
  p_actor_type public.audit_actor_type,p_actor_id uuid default null,p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql set search_path='pg_catalog'
as $$
declare v_old public.earning_attempt_status; v_user uuid;
begin
  select status,user_id into v_old,v_user from public.earning_task_attempts where id=p_attempt_id for update;
  if not found then raise exception 'attempt not found'; end if;
  if v_old=p_new_status then return; end if;
  if not ((v_old='started' and p_new_status in ('tracked','pending','approved','rejected','expired','cancelled')) or
    (v_old='tracked' and p_new_status in ('pending','approved','rejected','expired')) or
    (v_old='pending' and p_new_status in ('approved','rejected','reversed')) or
    (v_old='approved' and p_new_status='reversed')) then raise exception 'invalid task transition from % to %',v_old,p_new_status; end if;
  update public.earning_task_attempts set status=p_new_status,updated_at=statement_timestamp(),
    completed_at=case when p_new_status in ('approved','rejected','reversed','expired','cancelled') then statement_timestamp() else completed_at end where id=p_attempt_id;
  insert into public.earning_task_status_history(attempt_id,user_id,previous_status,new_status,reason_code,request_id,actor_type,actor_id,metadata)
  values(p_attempt_id,v_user,v_old,p_new_status,p_reason,p_request_id,p_actor_type,p_actor_id,coalesce(p_metadata,'{}'::jsonb));
end $$;

create function public.ingest_earning_provider_postback(
  p_provider_code text,p_webhook_id text,p_webhook_timestamp bigint,p_webhook_signature text,p_raw_body text
) returns jsonb language plpgsql security definer set search_path='pg_catalog'
as $$
declare
  v_provider private.earning_providers%rowtype; v_secret private.earning_provider_secrets%rowtype;
  v_event private.provider_postback_events%rowtype; v_attempt public.earning_task_attempts%rowtype;
  v_campaign public.earning_campaigns%rowtype; v_claim public.reward_claims%rowtype;
  v_body jsonb; v_expected text; v_sig_ok boolean:=false; v_conversion public.provider_conversion_status;
  v_occurred timestamptz; v_attempt_uuid uuid; v_reward_uuid uuid; v_reward_status public.reward_status;
  v_now timestamptz:=statement_timestamp(); v_hash text; v_transition_request uuid;
begin
  if p_webhook_id is null or char_length(trim(p_webhook_id)) not between 1 and 200 then raise exception 'invalid webhook id'; end if;
  if p_raw_body is null or octet_length(p_raw_body)>20480 then raise exception 'payload exceeds 20KB limit'; end if;
  select * into v_provider from private.earning_providers where code=lower(trim(p_provider_code));
  if not found then raise exception 'unknown provider'; end if;
  v_hash:=encode(extensions.digest(convert_to(p_raw_body,'UTF8'),'sha256'),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_provider.id::text||':'||trim(p_webhook_id),61));
  select * into v_event from private.provider_postback_events where provider_id=v_provider.id and webhook_id=trim(p_webhook_id);
  if found then
    if v_event.raw_body_sha256<>v_hash then raise exception 'webhook id replayed with different payload'; end if;
    return jsonb_build_object('event_id',v_event.event_uuid,'status',v_event.processing_status,'idempotent',true);
  end if;
  select * into v_secret from private.earning_provider_secrets
    where provider_id=v_provider.id and valid_from<=to_timestamp(p_webhook_timestamp)
      and (valid_until is null or valid_until>to_timestamp(p_webhook_timestamp)) order by valid_from desc limit 1;
  if found and abs(extract(epoch from v_now)::bigint-p_webhook_timestamp)<=v_provider.timestamp_tolerance_seconds then
    v_expected:=encode(extensions.hmac(convert_to(trim(p_webhook_id)||'.'||p_webhook_timestamp::text||'.'||p_raw_body,'UTF8'),
      decode(private.decrypt_provider_value(v_secret.encrypted_secret),'base64'),'sha256'),'base64');
    v_sig_ok:=position('v1,'||v_expected in coalesce(p_webhook_signature,''))>0;
  end if;
  insert into private.provider_postback_events(provider_id,webhook_id,webhook_timestamp,signature_fingerprint,raw_body_sha256,
    encrypted_payload,processing_status,rejection_code)
  values(v_provider.id,trim(p_webhook_id),p_webhook_timestamp,encode(extensions.digest(coalesce(p_webhook_signature,''),'sha256'),'hex'),v_hash,
    private.encrypt_provider_value(p_raw_body),case when v_sig_ok then 'verified' else 'rejected' end,
    case when v_sig_ok then null else 'SIGNATURE_OR_TIMESTAMP_INVALID' end) returning * into v_event;
  if not v_sig_ok then
    insert into public.audit_events(actor_type,action,resource_type,resource_id,request_id,new_data)
    values('provider','earning_postback.rejected','provider_postback',v_event.event_uuid::text,v_event.event_uuid,jsonb_build_object('reason','SIGNATURE_OR_TIMESTAMP_INVALID','provider_code',v_provider.code));
    return jsonb_build_object('event_id',v_event.event_uuid,'status','rejected','idempotent',false);
  end if;
  if v_provider.status not in ('active','degraded') then
    update private.provider_postback_events set processing_status='manual_review',rejection_code='PROVIDER_NOT_ACTIVE',processed_at=v_now where id=v_event.id;
    return jsonb_build_object('event_id',v_event.event_uuid,'status','manual_review','idempotent',false);
  end if;
  begin v_body:=p_raw_body::jsonb; exception when others then
    update private.provider_postback_events set processing_status='rejected',rejection_code='INVALID_JSON',processed_at=v_now where id=v_event.id;
    return jsonb_build_object('event_id',v_event.event_uuid,'status','rejected','idempotent',false);
  end;
  begin
    v_attempt_uuid:=(v_body->>'attempt_id')::uuid;
    v_conversion:=(v_body->>'event_type')::public.provider_conversion_status;
    v_occurred:=coalesce((v_body->>'occurred_at')::timestamptz,v_now);
  exception when others then
    update private.provider_postback_events set processing_status='rejected',rejection_code='INVALID_EVENT_FIELDS',processed_at=v_now where id=v_event.id;
    return jsonb_build_object('event_id',v_event.event_uuid,'status','rejected','idempotent',false);
  end;
  select * into v_attempt from public.earning_task_attempts where attempt_id=v_attempt_uuid for update;
  if not found or v_attempt.provider_code_snapshot<>v_provider.code then
    update private.provider_postback_events set processing_status='rejected',rejection_code='ATTEMPT_NOT_FOUND',processed_at=v_now where id=v_event.id;
    return jsonb_build_object('event_id',v_event.event_uuid,'status','rejected','idempotent',false);
  end if;
  select * into v_campaign from public.earning_campaigns where id=v_attempt.campaign_id for update;
  update private.provider_postback_events set conversion_status=v_conversion,campaign_id=v_campaign.id,attempt_id=v_attempt.id,occurred_at=v_occurred where id=v_event.id;
  if v_attempt.expires_at<v_occurred and v_conversion in ('pending','approved') then
    update private.provider_postback_events set processing_status='rejected',rejection_code='ATTEMPT_EXPIRED',processed_at=v_now where id=v_event.id;
    if v_attempt.status in ('started','tracked') then perform private.record_attempt_transition(v_attempt.id,'expired','ATTEMPT_EXPIRED',v_event.event_uuid,'provider'); end if;
    return jsonb_build_object('event_id',v_event.event_uuid,'status','rejected','idempotent',false);
  end if;
  if v_attempt.reward_claim_id is not null then select * into v_claim from public.reward_claims where id=v_attempt.reward_claim_id for update; end if;
  if v_conversion in ('pending','approved') and v_attempt.reward_claim_id is null then
    if v_attempt.status not in ('started','tracked') then raise exception 'attempt cannot receive a reward in status %',v_attempt.status; end if;
    perform private.move_campaign_budget(v_campaign.id,v_attempt.id,'available','reserved',v_attempt.reward_paise_snapshot,'reward_reserved',v_event.event_uuid);
    v_reward_uuid:=private.create_reward_claim(v_attempt.user_id,v_attempt.source_type_snapshot,v_provider.code,trim(p_webhook_id),
      v_campaign.title,v_attempt.reward_paise_snapshot,'pending',v_occurred,v_event.event_uuid,
      jsonb_build_object('attempt_id',v_attempt.attempt_id,'campaign_id',v_campaign.campaign_id,'verified_provider_event',v_event.event_uuid));
    select * into v_claim from public.reward_claims where reward_id=v_reward_uuid;
    update public.earning_task_attempts set reward_claim_id=v_claim.id where id=v_attempt.id;
  end if;
  if v_conversion='pending' then
    perform private.record_attempt_transition(v_attempt.id,'pending','PROVIDER_PENDING',v_event.event_uuid,'provider');
  elsif v_conversion='approved' then
    if v_claim.status='pending' then
      v_transition_request:=gen_random_uuid();
      perform private.transition_reward_claim(v_claim.reward_id,'available','Provider conversion verified',v_transition_request,'provider',null,
        jsonb_build_object('provider_event_id',v_event.event_uuid,'attempt_id',v_attempt.attempt_id));
      perform private.move_campaign_budget(v_campaign.id,v_attempt.id,'reserved','spent',v_attempt.reward_paise_snapshot,'reward_confirmed',v_event.event_uuid);
    elsif v_claim.status<>'available' then raise exception 'reward cannot be approved in status %',v_claim.status; end if;
    perform private.record_attempt_transition(v_attempt.id,'approved','PROVIDER_APPROVED',v_event.event_uuid,'provider');
  elsif v_conversion='rejected' then
    if v_attempt.status='approved' then raise exception 'approved conversions require a reversed event'; end if;
    if v_attempt.reward_claim_id is not null and v_claim.status='pending' then
      perform private.transition_reward_claim(v_claim.reward_id,'reversed','Provider rejected conversion',gen_random_uuid(),'provider',null,jsonb_build_object('provider_event_id',v_event.event_uuid));
      perform private.move_campaign_budget(v_campaign.id,v_attempt.id,'reserved','available',v_attempt.reward_paise_snapshot,'reservation_released',v_event.event_uuid);
    end if;
    perform private.record_attempt_transition(v_attempt.id,'rejected','PROVIDER_REJECTED',v_event.event_uuid,'provider');
  else
    if v_attempt.reward_claim_id is null then raise exception 'no reward exists to reverse'; end if;
    v_reward_status:=v_claim.status;
    if v_reward_status='paid' then
      update private.provider_postback_events set processing_status='manual_review',rejection_code='PAID_REWARD_REVERSAL',processed_at=v_now where id=v_event.id;
      insert into public.audit_events(actor_type,action,resource_type,resource_id,request_id,new_data)
      values('provider','earning_postback.manual_review','provider_postback',v_event.event_uuid::text,v_event.event_uuid,jsonb_build_object('reason','PAID_REWARD_REVERSAL','reward_id',v_claim.reward_id));
      return jsonb_build_object('event_id',v_event.event_uuid,'status','manual_review','idempotent',false);
    end if;
    if v_reward_status in ('pending','available','held') then
      perform private.transition_reward_claim(v_claim.reward_id,'reversed','Provider reversed conversion',gen_random_uuid(),'provider',null,jsonb_build_object('provider_event_id',v_event.event_uuid));
      if v_reward_status='pending' then
        perform private.move_campaign_budget(v_campaign.id,v_attempt.id,'reserved','available',v_attempt.reward_paise_snapshot,'reservation_released',v_event.event_uuid);
      else
        perform private.move_campaign_budget(v_campaign.id,v_attempt.id,'spent','available',v_attempt.reward_paise_snapshot,'reward_reversed',v_event.event_uuid);
      end if;
    end if;
    perform private.record_attempt_transition(v_attempt.id,'reversed','PROVIDER_REVERSED',v_event.event_uuid,'provider');
  end if;
  update private.provider_postback_events set processing_status='processed',processed_at=v_now where id=v_event.id;
  if private.campaign_bucket_balance(v_campaign.id,'available')<v_campaign.reward_paise then
    update public.earning_campaigns set status='exhausted',pause_reason='BUDGET_EXHAUSTED',updated_by=v_campaign.updated_by where id=v_campaign.id and status='active';
  elsif v_campaign.max_conversions is not null and (select count(*) from public.earning_task_attempts where campaign_id=v_campaign.id and status in ('pending','approved'))>=v_campaign.max_conversions then
    update public.earning_campaigns set status='exhausted',pause_reason='CONVERSION_CAP_REACHED',updated_by=v_campaign.updated_by where id=v_campaign.id and status='active';
  end if;
  insert into public.audit_events(actor_type,action,resource_type,resource_id,request_id,new_data)
  values('provider','earning_postback.processed','provider_postback',v_event.event_uuid::text,v_event.event_uuid,
    jsonb_build_object('provider_code',v_provider.code,'attempt_id',v_attempt.attempt_id,'event_type',v_conversion));
  return jsonb_build_object('event_id',v_event.event_uuid,'status','processed','idempotent',false);
end $$;

revoke all on function public.ingest_earning_provider_postback(text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.ingest_earning_provider_postback(text,text,bigint,text,text) to service_role;

revoke all on function private.register_earning_provider(text,text,text,integer,uuid,uuid,jsonb),
  private.set_earning_provider_status(uuid,public.earning_provider_status,text,uuid,uuid),
  private.create_earning_campaign(text,text,public.reward_source_type,text,text,bigint,bigint,bigint,integer,integer,integer,timestamptz,timestamptz,text,jsonb,text[],text[],uuid,uuid,jsonb),
  private.publish_earning_campaign(uuid,uuid,uuid), private.set_earning_campaign_status(uuid,public.earning_campaign_status,text,uuid,uuid),
  private.refresh_earning_campaign_states(), private.campaign_bucket_balance(bigint,public.campaign_budget_bucket),
  private.move_campaign_budget(bigint,bigint,public.campaign_budget_bucket,public.campaign_budget_bucket,bigint,public.campaign_budget_reason,uuid),
  private.start_earning_task_core(uuid,uuid,uuid,text,text,jsonb),
  private.record_attempt_transition(bigint,public.earning_attempt_status,text,uuid,public.audit_actor_type,uuid,jsonb)
from public,anon,authenticated;

grant execute on function private.register_earning_provider(text,text,text,integer,uuid,uuid,jsonb),
  private.set_earning_provider_status(uuid,public.earning_provider_status,text,uuid,uuid),
  private.create_earning_campaign(text,text,public.reward_source_type,text,text,bigint,bigint,bigint,integer,integer,integer,timestamptz,timestamptz,text,jsonb,text[],text[],uuid,uuid,jsonb),
  private.publish_earning_campaign(uuid,uuid,uuid), private.set_earning_campaign_status(uuid,public.earning_campaign_status,text,uuid,uuid),
  private.refresh_earning_campaign_states(),
  private.start_earning_task_core(uuid,uuid,uuid,text,text,jsonb)
to service_role;

comment on function public.ingest_earning_provider_postback(text,text,bigint,text,text) is
  'Service-only normalized Standard Webhooks ingestion. Signature, timestamp, replay and idempotency checks run before reward creation.';
