-- Step 17.1: persistent, versioned agent instructions and discussion history.
-- Only an active owner with an AAL2 session may create or change instructions.
-- Other active admin-console roles receive read access for operational visibility.

create table public.agent_instructions (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  agent_name text not null,
  target_type text not null default 'main_agent',
  target_name text not null,
  title text not null,
  instruction_text text not null,
  structured_rule jsonb not null default '{}'::jsonb,
  scope text not null default 'All approved operations',
  priority smallint not null default 2,
  status text not null default 'draft',
  effective_at timestamptz,
  expires_at timestamptz,
  version integer not null default 1,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  archived_at timestamptz,
  constraint agent_instructions_agent_key_format
    check (agent_key ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  constraint agent_instructions_agent_name_length
    check (char_length(agent_name) between 3 and 120),
  constraint agent_instructions_target_type
    check (target_type in ('main_agent', 'subagent')),
  constraint agent_instructions_target_name_length
    check (char_length(target_name) between 3 and 160),
  constraint agent_instructions_title_length
    check (char_length(title) between 3 and 160),
  constraint agent_instructions_text_length
    check (char_length(instruction_text) between 10 and 10000),
  constraint agent_instructions_scope_length
    check (char_length(scope) between 2 and 500),
  constraint agent_instructions_structured_rule_object
    check (jsonb_typeof(structured_rule) = 'object'),
  constraint agent_instructions_priority_range
    check (priority between 1 and 4),
  constraint agent_instructions_status
    check (status in ('draft', 'pending_approval', 'active', 'scheduled', 'paused', 'expired', 'archived', 'rejected')),
  constraint agent_instructions_effective_window
    check (expires_at is null or effective_at is null or expires_at > effective_at),
  constraint agent_instructions_archive_state
    check ((status = 'archived' and archived_at is not null) or (status <> 'archived' and archived_at is null)),
  constraint agent_instructions_version_positive
    check (version > 0)
);

create index agent_instructions_agent_status_updated
  on public.agent_instructions (agent_key, status, updated_at desc);
create index agent_instructions_active_schedule
  on public.agent_instructions (effective_at, expires_at)
  where status in ('active', 'scheduled');
create index agent_instructions_created_by_updated
  on public.agent_instructions (created_by, updated_at desc);

create table public.agent_instruction_versions (
  id bigint generated always as identity primary key,
  instruction_id uuid not null references public.agent_instructions(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  change_type text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default statement_timestamp(),
  constraint agent_instruction_versions_unique unique (instruction_id, version),
  constraint agent_instruction_versions_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint agent_instruction_versions_change_type check (change_type in ('created', 'modified', 'status_changed'))
);

create index agent_instruction_versions_history
  on public.agent_instruction_versions (instruction_id, version desc);

create table public.agent_instruction_messages (
  id bigint generated always as identity primary key,
  instruction_id uuid not null references public.agent_instructions(id) on delete restrict,
  actor_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  body text not null,
  structured_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_instruction_messages_actor_type check (actor_type in ('admin', 'agent', 'system')),
  constraint agent_instruction_messages_body_length check (char_length(body) between 1 and 10000),
  constraint agent_instruction_messages_structured_object check (jsonb_typeof(structured_data) = 'object'),
  constraint agent_instruction_messages_admin_actor check (actor_type <> 'admin' or actor_id is not null)
);

create index agent_instruction_messages_thread
  on public.agent_instruction_messages (instruction_id, created_at, id);

comment on table public.agent_instructions is
  'Current approved or draft operating instruction for a Glonni AI agent. Client deletion is intentionally unavailable; archive by status instead.';
comment on table public.agent_instruction_versions is
  'Append-only instruction snapshots created by protected triggers.';
comment on table public.agent_instruction_messages is
  'Append-only discussion messages associated with an instruction draft.';

alter table public.agent_instructions enable row level security;
alter table public.agent_instructions force row level security;
alter table public.agent_instruction_versions enable row level security;
alter table public.agent_instruction_versions force row level security;
alter table public.agent_instruction_messages enable row level security;
alter table public.agent_instruction_messages force row level security;

revoke all on public.agent_instructions from public, anon, authenticated;
revoke all on public.agent_instruction_versions from public, anon, authenticated;
revoke all on public.agent_instruction_messages from public, anon, authenticated;

grant select, insert, update on public.agent_instructions to authenticated;
grant select on public.agent_instruction_versions to authenticated;
grant select, insert on public.agent_instruction_messages to authenticated;
grant usage, select on sequence public.agent_instruction_messages_id_seq to authenticated;

create policy agent_instructions_admin_read
on public.agent_instructions
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.is_active
      and r.revoked_at is null
      and r.role in ('owner'::public.app_role, 'finance'::public.app_role, 'support'::public.app_role, 'kyc_risk'::public.app_role, 'content'::public.app_role, 'analyst'::public.app_role)
  )
);

create policy agent_instructions_owner_insert
on public.agent_instructions
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
);

create policy agent_instructions_owner_update
on public.agent_instructions
for update
to authenticated
using (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
)
with check (
  updated_by = (select auth.uid())
  and (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
);

create policy agent_instruction_versions_admin_read
on public.agent_instruction_versions
for select
to authenticated
using (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.is_active
      and r.revoked_at is null
      and r.role in ('owner'::public.app_role, 'finance'::public.app_role, 'support'::public.app_role, 'kyc_risk'::public.app_role, 'content'::public.app_role, 'analyst'::public.app_role)
  )
);

create policy agent_instruction_messages_admin_read
on public.agent_instruction_messages
for select
to authenticated
using (
  (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.is_active
      and r.revoked_at is null
      and r.role in ('owner'::public.app_role, 'finance'::public.app_role, 'support'::public.app_role, 'kyc_risk'::public.app_role, 'content'::public.app_role, 'analyst'::public.app_role)
  )
);

create policy agent_instruction_messages_owner_insert
on public.agent_instruction_messages
for insert
to authenticated
with check (
  actor_type = 'admin'
  and actor_id = (select auth.uid())
  and (select auth.jwt() ->> 'aal') = 'aal2'
  and exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'owner'::public.app_role
      and r.is_active
      and r.revoked_at is null
  )
);

create function public.create_agent_instruction(
  p_agent_key text,
  p_agent_name text,
  p_target_type text,
  p_target_name text,
  p_title text,
  p_instruction_text text,
  p_scope text,
  p_priority smallint,
  p_status text,
  p_admin_messages jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_instruction_id uuid;
  v_message text;
begin
  if jsonb_typeof(p_admin_messages) <> 'array' then
    raise exception 'admin_messages_must_be_array';
  end if;

  insert into public.agent_instructions (
    agent_key, agent_name, target_type, target_name, title,
    instruction_text, scope, priority, status, effective_at,
    created_by, updated_by
  ) values (
    p_agent_key, p_agent_name, p_target_type, p_target_name, btrim(p_title),
    btrim(p_instruction_text), btrim(p_scope), p_priority, p_status,
    case when p_status = 'active' then statement_timestamp() else null end,
    auth.uid(), auth.uid()
  ) returning id into v_instruction_id;

  for v_message in
    select value from jsonb_array_elements_text(p_admin_messages)
  loop
    insert into public.agent_instruction_messages (
      instruction_id, actor_type, actor_id, body
    ) values (
      v_instruction_id, 'admin', auth.uid(), v_message
    );
  end loop;

  return v_instruction_id;
end;
$$;

revoke all on function public.create_agent_instruction(text, text, text, text, text, text, text, smallint, text, jsonb) from public, anon;
grant execute on function public.create_agent_instruction(text, text, text, text, text, text, text, smallint, text, jsonb) to authenticated;

comment on function public.create_agent_instruction(text, text, text, text, text, text, text, smallint, text, jsonb) is
  'Atomic security-invoker creation of an owner-authored instruction and its approved discussion messages.';

create function private.prepare_agent_instruction_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.version := old.version + 1;
  new.updated_at := statement_timestamp();
  new.updated_by := auth.uid();
  if new.status = 'archived' and old.status <> 'archived' then
    new.archived_at := statement_timestamp();
  elsif new.status <> 'archived' then
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create trigger agent_instructions_prepare_update
before update on public.agent_instructions
for each row execute function private.prepare_agent_instruction_update();

create function private.capture_agent_instruction_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_change_type text;
begin
  v_change_type := case
    when tg_op = 'INSERT' then 'created'
    when old.status is distinct from new.status then 'status_changed'
    else 'modified'
  end;

  insert into public.agent_instruction_versions (
    instruction_id, version, snapshot, change_type, changed_by
  ) values (
    new.id, new.version, to_jsonb(new), v_change_type, auth.uid()
  );

  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    reason, previous_data, new_data, metadata
  ) values (
    'admin'::public.audit_actor_type,
    auth.uid(),
    'agent.instruction.' || v_change_type,
    'agent_instruction',
    new.id::text,
    case when tg_op = 'INSERT' then 'Agent instruction draft created' else 'Agent instruction changed' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),
    jsonb_build_object('agent_key', new.agent_key, 'version', new.version, 'status', new.status)
  );
  return new;
end;
$$;

revoke all on function private.capture_agent_instruction_version() from public, anon, authenticated;

create trigger agent_instructions_capture_version
after insert or update on public.agent_instructions
for each row execute function private.capture_agent_instruction_version();

create function private.audit_agent_instruction_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    actor_type, actor_id, action, resource_type, resource_id,
    reason, new_data, metadata
  ) values (
    case when new.actor_type = 'admin' then 'admin'::public.audit_actor_type else 'ai_agent'::public.audit_actor_type end,
    new.actor_id,
    'agent.instruction.message.created',
    'agent_instruction',
    new.instruction_id::text,
    'Instruction discussion message recorded',
    jsonb_build_object('message_id', new.id, 'actor_type', new.actor_type),
    jsonb_build_object('instruction_id', new.instruction_id)
  );
  return new;
end;
$$;

revoke all on function private.audit_agent_instruction_message() from public, anon, authenticated;

create trigger agent_instruction_messages_audit
after insert on public.agent_instruction_messages
for each row execute function private.audit_agent_instruction_message();

create function private.reject_agent_instruction_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'agent instruction history is append-only';
end;
$$;

create trigger agent_instruction_versions_immutable
before update or delete on public.agent_instruction_versions
for each row execute function private.reject_agent_instruction_history_mutation();

create trigger agent_instruction_messages_immutable
before update or delete on public.agent_instruction_messages
for each row execute function private.reject_agent_instruction_history_mutation();

revoke all on function private.prepare_agent_instruction_update() from public, anon, authenticated;
revoke all on function private.reject_agent_instruction_history_mutation() from public, anon, authenticated;
