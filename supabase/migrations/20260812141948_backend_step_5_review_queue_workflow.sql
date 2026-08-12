-- Complete the manual-review workflow with guarded assignment and terminal cleanup.

create function private.update_review_queue_item(
  p_review_item_id uuid,
  p_new_status public.review_queue_status,
  p_assigned_to uuid,
  p_actor_id uuid,
  p_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_item private.review_queue_items%rowtype;
begin
  if not private.is_authorized_admin(
    p_actor_id,
    array['owner', 'kyc_risk', 'support']::public.app_role[]
  ) then
    raise exception 'authorized review administrator is required';
  end if;

  if p_new_status in ('assigned', 'in_review')
     and not private.is_authorized_admin(
       p_assigned_to,
       array['owner', 'kyc_risk', 'support']::public.app_role[]
     ) then
    raise exception 'active eligible assignee is required';
  end if;

  select * into v_item
  from private.review_queue_items
  where review_item_id = p_review_item_id
  for update;

  if not found then
    raise exception 'review queue item not found';
  end if;

  if not (
    (v_item.status = 'queued' and p_new_status in ('assigned', 'cancelled'))
    or (v_item.status = 'assigned' and p_new_status in ('queued', 'in_review', 'cancelled'))
    or (v_item.status = 'in_review' and p_new_status in ('assigned', 'completed', 'cancelled'))
  ) then
    raise exception 'invalid review queue transition from % to %', v_item.status, p_new_status;
  end if;

  update private.review_queue_items
  set status = p_new_status,
      assigned_to = case
        when p_new_status in ('assigned', 'in_review') then p_assigned_to
        when p_new_status = 'queued' then null
        else assigned_to
      end,
      completed_at = case
        when p_new_status in ('completed', 'cancelled') then statement_timestamp()
        else null
      end,
      updated_at = statement_timestamp()
  where id = v_item.id;

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    request_id, previous_data, new_data
  ) values (
    'admin', p_actor_id, 'review_queue.status_changed', 'review_queue_item',
    v_item.review_item_id::text, p_request_id,
    jsonb_build_object('status', v_item.status, 'assigned_to', v_item.assigned_to),
    jsonb_build_object('status', p_new_status, 'assigned_to', p_assigned_to)
  );

  return v_item.review_item_id;
end;
$$;

create function private.complete_kyc_review_queue()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.new_status in (
    'verified'::public.kyc_status,
    'rejected'::public.kyc_status,
    'expired'::public.kyc_status,
    'cancelled'::public.kyc_status
  ) then
    update private.review_queue_items
    set status = 'completed',
        completed_at = statement_timestamp(),
        updated_at = statement_timestamp()
    where entity_type = 'kyc_case'
      and entity_id = (
        select kyc_id from public.kyc_cases where id = new.kyc_case_id
      )
      and status in ('queued', 'assigned', 'in_review');
  end if;

  return new;
end;
$$;

revoke all on function private.update_review_queue_item(
  uuid, public.review_queue_status, uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function private.update_review_queue_item(
  uuid, public.review_queue_status, uuid, uuid, uuid
) to service_role;

revoke all on function private.complete_kyc_review_queue()
from public, anon, authenticated, service_role;

create trigger kyc_history_complete_review_queue
after insert on public.kyc_status_history
for each row execute function private.complete_kyc_review_queue();
