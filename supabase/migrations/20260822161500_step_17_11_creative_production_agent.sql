-- Step 17.11: supervised Creative Production Agent orchestration.
create table public.creative_agent_requests (
  id uuid primary key default gen_random_uuid(), request_ref text not null unique, title text not null,
  creative_type text not null check (creative_type in ('graphic','video','motion','mixed')),
  assigned_specialist text check (assigned_specialist in ('Graphic Design','Video & Motion')),
  brief jsonb not null default '{}'::jsonb check (jsonb_typeof(brief)='object'),
  status text not null default 'draft' check (status in ('draft','ready','in_production','in_review','awaiting_approval','approved','completed','blocked','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index creative_requests_queue_idx on public.creative_agent_requests(status,priority,due_at);
create index creative_requests_created_by_idx on public.creative_agent_requests(created_by);

create table public.creative_agent_assets (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.creative_agent_requests(id) on delete restrict,
  asset_type text not null check (asset_type in ('design_draft','design_master','storyboard','video_draft','video_master','caption','export_package')),
  storage_object_ref text not null, mime_type text not null, checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  version integer not null default 1 check (version>0), status text not null default 'draft' check (status in ('draft','review','approved','superseded','blocked','archived')),
  rights_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(rights_metadata)='object'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(), unique(request_id,asset_type,version)
);
create index creative_assets_request_idx on public.creative_agent_assets(request_id,created_at desc);
create index creative_assets_status_idx on public.creative_agent_assets(status,asset_type);
create index creative_assets_created_by_idx on public.creative_agent_assets(created_by);

create table public.creative_agent_tasks (
  id uuid primary key default gen_random_uuid(), request_id uuid references public.creative_agent_requests(id) on delete restrict,
  title text not null, assigned_target text not null check (assigned_target in ('Creative Production Agent','Graphic Design','Video & Motion')),
  priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'queued' check (status in ('queued','running','rendering','waiting_human','waiting_asset','completed','failed','escalated','cancelled')),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary)='object'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index creative_tasks_queue_idx on public.creative_agent_tasks(status,priority,due_at);
create index creative_tasks_request_idx on public.creative_agent_tasks(request_id) where request_id is not null;
create index creative_tasks_created_by_idx on public.creative_agent_tasks(created_by);

create table public.creative_agent_approvals (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.creative_agent_requests(id) on delete restrict,
  asset_id uuid references public.creative_agent_assets(id) on delete restrict,
  approval_type text not null check (approval_type in ('brief','brand','content','compliance','rights','final_asset','publish_release','brand_master_change','bulk_action')),
  evidence_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_summary)='object'), recommendation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested','cancelled','expired')),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict, decision_reason text,
  requested_at timestamptz not null default statement_timestamp(), decided_at timestamptz,
  check ((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null))
);
create index creative_approvals_queue_idx on public.creative_agent_approvals(status,requested_at);
create index creative_approvals_request_idx on public.creative_agent_approvals(request_id);
create index creative_approvals_asset_idx on public.creative_agent_approvals(asset_id) where asset_id is not null;

create table public.creative_agent_automations (
  id uuid primary key default gen_random_uuid(), automation_key text not null unique, name text not null,
  trigger_type text not null check (trigger_type in ('asset_upload','asset_revision','render_complete','deadline','schedule')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration)='object'),
  status text not null default 'draft' check (status in ('draft','pending_approval','active','paused','archived')),
  automatic_publish boolean not null default false check (automatic_publish=false), automatic_self_approval boolean not null default false check (automatic_self_approval=false),
  automatic_brand_master_change boolean not null default false check (automatic_brand_master_change=false), automatic_media_licensing boolean not null default false check (automatic_media_licensing=false),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz, updated_at timestamptz not null default statement_timestamp(),
  check (status<>'active' or (approved_by is not null and approved_at is not null))
);
create index creative_automations_created_by_idx on public.creative_agent_automations(created_by);
create index creative_automations_approved_by_idx on public.creative_agent_automations(approved_by) where approved_by is not null;

create table public.creative_agent_reports (
  id uuid primary key default gen_random_uuid(), report_type text not null check (report_type in ('production_status','asset_throughput','revision_time','approval_time','brand_exceptions','rights_exceptions','subagent_quality')),
  period_start timestamptz not null, period_end timestamptz not null, summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary)='object'),
  status text not null default 'generated' check (status in ('generated','reviewed','delivered','superseded')),
  generated_at timestamptz not null default statement_timestamp(), check (period_end>period_start)
);
create index creative_reports_period_idx on public.creative_agent_reports(report_type,period_end desc);

create table private.creative_agent_activity (
  id bigint generated always as identity primary key, activity_id uuid not null default gen_random_uuid() unique,
  request_id uuid references public.creative_agent_requests(id) on delete set null, asset_id uuid references public.creative_agent_assets(id) on delete set null,
  actor_type public.audit_actor_type not null, actor_id uuid references auth.users(id) on delete set null,
  action text not null, evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'), occurred_at timestamptz not null default statement_timestamp()
);
create index creative_activity_timeline_idx on private.creative_agent_activity(occurred_at desc,id desc);
create index creative_activity_request_idx on private.creative_agent_activity(request_id) where request_id is not null;
create index creative_activity_asset_idx on private.creative_agent_activity(asset_id) where asset_id is not null;

alter table public.creative_agent_requests enable row level security; alter table public.creative_agent_requests force row level security;
alter table public.creative_agent_assets enable row level security; alter table public.creative_agent_assets force row level security;
alter table public.creative_agent_tasks enable row level security; alter table public.creative_agent_tasks force row level security;
alter table public.creative_agent_approvals enable row level security; alter table public.creative_agent_approvals force row level security;
alter table public.creative_agent_automations enable row level security; alter table public.creative_agent_automations force row level security;
alter table public.creative_agent_reports enable row level security; alter table public.creative_agent_reports force row level security;
alter table private.creative_agent_activity enable row level security; alter table private.creative_agent_activity force row level security;
revoke all on public.creative_agent_requests,public.creative_agent_assets,public.creative_agent_tasks,public.creative_agent_approvals,public.creative_agent_automations,public.creative_agent_reports from public,anon,authenticated;
revoke all on private.creative_agent_activity from public,anon,authenticated,service_role;
grant select,insert,update on public.creative_agent_requests,public.creative_agent_assets,public.creative_agent_tasks,public.creative_agent_approvals,public.creative_agent_automations to authenticated;
grant select on public.creative_agent_reports to authenticated;

create function private.is_step_17_11_creative_admin(p_owner_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role in ('content'::public.app_role,'analyst'::public.app_role))));
$$;
revoke all on function private.is_step_17_11_creative_admin(boolean) from public,anon,authenticated,service_role;
grant execute on function private.is_step_17_11_creative_admin(boolean) to authenticated;
create policy creative_requests_read on public.creative_agent_requests for select to authenticated using ((select private.is_step_17_11_creative_admin(false)));
create policy creative_requests_write on public.creative_agent_requests for all to authenticated using ((select private.is_step_17_11_creative_admin(false))) with check (created_by=(select auth.uid()) and status not in ('approved','completed') and (select private.is_step_17_11_creative_admin(false)));
create policy creative_assets_read on public.creative_agent_assets for select to authenticated using ((select private.is_step_17_11_creative_admin(false)));
create policy creative_assets_write on public.creative_agent_assets for all to authenticated using ((select private.is_step_17_11_creative_admin(false))) with check (created_by=(select auth.uid()) and status<>'approved' and (select private.is_step_17_11_creative_admin(false)));
create policy creative_tasks_read on public.creative_agent_tasks for select to authenticated using ((select private.is_step_17_11_creative_admin(false)));
create policy creative_tasks_write on public.creative_agent_tasks for all to authenticated using ((select private.is_step_17_11_creative_admin(false))) with check (created_by=(select auth.uid()) and (select private.is_step_17_11_creative_admin(false)));
create policy creative_approvals_read on public.creative_agent_approvals for select to authenticated using ((select private.is_step_17_11_creative_admin(false)));
create policy creative_approvals_request on public.creative_agent_approvals for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and (select private.is_step_17_11_creative_admin(false)));
create policy creative_approvals_owner_decide on public.creative_agent_approvals for update to authenticated using ((select private.is_step_17_11_creative_admin(true))) with check (decided_by=(select auth.uid()) and status in ('approved','rejected','changes_requested','cancelled') and (select private.is_step_17_11_creative_admin(true)));
create policy creative_automations_read on public.creative_agent_automations for select to authenticated using ((select private.is_step_17_11_creative_admin(false)));
create policy creative_automations_owner_write on public.creative_agent_automations for all to authenticated using ((select private.is_step_17_11_creative_admin(true))) with check (created_by=(select auth.uid()) and not automatic_publish and not automatic_self_approval and not automatic_brand_master_change and not automatic_media_licensing and (select private.is_step_17_11_creative_admin(true)));
create policy creative_reports_read on public.creative_agent_reports for select to authenticated using ((select private.is_step_17_11_creative_admin(false)));
create policy creative_activity_deny_client on private.creative_agent_activity as restrictive for all to anon,authenticated using(false) with check(false);
create function private.reject_creative_agent_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$ begin raise exception 'creative agent activity is append-only'; end; $$;
revoke all on function private.reject_creative_agent_activity_mutation() from public,anon,authenticated,service_role;
create trigger creative_agent_activity_immutable before update or delete on private.creative_agent_activity for each row execute function private.reject_creative_agent_activity_mutation();
comment on table public.creative_agent_assets is 'Step 17.11 versioned asset metadata; binaries remain in controlled storage and release requires human approval.';
comment on table public.creative_agent_approvals is 'Human creative decisions; agents cannot approve, license or release their own assets.';
