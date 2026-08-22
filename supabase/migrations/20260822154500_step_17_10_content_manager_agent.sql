-- Step 17.10: supervised Content Manager Agent orchestration.
create table public.content_agent_sources (
  id uuid primary key default gen_random_uuid(), name text not null, source_type text not null check (source_type in ('brand','internal_policy','campaign','offer','product_feed','legal','external_approved')),
  source_uri text, owner_name text not null, status text not null default 'draft' check (status in ('draft','approved','stale','blocked','archived')),
  permitted_uses text[] not null default '{}', verified_at timestamptz, expires_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index content_sources_status_idx on public.content_agent_sources(status,expires_at);
create index content_sources_created_by_idx on public.content_agent_sources(created_by);

create table public.content_agent_items (
  id uuid primary key default gen_random_uuid(), content_ref text not null unique,
  item_type text not null check (item_type in ('calendar_item','brief','campaign_copy','article','email','push','in_app','help_content','social_copy')),
  title text not null check (char_length(title) between 3 and 240), channel text not null,
  campaign_ref text, content_body text, source_ids uuid[] not null default '{}', version integer not null default 1 check (version>0),
  status text not null default 'draft' check (status in ('draft','in_review','changes_requested','awaiting_approval','approved','scheduled','published','rejected','archived')),
  risk_level text not null default 'normal' check (risk_level in ('low','normal','high','restricted')),
  scheduled_for timestamptz, published_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(),
  check (status<>'published' or published_at is not null)
);
create index content_items_calendar_idx on public.content_agent_items(scheduled_for,status) where scheduled_for is not null;
create index content_items_queue_idx on public.content_agent_items(status,risk_level,updated_at desc);
create index content_items_created_by_idx on public.content_agent_items(created_by);

create table public.content_agent_tasks (
  id uuid primary key default gen_random_uuid(), content_item_id uuid references public.content_agent_items(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 240), priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'queued' check (status in ('queued','running','waiting_human','waiting_source','completed','failed','escalated','cancelled')),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary)='object'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index content_tasks_queue_idx on public.content_agent_tasks(status,priority,due_at);
create index content_tasks_item_idx on public.content_agent_tasks(content_item_id) where content_item_id is not null;
create index content_tasks_created_by_idx on public.content_agent_tasks(created_by);

create table public.content_agent_approvals (
  id uuid primary key default gen_random_uuid(), content_item_id uuid not null references public.content_agent_items(id) on delete restrict,
  approval_type text not null check (approval_type in ('content_review','brand_review','compliance_review','campaign_owner_review','schedule_change','publish','bulk_action')),
  evidence_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_summary)='object'), recommendation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested','cancelled','expired')),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict, decision_reason text,
  requested_at timestamptz not null default statement_timestamp(), decided_at timestamptz,
  check ((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null))
);
create index content_approvals_queue_idx on public.content_agent_approvals(status,requested_at);
create index content_approvals_item_idx on public.content_agent_approvals(content_item_id);
create index content_approvals_requested_by_idx on public.content_agent_approvals(requested_by);
create index content_approvals_decided_by_idx on public.content_agent_approvals(decided_by) where decided_by is not null;

create table public.content_agent_automations (
  id uuid primary key default gen_random_uuid(), automation_key text not null unique, name text not null,
  trigger_type text not null check (trigger_type in ('source_freshness','calendar_deadline','draft_change','approval_reminder','schedule')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration)='object'),
  status text not null default 'draft' check (status in ('draft','pending_approval','active','paused','archived')),
  automatic_publish boolean not null default false check (automatic_publish=false),
  automatic_self_approval boolean not null default false check (automatic_self_approval=false),
  automatic_policy_change boolean not null default false check (automatic_policy_change=false),
  use_unapproved_sources boolean not null default false check (use_unapproved_sources=false),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz, updated_at timestamptz not null default statement_timestamp(),
  check (status<>'active' or (approved_by is not null and approved_at is not null))
);
create index content_automations_created_by_idx on public.content_agent_automations(created_by);
create index content_automations_approved_by_idx on public.content_agent_automations(approved_by) where approved_by is not null;

create table public.content_agent_reports (
  id uuid primary key default gen_random_uuid(), report_type text not null check (report_type in ('publishing_readiness','content_throughput','approval_turnaround','source_freshness','content_quality')),
  period_start timestamptz not null, period_end timestamptz not null,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary)='object'),
  status text not null default 'generated' check (status in ('generated','reviewed','delivered','superseded')),
  generated_at timestamptz not null default statement_timestamp(), check (period_end>period_start)
);
create index content_reports_period_idx on public.content_agent_reports(report_type,period_end desc);

create table private.content_agent_activity (
  id bigint generated always as identity primary key, activity_id uuid not null default gen_random_uuid() unique,
  content_item_id uuid references public.content_agent_items(id) on delete set null,
  actor_type public.audit_actor_type not null, actor_id uuid references auth.users(id) on delete set null,
  action text not null, evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'), occurred_at timestamptz not null default statement_timestamp()
);
create index content_activity_timeline_idx on private.content_agent_activity(occurred_at desc,id desc);
create index content_activity_item_idx on private.content_agent_activity(content_item_id) where content_item_id is not null;
create index content_activity_actor_idx on private.content_agent_activity(actor_id) where actor_id is not null;

alter table public.content_agent_sources enable row level security; alter table public.content_agent_sources force row level security;
alter table public.content_agent_items enable row level security; alter table public.content_agent_items force row level security;
alter table public.content_agent_tasks enable row level security; alter table public.content_agent_tasks force row level security;
alter table public.content_agent_approvals enable row level security; alter table public.content_agent_approvals force row level security;
alter table public.content_agent_automations enable row level security; alter table public.content_agent_automations force row level security;
alter table public.content_agent_reports enable row level security; alter table public.content_agent_reports force row level security;
alter table private.content_agent_activity enable row level security; alter table private.content_agent_activity force row level security;
revoke all on public.content_agent_sources,public.content_agent_items,public.content_agent_tasks,public.content_agent_approvals,public.content_agent_automations,public.content_agent_reports from public,anon,authenticated;
revoke all on private.content_agent_activity from public,anon,authenticated,service_role;
grant select,insert,update on public.content_agent_sources,public.content_agent_items,public.content_agent_tasks,public.content_agent_approvals,public.content_agent_automations to authenticated;
grant select on public.content_agent_reports to authenticated;

create function private.is_step_17_10_content_admin(p_owner_only boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role in ('content'::public.app_role,'analyst'::public.app_role))));
$$;
revoke all on function private.is_step_17_10_content_admin(boolean) from public,anon,authenticated,service_role;
grant execute on function private.is_step_17_10_content_admin(boolean) to authenticated;

create policy content_sources_read on public.content_agent_sources for select to authenticated using ((select private.is_step_17_10_content_admin(false)));
create policy content_sources_write on public.content_agent_sources for all to authenticated using ((select private.is_step_17_10_content_admin(true))) with check (created_by=(select auth.uid()) and (select private.is_step_17_10_content_admin(true)));
create policy content_items_read on public.content_agent_items for select to authenticated using ((select private.is_step_17_10_content_admin(false)));
create policy content_items_insert on public.content_agent_items for insert to authenticated with check (created_by=(select auth.uid()) and status<>'published' and (select private.is_step_17_10_content_admin(false)));
create policy content_items_update on public.content_agent_items for update to authenticated using ((select private.is_step_17_10_content_admin(false))) with check (status<>'published' and (select private.is_step_17_10_content_admin(false)));
create policy content_tasks_read on public.content_agent_tasks for select to authenticated using ((select private.is_step_17_10_content_admin(false)));
create policy content_tasks_insert on public.content_agent_tasks for insert to authenticated with check (created_by=(select auth.uid()) and (select private.is_step_17_10_content_admin(false)));
create policy content_tasks_update on public.content_agent_tasks for update to authenticated using ((select private.is_step_17_10_content_admin(false))) with check ((select private.is_step_17_10_content_admin(false)));
create policy content_approvals_read on public.content_agent_approvals for select to authenticated using ((select private.is_step_17_10_content_admin(false)));
create policy content_approvals_request on public.content_agent_approvals for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and (select private.is_step_17_10_content_admin(false)));
create policy content_approvals_owner_decide on public.content_agent_approvals for update to authenticated using ((select private.is_step_17_10_content_admin(true))) with check (decided_by=(select auth.uid()) and status in ('approved','rejected','changes_requested','cancelled') and (select private.is_step_17_10_content_admin(true)));
create policy content_automations_read on public.content_agent_automations for select to authenticated using ((select private.is_step_17_10_content_admin(false)));
create policy content_automations_owner_write on public.content_agent_automations for all to authenticated using ((select private.is_step_17_10_content_admin(true))) with check (created_by=(select auth.uid()) and not automatic_publish and not automatic_self_approval and not automatic_policy_change and not use_unapproved_sources and (select private.is_step_17_10_content_admin(true)));
create policy content_reports_read on public.content_agent_reports for select to authenticated using ((select private.is_step_17_10_content_admin(false)));
create policy content_activity_deny_client on private.content_agent_activity as restrictive for all to anon,authenticated using(false) with check(false);

create function private.reject_content_agent_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$ begin raise exception 'content agent activity is append-only'; end; $$;
revoke all on function private.reject_content_agent_activity_mutation() from public,anon,authenticated,service_role;
create trigger content_agent_activity_immutable before update or delete on private.content_agent_activity for each row execute function private.reject_content_agent_activity_mutation();
comment on table public.content_agent_items is 'Step 17.10 versioned content drafts and schedules; publication remains an external approval-gated action.';
comment on table public.content_agent_approvals is 'Human content decisions; the Content Manager Agent cannot approve or publish its own work.';
