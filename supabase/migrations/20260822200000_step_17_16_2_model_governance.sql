-- Step 17.16.2: versioned, provider-neutral model governance. Live execution remains disabled.
create table public.agent_model_catalog (
  provider_key text not null, model_id text not null, capability text not null check(capability in('routine_text','complex_reasoning','image_generation')),
  status text not null default 'approved' check(status in('draft','approved','paused','retired')), live_enabled boolean not null default false check(not live_enabled),
  secret_env_name text not null check(secret_env_name ~ '^[A-Z][A-Z0-9_]+$'), pricing_snapshot jsonb not null default '{}' check(jsonb_typeof(pricing_snapshot)='object'),
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default statement_timestamp(), primary key(provider_key,model_id),
  check(model_id in('gpt-5-nano','gpt-5.6-luna','gpt-image-2'))
);
comment on column public.agent_model_catalog.secret_env_name is 'Secret reference only; credentials must remain in the deployment environment.';
create index agent_model_catalog_created_by_idx on public.agent_model_catalog(created_by);

create table public.agent_model_policy_versions (
  id uuid primary key default gen_random_uuid(), version integer not null unique check(version>0), status text not null default 'draft' check(status in('draft','testing','approved','superseded','rejected')),
  change_reason text not null, live_execution_enabled boolean not null default false check(not live_execution_enabled), image_daily_limit integer check(image_daily_limit is null or image_daily_limit>=0), image_monthly_limit integer check(image_monthly_limit is null or image_monthly_limit>=0),
  created_by uuid not null default auth.uid() references auth.users(id), approved_by uuid references auth.users(id), created_at timestamptz not null default statement_timestamp(), approved_at timestamptz,
  check((status='approved' and approved_by is not null and approved_at is not null) or status<>'approved')
);
create unique index agent_model_one_active_policy_idx on public.agent_model_policy_versions((status)) where status='approved';
create index agent_model_policy_created_by_idx on public.agent_model_policy_versions(created_by);
create index agent_model_policy_approved_by_idx on public.agent_model_policy_versions(approved_by);

create table public.agent_model_assignments (
  id uuid primary key default gen_random_uuid(), policy_version_id uuid not null references public.agent_model_policy_versions(id) on delete cascade,
  agent_name text not null, subagent_name text, workload text not null check(workload in('text','reasoning','image')),
  provider_key text not null, model_id text not null, escalation_model_id text,
  automatic_fallback boolean not null default false check(not automatic_fallback), created_at timestamptz not null default statement_timestamp(),
  foreign key(provider_key,model_id) references public.agent_model_catalog(provider_key,model_id),
  foreign key(provider_key,escalation_model_id) references public.agent_model_catalog(provider_key,model_id),
  unique(policy_version_id,agent_name,subagent_name,workload)
);
create index agent_model_assignments_policy_idx on public.agent_model_assignments(policy_version_id);
create index agent_model_assignments_primary_model_idx on public.agent_model_assignments(provider_key,model_id);
create index agent_model_assignments_escalation_model_idx on public.agent_model_assignments(provider_key,escalation_model_id) where escalation_model_id is not null;

create table public.agent_model_change_requests (
  id uuid primary key default gen_random_uuid(), from_policy_version_id uuid references public.agent_model_policy_versions(id), proposed_policy_version_id uuid not null references public.agent_model_policy_versions(id),
  status text not null default 'draft' check(status in('draft','simulating','awaiting_ceo','approved','rejected','rolled_back')), simulation_summary jsonb not null default '{}' check(jsonb_typeof(simulation_summary)='object'),
  requested_by uuid not null default auth.uid() references auth.users(id), decided_by uuid references auth.users(id), decision_reason text, requested_at timestamptz not null default statement_timestamp(), decided_at timestamptz,
  check((status in('approved','rejected','rolled_back') and decided_by is not null and decided_at is not null) or status not in('approved','rejected','rolled_back'))
);
create index agent_model_changes_status_idx on public.agent_model_change_requests(status,requested_at desc);
create index agent_model_changes_requested_by_idx on public.agent_model_change_requests(requested_by);
create index agent_model_changes_decided_by_idx on public.agent_model_change_requests(decided_by);

create table private.agent_model_policy_activity (
  id bigint generated always as identity primary key, policy_version_id uuid references public.agent_model_policy_versions(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null, action text not null, evidence jsonb not null default '{}' check(jsonb_typeof(evidence)='object'), occurred_at timestamptz not null default statement_timestamp()
);
create index agent_model_activity_timeline_idx on private.agent_model_policy_activity(occurred_at desc,id desc);
create index agent_model_activity_policy_idx on private.agent_model_policy_activity(policy_version_id);
create index agent_model_activity_actor_idx on private.agent_model_policy_activity(actor_id);

alter table public.agent_model_catalog enable row level security; alter table public.agent_model_catalog force row level security;
alter table public.agent_model_policy_versions enable row level security; alter table public.agent_model_policy_versions force row level security;
alter table public.agent_model_assignments enable row level security; alter table public.agent_model_assignments force row level security;
alter table public.agent_model_change_requests enable row level security; alter table public.agent_model_change_requests force row level security;
alter table private.agent_model_policy_activity enable row level security; alter table private.agent_model_policy_activity force row level security;
revoke all on public.agent_model_catalog,public.agent_model_policy_versions,public.agent_model_assignments,public.agent_model_change_requests from public,anon,authenticated;
revoke all on private.agent_model_policy_activity from public,anon,authenticated,service_role;
grant select on public.agent_model_catalog,public.agent_model_policy_versions,public.agent_model_assignments,public.agent_model_change_requests to authenticated;
grant insert,update on public.agent_model_catalog,public.agent_model_policy_versions,public.agent_model_assignments,public.agent_model_change_requests to authenticated;

create function private.is_agent_model_governance_admin(p_owner_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role='analyst'::public.app_role)));$$;
revoke all on function private.is_agent_model_governance_admin(boolean) from public,anon,authenticated,service_role; grant execute on function private.is_agent_model_governance_admin(boolean) to authenticated;
create policy model_catalog_read on public.agent_model_catalog for select to authenticated using((select private.is_agent_model_governance_admin(false)));
create policy model_catalog_owner_insert on public.agent_model_catalog for insert to authenticated with check(not live_enabled and created_by=(select auth.uid()) and (select private.is_agent_model_governance_admin(true)));
create policy model_catalog_owner_update on public.agent_model_catalog for update to authenticated using((select private.is_agent_model_governance_admin(true))) with check(not live_enabled and created_by=(select auth.uid()) and (select private.is_agent_model_governance_admin(true)));
create policy model_policy_read on public.agent_model_policy_versions for select to authenticated using((select private.is_agent_model_governance_admin(false)));
create policy model_policy_owner_insert on public.agent_model_policy_versions for insert to authenticated with check(not live_execution_enabled and created_by=(select auth.uid()) and (select private.is_agent_model_governance_admin(true)));
create policy model_policy_owner_update on public.agent_model_policy_versions for update to authenticated using((select private.is_agent_model_governance_admin(true))) with check(not live_execution_enabled and (select private.is_agent_model_governance_admin(true)));
create policy model_assignments_read on public.agent_model_assignments for select to authenticated using((select private.is_agent_model_governance_admin(false)));
create policy model_assignments_owner_insert on public.agent_model_assignments for insert to authenticated with check(not automatic_fallback and (select private.is_agent_model_governance_admin(true)));
create policy model_assignments_owner_update on public.agent_model_assignments for update to authenticated using((select private.is_agent_model_governance_admin(true))) with check(not automatic_fallback and (select private.is_agent_model_governance_admin(true)));
create policy model_changes_read on public.agent_model_change_requests for select to authenticated using((select private.is_agent_model_governance_admin(false)));
create policy model_changes_owner_insert on public.agent_model_change_requests for insert to authenticated with check(requested_by=(select auth.uid()) and (select private.is_agent_model_governance_admin(true)));
create policy model_changes_owner_update on public.agent_model_change_requests for update to authenticated using((select private.is_agent_model_governance_admin(true))) with check((select private.is_agent_model_governance_admin(true)));
create policy model_activity_deny on private.agent_model_policy_activity as restrictive for all to anon,authenticated using(false) with check(false);

create function private.reject_agent_model_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$begin raise exception 'agent model policy activity is append-only';end;$$;
revoke all on function private.reject_agent_model_activity_mutation() from public,anon,authenticated,service_role;
create trigger agent_model_activity_immutable before update or delete on private.agent_model_policy_activity for each row execute function private.reject_agent_model_activity_mutation();

with owner_user as (select id from auth.users order by created_at limit 1)
insert into public.agent_model_catalog(provider_key,model_id,capability,secret_env_name,pricing_snapshot,created_by)
select 'openai',v.model_id,v.capability,'OPENAI_API_KEY',v.pricing,o.id from owner_user o cross join (values ('gpt-5-nano','routine_text','{"input_per_million":0.05,"output_per_million":0.40}'::jsonb),('gpt-5.6-luna','complex_reasoning','{"input_per_million":0.20,"output_per_million":1.20}'::jsonb),('gpt-image-2','image_generation','{"image_input_per_million":8.00,"image_output_per_million":30.00}'::jsonb)) v(model_id,capability,pricing);
with owner_user as (select id from auth.users order by created_at limit 1)
insert into public.agent_model_policy_versions(version,status,change_reason,created_by,approved_by,approved_at)
select 1,'approved','Initial CEO-approved two-text-model and one-image-model policy',id,id,statement_timestamp() from owner_user;
with p as (select id from public.agent_model_policy_versions where version=1), a(agent_name,model_id,workload) as (values
('Chief Operations Agent','gpt-5.6-luna','reasoning'),('Support Team Lead Agent','gpt-5-nano','text'),('Fraud & Risk Agent','gpt-5.6-luna','reasoning'),('Payments & Wallet Agent','gpt-5.6-luna','reasoning'),('Compliance, KYC & Finance Agent','gpt-5.6-luna','reasoning'),('Ads Operations Agent','gpt-5-nano','text'),('Offerwall & Tasks Agent','gpt-5-nano','text'),('Affiliate & Shop Agent','gpt-5-nano','text'),('Content Manager Agent','gpt-5-nano','text'),('Creative Production Agent','gpt-5-nano','text'),('Creative Production Agent','gpt-image-2','image'),('Social Media Agent','gpt-5-nano','text'),('Performance Marketing Agent','gpt-5.6-luna','reasoning'),('Data & Business Analyst Agent','gpt-5.6-luna','reasoning'),('Technical Operations Agent','gpt-5.6-luna','reasoning'))
insert into public.agent_model_assignments(policy_version_id,agent_name,workload,provider_key,model_id) select p.id,a.agent_name,a.workload,'openai',a.model_id from p cross join a;
