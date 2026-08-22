-- Step 17.16.1: provider-neutral agent runtime foundation (simulation only).
create table public.agent_runtime_providers (
  id uuid primary key default gen_random_uuid(), provider_key text not null unique check(provider_key in('openai','anthropic','gemini','custom')),
  display_name text not null, model_alias text not null, secret_env_name text not null check(secret_env_name ~ '^[A-Z][A-Z0-9_]+$'),
  enabled boolean not null default false, live_enabled boolean not null default false check(not live_enabled), metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
comment on column public.agent_runtime_providers.secret_env_name is 'Environment-variable reference only. Never store provider credentials here.';
create table public.agent_runtime_controls (
  id uuid primary key default gen_random_uuid(), control_key text not null unique default 'global', mode text not null default 'simulation' check(mode='simulation'),
  live_execution_enabled boolean not null default false check(not live_execution_enabled), emergency_paused boolean not null default false,
  max_token_budget integer not null default 20000 check(max_token_budget between 1 and 100000), max_timeout_ms integer not null default 60000 check(max_timeout_ms between 1000 and 300000), max_retries smallint not null default 2 check(max_retries between 0 and 5),
  updated_by uuid not null default auth.uid() references auth.users(id), updated_at timestamptz not null default statement_timestamp()
);
create table public.agent_runtime_runs (
  id uuid primary key default gen_random_uuid(), mode text not null default 'simulation' check(mode='simulation'), status text not null check(status in('simulated','waiting_approval','blocked','failed')),
  provider_key text not null check(provider_key in('openai','anthropic','gemini','custom')), model_alias text not null, main_agent text not null, subagent text,
  objective text not null check(length(btrim(objective)) between 1 and 10000), instruction_snapshot jsonb not null default '{}' check(jsonb_typeof(instruction_snapshot)='object'),
  approval_risk text not null check(approval_risk in('none','department','ceo')), token_budget integer not null check(token_budget>0), estimated_input_tokens integer not null default 0 check(estimated_input_tokens>=0), estimated_output_tokens integer not null default 0 check(estimated_output_tokens>=0), estimated_cost_usd numeric(14,6) not null default 0 check(estimated_cost_usd>=0),
  requested_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default statement_timestamp()
);
create index agent_runtime_runs_timeline_idx on public.agent_runtime_runs(created_at desc,id desc);
create table private.agent_runtime_trace (
  id bigint generated always as identity primary key, run_id uuid not null references public.agent_runtime_runs(id) on delete cascade, step_order smallint not null check(step_order>0),
  stage text not null check(stage in('policy','route','instruction','provider','approval','result')), status text not null check(status in('passed','simulated','waiting','blocked')), detail text not null, occurred_at timestamptz not null default statement_timestamp(), unique(run_id,step_order)
);
alter table public.agent_runtime_providers enable row level security; alter table public.agent_runtime_providers force row level security;
alter table public.agent_runtime_controls enable row level security; alter table public.agent_runtime_controls force row level security;
alter table public.agent_runtime_runs enable row level security; alter table public.agent_runtime_runs force row level security;
alter table private.agent_runtime_trace enable row level security; alter table private.agent_runtime_trace force row level security;
revoke all on public.agent_runtime_providers,public.agent_runtime_controls,public.agent_runtime_runs from public,anon,authenticated;
revoke all on private.agent_runtime_trace from public,anon,authenticated,service_role;
grant select on public.agent_runtime_providers,public.agent_runtime_controls,public.agent_runtime_runs to authenticated;
grant insert on public.agent_runtime_runs to authenticated; grant insert,update on public.agent_runtime_providers,public.agent_runtime_controls to authenticated;
create function private.is_agent_runtime_admin(p_owner_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role='analyst'::public.app_role)));$$;
revoke all on function private.is_agent_runtime_admin(boolean) from public,anon,authenticated,service_role; grant execute on function private.is_agent_runtime_admin(boolean) to authenticated;
create policy runtime_providers_read on public.agent_runtime_providers for select to authenticated using((select private.is_agent_runtime_admin(false)));
create policy runtime_providers_owner_write on public.agent_runtime_providers for all to authenticated using((select private.is_agent_runtime_admin(true))) with check(not live_enabled and created_by=(select auth.uid()) and (select private.is_agent_runtime_admin(true)));
create policy runtime_controls_read on public.agent_runtime_controls for select to authenticated using((select private.is_agent_runtime_admin(false)));
create policy runtime_controls_owner_write on public.agent_runtime_controls for all to authenticated using((select private.is_agent_runtime_admin(true))) with check(mode='simulation' and not live_execution_enabled and updated_by=(select auth.uid()) and (select private.is_agent_runtime_admin(true)));
create policy runtime_runs_read on public.agent_runtime_runs for select to authenticated using((select private.is_agent_runtime_admin(false)));
create policy runtime_runs_create on public.agent_runtime_runs for insert to authenticated with check(mode='simulation' and requested_by=(select auth.uid()) and (select private.is_agent_runtime_admin(false)));
create policy runtime_trace_deny on private.agent_runtime_trace as restrictive for all to anon,authenticated using(false) with check(false);
create function private.reject_agent_runtime_trace_mutation() returns trigger language plpgsql security definer set search_path='' as $$begin raise exception 'agent runtime trace is append-only';end;$$;
revoke all on function private.reject_agent_runtime_trace_mutation() from public,anon,authenticated,service_role;
create trigger agent_runtime_trace_immutable before update or delete on private.agent_runtime_trace for each row execute function private.reject_agent_runtime_trace_mutation();
insert into public.agent_runtime_controls(control_key,updated_by) select 'global',u.id from auth.users u order by u.created_at limit 1 on conflict(control_key) do nothing;
