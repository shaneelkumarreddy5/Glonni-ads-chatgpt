-- Step 17.4: Fraud & Risk Agent orchestration records.
-- Existing private.risk_cases, private.risk_signals, private.review_queue_items,
-- public.case_appeals and public.account_restrictions remain the source of truth.
-- These tables coordinate supervised agent work and never authorize enforcement.

create table public.risk_agent_tasks (
  id uuid primary key default gen_random_uuid(),
  risk_case_id uuid,
  appeal_id uuid,
  title text not null,
  assigned_target text not null,
  task_type text not null,
  priority text not null default 'normal',
  status text not null default 'queued',
  due_at timestamptz,
  evidence_summary jsonb not null default '{}'::jsonb,
  recommendation text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint risk_agent_tasks_case_fk foreign key (risk_case_id) references private.risk_cases(risk_case_id) on delete restrict,
  constraint risk_agent_tasks_appeal_fk foreign key (appeal_id) references public.case_appeals(appeal_id) on delete restrict,
  constraint risk_agent_tasks_one_subject check ((risk_case_id is not null)::int + (appeal_id is not null)::int <= 1),
  constraint risk_agent_tasks_title_length check (char_length(title) between 3 and 240),
  constraint risk_agent_tasks_target check (assigned_target in ('Fraud & Risk Agent','Account & Device Investigation','Transaction & Withdrawal Investigation')),
  constraint risk_agent_tasks_type check (task_type in ('account_device','transaction_withdrawal','appeal_evidence','rule_quality','reporting','follow_up')),
  constraint risk_agent_tasks_priority check (priority in ('low','normal','high','critical')),
  constraint risk_agent_tasks_status check (status in ('queued','running','waiting_human','waiting_evidence','completed','failed','escalated','cancelled')),
  constraint risk_agent_tasks_evidence_object check (jsonb_typeof(evidence_summary) = 'object')
);
create index risk_agent_tasks_queue on public.risk_agent_tasks (status, priority, due_at);

create table public.risk_agent_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  name text not null,
  signal_type public.risk_signal_type not null,
  description text not null,
  conditions jsonb not null default '{}'::jsonb,
  severity public.risk_severity not null,
  status text not null default 'draft',
  version integer not null default 1,
  evidence_only boolean not null default true,
  automatic_enforcement boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint risk_agent_rules_key check (rule_key ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  constraint risk_agent_rules_name_length check (char_length(name) between 3 and 160),
  constraint risk_agent_rules_description_length check (char_length(description) between 10 and 1000),
  constraint risk_agent_rules_conditions_object check (jsonb_typeof(conditions) = 'object'),
  constraint risk_agent_rules_status check (status in ('draft','pending_approval','active','paused','archived')),
  constraint risk_agent_rules_version check (version > 0),
  constraint risk_agent_rules_no_enforcement check (automatic_enforcement = false),
  constraint risk_agent_rules_activation check (status <> 'active' or (approved_by is not null and approved_at is not null))
);

create table public.risk_agent_approvals (
  id uuid primary key default gen_random_uuid(),
  risk_case_id uuid references private.risk_cases(risk_case_id) on delete restrict,
  appeal_id uuid references public.case_appeals(appeal_id) on delete restrict,
  approval_type text not null,
  requested_action text not null,
  evidence_summary jsonb not null default '{}'::jsonb,
  recommendation text not null,
  risk_level public.risk_severity not null,
  status text not null default 'pending',
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict,
  decision_reason text,
  requested_at timestamptz not null default statement_timestamp(),
  decided_at timestamptz,
  constraint risk_agent_approvals_one_subject check ((risk_case_id is not null)::int + (appeal_id is not null)::int = 1),
  constraint risk_agent_approvals_type check (approval_type in ('monitor_account','temporary_restriction','withdrawal_hold','withdrawal_release','appeal_outcome','kyc_outcome','account_closure','rule_activation','bulk_action')),
  constraint risk_agent_approvals_status check (status in ('pending','approved','rejected','cancelled','expired')),
  constraint risk_agent_approvals_evidence_object check (jsonb_typeof(evidence_summary) = 'object'),
  constraint risk_agent_approvals_decision_consistency check ((status = 'pending' and decided_by is null and decided_at is null) or (status <> 'pending' and decided_by is not null and decided_at is not null))
);
create index risk_agent_approvals_queue on public.risk_agent_approvals (status, risk_level, requested_at);

create table public.risk_agent_automations (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null unique,
  name text not null,
  trigger_type text not null,
  schedule_expression text,
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  automatic_enforcement boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  constraint risk_agent_automations_key check (automation_key ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  constraint risk_agent_automations_trigger check (trigger_type in ('verified_signal','review_deadline','schedule','provider_callback','appeal_submitted','rule_quality')),
  constraint risk_agent_automations_status check (status in ('draft','pending_approval','active','paused','archived')),
  constraint risk_agent_automations_configuration_object check (jsonb_typeof(configuration) = 'object'),
  constraint risk_agent_automations_no_enforcement check (automatic_enforcement = false),
  constraint risk_agent_automations_activation check (status <> 'active' or (approved_by is not null and approved_at is not null))
);

create table public.risk_agent_connections (
  id uuid primary key default gen_random_uuid(),
  connection_key text not null unique,
  provider_type text not null,
  display_name text not null,
  status text not null default 'disconnected',
  evidence_scope jsonb not null default '[]'::jsonb,
  public_configuration jsonb not null default '{}'::jsonb,
  secret_reference text,
  webhook_signature_required boolean not null default true,
  last_health_check_at timestamptz,
  configured_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  constraint risk_agent_connections_key check (connection_key ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  constraint risk_agent_connections_provider check (provider_type in ('device_intelligence','payment_fraud','offerwall','withdrawal_processor','identity','custom_webhook')),
  constraint risk_agent_connections_status check (status in ('disconnected','pending','connected','degraded','error','paused')),
  constraint risk_agent_connections_scope_array check (jsonb_typeof(evidence_scope) = 'array'),
  constraint risk_agent_connections_public_object check (jsonb_typeof(public_configuration) = 'object'),
  constraint risk_agent_connections_secret_reference check (secret_reference is null or secret_reference ~ '^(vault|env|kms)://')
);

create table public.risk_agent_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'generated',
  generated_at timestamptz not null default statement_timestamp(),
  constraint risk_agent_reports_type check (report_type in ('daily_summary','weekly_patterns','false_positive','withdrawal_abuse','device_linkage','appeals','rule_performance','subagent_quality')),
  constraint risk_agent_reports_period check (period_end > period_start),
  constraint risk_agent_reports_summary_object check (jsonb_typeof(summary) = 'object'),
  constraint risk_agent_reports_status check (status in ('generated','reviewed','delivered','superseded'))
);
create index risk_agent_reports_period on public.risk_agent_reports (report_type, period_end desc);

create table private.risk_agent_activity (
  id bigint generated always as identity primary key,
  activity_id uuid not null default gen_random_uuid() unique,
  actor_type public.audit_actor_type not null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint risk_agent_activity_action_length check (char_length(action) between 3 and 160),
  constraint risk_agent_activity_resource_length check (char_length(resource_type) between 2 and 80),
  constraint risk_agent_activity_evidence_object check (jsonb_typeof(evidence) = 'object')
);
create index risk_agent_activity_timeline on private.risk_agent_activity (occurred_at desc, id desc);

alter table public.risk_agent_tasks enable row level security; alter table public.risk_agent_tasks force row level security;
alter table public.risk_agent_rules enable row level security; alter table public.risk_agent_rules force row level security;
alter table public.risk_agent_approvals enable row level security; alter table public.risk_agent_approvals force row level security;
alter table public.risk_agent_automations enable row level security; alter table public.risk_agent_automations force row level security;
alter table public.risk_agent_connections enable row level security; alter table public.risk_agent_connections force row level security;
alter table public.risk_agent_reports enable row level security; alter table public.risk_agent_reports force row level security;
alter table private.risk_agent_activity enable row level security; alter table private.risk_agent_activity force row level security;

revoke all on public.risk_agent_tasks, public.risk_agent_rules, public.risk_agent_approvals, public.risk_agent_automations, public.risk_agent_connections, public.risk_agent_reports from public, anon, authenticated;
revoke all on private.risk_agent_activity from public, anon, authenticated, service_role;
grant select, insert, update on public.risk_agent_tasks, public.risk_agent_approvals to authenticated;
grant select on public.risk_agent_reports to authenticated;
grant select, insert, update on public.risk_agent_rules, public.risk_agent_automations, public.risk_agent_connections to authenticated;

create function private.is_step_17_4_risk_admin(p_owner_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.jwt() ->> 'aal') = 'aal2' and exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null
      and (r.role = 'owner'::public.app_role or (not p_owner_only and r.role = 'kyc_risk'::public.app_role))
  );
$$;
revoke all on function private.is_step_17_4_risk_admin(boolean) from public, anon, authenticated, service_role;
grant execute on function private.is_step_17_4_risk_admin(boolean) to authenticated;

create policy risk_agent_tasks_read on public.risk_agent_tasks for select to authenticated using ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_tasks_insert on public.risk_agent_tasks for insert to authenticated with check (created_by = (select auth.uid()) and (select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_tasks_update on public.risk_agent_tasks for update to authenticated using ((select private.is_step_17_4_risk_admin(false))) with check ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_rules_read on public.risk_agent_rules for select to authenticated using ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_rules_owner_insert on public.risk_agent_rules for insert to authenticated with check (created_by = (select auth.uid()) and automatic_enforcement = false and (select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_rules_owner_update on public.risk_agent_rules for update to authenticated using ((select private.is_step_17_4_risk_admin(true))) with check (automatic_enforcement = false and (select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_approvals_read on public.risk_agent_approvals for select to authenticated using ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_approvals_request on public.risk_agent_approvals for insert to authenticated with check (requested_by = (select auth.uid()) and status = 'pending' and (select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_approvals_owner_decide on public.risk_agent_approvals for update to authenticated using ((select private.is_step_17_4_risk_admin(true))) with check (decided_by = (select auth.uid()) and status in ('approved','rejected','cancelled') and (select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_automations_read on public.risk_agent_automations for select to authenticated using ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_automations_owner_insert on public.risk_agent_automations for insert to authenticated with check (created_by = (select auth.uid()) and automatic_enforcement = false and (select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_automations_owner_update on public.risk_agent_automations for update to authenticated using ((select private.is_step_17_4_risk_admin(true))) with check (automatic_enforcement = false and (select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_connections_read on public.risk_agent_connections for select to authenticated using ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_connections_owner_insert on public.risk_agent_connections for insert to authenticated with check (configured_by = (select auth.uid()) and (select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_connections_owner_update on public.risk_agent_connections for update to authenticated using ((select private.is_step_17_4_risk_admin(true))) with check ((select private.is_step_17_4_risk_admin(true)));
create policy risk_agent_reports_read on public.risk_agent_reports for select to authenticated using ((select private.is_step_17_4_risk_admin(false)));
create policy risk_agent_activity_deny_client on private.risk_agent_activity as restrictive for all to anon, authenticated using (false) with check (false);

create function private.protect_risk_agent_activity()
returns trigger language plpgsql security definer set search_path = '' as $$ begin raise exception 'fraud and risk agent activity is append-only'; end; $$;
create trigger risk_agent_activity_immutable before update or delete on private.risk_agent_activity for each row execute function private.protect_risk_agent_activity();
revoke all on function private.protect_risk_agent_activity() from public, anon, authenticated, service_role;

create function private.prepare_step_17_4_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.created_by := old.created_by;
  if to_jsonb(new) ? 'created_at' then new.created_at := old.created_at; end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
revoke all on function private.prepare_step_17_4_update() from public, anon, authenticated, service_role;
create trigger risk_agent_tasks_prepare_update before update on public.risk_agent_tasks for each row execute function private.prepare_step_17_4_update();
create trigger risk_agent_rules_prepare_update before update on public.risk_agent_rules for each row execute function private.prepare_step_17_4_update();
