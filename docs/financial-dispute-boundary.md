# Admin dispute financial boundary

The Admin Portal exposes dispute mutations through `financialApi.disputes`.

The facade keeps the operator-facing `reason` name, while the legacy transport maps that value to the backend controller's `adminNotes` request field. This preserves the existing backend producer contract without exposing transport naming to page consumers.

The War Room intentionally keeps the legacy `trades.live()` read outside this facade until its response contract has been audited and added to the financial contract boundary.
