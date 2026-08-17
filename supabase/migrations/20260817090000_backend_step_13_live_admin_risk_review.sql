-- Glonni Ads Backend Step 13: live, protected administrator risk review.
--
-- The browser never receives service-role credentials and never gains direct
-- access to private risk tables. An authenticated MFA session calls a dedicated
-- Edge Function, which invokes these service-only RPC facades. Every adverse
-- decision still requires an active human owner/KYC-risk administrator.

create function private.list_admin_risk_cases(
  p_actor_id uuid,
  p_search text default null,
  p_severity text default null,
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_can_decide boolean;
  v_result jsonb;
begin
  if p_actor_id is null or not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_actor_id
      and profile.status = 'active'::public.account_status
  ) or not private.is_authorized_admin(
    p_actor_id,
    array['owner', 'kyc_risk', 'support', 'analyst']::public.app_role[]
  ) then
    raise exception 'active_admin_required';
  end if;

  if v_search is not null and char_length(v_search) > 100 then
    raise exception 'search_too_long';
  end if;
  if p_severity is not null and p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception 'invalid_severity_filter';
  end if;
  if p_status is not null and p_status not in ('open', 'under_review', 'resolved', 'dismissed') then
    raise exception 'invalid_status_filter';
  end if;

  v_can_decide := private.is_authorized_admin(
    p_actor_id,
    array['owner', 'kyc_risk']::public.app_role[]
  );

  with matching_cases as materialized (
    select risk_case.id
    from private.risk_cases as risk_case
    join public.profiles as profile on profile.id = risk_case.user_id
    left join lateral (
      select signal.signal_type, signal.source, signal.basis
      from private.risk_signals as signal
      where signal.risk_case_id = risk_case.id
      order by signal.detected_at desc
      limit 1
    ) as latest_signal on true
    where (p_severity is null or risk_case.highest_severity::text = p_severity)
      and (p_status is null or risk_case.status::text = p_status)
      and (
        v_search is null
        or risk_case.risk_case_id::text = v_search
        or risk_case.user_id::text = v_search
        or profile.display_name ilike '%' || v_search || '%'
        or latest_signal.signal_type::text ilike '%' || v_search || '%'
        or latest_signal.source ilike '%' || v_search || '%'
      )
  ),
  page as materialized (
    select risk_case.*
    from matching_cases as matching
    join private.risk_cases as risk_case on risk_case.id = matching.id
    order by
      case risk_case.highest_severity
        when 'critical' then 4
        when 'high' then 3
        when 'medium' then 2
        else 1
      end desc,
      risk_case.risk_score desc,
      risk_case.opened_at asc
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'cases', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'risk_case_id', risk_case.risk_case_id,
          'user_id', risk_case.user_id,
          'display_name', coalesce(nullif(profile.display_name, ''), 'Glonni user'),
          'account_status', profile.status,
          'status', risk_case.status,
          'highest_severity', risk_case.highest_severity,
          'risk_score', risk_case.risk_score,
          'disposition', risk_case.disposition,
          'decision_reason', risk_case.decision_reason,
          'opened_at', risk_case.opened_at,
          'updated_at', risk_case.updated_at,
          'review', case when queue.review_item_id is null then null else jsonb_build_object(
            'review_item_id', queue.review_item_id,
            'status', queue.status,
            'priority', queue.priority,
            'assigned_to', queue.assigned_to,
            'due_at', queue.due_at
          ) end,
          'signals', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'signal_id', signal.signal_id,
                'signal_type', signal.signal_type,
                'severity', signal.severity,
                'confidence', signal.confidence,
                'source', signal.source,
                'basis', signal.basis,
                'detected_at', signal.detected_at,
                'evidence_verified', case
                  when lower(signal.evidence ->> 'evidence_verified') in ('true', 'false')
                    then (signal.evidence ->> 'evidence_verified')::boolean
                  else false
                end
              ) order by signal.detected_at desc
            )
            from private.risk_signals as signal
            where signal.risk_case_id = risk_case.id
          ), '[]'::jsonb)
        ) order by
          case risk_case.highest_severity
            when 'critical' then 4
            when 'high' then 3
            when 'medium' then 2
            else 1
          end desc,
          risk_case.risk_score desc,
          risk_case.opened_at asc
      )
      from page as risk_case
      join public.profiles as profile on profile.id = risk_case.user_id
      left join lateral (
        select item.review_item_id, item.status, item.priority,
               item.assigned_to, item.due_at
        from private.review_queue_items as item
        where item.entity_type = 'risk_case'
          and item.entity_id = risk_case.risk_case_id
        order by item.created_at desc
        limit 1
      ) as queue on true
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'matching', (select count(*) from matching_cases),
      'open', (select count(*) from private.risk_cases where status in ('open', 'under_review')),
      'critical', (select count(*) from private.risk_cases where status in ('open', 'under_review') and highest_severity = 'critical'),
      'under_review', (select count(*) from private.risk_cases where status = 'under_review'),
      'resolved_today', (select count(*) from private.risk_cases where status in ('resolved', 'dismissed') and resolved_at >= current_date)
    ),
    'permissions', jsonb_build_object(
      'can_view', true,
      'can_decide', v_can_decide,
      'human_decision_required', true
    ),
    'pagination', jsonb_build_object(
      'limit', v_limit,
      'offset', v_offset
    )
  ) into v_result;

  return v_result;
end;
$$;

create function private.decide_admin_risk_case(
  p_actor_id uuid,
  p_risk_case_id uuid,
  p_decision text,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case private.risk_cases%rowtype;
  v_restriction_id uuid;
begin
  if p_actor_id is null or not exists (
    select 1
    from public.profiles as profile
    where profile.id = p_actor_id
      and profile.status = 'active'::public.account_status
  ) or not private.is_authorized_admin(
    p_actor_id,
    array['owner', 'kyc_risk']::public.app_role[]
  ) then
    raise exception 'risk_decision_role_required';
  end if;
  if p_request_id is null or p_risk_case_id is null then
    raise exception 'case_and_request_id_required';
  end if;
  if p_decision not in ('clear', 'monitor', 'restrict') then
    raise exception 'invalid_risk_decision';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 8 and 500 then
    raise exception 'decision_reason_required';
  end if;

  select * into v_case
  from private.risk_cases
  where risk_case_id = p_risk_case_id
  for update;
  if not found then raise exception 'risk_case_not_found'; end if;
  if v_case.status not in ('open', 'under_review') then
    raise exception 'risk_case_already_decided';
  end if;

  if p_decision = 'clear' then
    perform private.resolve_risk_case(
      p_risk_case_id, 'dismissed', 'cleared', btrim(p_reason),
      p_request_id, p_actor_id
    );
  elsif p_decision = 'monitor' then
    perform private.resolve_risk_case(
      p_risk_case_id, 'resolved', 'monitor', btrim(p_reason),
      p_request_id, p_actor_id
    );
  else
    perform private.resolve_risk_case(
      p_risk_case_id, 'resolved', 'restriction_recommended', btrim(p_reason),
      p_request_id, p_actor_id
    );

    select restriction.restriction_id into v_restriction_id
    from public.account_restrictions as restriction
    where restriction.user_id = v_case.user_id
      and restriction.status = 'active'
      and restriction.restriction_type in (
        'account_restricted', 'account_suspended', 'account_closed'
      )
    order by restriction.created_at desc
    limit 1;

    if v_restriction_id is null then
      v_restriction_id := private.apply_account_restriction(
        v_case.user_id,
        'account_restricted',
        'human_risk_review',
        'Your account is restricted while a security decision is in effect. You may submit an appeal.',
        p_request_id,
        p_actor_id,
        p_risk_case_id,
        null,
        jsonb_build_object(
          'decision_origin', 'human_admin_review',
          'risk_case_id', p_risk_case_id
        )
      );
    end if;
  end if;

  return jsonb_build_object(
    'risk_case_id', p_risk_case_id,
    'decision', p_decision,
    'restriction_id', v_restriction_id,
    'decided_by', p_actor_id,
    'human_decision', true
  );
end;
$$;

revoke all on function private.list_admin_risk_cases(uuid, text, text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function private.decide_admin_risk_case(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function private.list_admin_risk_cases(uuid, text, text, text, integer, integer)
  to service_role;
grant execute on function private.decide_admin_risk_case(uuid, uuid, text, text, uuid)
  to service_role;

create function public.list_admin_risk_cases(
  p_actor_id uuid,
  p_search text default null,
  p_severity text default null,
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.list_admin_risk_cases(
    p_actor_id, p_search, p_severity, p_status, p_limit, p_offset
  )
$$;

create function public.decide_admin_risk_case(
  p_actor_id uuid,
  p_risk_case_id uuid,
  p_decision text,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.decide_admin_risk_case(
    p_actor_id, p_risk_case_id, p_decision, p_reason, p_request_id
  )
$$;

revoke all on function public.list_admin_risk_cases(uuid, text, text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.decide_admin_risk_case(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.list_admin_risk_cases(uuid, text, text, text, integer, integer)
  to service_role;
grant execute on function public.decide_admin_risk_case(uuid, uuid, text, text, uuid)
  to service_role;

comment on function public.list_admin_risk_cases(uuid, text, text, text, integer, integer) is
  'Service-only Step 13 facade. Returns redacted risk-review data after an active admin-role check.';
comment on function public.decide_admin_risk_case(uuid, uuid, text, text, uuid) is
  'Service-only Step 13 facade. Records an explicit human risk decision with role checks and audit history.';
