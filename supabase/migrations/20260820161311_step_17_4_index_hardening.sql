-- Step 17.4 performance hardening: cover all new foreign-key lookups.
create index risk_agent_tasks_case_idx on public.risk_agent_tasks (risk_case_id) where risk_case_id is not null;
create index risk_agent_tasks_appeal_idx on public.risk_agent_tasks (appeal_id) where appeal_id is not null;
create index risk_agent_tasks_created_by_idx on public.risk_agent_tasks (created_by);

create index risk_agent_rules_created_by_idx on public.risk_agent_rules (created_by);
create index risk_agent_rules_approved_by_idx on public.risk_agent_rules (approved_by) where approved_by is not null;

create index risk_agent_approvals_case_idx on public.risk_agent_approvals (risk_case_id) where risk_case_id is not null;
create index risk_agent_approvals_appeal_idx on public.risk_agent_approvals (appeal_id) where appeal_id is not null;
create index risk_agent_approvals_requested_by_idx on public.risk_agent_approvals (requested_by);
create index risk_agent_approvals_decided_by_idx on public.risk_agent_approvals (decided_by) where decided_by is not null;

create index risk_agent_automations_created_by_idx on public.risk_agent_automations (created_by);
create index risk_agent_automations_approved_by_idx on public.risk_agent_automations (approved_by) where approved_by is not null;
create index risk_agent_connections_configured_by_idx on public.risk_agent_connections (configured_by);
create index risk_agent_activity_actor_idx on private.risk_agent_activity (actor_id) where actor_id is not null;
