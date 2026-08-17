-- Glonni Ads Backend Step 15: provider-neutral communications and notification foundation.
--
-- No vendor, credential, route or message is seeded or activated here. Supabase
-- Auth continues to own OTP generation and verification. This layer later
-- delivers those OTPs, plus transactional notifications, through interchangeable
-- SMS, WhatsApp, email, push or in-app adapters.

create type public.communication_channel as enum ('sms', 'whatsapp', 'email', 'push', 'in_app');
create type public.communication_purpose as enum ('otp', 'security', 'transactional', 'support', 'marketing', 'system');
create type public.communication_provider_status as enum ('draft', 'active', 'degraded', 'paused', 'disabled');
create type public.communication_message_status as enum (
  'queued', 'dispatching', 'accepted', 'delivered', 'failed', 'suppressed', 'cancelled'
);

create table private.communication_providers (
  id bigint generated always as identity primary key,
  provider_id uuid not null default gen_random_uuid() unique,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  channel public.communication_channel not null,
  status public.communication_provider_status not null default 'draft',
  integration_mode text not null default 'server_api'
    check (integration_mode in ('server_api', 'smtp', 'auth_hook', 'mobile_push')),
  timestamp_tolerance_seconds integer not null default 300
    check (timestamp_tolerance_seconds between 30 and 900),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config) = 'object')
);

create index communication_providers_created_by_idx
  on private.communication_providers(created_by);
create index communication_providers_updated_by_idx
  on private.communication_providers(updated_by);

create table private.communication_provider_secrets (
  id bigint generated always as identity primary key,
  provider_id bigint not null references private.communication_providers(id) on delete restrict,
  encrypted_secret bytea not null,
  secret_fingerprint text not null check (secret_fingerprint ~ '^[0-9a-f]{64}$'),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);

create unique index communication_provider_one_current_secret_idx
  on private.communication_provider_secrets(provider_id) where valid_until is null;
create index communication_provider_secrets_provider_valid_idx
  on private.communication_provider_secrets(provider_id, valid_from desc, valid_until);
create index communication_provider_secrets_created_by_idx
  on private.communication_provider_secrets(created_by);

create table private.communication_routes (
  id bigint generated always as identity primary key,
  route_id uuid not null default gen_random_uuid() unique,
  purpose public.communication_purpose not null,
  channel public.communication_channel not null,
  provider_id bigint not null references private.communication_providers(id) on delete restrict,
  priority integer not null check (priority between 1 and 100),
  enabled boolean not null default false,
  country_codes text[] not null default array['IN']::text[],
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(purpose, channel, provider_id),
  unique(purpose, channel, priority),
  check (cardinality(country_codes) > 0),
  check (channel <> 'in_app')
);

create index communication_routes_provider_idx on private.communication_routes(provider_id);
create index communication_routes_created_by_idx on private.communication_routes(created_by);
create index communication_routes_updated_by_idx on private.communication_routes(updated_by);
create index communication_routes_dispatch_idx
  on private.communication_routes(purpose, channel, enabled, priority) where enabled;

create table private.communication_templates (
  id bigint generated always as identity primary key,
  template_id uuid not null default gen_random_uuid() unique,
  template_key text not null check (template_key ~ '^[a-z0-9][a-z0-9_.-]{2,79}$'),
  channel public.communication_channel not null,
  purpose public.communication_purpose not null,
  locale text not null default 'en-IN' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  subject_template text,
  body_template text not null check (char_length(body_template) between 1 and 5000),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(template_key, channel, locale, version),
  check ((status = 'approved' and approved_by is not null and approved_at is not null) or status <> 'approved')
);

create index communication_templates_lookup_idx
  on private.communication_templates(template_key, channel, locale, status, version desc);
create index communication_templates_approved_by_idx
  on private.communication_templates(approved_by) where approved_by is not null;
create index communication_templates_created_by_idx
  on private.communication_templates(created_by);

create table private.communication_messages (
  id bigint generated always as identity primary key,
  message_id uuid not null default gen_random_uuid() unique,
  user_id uuid references auth.users(id) on delete restrict,
  channel public.communication_channel not null,
  purpose public.communication_purpose not null,
  template_id bigint references private.communication_templates(id) on delete restrict,
  provider_id bigint references private.communication_providers(id) on delete restrict,
  destination_hash text not null check (destination_hash ~ '^[0-9a-f]{64}$'),
  encrypted_destination bytea not null,
  encrypted_variables bytea not null,
  locale text not null default 'en-IN',
  status public.communication_message_status not null default 'queued',
  request_id uuid not null unique,
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  scheduled_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  provider_reference_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (failure_code is null or char_length(failure_code) between 2 and 100),
  check (provider_reference_hash is null or provider_reference_hash ~ '^[0-9a-f]{64}$')
);

create index communication_messages_dispatch_idx
  on private.communication_messages(status, scheduled_at, created_at)
  where status in ('queued', 'dispatching');
create index communication_messages_user_timeline_idx
  on private.communication_messages(user_id, created_at desc) where user_id is not null;
create index communication_messages_provider_timeline_idx
  on private.communication_messages(provider_id, created_at desc) where provider_id is not null;
create index communication_messages_template_idx
  on private.communication_messages(template_id) where template_id is not null;

create table private.communication_delivery_events (
  id bigint generated always as identity primary key,
  delivery_event_id uuid not null default gen_random_uuid() unique,
  provider_id bigint not null references private.communication_providers(id) on delete restrict,
  message_id bigint not null references private.communication_messages(id) on delete restrict,
  webhook_event_id text not null check (char_length(webhook_event_id) between 1 and 200),
  event_status public.communication_message_status not null,
  event_timestamp timestamptz not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  encrypted_payload bytea not null,
  received_at timestamptz not null default now(),
  unique(provider_id, webhook_event_id)
);

create index communication_delivery_message_idx
  on private.communication_delivery_events(message_id, event_timestamp desc);
create index communication_delivery_provider_idx
  on private.communication_delivery_events(provider_id, received_at desc);

create table public.notifications (
  id bigint generated always as identity primary key,
  notification_id uuid not null default gen_random_uuid() unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  category text not null check (category in ('rewards', 'tasks', 'withdrawals', 'offers', 'account', 'support', 'system')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 1000),
  action_url text check (action_url is null or (char_length(action_url) between 1 and 500 and action_url like '/%')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  check (expires_at is null or expires_at > created_at)
);

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc) where read_at is null;
create index notifications_user_timeline_idx
  on public.notifications(user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel public.communication_channel not null,
  purpose public.communication_purpose not null,
  enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) between 3 and 64),
  updated_at timestamptz not null default now(),
  primary key(user_id, channel, purpose),
  check ((quiet_hours_start is null and quiet_hours_end is null) or
         (quiet_hours_start is not null and quiet_hours_end is not null)),
  check (purpose <> 'otp' or enabled),
  check (purpose <> 'security' or enabled)
);

alter table private.communication_providers enable row level security;
alter table private.communication_provider_secrets enable row level security;
alter table private.communication_routes enable row level security;
alter table private.communication_templates enable row level security;
alter table private.communication_messages enable row level security;
alter table private.communication_delivery_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

revoke all on private.communication_providers, private.communication_provider_secrets,
  private.communication_routes, private.communication_templates,
  private.communication_messages, private.communication_delivery_events
  from public, anon, authenticated;
revoke all on public.notifications, public.notification_preferences from public, anon, authenticated;

grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

create policy notifications_own_read on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_own_mark_read on public.notifications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy notification_preferences_own_read on public.notification_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy notification_preferences_own_insert on public.notification_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notification_preferences_own_update on public.notification_preferences
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy notification_preferences_own_delete on public.notification_preferences
  for delete to authenticated using ((select auth.uid()) = user_id);

do $block$
begin
  if not exists (select 1 from vault.secrets where name = 'step15_communication_encryption_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'step15_communication_encryption_key',
      'Encrypts communication destinations, variables, provider secrets and callback evidence'
    );
  end if;
end
$block$;

create function private.step15_communication_encryption_key()
returns text language sql stable security definer set search_path = 'pg_catalog'
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'step15_communication_encryption_key' limit 1
$$;

create function private.encrypt_communication_value(p_value text)
returns bytea language sql security definer set search_path = 'pg_catalog'
as $$
  select extensions.pgp_sym_encrypt(
    p_value, private.step15_communication_encryption_key(),
    'cipher-algo=aes256,compress-algo=1'
  )
$$;

create function private.decrypt_communication_value(p_value bytea)
returns text language sql stable security definer set search_path = 'pg_catalog'
as $$
  select extensions.pgp_sym_decrypt(p_value, private.step15_communication_encryption_key())
$$;

revoke all on function private.step15_communication_encryption_key(),
  private.encrypt_communication_value(text), private.decrypt_communication_value(bytea)
  from public, anon, authenticated;

create function private.guard_communication_secret_mutation()
returns trigger language plpgsql set search_path = 'pg_catalog'
as $$
begin
  if tg_op = 'DELETE' then raise exception 'communication secrets cannot be deleted'; end if;
  if old.valid_until is null and new.valid_until is not null
    and new.id = old.id and new.provider_id = old.provider_id
    and new.encrypted_secret = old.encrypted_secret
    and new.secret_fingerprint = old.secret_fingerprint
    and new.valid_from = old.valid_from and new.created_by = old.created_by
    and new.created_at = old.created_at then return new;
  end if;
  raise exception 'communication secrets are immutable except for retirement';
end;
$$;

create trigger communication_secrets_guard before update or delete
on private.communication_provider_secrets for each row
execute function private.guard_communication_secret_mutation();

create function private.reject_communication_delivery_mutation()
returns trigger language plpgsql set search_path = 'pg_catalog'
as $$ begin raise exception 'communication delivery events are append-only'; end $$;

create trigger communication_delivery_events_immutable before update or delete
on private.communication_delivery_events for each row
execute function private.reject_communication_delivery_mutation();

create function private.register_communication_provider(
  p_actor_id uuid,
  p_code text,
  p_display_name text,
  p_channel public.communication_channel,
  p_integration_mode text,
  p_secret_base64 text,
  p_timestamp_tolerance_seconds integer,
  p_request_id uuid,
  p_public_config jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_provider private.communication_providers%rowtype;
  v_secret_bytes bytea;
begin
  if p_actor_id is null or not private.is_authorized_admin(
    p_actor_id, array['owner']::public.app_role[]
  ) then raise exception 'owner_authorization_required'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;
  if p_channel = 'in_app' then raise exception 'in_app_does_not_use_external_provider'; end if;
  if p_integration_mode not in ('server_api', 'smtp', 'auth_hook', 'mobile_push') then
    raise exception 'invalid_integration_mode';
  end if;
  if p_public_config is null or jsonb_typeof(p_public_config) <> 'object' then
    raise exception 'public_config_must_be_object';
  end if;
  if p_public_config ?| array['secret', 'api_key', 'token', 'password', 'private_key'] then
    raise exception 'secret_material_not_allowed';
  end if;
  begin
    v_secret_bytes := decode(btrim(p_secret_base64), 'base64');
  exception when others then raise exception 'secret_must_be_valid_base64';
  end;
  if octet_length(v_secret_bytes) < 32 then raise exception 'provider_secret_too_short'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(lower(btrim(p_code)), 75)
  );
  select * into v_provider from private.communication_providers
  where code = lower(btrim(p_code)) for update;

  if found then
    if v_provider.channel <> p_channel then raise exception 'provider_channel_is_immutable'; end if;
    update private.communication_providers set
      display_name = btrim(p_display_name), integration_mode = p_integration_mode,
      timestamp_tolerance_seconds = p_timestamp_tolerance_seconds,
      updated_by = p_actor_id, updated_at = statement_timestamp(),
      public_config = p_public_config
    where id = v_provider.id returning * into v_provider;
    update private.communication_provider_secrets set valid_until = statement_timestamp()
    where provider_id = v_provider.id and valid_until is null;
  else
    insert into private.communication_providers(
      code, display_name, channel, integration_mode, timestamp_tolerance_seconds,
      created_by, updated_by, public_config
    ) values (
      lower(btrim(p_code)), btrim(p_display_name), p_channel, p_integration_mode,
      p_timestamp_tolerance_seconds, p_actor_id, p_actor_id, p_public_config
    ) returning * into v_provider;
  end if;

  insert into private.communication_provider_secrets(
    provider_id, encrypted_secret, secret_fingerprint, created_by
  ) values (
    v_provider.id,
    private.encrypt_communication_value(btrim(p_secret_base64)),
    encode(extensions.digest(v_secret_bytes, 'sha256'), 'hex'), p_actor_id
  );

  insert into public.audit_events(
    actor_type, actor_id, action, resource_type, resource_id, request_id, new_data
  ) values (
    'admin', p_actor_id, 'communication_provider.secret_rotated',
    'communication_provider', v_provider.provider_id::text, p_request_id,
    jsonb_build_object('code', v_provider.code, 'channel', v_provider.channel, 'status', v_provider.status)
  );
  return v_provider.provider_id;
end;
$$;

create function private.list_admin_communications(p_actor_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_result jsonb;
begin
  if p_actor_id is null or not exists (
    select 1 from public.profiles as profile
    where profile.id = p_actor_id and profile.status = 'active'::public.account_status
  ) or not private.is_authorized_admin(
    p_actor_id, array['owner', 'finance', 'support', 'content', 'analyst']::public.app_role[]
  ) then raise exception 'active_admin_required'; end if;

  select jsonb_build_object(
    'providers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'provider_id', provider.provider_id,
        'code', provider.code,
        'display_name', provider.display_name,
        'channel', provider.channel,
        'status', provider.status,
        'integration_mode', provider.integration_mode,
        'priority', coalesce((select min(route.priority) from private.communication_routes route where route.provider_id = provider.id), 0),
        'active_routes', (select count(*) from private.communication_routes route where route.provider_id = provider.id and route.enabled),
        'secret_configured', exists(select 1 from private.communication_provider_secrets secret where secret.provider_id = provider.id and secret.valid_until is null),
        'messages_24h', (select count(*) from private.communication_messages message where message.provider_id = provider.id and message.created_at >= statement_timestamp() - interval '24 hours'),
        'delivered_24h', (select count(*) from private.communication_messages message where message.provider_id = provider.id and message.delivered_at >= statement_timestamp() - interval '24 hours'),
        'failed_24h', (select count(*) from private.communication_messages message where message.provider_id = provider.id and message.failed_at >= statement_timestamp() - interval '24 hours'),
        'updated_at', provider.updated_at
      ) order by provider.channel, provider.code)
      from private.communication_providers provider
    ), '[]'::jsonb),
    'routes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'route_id', route.route_id, 'purpose', route.purpose,
        'channel', route.channel, 'provider_code', provider.code,
        'priority', route.priority, 'enabled', route.enabled,
        'country_codes', route.country_codes
      ) order by route.purpose, route.channel, route.priority)
      from private.communication_routes route
      join private.communication_providers provider on provider.id = route.provider_id
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'configured_providers', (select count(*) from private.communication_providers),
      'active_providers', (select count(*) from private.communication_providers where status = 'active'),
      'enabled_routes', (select count(*) from private.communication_routes where enabled),
      'queued_messages', (select count(*) from private.communication_messages where status in ('queued', 'dispatching')),
      'messages_24h', (select count(*) from private.communication_messages where created_at >= statement_timestamp() - interval '24 hours'),
      'delivered_24h', (select count(*) from private.communication_messages where delivered_at >= statement_timestamp() - interval '24 hours'),
      'failed_24h', (select count(*) from private.communication_messages where failed_at >= statement_timestamp() - interval '24 hours')
    ),
    'channels', jsonb_build_array(
      jsonb_build_object('channel', 'sms', 'label', 'SMS'),
      jsonb_build_object('channel', 'whatsapp', 'label', 'WhatsApp'),
      jsonb_build_object('channel', 'email', 'label', 'Email'),
      jsonb_build_object('channel', 'push', 'label', 'Push'),
      jsonb_build_object('channel', 'in_app', 'label', 'In-app')
    ),
    'purposes', jsonb_build_array('otp', 'security', 'transactional', 'support', 'marketing', 'system'),
    'routing', jsonb_build_object(
      'provider_neutral', true,
      'priority_fallback', true,
      'automatic_provider_selection', false,
      'otp_owner', 'supabase_auth',
      'delivery_owner', 'communication_gateway'
    ),
    'activation_requirements', jsonb_build_array(
      'Provider account and commercial approval',
      'Encrypted server credential',
      'Approved sender identity or domain',
      'Approved message templates where required',
      'Signed delivery callback test',
      'Owner activation and fallback review'
    )
  ) into v_result;
  return v_result;
end;
$$;

create function private.enqueue_communication(
  p_user_id uuid,
  p_channel public.communication_channel,
  p_purpose public.communication_purpose,
  p_destination text,
  p_template_key text,
  p_locale text,
  p_variables jsonb,
  p_request_id uuid,
  p_scheduled_at timestamptz default statement_timestamp(),
  p_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_message private.communication_messages%rowtype;
  v_template private.communication_templates%rowtype;
  v_provider private.communication_providers%rowtype;
  v_preference_enabled boolean := true;
begin
  if p_request_id is null then raise exception 'request_id_required'; end if;
  if p_destination is null or char_length(btrim(p_destination)) not between 3 and 320 then
    raise exception 'invalid_destination';
  end if;
  if p_variables is null or jsonb_typeof(p_variables) <> 'object' then
    raise exception 'variables_must_be_object';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'metadata_must_be_object';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_request_id::text, 76)
  );
  select * into v_message from private.communication_messages where request_id = p_request_id;
  if found then return v_message.message_id; end if;

  if p_user_id is not null and p_purpose not in ('otp', 'security', 'system') then
    select preference.enabled into v_preference_enabled
    from public.notification_preferences preference
    where preference.user_id = p_user_id
      and preference.channel = p_channel and preference.purpose = p_purpose;
    if found and not v_preference_enabled then
      insert into private.communication_messages(
        user_id, channel, purpose, destination_hash, encrypted_destination,
        encrypted_variables, locale, status, request_id, scheduled_at, metadata
      ) values (
        p_user_id, p_channel, p_purpose,
        encode(extensions.digest(lower(btrim(p_destination)), 'sha256'), 'hex'),
        private.encrypt_communication_value(btrim(p_destination)),
        private.encrypt_communication_value(p_variables::text), p_locale,
        'suppressed', p_request_id, p_scheduled_at,
        p_metadata || jsonb_build_object('suppression_reason', 'user_preference')
      ) returning * into v_message;
      return v_message.message_id;
    end if;
  end if;

  select * into v_template from private.communication_templates
  where template_key = p_template_key and channel = p_channel and locale = p_locale
    and purpose = p_purpose and status = 'approved'
  order by version desc limit 1;
  if not found then raise exception 'approved_template_not_found'; end if;

  if p_channel <> 'in_app' then
    select provider.* into v_provider
    from private.communication_routes route
    join private.communication_providers provider on provider.id = route.provider_id
    where route.purpose = p_purpose and route.channel = p_channel
      and route.enabled and provider.status in ('active', 'degraded')
    order by route.priority limit 1;
    if not found then raise exception 'active_provider_route_not_found'; end if;
  end if;

  insert into private.communication_messages(
    user_id, channel, purpose, template_id, provider_id,
    destination_hash, encrypted_destination, encrypted_variables,
    locale, status, request_id, scheduled_at, metadata
  ) values (
    p_user_id, p_channel, p_purpose, v_template.id,
    case when p_channel = 'in_app' then null else v_provider.id end,
    encode(extensions.digest(lower(btrim(p_destination)), 'sha256'), 'hex'),
    private.encrypt_communication_value(btrim(p_destination)),
    private.encrypt_communication_value(p_variables::text),
    p_locale, case when p_channel = 'in_app' then 'delivered' else 'queued' end,
    p_request_id, p_scheduled_at, p_metadata
  ) returning * into v_message;

  if p_channel = 'in_app' then
    if p_user_id is null then raise exception 'in_app_user_required'; end if;
    insert into public.notifications(user_id, category, title, body, action_url, metadata)
    values (
      p_user_id,
      coalesce(nullif(p_variables ->> 'category', ''), 'system'),
      p_variables ->> 'title', p_variables ->> 'body',
      nullif(p_variables ->> 'action_url', ''),
      jsonb_build_object('message_id', v_message.message_id)
    );
    update private.communication_messages set
      delivered_at = statement_timestamp(), updated_at = statement_timestamp()
    where id = v_message.id;
  end if;
  return v_message.message_id;
end;
$$;

create function private.ingest_communication_delivery_event(
  p_provider_code text,
  p_webhook_id text,
  p_webhook_timestamp bigint,
  p_webhook_signature text,
  p_raw_body text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_provider private.communication_providers%rowtype;
  v_secret private.communication_provider_secrets%rowtype;
  v_body jsonb;
  v_message private.communication_messages%rowtype;
  v_expected text;
  v_event_status public.communication_message_status;
  v_event_time timestamptz;
  v_payload_hash text;
begin
  select * into v_provider from private.communication_providers
  where code = lower(btrim(p_provider_code));
  if not found then raise exception 'unknown_provider'; end if;
  if v_provider.status not in ('active', 'degraded') then raise exception 'provider_not_active'; end if;
  if abs(extract(epoch from statement_timestamp())::bigint - p_webhook_timestamp) > v_provider.timestamp_tolerance_seconds then
    raise exception 'webhook_timestamp_invalid';
  end if;

  select * into v_secret from private.communication_provider_secrets
  where provider_id = v_provider.id and valid_from <= to_timestamp(p_webhook_timestamp)
    and (valid_until is null or valid_until > to_timestamp(p_webhook_timestamp))
  order by valid_from desc limit 1;
  if not found then raise exception 'provider_secret_not_found'; end if;

  v_expected := encode(extensions.hmac(
    convert_to(p_webhook_timestamp::text || '.' || p_raw_body, 'utf8'),
    decode(private.decrypt_communication_value(v_secret.encrypted_secret), 'base64'),
    'sha256'
  ), 'base64');
  if encode(extensions.digest(v_expected, 'sha256'), 'hex') <>
     encode(extensions.digest(p_webhook_signature, 'sha256'), 'hex') then
    raise exception 'webhook_signature_invalid';
  end if;

  begin v_body := p_raw_body::jsonb;
  exception when others then raise exception 'invalid_json'; end;
  if jsonb_typeof(v_body) <> 'object' then raise exception 'invalid_json'; end if;
  if (v_body ->> 'event_type') not in ('accepted', 'delivered', 'failed') then
    raise exception 'invalid_delivery_event';
  end if;
  begin
    v_event_status := (v_body ->> 'event_type')::public.communication_message_status;
    v_event_time := (v_body ->> 'occurred_at')::timestamptz;
  exception when others then raise exception 'invalid_delivery_event'; end;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_provider.id::text || ':' || p_webhook_id, 77)
  );
  if exists (
    select 1 from private.communication_delivery_events event
    where event.provider_id = v_provider.id and event.webhook_event_id = p_webhook_id
  ) then
    return jsonb_build_object('duplicate', true, 'accepted', true);
  end if;

  select * into v_message from private.communication_messages
  where message_id = (v_body ->> 'message_id')::uuid for update;
  if not found or v_message.provider_id <> v_provider.id then raise exception 'message_not_found'; end if;

  v_payload_hash := encode(extensions.digest(p_raw_body, 'sha256'), 'hex');
  insert into private.communication_delivery_events(
    provider_id, message_id, webhook_event_id, event_status,
    event_timestamp, payload_sha256, encrypted_payload
  ) values (
    v_provider.id, v_message.id, p_webhook_id, v_event_status,
    v_event_time, v_payload_hash, private.encrypt_communication_value(p_raw_body)
  );

  update private.communication_messages set
    status = v_event_status,
    accepted_at = case when v_event_status = 'accepted' then coalesce(accepted_at, v_event_time) else accepted_at end,
    delivered_at = case when v_event_status = 'delivered' then v_event_time else delivered_at end,
    failed_at = case when v_event_status = 'failed' then v_event_time else failed_at end,
    failure_code = case when v_event_status = 'failed' then left(coalesce(v_body ->> 'failure_code', 'provider_failed'), 100) else failure_code end,
    provider_reference_hash = case when nullif(v_body ->> 'provider_reference', '') is not null
      then encode(extensions.digest(v_body ->> 'provider_reference', 'sha256'), 'hex') else provider_reference_hash end,
    updated_at = statement_timestamp()
  where id = v_message.id;

  return jsonb_build_object('accepted', true, 'duplicate', false, 'message_id', v_message.message_id, 'status', v_event_status);
end;
$$;

revoke all on function private.register_communication_provider(
  uuid, text, text, public.communication_channel, text, text, integer, uuid, jsonb
), private.list_admin_communications(uuid), private.enqueue_communication(
  uuid, public.communication_channel, public.communication_purpose, text, text,
  text, jsonb, uuid, timestamptz, jsonb
), private.ingest_communication_delivery_event(text, text, bigint, text, text)
from public, anon, authenticated;

grant execute on function private.register_communication_provider(
  uuid, text, text, public.communication_channel, text, text, integer, uuid, jsonb
), private.list_admin_communications(uuid), private.enqueue_communication(
  uuid, public.communication_channel, public.communication_purpose, text, text,
  text, jsonb, uuid, timestamptz, jsonb
), private.ingest_communication_delivery_event(text, text, bigint, text, text)
to service_role;

create function public.list_admin_communications(p_actor_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.list_admin_communications(p_actor_id) $$;

create function public.ingest_communication_delivery_event(
  p_provider_code text, p_webhook_id text, p_webhook_timestamp bigint,
  p_webhook_signature text, p_raw_body text
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.ingest_communication_delivery_event(
  p_provider_code, p_webhook_id, p_webhook_timestamp, p_webhook_signature, p_raw_body
) $$;

revoke all on function public.list_admin_communications(uuid),
  public.ingest_communication_delivery_event(text, text, bigint, text, text)
from public, anon, authenticated;
grant execute on function public.list_admin_communications(uuid),
  public.ingest_communication_delivery_event(text, text, bigint, text, text)
to service_role;

comment on function public.list_admin_communications(uuid) is
  'Service-only Step 15 redacted communications gateway monitor.';
comment on function public.ingest_communication_delivery_event(text, text, bigint, text, text) is
  'Service-only Step 15 signed, timestamp-bound and idempotent delivery callback ingestion.';
