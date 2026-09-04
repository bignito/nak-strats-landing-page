module {
  // A single metrics sample captured by the cycle monitor. All fields are
  // local reads only — no inter-canister, outcall, or management-canister
  // calls are made to produce a sample.
  public type CycleSample = {
    timestamp : Int;          // nanoseconds since the Unix epoch
    cyclesBalance : Nat;      // Cycles.balance() at sample time
    heapBytes : Nat;          // Prim.rts_heap_size()
    stableBytes : Nat;        // Prim.rts_stable_memory_size()
    totalOutcalls : Nat;      // cumulative HTTPS outcalls since deploy
    totalLedgerCalls : Nat;   // cumulative ledger calls since deploy
    totalVetkdCalls : Nat;    // cumulative vetKD calls since deploy
    totalRawRandCalls : Nat;  // cumulative raw_rand calls since deploy
  };

  // Monotonic cumulative attribution counters, incremented in place at their
  // call sites. Never reset. Shared by reference across modules.
  public type CycleCounters = {
    var totalOutcalls : Nat;
    var totalLedgerCalls : Nat;
    var totalVetkdCalls : Nat;
    var totalRawRandCalls : Nat;
  };

  // Stable fixed-capacity ring buffer of exactly 112 samples (14 days at
  // 3-hour intervals). When full, the oldest sample is overwritten; it never
  // grows beyond 112.
  public type CycleMetricsState = {
    var samples : [var ?CycleSample];  // fixed 112 slots
    var head : Nat;                    // index of the next write position
    var count : Nat;                   // number of valid entries (0..112)
  };

  // Shared (immutable) view of the counters for the API boundary.
  public type CycleCountersView = {
    totalOutcalls : Nat;
    totalLedgerCalls : Nat;
    totalVetkdCalls : Nat;
    totalRawRandCalls : Nat;
  };

  // Return type of getCycleMetrics: raw samples + live balance + counters.
  public type CycleMetrics = {
    samples : [CycleSample];
    liveBalance : Nat;
    counters : CycleCountersView;
  };
};
