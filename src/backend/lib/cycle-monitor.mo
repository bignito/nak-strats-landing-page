import Cycles "mo:core/Cycles";
import Prim "mo:⛔";
import Time "mo:core/Time";
import List "mo:core/List";
import CycleTypes "../types/cycle-monitor";

module {
  // Fixed capacity of the ring buffer: 112 samples = 14 days at 3-hour
  // intervals. Never grows beyond this.
  public let CAPACITY : Nat = 112;

  // 3 hours in nanoseconds (3 * 3600 * 1_000_000_000).
  public let SAMPLE_INTERVAL_NS : Int = 10_800_000_000_000;

  // Records one sample using ONLY local reads: cycle balance, heap size,
  // stable memory size, and the four attribution counters. No inter-canister,
  // outcall, or management-canister calls. When the ring buffer is full, the
  // oldest sample is overwritten (head wraps and count stays at CAPACITY).
  public func recordSample(state : CycleTypes.CycleMetricsState, counters : CycleTypes.CycleCounters) {
    let sample : CycleTypes.CycleSample = {
      timestamp = Time.now();
      cyclesBalance = Cycles.balance();
      heapBytes = Prim.rts_heap_size();
      stableBytes = Prim.rts_stable_memory_size();
      totalOutcalls = counters.totalOutcalls;
      totalLedgerCalls = counters.totalLedgerCalls;
      totalVetkdCalls = counters.totalVetkdCalls;
      totalRawRandCalls = counters.totalRawRandCalls;
    };
    state.samples[state.head] := ?sample;
    state.head := (state.head + 1) % CAPACITY;
    if (state.count < CAPACITY) { state.count += 1 };
  };

  // Timestamp of the most recent sample, or null when none has been recorded.
  public func lastSampleTimestamp(state : CycleTypes.CycleMetricsState) : ?Int {
    if (state.count == 0) { return null };
    let lastIdx = if (state.head == 0) { CAPACITY - 1 } else { state.head - 1 };
    switch (state.samples[lastIdx]) {
      case (?s) { ?s.timestamp };
      case null { null };
    };
  };

  // Returns the samples in chronological order (oldest first).
  public func getSamples(state : CycleTypes.CycleMetricsState) : [CycleTypes.CycleSample] {
    let out = List.empty<CycleTypes.CycleSample>();
    var i = 0;
    var idx = if (state.count == CAPACITY) { state.head } else { 0 };
    while (i < state.count) {
      switch (state.samples[idx]) {
        case (?s) { out.add(s) };
        case null {};
      };
      idx := (idx + 1) % CAPACITY;
      i += 1;
    };
    out.toArray();
  };
};
