-- Step 4 advisor hardening: make private denial explicit and cover composite keys.

create policy payout_destination_secrets_deny_client_access
on private.payout_destination_secrets
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create index payout_destination_secrets_user_lookup
  on private.payout_destination_secrets (user_id);

create index payout_destination_secrets_destination_user_lookup
  on private.payout_destination_secrets (payout_destination_id, user_id);
