import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Types "../types/sweep";
import CryptoTypes "../types/crypto-payments";
import CryptoPaymentsLib "./crypto-payments";

module {
  // ICRC-1 ledger interface (mirrors the one in crypto-payments.mo). Called via
  // actor(canisterId), not the ic package.
  type Account = { owner : Principal; subaccount : ?Blob };

  type TransferArg = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type Ledger = actor {
    icrc1_balance_of : shared query Account -> async Nat;
    icrc1_transfer : shared TransferArg -> async { #Ok : Nat; #Err : TransferError };
    icrc1_fee : shared query () -> async Nat;
  };

  func hexDigit(n : Nat8) : Text {
    let v = n.toNat();
    if (v < 10) { v.toText() } else {
      switch v {
        case 10 { "a" };
        case 11 { "b" };
        case 12 { "c" };
        case 13 { "d" };
        case 14 { "e" };
        case _ { "f" };
      };
    };
  };

  func blobToHex(b : Blob) : Text {
    var hex = "";
    for (byte in b.toArray().values()) {
      hex := hex # hexDigit(byte / 16) # hexDigit(byte % 16);
    };
    hex;
  };

  // Queries the on-ledger balance of the subaccount at the given integer index
  // on the configured ckUSDC ledger. The subaccount is derived with the SAME
  // big-endian encoding as deriveSubaccount (32-byte big-endian encoding of the
  // integer), so subaccount 5 is byte-for-byte the subaccount encoded in the
  // displayed deposit address for an order whose id is 5. Returns the exact
  // unit count.
  public func getSubaccountBalance(
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
    subaccountIndex : Nat,
  ) : async Result.Result<Types.SubaccountBalanceResult, Types.SweepError> {
    let subaccount = CryptoPaymentsLib.deriveSubaccount(subaccountIndex);
    let ledgerActor : Ledger = actor (config.ckUSDC.canisterId.toText());
    let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?subaccount });
    #ok({
      subaccountIndex;
      subaccountHex = blobToHex(subaccount);
      balance;
    });
  };

  // Sweeps the subaccount at the given integer index to the treasury principal,
  // surfacing the EXACT ledger error (icrc1_transfer error variant) on failure.
  // The subaccount is derived with the same big-endian encoding as
  // deriveSubaccount, so the swept subaccount matches the displayed deposit
  // address byte-for-byte. Returns the on-ledger block index on success.
  public func sweepSubaccount(
    config : CryptoTypes.CryptoConfig,
    selfPrincipal : Principal,
    feeCache : CryptoTypes.FeeCache,
    subaccountIndex : Nat,
  ) : async Result.Result<Types.SweepSubaccountResult, Types.SweepError> {
    let subaccount = CryptoPaymentsLib.deriveSubaccount(subaccountIndex);
    let ledgerActor : Ledger = actor (config.ckUSDC.canisterId.toText());
    let balance = await ledgerActor.icrc1_balance_of({ owner = selfPrincipal; subaccount = ?subaccount });
    // The transfer fee is queried from the ledger at runtime (cached briefly)
    // rather than hardcoded, so a fee change never silently breaks the sweep.
    let fee = await CryptoPaymentsLib.getRuntimeFee(#ckUSDC, config, feeCache);
    if (balance <= fee) {
      // Cannot sweep: after deducting the fee there is nothing left to transfer
      // and the ledger rejects a zero-value transfer.
      #err(#sweepFailed("subaccount balance " # balance.toText() # " is not greater than the transfer fee " # fee.toText()));
    } else {
      let sweepAmount = balance - fee;
      let transferResult = await ledgerActor.icrc1_transfer({
        from_subaccount = ?subaccount;
        to = { owner = config.treasuryPrincipal; subaccount = config.treasurySubaccount };
        amount = sweepAmount;
        fee = ?fee;
        memo = null;
        created_at_time = null;
      });
      switch transferResult {
        case (#Ok blockIndex) {
          #ok({
            subaccountIndex;
            subaccountHex = blobToHex(subaccount);
            blockIndex = ?blockIndex;
            error = null;
          });
        };
        case (#Err e) {
          // Surface the EXACT ledger error variant — never swallowed or
          // genericized.
          #err(#ledgerError(debug_show(e)));
        };
      };
    };
  };
};
