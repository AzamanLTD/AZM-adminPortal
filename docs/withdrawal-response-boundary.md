# Admin withdrawal response boundary

The backend `/api/admin/withdrawals/pending` response contains two distinct collections:

- `pending`: `Withdrawal` records with the full withdrawal-review fields consumed by the Admin queue;
- `frozen`: `TransactionHistory` records representing frozen dispute-related history, with a smaller common identity/status shape plus transaction-history-specific fields.

The Admin financial facade validates these collections with separate schemas. The `pending` contract stays strict so missing review-critical fields fail loudly, while the `frozen` contract validates only fields guaranteed by the producer and passes through transaction-history-specific fields unchanged.
