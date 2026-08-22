-- Step 17.12: supervised Social Media Agent orchestration.
create table public.social_agent_accounts (
  id uuid primary key default gen_random_uuid(), platform text not null, account_ref text not null, display_name text not null,
  permission_scope text[] not null default '{}', status text not null default 'draft' check (status in ('draft','connected','degraded','paused','revoked')),
  credential_vault_ref text, created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(), unique(platform,account_ref)
);
create index social_accounts_status_idx on public.social_agent_accounts(status,platform);
create index social_accounts_created_by_idx on public.social_agent_accounts(created_by);

create table public.social_agent_posts (
  id uuid primary key default gen_random_uuid(), post_ref text not null unique, account_id uuid not null references public.social_agent_accounts(id) on delete restrict,
  content_item_id uuid references public.content_agent_items(id) on delete restrict, post_body text not null, asset_refs text[] not null default '{}', destination_urls text[] not null default '{}',
  version integer not null default 1 check (version>0), status text not null default 'draft' check (status in ('draft','review','awaiting_approval','approved','scheduled','published','failed','cancelled','archived')),
  scheduled_for timestamptz, published_at timestamptz, created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(), check (status<>'published' or published_at is not null)
);
create index social_posts_calendar_idx on public.social_agent_posts(scheduled_for,status) where scheduled_for is not null;
create index social_posts_account_idx on public.social_agent_posts(account_id,created_at desc);
create index social_posts_created_by_idx on public.social_agent_posts(created_by);

create table public.social_agent_conversations (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.social_agent_accounts(id) on delete restrict,
  platform_conversation_hash text not null check (platform_conversation_hash ~ '^[0-9a-f]{64}$'), category text not null check (category in ('general','support','complaint','risk','privacy','abuse','praise')),
  risk_level text not null default 'normal' check (risk_level in ('low','normal','high','critical')), status text not null default 'open' check (status in ('open','classified','draft_ready','waiting_human','handed_off','resolved','closed')),
  reply_draft text, evidence_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_summary)='object'),
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(), unique(account_id,platform_conversation_hash)
);
create index social_conversations_queue_idx on public.social_agent_conversations(status,risk_level,updated_at desc);
create index social_conversations_account_idx on public.social_agent_conversations(account_id,created_at desc);

create table public.social_agent_tasks (
  id uuid primary key default gen_random_uuid(), post_id uuid references public.social_agent_posts(id) on delete restrict, conversation_id uuid references public.social_agent_conversations(id) on delete restrict,
  title text not null, priority text not null default 'normal' check (priority in ('low','normal','high','critical')),
  status text not null default 'queued' check (status in ('queued','running','waiting_human','waiting_content','completed','failed','escalated','cancelled')),
  result_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(result_summary)='object'), created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  due_at timestamptz, completed_at timestamptz, created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp()
);
create index social_tasks_queue_idx on public.social_agent_tasks(status,priority,due_at);
create index social_tasks_created_by_idx on public.social_agent_tasks(created_by);

create table public.social_agent_approvals (
  id uuid primary key default gen_random_uuid(), post_id uuid references public.social_agent_posts(id) on delete restrict, conversation_id uuid references public.social_agent_conversations(id) on delete restrict,
  approval_type text not null check (approval_type in ('publish_post','public_reply','hide_comment','delete_comment','account_change','paid_promotion','bulk_action')),
  evidence_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_summary)='object'), recommendation text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested','cancelled','expired')),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict, decided_by uuid references auth.users(id) on delete restrict, decision_reason text,
  requested_at timestamptz not null default statement_timestamp(), decided_at timestamptz,
  check (post_id is not null or conversation_id is not null), check ((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null))
);
create index social_approvals_queue_idx on public.social_agent_approvals(status,requested_at);
create index social_approvals_requested_by_idx on public.social_agent_approvals(requested_by);

create table public.social_agent_automations (
  id uuid primary key default gen_random_uuid(), automation_key text not null unique, name text not null,
  trigger_type text not null check (trigger_type in ('conversation_sync','conversation_ingest','post_change','approval_reminder','schedule')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration)='object'), status text not null default 'draft' check (status in ('draft','pending_approval','active','paused','archived')),
  automatic_publish boolean not null default false check (automatic_publish=false), automatic_public_reply boolean not null default false check (automatic_public_reply=false),
  automatic_comment_removal boolean not null default false check (automatic_comment_removal=false), automatic_account_change boolean not null default false check (automatic_account_change=false), automatic_paid_promotion boolean not null default false check (automatic_paid_promotion=false),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict, approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz, updated_at timestamptz not null default statement_timestamp(),
  check (status<>'active' or (approved_by is not null and approved_at is not null))
);
create index social_automations_created_by_idx on public.social_agent_automations(created_by);

create table public.social_agent_reports (
  id uuid primary key default gen_random_uuid(), report_type text not null check (report_type in ('publishing_readiness','conversation_escalations','channel_performance','reply_quality','account_health')),
  period_start timestamptz not null, period_end timestamptz not null, summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary)='object'),
  status text not null default 'generated' check (status in ('generated','reviewed','delivered','superseded')), generated_at timestamptz not null default statement_timestamp(), check (period_end>period_start)
);
create index social_reports_period_idx on public.social_agent_reports(report_type,period_end desc);

create table private.social_agent_activity (
  id bigint generated always as identity primary key, activity_id uuid not null default gen_random_uuid() unique,
  post_id uuid references public.social_agent_posts(id) on delete set null, conversation_id uuid references public.social_agent_conversations(id) on delete set null,
  actor_type public.audit_actor_type not null, actor_id uuid references auth.users(id) on delete set null, action text not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'), occurred_at timestamptz not null default statement_timestamp()
);
create index social_activity_timeline_idx on private.social_agent_activity(occurred_at desc,id desc);

alter table public.social_agent_accounts enable row level security; alter table public.social_agent_accounts force row level security;
alter table public.social_agent_posts enable row level security; alter table public.social_agent_posts force row level security;
alter table public.social_agent_conversations enable row level security; alter table public.social_agent_conversations force row level security;
alter table public.social_agent_tasks enable row level security; alter table public.social_agent_tasks force row level security;
alter table public.social_agent_approvals enable row level security; alter table public.social_agent_approvals force row level security;
alter table public.social_agent_automations enable row level security; alter table public.social_agent_automations force row level security;
alter table public.social_agent_reports enable row level security; alter table public.social_agent_reports force row level security;
alter table private.social_agent_activity enable row level security; alter table private.social_agent_activity force row level security;
revoke all on public.social_agent_accounts,public.social_agent_posts,public.social_agent_conversations,public.social_agent_tasks,public.social_agent_approvals,public.social_agent_automations,public.social_agent_reports from public,anon,authenticated;
revoke all on private.social_agent_activity from public,anon,authenticated,service_role;
grant select,insert,update on public.social_agent_accounts,public.social_agent_posts,public.social_agent_conversations,public.social_agent_tasks,public.social_agent_approvals,public.social_agent_automations to authenticated;
grant select on public.social_agent_reports to authenticated;
create function private.is_step_17_12_social_admin(p_owner_only boolean default false) returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.is_active and r.revoked_at is null and (r.role='owner'::public.app_role or (not p_owner_only and r.role in ('content'::public.app_role,'analyst'::public.app_role))));
$$;
revoke all on function private.is_step_17_12_social_admin(boolean) from public,anon,authenticated,service_role; grant execute on function private.is_step_17_12_social_admin(boolean) to authenticated;
create policy social_accounts_read on public.social_agent_accounts for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_accounts_owner_write on public.social_agent_accounts for all to authenticated using ((select private.is_step_17_12_social_admin(true))) with check (created_by=(select auth.uid()) and (select private.is_step_17_12_social_admin(true)));
create policy social_posts_read on public.social_agent_posts for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_posts_write on public.social_agent_posts for all to authenticated using ((select private.is_step_17_12_social_admin(false))) with check (created_by=(select auth.uid()) and status<>'published' and (select private.is_step_17_12_social_admin(false)));
create policy social_conversations_read on public.social_agent_conversations for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_conversations_update on public.social_agent_conversations for update to authenticated using ((select private.is_step_17_12_social_admin(false))) with check ((select private.is_step_17_12_social_admin(false)));
create policy social_tasks_read on public.social_agent_tasks for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_tasks_write on public.social_agent_tasks for all to authenticated using ((select private.is_step_17_12_social_admin(false))) with check (created_by=(select auth.uid()) and (select private.is_step_17_12_social_admin(false)));
create policy social_approvals_read on public.social_agent_approvals for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_approvals_request on public.social_agent_approvals for insert to authenticated with check (requested_by=(select auth.uid()) and status='pending' and (select private.is_step_17_12_social_admin(false)));
create policy social_approvals_owner_decide on public.social_agent_approvals for update to authenticated using ((select private.is_step_17_12_social_admin(true))) with check (decided_by=(select auth.uid()) and status in ('approved','rejected','changes_requested','cancelled') and (select private.is_step_17_12_social_admin(true)));
create policy social_automations_read on public.social_agent_automations for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_automations_owner_write on public.social_agent_automations for all to authenticated using ((select private.is_step_17_12_social_admin(true))) with check (created_by=(select auth.uid()) and not automatic_publish and not automatic_public_reply and not automatic_comment_removal and not automatic_account_change and not automatic_paid_promotion and (select private.is_step_17_12_social_admin(true)));
create policy social_reports_read on public.social_agent_reports for select to authenticated using ((select private.is_step_17_12_social_admin(false)));
create policy social_activity_deny_client on private.social_agent_activity as restrictive for all to anon,authenticated using(false) with check(false);
create function private.reject_social_agent_activity_mutation() returns trigger language plpgsql security definer set search_path='' as $$ begin raise exception 'social agent activity is append-only'; end; $$;
revoke all on function private.reject_social_agent_activity_mutation() from public,anon,authenticated,service_role;
create trigger social_agent_activity_immutable before update or delete on private.social_agent_activity for each row execute function private.reject_social_agent_activity_mutation();
comment on table public.social_agent_posts is 'Step 17.12 versioned social drafts and schedules; public publishing remains approval gated.';
comment on table public.social_agent_approvals is 'Human decisions for publishing, replies, moderation, account changes and paid promotions.';
