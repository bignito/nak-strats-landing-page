import Cycles "mo:core/Cycles";
import CycleTypes "../types/cycle-monitor";
import CycleMonitorLib "../lib/cycle-monitor";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";

mixin (
  cycleMetrics : CycleTypes.CycleMetricsState,
  cycleCounters : CycleTypes.CycleCounters,
  adminUsers : AdminTypes.AdminUsers,
) {
  // Admin-only: returns the raw cycle-monitor samples, the current live cycle
  // balance, and the current attribution counters. A query (not an update) so
  // opening the admin page costs no consensus. Returns raw samples only — the
  // frontend does all burn-rate arithmetic.
  public shared query ({ caller }) func getCycleMetrics() : async CycleTypes.CycleMetrics {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    {
      samples = CycleMonitorLib.getSamples(cycleMetrics);
      liveBalance = Cycles.balance();
      counters = {
        totalOutcalls = cycleCounters.totalOutcalls;
        totalLedgerCalls = cycleCounters.totalLedgerCalls;
        totalVetkdCalls = cycleCounters.totalVetkdCalls;
        totalRawRandCalls = cycleCounters.totalRawRandCalls;
      };
    };
  };
};
