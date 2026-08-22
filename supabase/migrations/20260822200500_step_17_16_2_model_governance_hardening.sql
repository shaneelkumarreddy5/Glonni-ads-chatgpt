-- Step 17.16.2 hardening: cover model-policy change-history relationships.
create index agent_model_changes_from_policy_idx on public.agent_model_change_requests(from_policy_version_id) where from_policy_version_id is not null;
create index agent_model_changes_proposed_policy_idx on public.agent_model_change_requests(proposed_policy_version_id);
