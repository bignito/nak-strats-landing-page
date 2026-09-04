import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Types "../types/sweep";
import CryptoTypes "../types/crypto-payments";
import CycleTypes "../types/cycle-monitor";
import SweepLib "../lib/sweep";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";

mixin (
  cryptoConfig : CryptoTypes.CryptoConfig,
  selfPrincipal : Principal,
  adminUsers : AdminTypes.AdminUsers,
  feeCache : CryptoTypes.FeeCache,
  cycleCounters : CycleTypes.CycleCounters,
) {
  // Admin-only: queries the on-ledger balance of the subaccount at the given
  // integer index on the configured ckUSDC ledger, returning the exact unit
  // count. The subaccount is derived with the same big-endian encoding as the
  // displayed deposit address. Requires a non-anonymous admin caller (rejected
  // by AdminLib.requireAdmin).
  public shared ({ caller }) func getSubaccountBalance(subaccountIndex : Nat) : async Result.Result<Types.SubaccountBalanceResult, Types.SweepError> {
    AdminLib.requireStaffOrAbove(adminUsers, caller);
    await SweepLib.getSubaccountBalance(cryptoConfig, selfPrincipal, subaccountIndex, cycleCounters);
  };

  // Admin-only: sweeps the subaccount at the given integer index to the
  // treasury principal, surfacing the EXACT ledger error (icrc1_transfer error
  // variant) on failure. The subaccount is derived with the same big-endian
  // encoding as the displayed deposit address. Requires a non-anonymous admin
  // caller (rejected by AdminLib.requireAdmin).
  public shared ({ caller }) func sweepSubaccount(subaccountIndex : Nat) : async Result.Result<Types.SweepSubaccountResult, Types.SweepError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    await SweepLib.sweepSubaccount(cryptoConfig, selfPrincipal, feeCache, subaccountIndex, cycleCounters);
  };
};
