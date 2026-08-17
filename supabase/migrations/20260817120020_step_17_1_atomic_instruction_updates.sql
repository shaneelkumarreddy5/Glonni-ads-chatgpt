-- Step 17.1: atomically modify an instruction and append its approved discussion.
-- Existing RLS still requires an active owner using an AAL2 session.

create function public.update_agent_instruction(
  p_instruction_id uuid,
  p_target_type text,
  p_target_name text,
  p_title text,
  p_instruction_text text,
  p_scope text,
  p_priority smallint,
  p_status text,
  p_admin_messages jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_message text;
begin
  if jsonb_typeof(p_admin_messages) <> 'array' then
    raise exception 'admin_messages_must_be_array';
  end if;

  update public.agent_instructions
  set target_type = p_target_type,
      target_name = p_target_name,
      title = btrim(p_title),
      instruction_text = btrim(p_instruction_text),
      scope = btrim(p_scope),
      priority = p_priority,
      status = p_status,
      effective_at = case when p_status = 'active' then statement_timestamp() else null end
  where id = p_instruction_id;

  if not found then
    raise exception 'instruction_not_found_or_not_authorized';
  end if;

  for v_message in
    select value from jsonb_array_elements_text(p_admin_messages)
  loop
    insert into public.agent_instruction_messages (
      instruction_id, actor_type, actor_id, body
    ) values (
      p_instruction_id, 'admin', auth.uid(), v_message
    );
  end loop;

  return p_instruction_id;
end;
$$;

revoke all on function public.update_agent_instruction(uuid, text, text, text, text, text, smallint, text, jsonb) from public, anon;
grant execute on function public.update_agent_instruction(uuid, text, text, text, text, text, smallint, text, jsonb) to authenticated;

comment on function public.update_agent_instruction(uuid, text, text, text, text, text, smallint, text, jsonb) is
  'Atomically updates an owner-authored agent instruction and appends its approved discussion messages.';
