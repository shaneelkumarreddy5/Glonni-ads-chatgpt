-- Step 3 advisor hardening: cover every composite financial foreign key.

create index reward_status_history_claim_user_lookup
  on public.reward_status_history (reward_claim_id, user_id);

create index wallet_ledger_claim_user_lookup
  on public.wallet_ledger_entries (reward_claim_id, user_id);

create index wallet_ledger_history_claim_user_lookup
  on public.wallet_ledger_entries (status_history_id, reward_claim_id, user_id);
