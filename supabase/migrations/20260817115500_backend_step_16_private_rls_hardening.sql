-- Explicit client-deny policies complement schema/table privilege revocation and
-- make the private Step 16 boundary visible to the database security advisor.

create policy commerce_providers_deny_client on private.commerce_providers
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy commerce_provider_secrets_deny_client on private.commerce_provider_secrets
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_merchants_deny_client on private.affiliate_merchants
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_clicks_deny_client on private.affiliate_clicks
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_conversions_deny_client on private.affiliate_conversions
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy affiliate_conversion_events_deny_client on private.affiliate_conversion_events
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy payout_routes_deny_client on private.payout_routes
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy payout_attempts_deny_client on private.payout_attempts
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy payout_attempt_events_deny_client on private.payout_attempt_events
  as restrictive for all to anon, authenticated using (false) with check (false);
