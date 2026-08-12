-- Step 4 prerequisite: withdrawal movements used by the append-only wallet ledger.

alter type public.wallet_entry_reason add value if not exists 'withdrawal_reserved';
alter type public.wallet_entry_reason add value if not exists 'withdrawal_released';
alter type public.wallet_entry_reason add value if not exists 'withdrawal_paid';
