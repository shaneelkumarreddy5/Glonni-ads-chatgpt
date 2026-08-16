-- Cover the compound risk-case/user foreign key with one index. Its leading
-- risk_case_id column also replaces the earlier single-column lookup index.

create index security_review_routes_case_user_lookup
  on private.security_review_routes (risk_case_id, user_id);

drop index private.security_review_routes_case_lookup;
