-- Step 17.9: supervised Affiliate & Shop Agent orchestration.
-- Step 16 providers, merchants, clicks, conversions, rewards and ledgers remain authoritative.
create table public.affiliate_agent_cases (
  id uuid primary key default gen_random_uuid(), case_ref text not null unique,
  case_type text not null check (case_type in ('provider_connection','feed_quality','catalog_quality','deal_ranking','tracking_exception','commission_exception')),
  provider_id bigint references private.commerce_providers(id) on delete restrict,
  merchant_id bigint references private.affiliate_merchants(id) on delete restrict,
  click_id bigint references private.affiliate_clicks(id) on delete restrict,
  conversion_id bigint references private.affiliate_conversions(id) on delete restrict,
  status text not null default 'open' check (status in ('open','investigating','waiting_provider','awaiting_approval','resolved','closed')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  assigned_specialist text check (assigned_specialist in ('Provider Connection','Product Feed','Catalog Quality','Deal Ranking','Tracking Link','Commission Reconciliation')),
  evidence_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_summary)='object'),
  recommendation jsonb not null default '{}'::jsonb check (jsonb_typeof(recommendation)='object'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index affiliate_agent_cases_queue_idx on public.affiliate_agent_cases(status,severity,due_at);
create index affiliate_agent_cases_provider_idx on public.affiliate_agent_cases(provider_id) where provider_id is not null;
create index affiliate_agent_cases_merchant_idx on public.affiliate_agent_cases(merchant_id) where merchant_id is not null;
create index affiliate_agent_cases_click_idx on public.affiliate_agent_cases(click_id) where click_id is not null;
create index affiliate_agent_cases_conversion_idx on public.affiliate_agent_cases(conversion_id) where conversion_id is not null;
create index affiliate_agent_cases_created_by_idx on public.affiliate_agent_cases(created_by);

create table public.affiliate_agent_tasks (
  id uuid primary key default gen_random_uuid(), case_id uuid references public.affiliate_agent_cases(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 240),
  assigned_target text not null check (assigned_target in ('Affiliate & Shop Agent','Provider Connection','Product Feed','Catalog Quality','Deal Ranking','Tracking Link','Commission Reconciliation')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'queued' check (status in ('queued','running','waiting_human','waiting_provider','completed','failed','escalated','cancelled')),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary)='object'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index affiliate_agent_tasks_queue_idx on public.affiliate_agent_tasks(status,priority,due_at);
create index affiliate_agent_tasks_case_idx on public.affiliate_agent_tasks(case_id) where case_id is not null;
create index affiliate_agent_tasks_created_by_idx on public.affiliate_agent_tasks(created_by);

create table public.affiliate_agent_approvals (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.affiliate_agent_cases(id) on delete restrict,
  approval_type text not null check (approval_type in ('provider_activation','feed_activation','catalog_publish','store_publish','deal_publish','ranking_override','tracking_domain_change','commission_exception','cashback_change','bulk_action')),
  requested_action text not null, evidence_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_summary)='object'), recommendation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','expired')),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict, decision_reason text,
  requested_at timestamptz not null default statement_timestamp(), decided_at timestamptz,
  check ((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null))
);
create index affiliate_agent_approvals_queue_idx on public.affiliate_agent_approvals(status,requested_at);
create index affiliate_agent_approvals_case_idx on public.affiliate_agent_approvals(case_id);
create index affiliate_agent_approvals_requested_by_idx on public.affiliate_agent_approvals(requested_by);
create index affiliate_agent_approvals_decided_by_idx on public.affiliate_agent_approvals(decided_by) where decided_by is not null;

create table public.affiliate_agent_automations (
  id uuid primary key default gen_random_uuid(), automation_key text not null unique, name text not null,
  trigger_type text not null check (trigger_type in ('provider_health','feed_freshness','catalog_quality','link_health','conversion_mismatch','schedule')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration)='object'),
  status text not null default 'draft' check (status in ('draft','pending_approval','active','paused','archived')),
  automatic_provider_activation boolean not null default false check (automatic_provider_activation=false),
  automatic_catalog_publish boolean not null default false check (automatic_catalog_publish=false),
  automatic_tracking_redirect_change boolean not null default false check (automatic_tracking_redirect_change=false),
  automatic_commission_adjustment boolean not null default false check (automatic_commission_adjustment=false),
  automatic_wallet_credit boolean not null default false check (automatic_wallet_credit=false),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz, updated_at timestamptz not null default statement_timestamp(),
  check (status<>'active' or (approved_by is not null and approved_at is not null))
);
create index affiliate_agent_automations_created_by_idx on public.affiliate_agent_automations(created_by);
create index affiliate_agent_automations_approved_by_idx on public.affiliate_agent_automations(approved_by) where approved_by is not null;

create table public.affiliate_agent_reports (
  id uuid primary key default gen_random_uuid(), report_type text not null check (report_type in ('provider_health','feed_health','catalog_quality','deal_performance','click_quality','commission_exceptions','subagent_quality')),
  period_start timestamptz not null, period_end timestamptz not null,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary)='object'),
  status text not null default 'generated' check (status in ('generated','reviewed','delivered','superseded')),
  generated_at timestamptz not null default statement_timestamp(), check (period_end>period_start)
);
create index affiliate_agent_reports_period_idx on public.affiliate_agent_reports(report_type,period_end desc);

create table private.affiliate_agent_activity (
  id bigint generated always as identity primary key, activity_id uuid not null default gen_random_uuid() unique,
  case_id uuid references public.affiliate_agent_cases(id) on delete set null,
  actor_type public.audit_actor_type not null, actor_id uuid references auth.users(id) on delete set null,
  action text not null, evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  occurred_at timestamptz not null default statement_timestamp()
);
create index affiliate_agent_activity_timeline_idx on private.affiliate_agent_activity(occurred_at desc,id desc);
create index affiliate_agent_activity_case_idx on private.affiliate_agent_activity(case_id) where case_id is not null;
create index affiliate_agent_activity_actor_idx on private.affiliate_agent_activity(actor_id) where actor_id is not null;

alter table public.affiliate_agent_cases enable row level security; alter table public.affiliate_agent_cases force row level security;
alter table public.affiliate_agent_tasks enable row level security; alter table public.affiliate_agent_tasks force row level security;
alter table public.affiliate_agent_approvals enable row level security; alter table public.affiliate_agent_approvals force row level security;
alter table public.affiliate_agent_automations enable row level security; alter table public.affiliate_agent_automations force row level security;
alter table public.affiliate_agent_reports enable row level security; alter table public.affiliate_agent_reports force row level security;
alter table private.affiliate_agent_activity enable row level security; alter table private.affiliate_agent_activity force row level security;
revoke all on public.affiliate_agent_cases,public.affiliate_agent_tasks,public.affiliate_agent_approvals,public.affiliate_agent_automations,public.affiliate_agent_reports from public,anon,authenticated;
revoke all on private.affiliate_agent_activity from public,anon,authenticated,service_role;
grant select,insert,update on public.affiliate_agent_cases,public.affiliate_agent_tasks,public.affiliate_agent_approvals,public.affiliate_agent_automations to authenticated;
grant select on public.affiliate_agent_reports to authenticated;

create function private.is_step_17_9_affiliate_admin(p_owner_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role in ('content'::public.app_role,'analyst'::public.app_role))));
$$;
revoke all on function private.is_step_17_9_affiliate_admin(boolean) from public,anon,authenticated,service_role;
grant execute on function private.is_step_17_9_affiliate_admin(boolean) to authenticated;
create policy affiliate_agent_cases_read on public.affiliate_agent_cases for select to authenticated using ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_cases_insert on public.affiliate_agent_cases for insert to authenticated with check (created_by=(select auth.uid()) and (select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_cases_update on public.affiliate_agent_cases for update to authenticated using ((select private.is_step_17_9_affiliate_admin(false))) with check ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_tasks_read on public.affiliate_agent_tasks for select to authenticated using ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_tasks_insert on public.affiliate_agent_tasks for insert to authenticated with check (created_by=(select auth.uid()) and (select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_tasks_update on public.affiliate_agent_tasks for update to authenticated using ((select private.is_step_17_9_affiliate_admin(false))) with check ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_approvals_read on public.affiliate_agent_approvals for select to authenticated using ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_approvals_request on public.affiliate_agent_approvals for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and (select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_approvals_owner_decide on public.affiliate_agent_approvals for update to authenticated using ((select private.is_step_17_9_affiliate_admin(true))) with check (decided_by=(select auth.uid()) and status in ('approved','rejected','cancelled') and (select private.is_step_17_9_affiliate_admin(true)));
create policy affiliate_agent_automations_read on public.affiliate_agent_automations for select to authenticated using ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_automations_owner_insert on public.affiliate_agent_automations for insert to authenticated with check (created_by=(select auth.uid()) and not automatic_provider_activation and not automatic_catalog_publish and not automatic_tracking_redirect_change and not automatic_commission_adjustment and not automatic_wallet_credit and (select private.is_step_17_9_affiliate_admin(true)));
create policy affiliate_agent_automations_owner_update on public.affiliate_agent_automations for update to authenticated using ((select private.is_step_17_9_affiliate_admin(true))) with check (not automatic_provider_activation and not automatic_catalog_publish and not automatic_tracking_redirect_change and not automatic_commission_adjustment and not automatic_wallet_credit and (select private.is_step_17_9_affiliate_admin(true)));
create policy affiliate_agent_reports_read on public.affiliate_agent_reports for select to authenticated using ((select private.is_step_17_9_affiliate_admin(false)));
create policy affiliate_agent_activity_deny_client on private.affiliate_agent_activity as restrictive for all to anon,authenticated using(false) with check(false);

create function private.reject_affiliate_agent_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$ begin raise exception 'affiliate agent activity is append-only'; end; $$;
revoke all on function private.reject_affiliate_agent_activity_mutation() from public,anon,authenticated,service_role;
create trigger affiliate_agent_activity_immutable before update or delete on private.affiliate_agent_activity for each row execute function private.reject_affiliate_agent_activity_mutation();
comment on table public.affiliate_agent_cases is 'Step 17.9 supervised affiliate operations; Step 16 provider, merchant, click, conversion, reward and ledger records remain authoritative.';
comment on table public.affiliate_agent_approvals is 'Human authorization requests only; recommendations never activate providers, publish deals, alter tracking, adjust commissions or credit wallets.';
