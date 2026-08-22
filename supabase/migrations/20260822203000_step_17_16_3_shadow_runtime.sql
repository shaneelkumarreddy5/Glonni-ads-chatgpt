-- Step 17.16.3: live-model shadow runtime. It can recommend only and begins disabled.
create table public.agent_shadow_controls (
  id uuid primary key default gen_random_uuid(), control_key text not null unique default 'global', enabled boolean not null default false,
  allowed_agents text[] not null default array['Chief Operations Agent','Support Team Lead Agent'], max_runs_per_day integer not null default 10 check(max_runs_per_day between 1 and 1000),
  max_cost_usd_per_day numeric(12,4) not null default 1 check(max_cost_usd_per_day>0), max_output_tokens integer not null default 600 check(max_output_tokens between 64 and 4000),
  timeout_ms integer not null default 30000 check(timeout_ms between 1000 and 60000), tools_enabled boolean not null default false check(not tools_enabled), business_actions_enabled boolean not null default false check(not business_actions_enabled),
  approved_by uuid references auth.users(id), approved_at timestamptz, updated_by uuid not null default auth.uid() references auth.users(id), updated_at timestamptz not null default statement_timestamp(),
  check(not enabled or (approved_by is not null and approved_at is not null))
);
create index agent_shadow_controls_approved_by_idx on public.agent_shadow_controls(approved_by);
create index agent_shadow_controls_updated_by_idx on public.agent_shadow_controls(updated_by);

create table public.agent_shadow_runs (
  id uuid primary key default gen_random_uuid(), agent_name text not null check(agent_name in('Chief Operations Agent','Support Team Lead Agent')),
  model_id text not null check(model_id in('gpt-5-nano','gpt-5.6-luna')), objective text not null check(length(btrim(objective)) between 10 and 4000),
  provider_response_id text not null, status text not null check(status in('completed','failed','timed_out','blocked')), input_tokens integer not null default 0 check(input_tokens>=0), output_tokens integer not null default 0 check(output_tokens>=0), total_tokens integer not null default 0 check(total_tokens>=0),
  estimated_cost_usd numeric(14,6) not null default 0 check(estimated_cost_usd>=0), duration_ms integer not null check(duration_ms>=0), output_excerpt text not null check(length(output_excerpt)<=1000), output_sha256 text not null check(output_sha256 ~ '^[a-f0-9]{64}$'),
  tools_used boolean not null default false check(not tools_used), business_actions_taken boolean not null default false check(not business_actions_taken), requested_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default statement_timestamp()
);
create index agent_shadow_runs_timeline_idx on public.agent_shadow_runs(created_at desc,id desc);
create index agent_shadow_runs_daily_cost_idx on public.agent_shadow_runs(created_at,estimated_cost_usd);
create index agent_shadow_runs_requested_by_idx on public.agent_shadow_runs(requested_by);

create table public.agent_shadow_failures (
  id uuid primary key default gen_random_uuid(), agent_name text not null, objective_excerpt text not null check(length(objective_excerpt)<=500), error_code text not null,
  error_message text not null check(length(error_message)<=500), requested_by uuid not null default auth.uid() references auth.users(id), occurred_at timestamptz not null default statement_timestamp()
);
create index agent_shadow_failures_timeline_idx on public.agent_shadow_failures(occurred_at desc,id desc);create index agent_shadow_failures_requested_by_idx on public.agent_shadow_failures(requested_by);

create table private.agent_shadow_activity (
  id bigint generated always as identity primary key, run_id uuid references public.agent_shadow_runs(id) on delete set null, actor_id uuid references auth.users(id) on delete set null,
  action text not null, evidence jsonb not null default '{}' check(jsonb_typeof(evidence)='object'), occurred_at timestamptz not null default statement_timestamp()
);
create index agent_shadow_activity_timeline_idx on private.agent_shadow_activity(occurred_at desc,id desc); create index agent_shadow_activity_run_idx on private.agent_shadow_activity(run_id); create index agent_shadow_activity_actor_idx on private.agent_shadow_activity(actor_id);

alter table public.agent_shadow_controls enable row level security;alter table public.agent_shadow_controls force row level security;
alter table public.agent_shadow_runs enable row level security;alter table public.agent_shadow_runs force row level security;
alter table public.agent_shadow_failures enable row level security;alter table public.agent_shadow_failures force row level security;
alter table private.agent_shadow_activity enable row level security;alter table private.agent_shadow_activity force row level security;
revoke all on public.agent_shadow_controls,public.agent_shadow_runs,public.agent_shadow_failures from public,anon,authenticated;revoke all on private.agent_shadow_activity from public,anon,authenticated,service_role;
grant select,update on public.agent_shadow_controls to authenticated;grant select,insert on public.agent_shadow_runs,public.agent_shadow_failures to authenticated;
create function private.is_agent_shadow_admin(p_owner_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role='analyst'::public.app_role)));$$;
revoke all on function private.is_agent_shadow_admin(boolean) from public,anon,authenticated,service_role;grant execute on function private.is_agent_shadow_admin(boolean) to authenticated;
create policy shadow_controls_read on public.agent_shadow_controls for select to authenticated using((select private.is_agent_shadow_admin(false)));
create policy shadow_controls_owner_update on public.agent_shadow_controls for update to authenticated using((select private.is_agent_shadow_admin(true))) with check(not tools_enabled and not business_actions_enabled and updated_by=(select auth.uid()) and (select private.is_agent_shadow_admin(true)));
create policy shadow_runs_read on public.agent_shadow_runs for select to authenticated using((select private.is_agent_shadow_admin(false)));
create policy shadow_runs_create on public.agent_shadow_runs for insert to authenticated with check(not tools_used and not business_actions_taken and requested_by=(select auth.uid()) and (select private.is_agent_shadow_admin(false)));
create policy shadow_failures_read on public.agent_shadow_failures for select to authenticated using((select private.is_agent_shadow_admin(false)));
create policy shadow_failures_create on public.agent_shadow_failures for insert to authenticated with check(requested_by=(select auth.uid()) and (select private.is_agent_shadow_admin(false)));
create policy shadow_activity_deny on private.agent_shadow_activity as restrictive for all to anon,authenticated using(false) with check(false);
create function private.reject_agent_shadow_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$begin raise exception 'agent shadow activity is append-only';end;$$;
revoke all on function private.reject_agent_shadow_activity_mutation() from public,anon,authenticated,service_role;create trigger agent_shadow_activity_immutable before update or delete on private.agent_shadow_activity for each row execute function private.reject_agent_shadow_activity_mutation();
with owner_user as(select id from auth.users order by created_at limit 1) insert into public.agent_shadow_controls(control_key,updated_by) select 'global',id from owner_user;
