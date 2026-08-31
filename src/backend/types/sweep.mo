module {
  // Result of querying the on-ledger balance of a specific subaccount (by
  // integer index) on the configured ckUSDC ledger. The subaccount is the
  // 32-byte big-endian encoding of the integer (reusing deriveSubaccount), so
  // the queried subaccount is byte-for-byte identical to the one in the
  // displayed deposit address for an order whose id equals the index.
  public type SubaccountBalanceResult = {
    subaccountIndex : Nat;
    subaccountHex : Text;
    balance : Nat;
  };

  // Result of sweeping a specific subaccount (by integer index) to the
  // treasury. `blockIndex` is the on-ledger block index on success; `error`
  // carries the exact ledger error on failure (never swallowed or genericized).
  public type SweepSubaccountResult = {
    subaccountIndex : Nat;
    subaccountHex : Text;
    blockIndex : ?Nat;
    error : ?Text;
  };

  public type SweepError = {
    #unauthorized;
    #invalidConfig : Text;
    #ledgerError : Text;
    #sweepFailed : Text;
  };
};
