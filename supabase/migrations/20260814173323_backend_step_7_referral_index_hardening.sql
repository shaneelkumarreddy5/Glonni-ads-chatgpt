-- Cover referral-code foreign key lookups and deletion checks.
create index referrals_referral_code_lookup_idx on public.referrals(referral_code_id);