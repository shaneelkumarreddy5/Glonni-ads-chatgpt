-- Step 17.1: server-enforced CEO -> Chief Operations -> department -> subagent hierarchy.
-- Owner-authored instructions are CEO authority by default. Future agent workers must
-- use their own restricted server functions and cannot choose a stronger authority.

alter table public.agent_instructions
  add column issuer_type text not null default 'ceo',
  add column authority_rank smallint not null default 1,
  add column hierarchy_path text[] not null default array['company']::text[],
  add column rule_key text not null default 'general',
  add column is_mandatory boolean not null default true,
  add column parent_instruction_id uuid references public.agent_instructions(id) on delete restrict,
  add constraint agent_instructions_issuer_type
    check (issuer_type in ('ceo', 'chief_operations_agent', 'department_agent', 'subagent')),
  add constraint agent_instructions_authority_rank
    check (
      (issuer_type = 'ceo' and authority_rank = 1)
      or (issuer_type = 'chief_operations_agent' and authority_rank = 2)
      or (issuer_type = 'department_agent' and authority_rank = 3)
      or (issuer_type = 'subagent' and authority_rank = 4)
    ),
  add constraint agent_instructions_hierarchy_path
    check (cardinality(hierarchy_path) between 1 and 4 and hierarchy_path[1] = 'company'),
  add constraint agent_instructions_rule_key
    check (rule_key ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  add constraint agent_instructions_not_self_parent
    check (parent_instruction_id is null or parent_instruction_id <> id);

create index agent_instructions_hierarchy_lookup
  on public.agent_instructions (rule_key, authority_rank, status);
create index agent_instructions_parent_lookup
  on public.agent_instructions (parent_instruction_id)
  where parent_instruction_id is not null;
create index agent_instructions_hierarchy_path_gin
  on public.agent_instructions using gin (hierarchy_path);

create function private.enforce_agent_instruction_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.agent_instructions%rowtype;
begin
  if new.parent_instruction_id is not null then
    select * into v_parent
    from public.agent_instructions
    where id = new.parent_instruction_id;

    if not found then
      raise exception 'parent_instruction_not_found';
    end if;

    if v_parent.authority_rank >= new.authority_rank then
      raise exception 'parent_must_have_higher_authority';
    end if;

    if new.hierarchy_path[1:cardinality(v_parent.hierarchy_path)] <> v_parent.hierarchy_path then
      raise exception 'instruction_must_remain_inside_parent_scope';
    end if;
  end if;

  if new.status in ('pending_approval', 'active', 'scheduled') and exists (
    select 1
    from public.agent_instructions higher
    where higher.id <> new.id
      and higher.rule_key = new.rule_key
      and higher.is_mandatory
      and higher.authority_rank < new.authority_rank
      and higher.status in ('active', 'scheduled')
      and new.hierarchy_path[1:cardinality(higher.hierarchy_path)] = higher.hierarchy_path
  ) then
    raise exception 'higher_authority_instruction_controls_this_rule';
  end if;

  return new;
end;
$$;

create trigger agent_instructions_enforce_hierarchy
before insert or update of issuer_type, authority_rank, hierarchy_path, rule_key,
  is_mandatory, parent_instruction_id, status
on public.agent_instructions
for each row execute function private.enforce_agent_instruction_hierarchy();

create view public.effective_agent_instructions
with (security_invoker = true)
as
select instruction.*
from public.agent_instructions instruction
where instruction.status in ('active', 'scheduled')
  and not exists (
    select 1
    from public.agent_instructions stronger
    where stronger.id <> instruction.id
      and stronger.rule_key = instruction.rule_key
      and stronger.is_mandatory
      and stronger.authority_rank < instruction.authority_rank
      and stronger.status in ('active', 'scheduled')
      and instruction.hierarchy_path[1:cardinality(stronger.hierarchy_path)] = stronger.hierarchy_path
  );

revoke all on public.effective_agent_instructions from public, anon, authenticated;
grant select on public.effective_agent_instructions to authenticated;

comment on view public.effective_agent_instructions is
  'Security-invoker view containing only active instructions that are not superseded by a mandatory higher-authority rule.';
