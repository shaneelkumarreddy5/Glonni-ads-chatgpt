-- Step 17.6: Compliance, KYC & Finance Agent orchestration.
-- Existing KYC cases, encrypted provider evidence, consent history and finance
-- ledgers remain authoritative. This layer records supervised work only.

create table public.compliance_agent_reviews (
  id uuid primary key default gen_random_uuid(), review_ref text not null unique,
  review_type text not null check (review_type in ('kyc_manual','consent','retention','access_control','financial_record','policy_exception')),
  kyc_id uuid references public.kyc_cases(kyc_id) on delete restrict,
  subject_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','in_review','waiting_evidence','awaiting_approval','complete','closed')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  assigned_specialist text check (assigned_specialist in ('KYC Review','Finance & Records')),
  evidence_summary jsonb not null default '{}'::jsonb,
  recommendation jsonb not null default '{}'::jsonb,
  due_at timestamptz, created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(),
  constraint compliance_reviews_evidence_object check (jsonb_typeof(evidence_summary)='object'),
  constraint compliance_reviews_recommendation_object check (jsonb_typeof(recommendation)='object')
);
create index compliance_reviews_queue_idx on public.compliance_agent_reviews(status,severity,due_at);
create index compliance_reviews_kyc_idx on public.compliance_agent_reviews(kyc_id) where kyc_id is not null;
create index compliance_reviews_subject_idx on public.compliance_agent_reviews(subject_user_id) where subject_user_id is not null;
create index compliance_reviews_created_by_idx on public.compliance_agent_reviews(created_by);

create table public.compliance_agent_tasks (
  id uuid primary key default gen_random_uuid(), review_id uuid references public.compliance_agent_reviews(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 240),
  assigned_target text not null check (assigned_target in ('Compliance, KYC & Finance Agent','KYC Review','Finance & Records')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'queued' check (status in ('queued','running','waiting_human','waiting_evidence','completed','failed','escalated','cancelled')),
  due_at timestamptz, result_summary jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  completed_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(),
  constraint compliance_tasks_result_object check (jsonb_typeof(result_summary)='object')
);
create index compliance_tasks_queue_idx on public.compliance_agent_tasks(status,priority,due_at);
create index compliance_tasks_review_idx on public.compliance_agent_tasks(review_id) where review_id is not null;
create index compliance_tasks_created_by_idx on public.compliance_agent_tasks(created_by);

create table public.compliance_agent_approvals (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.compliance_agent_reviews(id) on delete restrict,
  approval_type text not null check (approval_type in ('kyc_outcome','retention_exception','policy_exception','financial_record_adjustment','statutory_action','bulk_action')),
  requested_action text not null, evidence_summary jsonb not null default '{}'::jsonb, recommendation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','expired')),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict, decision_reason text,
  requested_at timestamptz not null default statement_timestamp(), decided_at timestamptz,
  constraint compliance_approvals_evidence_object check (jsonb_typeof(evidence_summary)='object'),
  constraint compliance_approvals_decision_check check ((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null))
);
create index compliance_approvals_queue_idx on public.compliance_agent_approvals(status,requested_at);
create index compliance_approvals_review_idx on public.compliance_agent_approvals(review_id);
create index compliance_approvals_requested_by_idx on public.compliance_agent_approvals(requested_by);
create index compliance_approvals_decided_by_idx on public.compliance_agent_approvals(decided_by) where decided_by is not null;

create table public.compliance_agent_automations (
  id uuid primary key default gen_random_uuid(), automation_key text not null unique,
  name text not null, trigger_type text not null check (trigger_type in ('kyc_expiry','review_deadline','consent_check','retention_schedule','schedule')),
  configuration jsonb not null default '{}'::jsonb, status text not null default 'draft' check (status in ('draft','pending_approval','active','paused','archived')),
  automatic_decision boolean not null default false check (automatic_decision=false),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz, updated_at timestamptz not null default statement_timestamp(),
  constraint compliance_automations_config_object check (jsonb_typeof(configuration)='object'),
  constraint compliance_automations_activation check (status<>'active' or (approved_by is not null and approved_at is not null))
);
create index compliance_automations_created_by_idx on public.compliance_agent_automations(created_by);
create index compliance_automations_approved_by_idx on public.compliance_agent_automations(approved_by) where approved_by is not null;

create table public.compliance_agent_connections (
  id uuid primary key default gen_random_uuid(), connection_key text not null unique,
  provider_type text not null check (provider_type in ('identity_verification','policy_registry','records_vault','accounting_export','custom_webhook')),
  display_name text not null, status text not null default 'disconnected' check (status in ('disconnected','pending','connected','degraded','error','paused')),
  permitted_evidence_fields jsonb not null default '[]'::jsonb, public_configuration jsonb not null default '{}'::jsonb,
  secret_reference text check (secret_reference is null or secret_reference ~ '^(vault|env|kms)://'),
  retention_days integer check (retention_days is null or retention_days between 1 and 3650),
  configured_by uuid not null default auth.uid() references auth.users(id) on delete restrict, updated_at timestamptz not null default statement_timestamp(),
  constraint compliance_connections_fields_array check (jsonb_typeof(permitted_evidence_fields)='array'),
  constraint compliance_connections_config_object check (jsonb_typeof(public_configuration)='object')
);
create index compliance_connections_configured_by_idx on public.compliance_agent_connections(configured_by);

create table public.compliance_agent_reports (
  id uuid primary key default gen_random_uuid(), report_type text not null check (report_type in ('daily_kyc','weekly_exceptions','consent_retention','financial_records','control_effectiveness','subagent_quality')),
  period_start timestamptz not null, period_end timestamptz not null, summary jsonb not null default '{}'::jsonb,
  status text not null default 'generated' check (status in ('generated','reviewed','delivered','superseded')),
  generated_at timestamptz not null default statement_timestamp(),
  constraint compliance_reports_period check (period_end>period_start), constraint compliance_reports_summary_object check (jsonb_typeof(summary)='object')
);
create index compliance_reports_period_idx on public.compliance_agent_reports(report_type,period_end desc);

create table private.compliance_agent_activity (
  id bigint generated always as identity primary key, activity_id uuid not null default gen_random_uuid() unique,
  review_id uuid references public.compliance_agent_reviews(id) on delete set null,
  actor_type public.audit_actor_type not null, actor_id uuid references auth.users(id) on delete set null,
  action text not null, evidence jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default statement_timestamp(),
  constraint compliance_activity_evidence_object check (jsonb_typeof(evidence)='object')
);
create index compliance_activity_timeline_idx on private.compliance_agent_activity(occurred_at desc,id desc);
create index compliance_activity_review_idx on private.compliance_agent_activity(review_id) where review_id is not null;
create index compliance_activity_actor_idx on private.compliance_agent_activity(actor_id) where actor_id is not null;

alter table public.compliance_agent_reviews enable row level security; alter table public.compliance_agent_reviews force row level security;
alter table public.compliance_agent_tasks enable row level security; alter table public.compliance_agent_tasks force row level security;
alter table public.compliance_agent_approvals enable row level security; alter table public.compliance_agent_approvals force row level security;
alter table public.compliance_agent_automations enable row level security; alter table public.compliance_agent_automations force row level security;
alter table public.compliance_agent_connections enable row level security; alter table public.compliance_agent_connections force row level security;
alter table public.compliance_agent_reports enable row level security; alter table public.compliance_agent_reports force row level security;
alter table private.compliance_agent_activity enable row level security; alter table private.compliance_agent_activity force row level security;

revoke all on public.compliance_agent_reviews,public.compliance_agent_tasks,public.compliance_agent_approvals,public.compliance_agent_automations,public.compliance_agent_connections,public.compliance_agent_reports from public,anon,authenticated;
revoke all on private.compliance_agent_activity from public,anon,authenticated,service_role;
grant select,insert,update on public.compliance_agent_reviews,public.compliance_agent_tasks,public.compliance_agent_approvals to authenticated;
grant select on public.compliance_agent_reports to authenticated;
grant select,insert,update on public.compliance_agent_automations,public.compliance_agent_connections to authenticated;

create function private.is_step_17_6_compliance_admin(p_owner_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role in ('kyc_risk'::public.app_role,'finance'::public.app_role))));
$$;
revoke all on function private.is_step_17_6_compliance_admin(boolean) from public,anon,authenticated,service_role;
grant execute on function private.is_step_17_6_compliance_admin(boolean) to authenticated;

create policy compliance_reviews_read on public.compliance_agent_reviews for select to authenticated using ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_reviews_insert on public.compliance_agent_reviews for insert to authenticated with check (created_by=(select auth.uid()) and (select private.is_step_17_6_compliance_admin(false)));
create policy compliance_reviews_update on public.compliance_agent_reviews for update to authenticated using ((select private.is_step_17_6_compliance_admin(false))) with check ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_tasks_read on public.compliance_agent_tasks for select to authenticated using ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_tasks_insert on public.compliance_agent_tasks for insert to authenticated with check (created_by=(select auth.uid()) and (select private.is_step_17_6_compliance_admin(false)));
create policy compliance_tasks_update on public.compliance_agent_tasks for update to authenticated using ((select private.is_step_17_6_compliance_admin(false))) with check ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_approvals_read on public.compliance_agent_approvals for select to authenticated using ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_approvals_request on public.compliance_agent_approvals for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and (select private.is_step_17_6_compliance_admin(false)));
create policy compliance_approvals_owner_decide on public.compliance_agent_approvals for update to authenticated using ((select private.is_step_17_6_compliance_admin(true))) with check (decided_by=(select auth.uid()) and status in ('approved','rejected','cancelled') and (select private.is_step_17_6_compliance_admin(true)));
create policy compliance_automations_read on public.compliance_agent_automations for select to authenticated using ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_automations_owner_insert on public.compliance_agent_automations for insert to authenticated with check (created_by=(select auth.uid()) and automatic_decision=false and (select private.is_step_17_6_compliance_admin(true)));
create policy compliance_automations_owner_update on public.compliance_agent_automations for update to authenticated using ((select private.is_step_17_6_compliance_admin(true))) with check (automatic_decision=false and (select private.is_step_17_6_compliance_admin(true)));
create policy compliance_connections_read on public.compliance_agent_connections for select to authenticated using ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_connections_owner_insert on public.compliance_agent_connections for insert to authenticated with check (configured_by=(select auth.uid()) and (select private.is_step_17_6_compliance_admin(true)));
create policy compliance_connections_owner_update on public.compliance_agent_connections for update to authenticated using ((select private.is_step_17_6_compliance_admin(true))) with check ((select private.is_step_17_6_compliance_admin(true)));
create policy compliance_reports_read on public.compliance_agent_reports for select to authenticated using ((select private.is_step_17_6_compliance_admin(false)));
create policy compliance_activity_deny_client on private.compliance_agent_activity as restrictive for all to anon,authenticated using(false) with check(false);

create function private.reject_compliance_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$ begin raise exception 'compliance activity is append-only'; end; $$;
revoke all on function private.reject_compliance_activity_mutation() from public,anon,authenticated,service_role;
create trigger compliance_activity_immutable before update or delete on private.compliance_agent_activity for each row execute function private.reject_compliance_activity_mutation();

comment on table public.compliance_agent_reviews is 'Step 17.6 supervised compliance work. It does not replace authoritative KYC, consent, ledger, accounting or statutory records.';
comment on table public.compliance_agent_approvals is 'Human authorization requests only. Agent recommendations never constitute a final KYC, legal or financial decision.';
