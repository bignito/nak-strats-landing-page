import CycleTypes "../types/cycle-monitor";

module {
  // Monotonic cumulative attribution counters, incremented in place at their
  // call sites. Each increment function takes the shared CycleCounters record
  // (the stable actor field) as a parameter and mutates the matching field in
  // place, so every call site shares the same counters without any module-level
  // global pointer. Never reset; each sample snapshots their current values so
  // the delta between two samples shows how many of each happened in that
  // window.

  public func incOutcalls(counters : CycleTypes.CycleCounters) {
    counters.totalOutcalls += 1;
  };

  public func incLedgerCalls(counters : CycleTypes.CycleCounters) {
    counters.totalLedgerCalls += 1;
  };

  public func incVetkdCalls(counters : CycleTypes.CycleCounters) {
    counters.totalVetkdCalls += 1;
  };

  public func incRawRandCalls(counters : CycleTypes.CycleCounters) {
    counters.totalRawRandCalls += 1;
  };
};
