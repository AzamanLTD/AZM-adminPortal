# Admin withdrawal response boundary

The `/api/admin/withdrawals/pending` response contains two distinct collections:

- `pending`: `Withdrawal` records with the full withdrawal review fields.
- `frozen`: `TransactionHistory` records representing frozen dispute-related history.

The Admin financial facade validates these collections with separate schemas. The `pending` schema remains strict; the `frozen` schema validates only the common fields guaranteed by the producer and passes through transaction-history-specific fields unchanged.
