-- Step 17.3: Support Team Lead operational records.
-- Human admins operate tickets; automated workers use server identities. Financial,
-- KYC, fraud and policy exceptions are represented as approvals, never executed here.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  customer_reference text not null,
  customer_display_name text not null,
  subject text not null,
  category text not null,
  channel text not null default 'in_app',
  language_code text not null default 'en',
  priority text not null default 'normal',
  status text not null default 'new',
  assigned_subagent text,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  sentiment text not null default 'neutral',
  summary text,
  sla_due_at timestamptz not null,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint support_tickets_customer_reference_length check (char_length(customer_reference) between 2 and 160),
  constraint support_tickets_customer_name_length check (char_length(customer_display_name) between 2 and 160),
  constraint support_tickets_subject_length check (char_length(subject) between 3 and 240),
  constraint support_tickets_category check (category in ('account_access','missing_reward','withdrawal','kyc_account','fraud_restriction','technical','complaint_feedback','privacy_safety_legal','other')),
  constraint support_tickets_channel check (channel in ('in_app','email','web_form','phone','messaging','social','app_store')),
  constraint support_tickets_language_code check (language_code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint support_tickets_priority check (priority in ('low','normal','high','critical')),
  constraint support_tickets_status check (status in ('new','classified','investigating','waiting_customer','waiting_department','escalated','resolved','closed','spam')),
  constraint support_tickets_sentiment check (sentiment in ('positive','neutral','negative','distressed')),
  constraint support_tickets_resolution_dates check (resolved_at is null or resolved_at >= created_at),
  constraint support_tickets_close_dates check (closed_at is null or resolved_at is not null)
);

create index support_tickets_queue on public.support_tickets (status, priority, sla_due_at);
create index support_tickets_assignment on public.support_tickets (assigned_subagent, status, updated_at desc);
create index support_tickets_customer on public.support_tickets (customer_reference, created_at desc);

create table public.support_ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  actor_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  visibility text not null default 'customer',
  body text not null,
  provider_message_reference text,
  created_at timestamptz not null default statement_timestamp(),
  constraint support_ticket_messages_actor check (actor_type in ('customer','admin','support_agent','subagent','system')),
  constraint support_ticket_messages_visibility check (visibility in ('customer','internal')),
  constraint support_ticket_messages_body_length check (char_length(body) between 1 and 20000),
  constraint support_ticket_messages_admin_actor check (actor_type <> 'admin' or actor_id is not null)
);
create index support_ticket_messages_timeline on public.support_ticket_messages (ticket_id, created_at, id);

create table public.support_ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  event_type text not null,
  actor_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default statement_timestamp(),
  constraint support_ticket_events_actor check (actor_type in ('admin','support_agent','subagent','system')),
  constraint support_ticket_events_state_objects check (jsonb_typeof(before_state) = 'object' and jsonb_typeof(after_state) = 'object')
);
create index support_ticket_events_timeline on public.support_ticket_events (ticket_id, created_at, id);

create table public.support_tasks (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete restrict,
  title text not null,
  assigned_target text not null,
  priority text not null default 'normal',
  status text not null default 'queued',
  due_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint support_tasks_title_length check (char_length(title) between 3 and 240),
  constraint support_tasks_priority check (priority in ('low','normal','high','critical')),
  constraint support_tasks_status check (status in ('queued','running','waiting','completed','failed','escalated','cancelled')),
  constraint support_tasks_evidence_object check (jsonb_typeof(evidence) = 'object')
);
create index support_tasks_work_queue on public.support_tasks (status, priority, due_at);

create table public.support_approvals (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete restrict,
  approval_type text not null,
  requested_action text not null,
  evidence jsonb not null default '{}'::jsonb,
  recommendation text not null,
  risk_level text not null default 'medium',
  status text not null default 'pending',
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  decided_by uuid references auth.users(id) on delete restrict,
  decision_reason text,
  requested_at timestamptz not null default statement_timestamp(),
  decided_at timestamptz,
  constraint support_approvals_type check (approval_type in ('reward_adjustment','refund_goodwill','withdrawal_exception','account_exception','sensitive_message','policy_exception','bulk_action')),
  constraint support_approvals_risk check (risk_level in ('low','medium','high','critical')),
  constraint support_approvals_status check (status in ('pending','approved','rejected','cancelled','expired')),
  constraint support_approvals_evidence_object check (jsonb_typeof(evidence) = 'object'),
  constraint support_approvals_decision_consistency check ((status = 'pending' and decided_by is null and decided_at is null) or (status <> 'pending'))
);
create index support_approvals_queue on public.support_approvals (status, risk_level, requested_at);

create table public.support_automations (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null unique,
  name text not null,
  trigger_type text not null,
  schedule_expression text,
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  requires_approval boolean not null default true,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  constraint support_automations_key check (automation_key ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  constraint support_automations_trigger check (trigger_type in ('ticket_created','ticket_updated','sla_threshold','schedule','customer_reply','provider_callback')),
  constraint support_automations_status check (status in ('draft','pending_approval','active','paused','archived')),
  constraint support_automations_configuration_object check (jsonb_typeof(configuration) = 'object'),
  constraint support_automations_activation_approval check (status <> 'active' or requires_approval = false or (approved_by is not null and approved_at is not null))
);

create table public.support_connections (
  id uuid primary key default gen_random_uuid(),
  connection_key text not null unique,
  provider_type text not null,
  display_name text not null,
  status text not null default 'disconnected',
  public_configuration jsonb not null default '{}'::jsonb,
  secret_reference text,
  last_health_check_at timestamptz,
  last_error_code text,
  configured_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp(),
  constraint support_connections_key check (connection_key ~ '^[a-z0-9][a-z0-9._-]{1,119}$'),
  constraint support_connections_provider check (provider_type in ('email','in_app','web_form','messaging','phone','social','app_store')),
  constraint support_connections_status check (status in ('disconnected','pending','connected','degraded','error','paused')),
  constraint support_connections_public_configuration_object check (jsonb_typeof(public_configuration) = 'object'),
  constraint support_connections_secret_not_plaintext check (secret_reference is null or secret_reference ~ '^(vault|env|kms)://')
);

create table public.support_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'generated',
  generated_at timestamptz not null default statement_timestamp(),
  constraint support_reports_type check (report_type in ('daily_summary','weekly_performance','ticket_volume','missing_rewards','withdrawals','kyc_account','sla','customer_satisfaction','repeat_contact','escalations','subagent_quality')),
  constraint support_reports_period check (period_end > period_start),
  constraint support_reports_summary_object check (jsonb_typeof(summary) = 'object'),
  constraint support_reports_status check (status in ('generated','reviewed','delivered','superseded'))
);
create index support_reports_period on public.support_reports (report_type, period_end desc);

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_messages force row level security;
alter table public.support_ticket_events enable row level security;
alter table public.support_ticket_events force row level security;
alter table public.support_tasks enable row level security;
alter table public.support_tasks force row level security;
alter table public.support_approvals enable row level security;
alter table public.support_approvals force row level security;
alter table public.support_automations enable row level security;
alter table public.support_automations force row level security;
alter table public.support_connections enable row level security;
alter table public.support_connections force row level security;
alter table public.support_reports enable row level security;
alter table public.support_reports force row level security;

revoke all on public.support_tickets, public.support_ticket_messages, public.support_ticket_events,
  public.support_tasks, public.support_approvals, public.support_automations,
  public.support_connections, public.support_reports from public, anon, authenticated;
grant select, insert, update on public.support_tickets, public.support_tasks, public.support_approvals to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;
grant select on public.support_ticket_events, public.support_reports to authenticated;
grant select, insert, update on public.support_automations, public.support_connections to authenticated;
grant usage, select on sequence public.support_tickets_ticket_number_seq, public.support_ticket_messages_id_seq, public.support_ticket_events_id_seq to authenticated;

create policy support_tickets_admin_read on public.support_tickets for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_tickets_admin_insert on public.support_tickets for insert to authenticated with check (
  created_by = (select auth.uid()) and updated_by = (select auth.uid()) and (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_tickets_admin_update on public.support_tickets for update to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
) with check (updated_by = (select auth.uid()));

create policy support_messages_admin_read on public.support_ticket_messages for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_messages_admin_insert on public.support_ticket_messages for insert to authenticated with check (
  actor_type = 'admin' and actor_id = (select auth.uid()) and (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_events_admin_read on public.support_ticket_events for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);

create policy support_tasks_admin_read on public.support_tasks for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_tasks_admin_insert on public.support_tasks for insert to authenticated with check (
  created_by = (select auth.uid()) and (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_tasks_admin_update on public.support_tasks for update to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
) with check (true);

create policy support_approvals_admin_read on public.support_approvals for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role,'finance'::public.app_role,'kyc_risk'::public.app_role))
);
create policy support_approvals_request on public.support_approvals for insert to authenticated with check (
  requested_by = (select auth.uid()) and status = 'pending' and (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_approvals_owner_decide on public.support_approvals for update to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role = 'owner'::public.app_role)
) with check (decided_by = (select auth.uid()) and status in ('approved','rejected','cancelled'));

create policy support_automations_admin_read on public.support_automations for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_automations_owner_insert on public.support_automations for insert to authenticated with check (
  created_by = (select auth.uid()) and (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role = 'owner'::public.app_role)
);
create policy support_automations_owner_update on public.support_automations for update to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role = 'owner'::public.app_role)
) with check (true);

create policy support_connections_admin_read on public.support_connections for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role))
);
create policy support_connections_owner_insert on public.support_connections for insert to authenticated with check (
  configured_by = (select auth.uid()) and (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role = 'owner'::public.app_role)
);
create policy support_connections_owner_update on public.support_connections for update to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role = 'owner'::public.app_role)
) with check (true);
create policy support_reports_admin_read on public.support_reports for select to authenticated using (
  (select auth.jwt() ->> 'aal') = 'aal2' and exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.is_active and r.revoked_at is null and r.role in ('owner'::public.app_role,'support'::public.app_role,'analyst'::public.app_role))
);

create function private.prepare_support_ticket_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.ticket_number := old.ticket_number;
  new.customer_reference := old.customer_reference;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.updated_at := statement_timestamp();
  return new;
end;
$$;
revoke all on function private.prepare_support_ticket_update() from public, anon, authenticated;
create trigger support_tickets_prepare_update before update on public.support_tickets for each row execute function private.prepare_support_ticket_update();

create function private.prepare_support_task_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.ticket_id := old.ticket_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := statement_timestamp();
  if new.status = 'completed' and old.status <> 'completed' then new.completed_at := statement_timestamp(); end if;
  if new.status <> 'completed' then new.completed_at := null; end if;
  return new;
end;
$$;
revoke all on function private.prepare_support_task_update() from public, anon, authenticated;
create trigger support_tasks_prepare_update before update on public.support_tasks for each row execute function private.prepare_support_task_update();

create function private.protect_support_approval_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status <> 'pending' then raise exception 'support_approval_is_final'; end if;
  new.id := old.id;
  new.ticket_id := old.ticket_id;
  new.approval_type := old.approval_type;
  new.requested_action := old.requested_action;
  new.evidence := old.evidence;
  new.recommendation := old.recommendation;
  new.risk_level := old.risk_level;
  new.requested_by := old.requested_by;
  new.requested_at := old.requested_at;
  new.decided_by := auth.uid();
  new.decided_at := statement_timestamp();
  if new.status not in ('approved','rejected','cancelled') then raise exception 'invalid_support_approval_decision'; end if;
  if nullif(btrim(coalesce(new.decision_reason,'')), '') is null then raise exception 'support_approval_reason_required'; end if;
  return new;
end;
$$;
revoke all on function private.protect_support_approval_decision() from public, anon, authenticated;
create trigger support_approvals_protect_decision before update on public.support_approvals for each row execute function private.protect_support_approval_decision();

create function private.capture_support_ticket_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.support_ticket_events (ticket_id, event_type, actor_type, actor_id, before_state, after_state)
  values (new.id, case when tg_op = 'INSERT' then 'ticket.created' else 'ticket.updated' end,
    case when auth.uid() is null then 'system' else 'admin' end, auth.uid(),
    case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object('status',old.status,'priority',old.priority,'assigned_subagent',old.assigned_subagent) end,
    jsonb_build_object('status',new.status,'priority',new.priority,'assigned_subagent',new.assigned_subagent));
  return new;
end;
$$;
revoke all on function private.capture_support_ticket_event() from public, anon, authenticated;
create trigger support_tickets_capture_event after insert or update on public.support_tickets for each row execute function private.capture_support_ticket_event();

create function private.reject_support_history_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$ begin raise exception 'support history is append-only'; end; $$;
revoke all on function private.reject_support_history_mutation() from public, anon, authenticated;
create trigger support_messages_immutable before update or delete on public.support_ticket_messages for each row execute function private.reject_support_history_mutation();
create trigger support_events_immutable before update or delete on public.support_ticket_events for each row execute function private.reject_support_history_mutation();

comment on table public.support_connections is 'Support channel metadata only. Secrets must remain in an approved vault, environment secret store or KMS reference.';
comment on table public.support_approvals is 'Human authorization requests prepared by support. This table does not execute financial, KYC, fraud or policy actions.';
