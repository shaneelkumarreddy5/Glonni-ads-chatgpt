-- Glonni Ads Backend Step 16: provider-neutral affiliate and payout gateway.
-- No network, merchant, payout service, credential, route, click, order or payout
-- attempt is seeded or activated. Amounts are integer paise. External callbacks
-- are signed, timestamp-bound and idempotent. Existing reward and withdrawal
-- ledgers remain the financial source of truth.

create type public.commerce_provider_domain as enum ('affiliate', 'payout');
create type public.commerce_provider_status as enum ('draft', 'active', 'degraded', 'paused', 'disabled');
create type public.affiliate_conversion_status as enum ('tracked', 'pending', 'confirmed', 'rejected', 'reversed');
create type public.payout_attempt_status as enum ('queued', 'processing', 'paid', 'failed', 'cancelled');

create table private.commerce_providers (
  id bigint generated always as identity primary key,
  provider_id uuid not null default gen_random_uuid() unique,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  domain public.commerce_provider_domain not null,
  status public.commerce_provider_status not null default 'draft',
  integration_mode text not null check (integration_mode in ('api', 'feed', 'deep_link', 'server_postback', 'bank_rail')),
  timestamp_tolerance_seconds integer not null default 300 check (timestamp_tolerance_seconds between 30 and 900),
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config) = 'object'),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index commerce_providers_domain_status_idx on private.commerce_providers(domain, status);
create index commerce_providers_created_by_idx on private.commerce_providers(created_by);
create index commerce_providers_updated_by_idx on private.commerce_providers(updated_by);

create table private.commerce_provider_secrets (
  id bigint generated always as identity primary key,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  encrypted_secret bytea not null,
  secret_fingerprint text not null check (secret_fingerprint ~ '^[0-9a-f]{64}$'),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);

create unique index commerce_provider_one_current_secret_idx
  on private.commerce_provider_secrets(provider_id) where valid_until is null;
create index commerce_provider_secrets_valid_idx
  on private.commerce_provider_secrets(provider_id, valid_from desc, valid_until);
create index commerce_provider_secrets_created_by_idx on private.commerce_provider_secrets(created_by);

create table private.affiliate_merchants (
  id bigint generated always as identity primary key,
  merchant_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  merchant_code text not null check (merchant_code ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'disabled')),
  destination_url text not null check (destination_url ~ '^https://'),
  cashback_bps integer not null check (cashback_bps between 0 and 10000),
  return_window_days integer not null check (return_window_days between 0 and 180),
  attribution_window_hours integer not null default 720 check (attribution_window_hours between 1 and 2160),
  terms_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(terms_snapshot) = 'object'),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, merchant_code)
);

create index affiliate_merchants_provider_status_idx on private.affiliate_merchants(provider_id, status);
create index affiliate_merchants_created_by_idx on private.affiliate_merchants(created_by);
create index affiliate_merchants_updated_by_idx on private.affiliate_merchants(updated_by);

create table private.affiliate_clicks (
  id bigint generated always as identity primary key,
  click_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  merchant_id bigint not null references private.affiliate_merchants(id) on delete restrict,
  tracking_token_hash text not null unique check (tracking_token_hash ~ '^[0-9a-f]{64}$'),
  destination_hash text not null check (destination_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (expires_at > created_at)
);

create index affiliate_clicks_user_timeline_idx on private.affiliate_clicks(user_id, created_at desc);
create index affiliate_clicks_merchant_timeline_idx on private.affiliate_clicks(merchant_id, created_at desc);
create index affiliate_clicks_expiry_idx on private.affiliate_clicks(expires_at);

create table private.affiliate_conversions (
  id bigint generated always as identity primary key,
  conversion_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  merchant_id bigint not null references private.affiliate_merchants(id) on delete restrict,
  click_id bigint not null references private.affiliate_clicks(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider_order_hash text not null check (provider_order_hash ~ '^[0-9a-f]{64}$'),
  sale_amount_paise bigint not null check (sale_amount_paise >= 0),
  commission_amount_paise bigint not null check (commission_amount_paise >= 0),
  cashback_amount_paise bigint not null check (cashback_amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status public.affiliate_conversion_status not null,
  reward_claim_id bigint unique references public.reward_claims(id) on delete restrict,
  return_window_ends_at timestamptz not null,
  confirmed_at timestamptz,
  rejected_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(provider_id, provider_order_hash),
  check (cashback_amount_paise <= commission_amount_paise),
  check (confirmed_at is null or status in ('confirmed', 'reversed')),
  check (rejected_at is null or status = 'rejected'),
  check (reversed_at is null or status = 'reversed')
);

create index affiliate_conversions_provider_timeline_idx on private.affiliate_conversions(provider_id, created_at desc);
create index affiliate_conversions_merchant_timeline_idx on private.affiliate_conversions(merchant_id, created_at desc);
create index affiliate_conversions_click_idx on private.affiliate_conversions(click_id);
create index affiliate_conversions_user_timeline_idx on private.affiliate_conversions(user_id, created_at desc);
create index affiliate_conversions_finalize_idx
  on private.affiliate_conversions(status, return_window_ends_at) where status = 'confirmed';

create table private.affiliate_conversion_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  conversion_id bigint not null references private.affiliate_conversions(id) on delete restrict,
  webhook_event_id text not null check (char_length(webhook_event_id) between 1 and 200),
  event_status public.affiliate_conversion_status not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  encrypted_payload bytea not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique(provider_id, webhook_event_id)
);

create index affiliate_conversion_events_conversion_idx
  on private.affiliate_conversion_events(conversion_id, occurred_at desc);
create index affiliate_conversion_events_provider_idx
  on private.affiliate_conversion_events(provider_id, received_at desc);

create table private.payout_routes (
  id bigint generated always as identity primary key,
  route_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  method_type public.payout_method_type not null,
  priority integer not null check (priority between 1 and 100),
  enabled boolean not null default false,
  minimum_amount_paise bigint not null default 10000 check (minimum_amount_paise >= 10000),
  maximum_amount_paise bigint not null default 200000 check (maximum_amount_paise >= minimum_amount_paise),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, method_type),
  unique(method_type, priority)
);

create index payout_routes_provider_idx on private.payout_routes(provider_id);
create index payout_routes_dispatch_idx on private.payout_routes(method_type, enabled, priority) where enabled;
create index payout_routes_created_by_idx on private.payout_routes(created_by);
create index payout_routes_updated_by_idx on private.payout_routes(updated_by);

create table private.payout_attempts (
  id bigint generated always as identity primary key,
  attempt_id uuid not null default gen_random_uuid() unique,
  withdrawal_request_id bigint not null references public.withdrawal_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  request_id uuid not null unique,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status public.payout_attempt_status not null default 'queued',
  provider_reference_hash text check (provider_reference_hash is null or provider_reference_hash ~ '^[0-9a-f]{64}$'),
  failure_code text check (failure_code is null or char_length(failure_code) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(withdrawal_request_id, provider_id, request_id)
);

create index payout_attempts_withdrawal_idx on private.payout_attempts(withdrawal_request_id, created_at desc);
create index payout_attempts_user_timeline_idx on private.payout_attempts(user_id, created_at desc);
create index payout_attempts_provider_timeline_idx on private.payout_attempts(provider_id, created_at desc);
create index payout_attempts_queue_idx on private.payout_attempts(status, created_at) where status in ('queued', 'processing');

create table private.payout_attempt_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.commerce_providers(id) on delete restrict,
  payout_attempt_id bigint not null references private.payout_attempts(id) on delete restrict,
  webhook_event_id text not null check (char_length(webhook_event_id) between 1 and 200),
  event_status public.payout_attempt_status not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  encrypted_payload bytea not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  unique(provider_id, webhook_event_id)
);

create index payout_attempt_events_attempt_idx on private.payout_attempt_events(payout_attempt_id, occurred_at desc);
create index payout_attempt_events_provider_idx on private.payout_attempt_events(provider_id, received_at desc);

alter table private.commerce_providers enable row level security;
alter table private.commerce_provider_secrets enable row level security;
alter table private.affiliate_merchants enable row level security;
alter table private.affiliate_clicks enable row level security;
alter table private.affiliate_conversions enable row level security;
alter table private.affiliate_conversion_events enable row level security;
alter table private.payout_routes enable row level security;
alter table private.payout_attempts enable row level security;
alter table private.payout_attempt_events enable row level security;

revoke all on private.commerce_providers, private.commerce_provider_secrets,
  private.affiliate_merchants, private.affiliate_clicks, private.affiliate_conversions,
  private.affiliate_conversion_events, private.payout_routes, private.payout_attempts,
  private.payout_attempt_events from public, anon, authenticated;

do $block$
begin
  if not exists (select 1 from vault.secrets where name = 'step16_commerce_encryption_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
      'step16_commerce_encryption_key', 'Encrypts Step 16 provider secrets and callback evidence');
  end if;
end
$block$;

create function private.step16_commerce_encryption_key()
returns text language sql stable security definer set search_path = 'pg_catalog'
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'step16_commerce_encryption_key' limit 1 $$;

create function private.encrypt_commerce_value(p_value text)
returns bytea language sql security definer set search_path = 'pg_catalog'
as $$ select extensions.pgp_sym_encrypt(p_value, private.step16_commerce_encryption_key(), 'cipher-algo=aes256,compress-algo=1') $$;

create function private.decrypt_commerce_value(p_value bytea)
returns text language sql stable security definer set search_path = 'pg_catalog'
as $$ select extensions.pgp_sym_decrypt(p_value, private.step16_commerce_encryption_key()) $$;

revoke all on function private.step16_commerce_encryption_key(),
  private.encrypt_commerce_value(text), private.decrypt_commerce_value(bytea)
  from public, anon, authenticated;

create function private.reject_commerce_evidence_mutation()
returns trigger language plpgsql set search_path = 'pg_catalog'
as $$ begin raise exception 'commerce evidence is append-only'; end $$;

create trigger affiliate_conversion_events_immutable before update or delete
  on private.affiliate_conversion_events for each row execute function private.reject_commerce_evidence_mutation();
create trigger payout_attempt_events_immutable before update or delete
  on private.payout_attempt_events for each row execute function private.reject_commerce_evidence_mutation();

create function private.guard_commerce_secret_mutation()
returns trigger language plpgsql set search_path = 'pg_catalog'
as $$
begin
  if tg_op = 'DELETE' then raise exception 'commerce secrets cannot be deleted'; end if;
  if old.valid_until is null and new.valid_until is not null
    and new.id = old.id and new.provider_id = old.provider_id
    and new.encrypted_secret = old.encrypted_secret
    and new.secret_fingerprint = old.secret_fingerprint
    and new.valid_from = old.valid_from and new.created_by = old.created_by
    and new.created_at = old.created_at then return new;
  end if;
  raise exception 'commerce secrets are immutable except for retirement';
end;
$$;

create trigger commerce_provider_secrets_guard before update or delete
  on private.commerce_provider_secrets for each row execute function private.guard_commerce_secret_mutation();

create function private.register_commerce_provider(
  p_actor_id uuid, p_code text, p_display_name text,
  p_domain public.commerce_provider_domain, p_integration_mode text,
  p_secret_base64 text, p_timestamp_tolerance_seconds integer,
  p_request_id uuid, p_public_config jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_provider private.commerce_providers%rowtype; v_secret_bytes bytea;
begin
  if p_actor_id is null or not private.is_authorized_admin(p_actor_id, array['owner']::public.app_role[])
    then raise exception 'owner_authorization_required'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;
  if p_public_config is null or jsonb_typeof(p_public_config) <> 'object'
    then raise exception 'public_config_must_be_object'; end if;
  if p_public_config ?| array['secret','api_key','token','password','private_key']
    then raise exception 'secret_material_not_allowed'; end if;
  begin v_secret_bytes := decode(btrim(p_secret_base64), 'base64');
  exception when others then raise exception 'secret_must_be_valid_base64'; end;
  if octet_length(v_secret_bytes) < 32 then raise exception 'provider_secret_too_short'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(btrim(p_code)), 81));
  select * into v_provider from private.commerce_providers where code = lower(btrim(p_code)) for update;
  if found then
    if v_provider.domain <> p_domain then raise exception 'provider_domain_is_immutable'; end if;
    update private.commerce_providers set display_name=btrim(p_display_name), integration_mode=p_integration_mode,
      timestamp_tolerance_seconds=p_timestamp_tolerance_seconds, public_config=p_public_config,
      updated_by=p_actor_id, updated_at=statement_timestamp()
      where id=v_provider.id returning * into v_provider;
    update private.commerce_provider_secrets set valid_until=statement_timestamp()
      where provider_id=v_provider.id and valid_until is null;
  else
    insert into private.commerce_providers(code,display_name,domain,integration_mode,
      timestamp_tolerance_seconds,public_config,created_by,updated_by)
    values(lower(btrim(p_code)),btrim(p_display_name),p_domain,p_integration_mode,
      p_timestamp_tolerance_seconds,p_public_config,p_actor_id,p_actor_id)
    returning * into v_provider;
  end if;
  insert into private.commerce_provider_secrets(provider_id,encrypted_secret,secret_fingerprint,created_by)
  values(v_provider.id,private.encrypt_commerce_value(btrim(p_secret_base64)),
    encode(extensions.digest(v_secret_bytes,'sha256'),'hex'),p_actor_id);
  insert into public.audit_events(actor_type,actor_id,action,resource_type,resource_id,request_id,new_data)
  values('admin',p_actor_id,'commerce_provider.secret_rotated','commerce_provider',v_provider.provider_id::text,
    p_request_id,jsonb_build_object('code',v_provider.code,'domain',v_provider.domain,'status',v_provider.status));
  return v_provider.provider_id;
end;
$$;

create function private.create_affiliate_click(
  p_user_id uuid, p_merchant_code text, p_request_id uuid, p_metadata jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_merchant private.affiliate_merchants%rowtype; v_provider private.commerce_providers%rowtype;
  v_click private.affiliate_clicks%rowtype; v_token uuid;
begin
  if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id and status='active')
    then raise exception 'active_user_required'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;
  select merchant.* into v_merchant from private.affiliate_merchants merchant
    join private.commerce_providers provider on provider.id=merchant.provider_id
    where merchant.merchant_code=lower(btrim(p_merchant_code)) and merchant.status='active'
      and provider.domain='affiliate' and provider.status in ('active','degraded');
  if not found then raise exception 'merchant_not_available'; end if;
  select * into v_provider from private.commerce_providers where id=v_merchant.provider_id;
  v_token := gen_random_uuid();
  insert into private.affiliate_clicks(user_id,merchant_id,tracking_token_hash,destination_hash,expires_at,metadata)
  values(p_user_id,v_merchant.id,encode(extensions.digest(v_token::text,'sha256'),'hex'),
    encode(extensions.digest(v_merchant.destination_url,'sha256'),'hex'),
    statement_timestamp() + make_interval(hours=>v_merchant.attribution_window_hours),p_metadata)
  returning * into v_click;
  return jsonb_build_object('click_id',v_click.click_id,'tracking_token',v_token,
    'destination_url',v_merchant.destination_url,'provider_code',v_provider.code,
    'expires_at',v_click.expires_at,'cashback_bps',v_merchant.cashback_bps);
end;
$$;

create function private.verify_commerce_callback(
  p_provider_code text, p_domain public.commerce_provider_domain,
  p_webhook_timestamp bigint, p_webhook_signature text, p_raw_body text
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_provider private.commerce_providers%rowtype; v_secret private.commerce_provider_secrets%rowtype; v_expected text;
begin
  select * into v_provider from private.commerce_providers
    where code=lower(btrim(p_provider_code)) and domain=p_domain;
  if not found then raise exception 'unknown_provider'; end if;
  if v_provider.status not in ('active','degraded') then raise exception 'provider_not_active'; end if;
  if abs(extract(epoch from statement_timestamp())::bigint-p_webhook_timestamp)>v_provider.timestamp_tolerance_seconds
    then raise exception 'webhook_timestamp_invalid'; end if;
  select * into v_secret from private.commerce_provider_secrets
    where provider_id=v_provider.id and valid_from<=to_timestamp(p_webhook_timestamp)
      and (valid_until is null or valid_until>to_timestamp(p_webhook_timestamp))
    order by valid_from desc limit 1;
  if not found then raise exception 'provider_secret_not_found'; end if;
  v_expected:=encode(extensions.hmac(convert_to(p_webhook_timestamp::text||'.'||p_raw_body,'utf8'),
    decode(private.decrypt_commerce_value(v_secret.encrypted_secret),'base64'),'sha256'),'base64');
  if encode(extensions.digest(v_expected,'sha256'),'hex')<>
     encode(extensions.digest(p_webhook_signature,'sha256'),'hex')
    then raise exception 'webhook_signature_invalid'; end if;
  return v_provider.id;
end;
$$;

create function private.ingest_affiliate_callback(
  p_provider_code text, p_webhook_id text, p_webhook_timestamp bigint,
  p_webhook_signature text, p_raw_body text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_provider_id bigint; v_body jsonb; v_click private.affiliate_clicks%rowtype;
  v_merchant private.affiliate_merchants%rowtype; v_conversion private.affiliate_conversions%rowtype;
  v_status public.affiliate_conversion_status; v_reward_id uuid; v_reward_internal_id bigint;
  v_order_hash text; v_event_time timestamptz; v_return_end timestamptz; v_cashback bigint;
begin
  v_provider_id:=private.verify_commerce_callback(p_provider_code,'affiliate',p_webhook_timestamp,p_webhook_signature,p_raw_body);
  begin v_body:=p_raw_body::jsonb; exception when others then raise exception 'invalid_json'; end;
  if jsonb_typeof(v_body)<>'object' then raise exception 'invalid_json'; end if;
  begin
    v_status:=(v_body->>'event_type')::public.affiliate_conversion_status;
    v_event_time:=(v_body->>'occurred_at')::timestamptz;
    v_return_end:=(v_body->>'return_window_ends_at')::timestamptz;
    v_cashback:=(v_body->>'cashback_amount_paise')::bigint;
  exception when others then raise exception 'invalid_affiliate_event'; end;
  if v_status not in ('tracked','pending','confirmed','rejected','reversed')
    then raise exception 'invalid_affiliate_event'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_provider_id::text||':'||p_webhook_id,82));
  if exists(select 1 from private.affiliate_conversion_events where provider_id=v_provider_id and webhook_event_id=p_webhook_id)
    then return jsonb_build_object('accepted',true,'duplicate',true); end if;
  select click.* into v_click from private.affiliate_clicks click
    where click.click_id=(v_body->>'click_id')::uuid and click.expires_at>=v_event_time;
  if not found then raise exception 'valid_click_not_found'; end if;
  select * into v_merchant from private.affiliate_merchants where id=v_click.merchant_id and provider_id=v_provider_id;
  if not found then raise exception 'merchant_provider_mismatch'; end if;
  if v_cashback<=0 or v_cashback>(v_body->>'commission_amount_paise')::bigint
    then raise exception 'invalid_cashback_amount'; end if;
  v_order_hash:=encode(extensions.digest(v_body->>'order_id','sha256'),'hex');
  select * into v_conversion from private.affiliate_conversions
    where provider_id=v_provider_id and provider_order_hash=v_order_hash for update;
  if not found then
    if v_status in ('rejected','reversed') then raise exception 'conversion_not_found'; end if;
    v_reward_id:=private.create_reward_claim(v_click.user_id,'shop_cashback',p_provider_code,
      v_body->>'order_id','Shop & Earn cashback',v_cashback,'pending',v_event_time,
      gen_random_uuid(),jsonb_build_object('merchant_code',v_merchant.merchant_code,'source','affiliate_gateway'));
    select id into v_reward_internal_id from public.reward_claims where reward_id=v_reward_id;
    insert into private.affiliate_conversions(provider_id,merchant_id,click_id,user_id,provider_order_hash,
      sale_amount_paise,commission_amount_paise,cashback_amount_paise,status,reward_claim_id,
      return_window_ends_at,confirmed_at,metadata)
    values(v_provider_id,v_merchant.id,v_click.id,v_click.user_id,v_order_hash,
      (v_body->>'sale_amount_paise')::bigint,(v_body->>'commission_amount_paise')::bigint,v_cashback,
      v_status,v_reward_internal_id,v_return_end,case when v_status='confirmed' then v_event_time end,
      jsonb_build_object('merchant_code',v_merchant.merchant_code)) returning * into v_conversion;
  else
    if v_conversion.cashback_amount_paise<>v_cashback then raise exception 'immutable_cashback_mismatch'; end if;
    if not ((v_conversion.status in ('tracked','pending') and v_status in ('pending','confirmed','rejected'))
      or (v_conversion.status='confirmed' and v_status='reversed')) then
      raise exception 'invalid_conversion_transition'; end if;
    update private.affiliate_conversions set status=v_status,
      confirmed_at=case when v_status='confirmed' then v_event_time else confirmed_at end,
      rejected_at=case when v_status='rejected' then v_event_time else rejected_at end,
      reversed_at=case when v_status='reversed' then v_event_time else reversed_at end,
      updated_at=statement_timestamp() where id=v_conversion.id returning * into v_conversion;
    if v_status in ('rejected','reversed') then
      select reward_id into v_reward_id from public.reward_claims where id=v_conversion.reward_claim_id;
      perform private.transition_reward_claim(v_reward_id,'reversed','Affiliate provider reversed order',
        gen_random_uuid(),'system',null,jsonb_build_object('provider_code',p_provider_code));
    end if;
  end if;
  insert into private.affiliate_conversion_events(provider_id,conversion_id,webhook_event_id,event_status,
    payload_sha256,encrypted_payload,occurred_at)
  values(v_provider_id,v_conversion.id,p_webhook_id,v_status,
    encode(extensions.digest(p_raw_body,'sha256'),'hex'),private.encrypt_commerce_value(p_raw_body),v_event_time);
  return jsonb_build_object('accepted',true,'duplicate',false,'conversion_id',v_conversion.conversion_id,'status',v_conversion.status);
end;
$$;

create function private.finalize_affiliate_cashback(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_row record; v_count integer:=0; v_reward_id uuid;
begin
  for v_row in select conversion.id,conversion.reward_claim_id,provider.code
    from private.affiliate_conversions conversion join private.commerce_providers provider on provider.id=conversion.provider_id
    join public.reward_claims reward on reward.id=conversion.reward_claim_id
    where conversion.status='confirmed' and conversion.return_window_ends_at<=statement_timestamp()
      and reward.status='pending' order by conversion.return_window_ends_at for update of conversion skip locked limit greatest(1,least(p_limit,500))
  loop
    select reward_id into v_reward_id from public.reward_claims where id=v_row.reward_claim_id;
    perform private.transition_reward_claim(v_reward_id,'available','Affiliate return window completed',
      gen_random_uuid(),'system',null,jsonb_build_object('provider_code',v_row.code));
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

create function private.create_payout_attempt(p_withdrawal_id uuid, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_withdrawal public.withdrawal_requests%rowtype; v_destination public.payout_destinations%rowtype;
  v_provider private.commerce_providers%rowtype; v_attempt private.payout_attempts%rowtype;
begin
  if p_request_id is null then raise exception 'request_id_required'; end if;
  select * into v_attempt from private.payout_attempts where request_id=p_request_id;
  if found then return v_attempt.attempt_id; end if;
  select * into v_withdrawal from public.withdrawal_requests where withdrawal_id=p_withdrawal_id for update;
  if not found or v_withdrawal.status<>'approved' then raise exception 'approved_withdrawal_required'; end if;
  select * into v_destination from public.payout_destinations where id=v_withdrawal.payout_destination_id;
  select provider.* into v_provider from private.payout_routes route
    join private.commerce_providers provider on provider.id=route.provider_id
    where route.method_type=v_destination.method_type and route.enabled and provider.domain='payout'
      and provider.status in ('active','degraded') and v_withdrawal.amount_paise between route.minimum_amount_paise and route.maximum_amount_paise
    order by route.priority limit 1;
  if not found then raise exception 'active_payout_route_not_found'; end if;
  insert into private.payout_attempts(withdrawal_request_id,user_id,provider_id,request_id,amount_paise,status)
  values(v_withdrawal.id,v_withdrawal.user_id,v_provider.id,p_request_id,v_withdrawal.amount_paise,'processing')
  returning * into v_attempt;
  perform private.transition_withdrawal_request(v_withdrawal.withdrawal_id,'processing','Payout submitted to provider',
    gen_random_uuid(),'system',null,v_provider.code,v_attempt.attempt_id::text,null,null,
    jsonb_build_object('attempt_id',v_attempt.attempt_id));
  return v_attempt.attempt_id;
end;
$$;

create function private.ingest_payout_callback(
  p_provider_code text, p_webhook_id text, p_webhook_timestamp bigint,
  p_webhook_signature text, p_raw_body text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_provider_id bigint; v_body jsonb; v_attempt private.payout_attempts%rowtype;
  v_status public.payout_attempt_status; v_event_time timestamptz; v_withdrawal_id uuid;
begin
  v_provider_id:=private.verify_commerce_callback(p_provider_code,'payout',p_webhook_timestamp,p_webhook_signature,p_raw_body);
  begin v_body:=p_raw_body::jsonb; v_status:=(v_body->>'event_type')::public.payout_attempt_status;
    v_event_time:=(v_body->>'occurred_at')::timestamptz;
  exception when others then raise exception 'invalid_payout_event'; end;
  if v_status not in ('processing','paid','failed') then raise exception 'invalid_payout_event'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_provider_id::text||':'||p_webhook_id,83));
  if exists(select 1 from private.payout_attempt_events where provider_id=v_provider_id and webhook_event_id=p_webhook_id)
    then return jsonb_build_object('accepted',true,'duplicate',true); end if;
  select * into v_attempt from private.payout_attempts
    where attempt_id=(v_body->>'attempt_id')::uuid and provider_id=v_provider_id for update;
  if not found then raise exception 'payout_attempt_not_found'; end if;
  if v_attempt.status in ('paid','failed','cancelled') then raise exception 'payout_attempt_terminal'; end if;
  update private.payout_attempts set status=v_status,
    provider_reference_hash=case when nullif(v_body->>'provider_reference','') is not null
      then encode(extensions.digest(v_body->>'provider_reference','sha256'),'hex') else provider_reference_hash end,
    failure_code=case when v_status='failed' then left(coalesce(v_body->>'failure_code','provider_failed'),100) else null end,
    completed_at=case when v_status in ('paid','failed') then v_event_time end,updated_at=statement_timestamp()
    where id=v_attempt.id returning * into v_attempt;
  select withdrawal_id into v_withdrawal_id from public.withdrawal_requests where id=v_attempt.withdrawal_request_id;
  if v_status='paid' then
    perform private.transition_withdrawal_request(v_withdrawal_id,'paid','Payout provider confirmed payment',
      gen_random_uuid(),'system',null,p_provider_code,v_body->>'provider_reference',null,null,
      jsonb_build_object('attempt_id',v_attempt.attempt_id));
  elsif v_status='failed' then
    perform private.transition_withdrawal_request(v_withdrawal_id,'failed','Payout provider reported failure',
      gen_random_uuid(),'system',null,p_provider_code,coalesce(v_body->>'provider_reference',v_attempt.attempt_id::text),
      coalesce(v_body->>'failure_code','provider_failed'),coalesce(v_body->>'failure_message','Provider payout failed'),
      jsonb_build_object('attempt_id',v_attempt.attempt_id));
  end if;
  insert into private.payout_attempt_events(provider_id,payout_attempt_id,webhook_event_id,event_status,
    payload_sha256,encrypted_payload,occurred_at)
  values(v_provider_id,v_attempt.id,p_webhook_id,v_status,encode(extensions.digest(p_raw_body,'sha256'),'hex'),
    private.encrypt_commerce_value(p_raw_body),v_event_time);
  return jsonb_build_object('accepted',true,'duplicate',false,'attempt_id',v_attempt.attempt_id,'status',v_attempt.status);
end;
$$;

create function private.list_admin_commerce_integrations(p_actor_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id and status='active')
    or not private.is_authorized_admin(p_actor_id,array['owner','finance','support','content','analyst']::public.app_role[])
    then raise exception 'active_admin_required'; end if;
  select jsonb_build_object(
    'providers',coalesce((select jsonb_agg(jsonb_build_object('provider_id',provider.provider_id,'code',provider.code,
      'display_name',provider.display_name,'domain',provider.domain,'status',provider.status,
      'integration_mode',provider.integration_mode,'secret_configured',exists(select 1 from private.commerce_provider_secrets secret where secret.provider_id=provider.id and secret.valid_until is null),
      'updated_at',provider.updated_at) order by provider.domain,provider.code) from private.commerce_providers provider),'[]'::jsonb),
    'summary',jsonb_build_object(
      'affiliate_providers',(select count(*) from private.commerce_providers where domain='affiliate'),
      'payout_providers',(select count(*) from private.commerce_providers where domain='payout'),
      'active_providers',(select count(*) from private.commerce_providers where status='active'),
      'active_merchants',(select count(*) from private.affiliate_merchants where status='active'),
      'clicks_24h',(select count(*) from private.affiliate_clicks where created_at>=statement_timestamp()-interval '24 hours'),
      'pending_cashback_paise',(select coalesce(sum(cashback_amount_paise),0) from private.affiliate_conversions where status in ('tracked','pending','confirmed')),
      'confirmed_cashback_paise',(select coalesce(sum(cashback_amount_paise),0) from private.affiliate_conversions where status='confirmed'),
      'payout_attempts_24h',(select count(*) from private.payout_attempts where created_at>=statement_timestamp()-interval '24 hours'),
      'enabled_payout_routes',(select count(*) from private.payout_routes where enabled)),
    'contracts',jsonb_build_object('currency','INR','money_unit','paise','callback_signature','HMAC-SHA256',
      'affiliate_attribution','signed_click_id','cashback_release','provider_confirmed_and_return_window_closed',
      'payout_idempotency',true,'automatic_provider_activation',false,'provider_neutral',true),
    'activation_requirements',jsonb_build_array('Commercial approval','Encrypted server credential',
      'Signed callback validation','Merchant and cashback rules','Return and cancellation mapping',
      'Payout sandbox reconciliation','Owner activation and fallback review')
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function private.register_commerce_provider(uuid,text,text,public.commerce_provider_domain,text,text,integer,uuid,jsonb),
  private.create_affiliate_click(uuid,text,uuid,jsonb),
  private.verify_commerce_callback(text,public.commerce_provider_domain,bigint,text,text),
  private.ingest_affiliate_callback(text,text,bigint,text,text),private.finalize_affiliate_cashback(integer),
  private.create_payout_attempt(uuid,uuid),private.ingest_payout_callback(text,text,bigint,text,text),
  private.list_admin_commerce_integrations(uuid),private.reject_commerce_evidence_mutation(),
  private.guard_commerce_secret_mutation() from public,anon,authenticated;

grant execute on function private.register_commerce_provider(uuid,text,text,public.commerce_provider_domain,text,text,integer,uuid,jsonb),
  private.create_affiliate_click(uuid,text,uuid,jsonb),
  private.ingest_affiliate_callback(text,text,bigint,text,text),private.finalize_affiliate_cashback(integer),
  private.create_payout_attempt(uuid,uuid),private.ingest_payout_callback(text,text,bigint,text,text),
  private.list_admin_commerce_integrations(uuid) to service_role;

create function public.create_affiliate_click(p_user_id uuid,p_merchant_code text,p_request_id uuid,p_metadata jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path=''
as $$ select private.create_affiliate_click(p_user_id,p_merchant_code,p_request_id,p_metadata) $$;
create function public.ingest_affiliate_callback(p_provider_code text,p_webhook_id text,p_webhook_timestamp bigint,p_webhook_signature text,p_raw_body text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.ingest_affiliate_callback(p_provider_code,p_webhook_id,p_webhook_timestamp,p_webhook_signature,p_raw_body) $$;
create function public.ingest_payout_callback(p_provider_code text,p_webhook_id text,p_webhook_timestamp bigint,p_webhook_signature text,p_raw_body text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.ingest_payout_callback(p_provider_code,p_webhook_id,p_webhook_timestamp,p_webhook_signature,p_raw_body) $$;
create function public.list_admin_commerce_integrations(p_actor_id uuid)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.list_admin_commerce_integrations(p_actor_id) $$;

revoke all on function public.create_affiliate_click(uuid,text,uuid,jsonb),
  public.ingest_affiliate_callback(text,text,bigint,text,text),
  public.ingest_payout_callback(text,text,bigint,text,text),
  public.list_admin_commerce_integrations(uuid) from public,anon,authenticated;
grant execute on function public.create_affiliate_click(uuid,text,uuid,jsonb),
  public.ingest_affiliate_callback(text,text,bigint,text,text),
  public.ingest_payout_callback(text,text,bigint,text,text),
  public.list_admin_commerce_integrations(uuid) to service_role;

comment on function public.create_affiliate_click(uuid,text,uuid,jsonb) is
  'Service-only Step 16 authenticated affiliate click attribution boundary.';
comment on function public.ingest_affiliate_callback(text,text,bigint,text,text) is
  'Service-only normalized, signed and idempotent affiliate callback boundary.';
comment on function public.ingest_payout_callback(text,text,bigint,text,text) is
  'Service-only normalized, signed and idempotent payout callback boundary.';
