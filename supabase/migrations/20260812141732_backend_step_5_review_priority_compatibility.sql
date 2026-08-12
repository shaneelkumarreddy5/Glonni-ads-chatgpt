-- Allow ordinary integer priority expressions while preserving the smallint queue constraint.

create function private.enqueue_review(
  p_entity_type public.review_entity_type,
  p_entity_id uuid,
  p_user_id uuid,
  p_priority integer,
  p_due_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if p_priority not between 1 and 5 then
    raise exception 'review priority must be between 1 and 5';
  end if;

  return private.enqueue_review(
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_priority::smallint,
    p_due_at,
    p_metadata
  );
end;
$$;

revoke all on function private.enqueue_review(
  public.review_entity_type, uuid, uuid, integer, timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function private.enqueue_review(
  public.review_entity_type, uuid, uuid, integer, timestamptz, jsonb
) to service_role;
