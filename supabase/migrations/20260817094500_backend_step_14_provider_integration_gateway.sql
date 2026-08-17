-- Glonni Ads Backend Step 14: provider-neutral earning integration gateway.
--
-- This migration does not activate or seed a provider. It adds the typed
-- adapter/readiness layer used by rewarded ads, offerwalls, surveys, app
-- installs and games while preserving Step 6's signed, idempotent reward
-- ledger as the only path that can create a reward.

create type public.earning_provider_kind as enum (
  'rewarded_ad', 'offerwall', 'survey', 'app_install', 'game'
);

create type public.provider_integration_mode as enum (
  'server_api', 'offerwall', 'web_sdk', 'mobile_sdk'
);

create type public.provider_readiness_status as enum (
  'awaiting_credentials', 'awaiting_mapping', 'awaiting_test', 'ready', 'blocked'
);

create table private.earning_provider_adapters (
  id bigint generated always as identity primary key,
  adapter_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null unique references private.earning_providers(id) on delete restrict,
  provider_kind public.earning_provider_kind not null,
  integration_mode public.provider_integration_mode not null,
  callback_version text not null default 'glonni_v1'
    check (callback_version = 'glonni_v1'),
  readiness_status public.provider_readiness_status not null default 'awaiting_credentials',
  gateway_enabled boolean not null default false,
  last_verified_at timestamptz,
  last_health_at timestamptz,
  last_health_status text check (last_health_status is null or last_health_status in ('healthy', 'degraded', 'failed')),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config) = 'object'),
  check (not gateway_enabled or readiness_status = 'ready')
);

comment on table private.earning_provider_adapters is
  'Non-secret adapter type, readiness and health state. Provider credentials remain encrypted in earning_provider_secrets.';

create index earning_provider_adapters_kind_idx
  on private.earning_provider_adapters(provider_kind, readiness_status);
create index earning_provider_adapters_health_idx
  on private.earning_provider_adapters(last_health_status, last_health_at desc)
  where last_health_status is not null;

alter table private.earning_provider_adapters enable row level security;
revoke all on private.earning_provider_adapters from public, anon, authenticated;

create policy earning_provider_adapters_service_only
on private.earning_provider_adapters for all to service_role
using (true) with check (true);

create function private.configure_earning_provider_adapter(
  p_actor_id uuid,
  p_provider_code text,
  p_provider_kind public.earning_provider_kind,
  p_integration_mode public.provider_integration_mode,
  p_request_id uuid,
  p_public_config jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider private.earning_providers%rowtype;
  v_adapter private.earning_provider_adapters%rowtype;
  v_has_secret boolean;
begin
  if p_actor_id is null or not private.is_authorized_admin(
    p_actor_id, array['owner']::public.app_role[]
  ) then
    raise exception 'owner_authorization_required';
  end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;
  if p_public_config is null or jsonb_typeof(p_public_config) <> 'object' then
    raise exception 'public_config_must_be_object';
  end if;
  if p_public_config ?| array['secret', 'api_key', 'token', 'password', 'private_key'] then
    raise exception 'secret_material_not_allowed';
  end if;

  select * into v_provider
  from private.earning_providers
  where code = lower(btrim(p_provider_code))
  for update;
  if not found then raise exception 'provider_not_found'; end if;

  select exists (
    select 1 from private.earning_provider_secrets as secret
    where secret.provider_id = v_provider.id and secret.valid_until is null
  ) into v_has_secret;

  insert into private.earning_provider_adapters (
    provider_id, provider_kind, integration_mode, readiness_status,
    gateway_enabled, created_by, updated_by, public_config
  ) values (
    v_provider.id, p_provider_kind, p_integration_mode,
    case when v_has_secret then 'awaiting_mapping'::public.provider_readiness_status
         else 'awaiting_credentials'::public.provider_readiness_status end,
    false, p_actor_id, p_actor_id, p_public_config
  )
  on conflict (provider_id) do update set
    provider_kind = excluded.provider_kind,
    integration_mode = excluded.integration_mode,
    readiness_status = case
      when private.earning_provider_adapters.readiness_status = 'ready'
        then 'awaiting_test'::public.provider_readiness_status
      when v_has_secret then 'awaiting_mapping'::public.provider_readiness_status
      else 'awaiting_credentials'::public.provider_readiness_status
    end,
    gateway_enabled = false,
    updated_by = p_actor_id,
    updated_at = statement_timestamp(),
    public_config = excluded.public_config
  returning * into v_adapter;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    request_id, new_data
  ) values (
    'admin', p_actor_id, 'earning_provider.adapter_configured',
    'earning_provider_adapter', v_adapter.adapter_id::text, p_request_id,
    jsonb_build_object(
      'provider_code', v_provider.code,
      'provider_kind', v_adapter.provider_kind,
      'integration_mode', v_adapter.integration_mode,
      'readiness_status', v_adapter.readiness_status,
      'gateway_enabled', false
    )
  );

  return v_adapter.adapter_id;
end;
$$;

create function private.list_admin_provider_integrations(p_actor_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_actor_id is null or not exists (
    select 1 from public.profiles as profile
    where profile.id = p_actor_id and profile.status = 'active'::public.account_status
  ) or not private.is_authorized_admin(
    p_actor_id,
    array['owner', 'finance', 'content', 'analyst']::public.app_role[]
  ) then
    raise exception 'active_admin_required';
  end if;

  select jsonb_build_object(
    'providers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'provider_id', provider.provider_id,
        'code', provider.code,
        'display_name', provider.display_name,
        'status', provider.status,
        'provider_kind', adapter.provider_kind,
        'integration_mode', adapter.integration_mode,
        'readiness_status', coalesce(adapter.readiness_status::text, 'awaiting_mapping'),
        'gateway_enabled', coalesce(adapter.gateway_enabled, false),
        'secret_configured', exists (
          select 1 from private.earning_provider_secrets as secret
          where secret.provider_id = provider.id and secret.valid_until is null
        ),
        'active_campaigns', (
          select count(*) from public.earning_campaigns as campaign
          where campaign.provider_code = provider.code and campaign.status = 'active'
        ),
        'callbacks_24h', (
          select count(*) from private.provider_postback_events as event
          where event.provider_id = provider.id and event.received_at >= statement_timestamp() - interval '24 hours'
        ),
        'rejected_callbacks_24h', (
          select count(*) from private.provider_postback_events as event
          where event.provider_id = provider.id
            and event.received_at >= statement_timestamp() - interval '24 hours'
            and event.processing_status in ('rejected', 'manual_review')
        ),
        'last_callback_at', (
          select max(event.received_at) from private.provider_postback_events as event
          where event.provider_id = provider.id
        ),
        'last_health_at', adapter.last_health_at,
        'last_health_status', adapter.last_health_status,
        'updated_at', greatest(provider.updated_at, coalesce(adapter.updated_at, provider.updated_at))
      ) order by provider.code)
      from private.earning_providers as provider
      left join private.earning_provider_adapters as adapter on adapter.provider_id = provider.id
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'configured', (select count(*) from private.earning_providers),
      'ready', (select count(*) from private.earning_provider_adapters where readiness_status = 'ready'),
      'enabled', (select count(*) from private.earning_provider_adapters where gateway_enabled),
      'active_campaigns', (select count(*) from public.earning_campaigns where status = 'active'),
      'callbacks_24h', (select count(*) from private.provider_postback_events where received_at >= statement_timestamp() - interval '24 hours'),
      'rejected_callbacks_24h', (
        select count(*) from private.provider_postback_events
        where received_at >= statement_timestamp() - interval '24 hours'
          and processing_status in ('rejected', 'manual_review')
      )
    ),
    'supported_kinds', jsonb_build_array(
      jsonb_build_object('kind', 'rewarded_ad', 'label', 'Rewarded ads'),
      jsonb_build_object('kind', 'offerwall', 'label', 'Offerwalls'),
      jsonb_build_object('kind', 'survey', 'label', 'Surveys'),
      jsonb_build_object('kind', 'app_install', 'label', 'App installs'),
      jsonb_build_object('kind', 'game', 'label', 'Games')
    ),
    'gateway', jsonb_build_object(
      'function_name', 'earning-provider-callback',
      'contract_version', 'glonni_v1',
      'signature', 'HMAC-SHA256',
      'reward_source', 'verified_server_callback_only',
      'automatic_activation', false
    ),
    'activation_requirements', jsonb_build_array(
      'Provider approval and commercial account',
      'Server-side callback secret',
      'Event and reward mapping review',
      'Signed callback test',
      'Owner activation approval'
    )
  ) into v_result;

  return v_result;
end;
$$;

create function private.ingest_earning_provider_gateway_postback(
  p_provider_code text,
  p_webhook_id text,
  p_webhook_timestamp bigint,
  p_webhook_signature text,
  p_raw_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gateway_enabled boolean;
begin
  select adapter.gateway_enabled into v_gateway_enabled
  from private.earning_provider_adapters as adapter
  join private.earning_providers as provider on provider.id = adapter.provider_id
  where provider.code = lower(btrim(p_provider_code));

  if not found then raise exception 'provider_adapter_not_found'; end if;
  if not v_gateway_enabled then raise exception 'provider_gateway_disabled'; end if;

  return public.ingest_earning_provider_postback(
    lower(btrim(p_provider_code)), p_webhook_id, p_webhook_timestamp,
    p_webhook_signature, p_raw_body
  );
end;
$$;

revoke all on function private.configure_earning_provider_adapter(
  uuid, text, public.earning_provider_kind, public.provider_integration_mode, uuid, jsonb
) from public, anon, authenticated;
revoke all on function private.list_admin_provider_integrations(uuid)
  from public, anon, authenticated;
revoke all on function private.ingest_earning_provider_gateway_postback(text, text, bigint, text, text)
  from public, anon, authenticated;

grant execute on function private.configure_earning_provider_adapter(
  uuid, text, public.earning_provider_kind, public.provider_integration_mode, uuid, jsonb
) to service_role;
grant execute on function private.list_admin_provider_integrations(uuid) to service_role;
grant execute on function private.ingest_earning_provider_gateway_postback(text, text, bigint, text, text)
  to service_role;

create function public.list_admin_provider_integrations(p_actor_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.list_admin_provider_integrations(p_actor_id) $$;

create function public.ingest_earning_provider_gateway_postback(
  p_provider_code text,
  p_webhook_id text,
  p_webhook_timestamp bigint,
  p_webhook_signature text,
  p_raw_body text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_earning_provider_gateway_postback(
    p_provider_code, p_webhook_id, p_webhook_timestamp,
    p_webhook_signature, p_raw_body
  )
$$;

revoke all on function public.list_admin_provider_integrations(uuid)
  from public, anon, authenticated;
revoke all on function public.ingest_earning_provider_gateway_postback(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.list_admin_provider_integrations(uuid) to service_role;
grant execute on function public.ingest_earning_provider_gateway_postback(text, text, bigint, text, text)
  to service_role;

comment on function public.list_admin_provider_integrations(uuid) is
  'Service-only Step 14 provider/readiness monitor with no credential exposure.';
comment on function public.ingest_earning_provider_gateway_postback(text, text, bigint, text, text) is
  'Service-only Step 14 callback gateway. Disabled adapters cannot reach the Step 6 reward engine.';
