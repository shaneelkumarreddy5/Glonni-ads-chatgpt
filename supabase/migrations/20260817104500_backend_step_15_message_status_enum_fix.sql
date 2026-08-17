-- Preserve the communication message enum type across the conditional branch.
-- PostgreSQL otherwise resolves the CASE expression as text.

create or replace function private.enqueue_communication(
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
    p_locale,
    (case when p_channel = 'in_app' then 'delivered' else 'queued' end)::public.communication_message_status,
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

revoke all on function private.enqueue_communication(
  uuid, public.communication_channel, public.communication_purpose, text, text,
  text, jsonb, uuid, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function private.enqueue_communication(
  uuid, public.communication_channel, public.communication_purpose, text, text,
  text, jsonb, uuid, timestamptz, jsonb
) to service_role;
