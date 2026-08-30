import Result "mo:core/Result";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Types "../types/crypto-payments";
import StorefrontTypes "../types/storefront";
import CryptoPaymentsLib "../lib/crypto-payments";
import AdminLib "../lib/admin-access-control";

mixin (
  orders : List.List<StorefrontTypes.Order>,
  products : List.List<StorefrontTypes.Product>,
  cryptoPayments : Map.Map<Text, Types.CryptoPayment>,
  cryptoConfig : Types.CryptoConfig,
  selfPrincipal : Principal,
  adminAllowlist : Set.Set<Principal>,
) {
  public query func getCryptoConfig() : async Types.CryptoConfigView {
    {
      treasuryPrincipal = cryptoConfig.treasuryPrincipal;
      treasurySubaccount = cryptoConfig.treasurySubaccount;
      ckUSDC = cryptoConfig.ckUSDC;
      icp = cryptoConfig.icp;
    };
  };

  public query func getCryptoDepositInfo(reference : Text) : async Result.Result<Types.DepositInfo, Types.CryptoPaymentError> {
    switch (CryptoPaymentsLib.getPayment(cryptoPayments, reference)) {
      case null { #err(#notFound) };
      case (?payment) { #ok(CryptoPaymentsLib.getDepositInfo(payment, cryptoConfig, selfPrincipal)) };
    };
  };

  public query func getCryptoPaymentStatus(reference : Text) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    switch (CryptoPaymentsLib.getPayment(cryptoPayments, reference)) {
      case null { #err(#notFound) };
      case (?payment) { #ok(payment.status) };
    };
  };

  public func checkCryptoPayment(reference : Text) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    await CryptoPaymentsLib.checkPayment(cryptoPayments, reference, cryptoConfig, selfPrincipal);
  };

  public func confirmCryptoPayment(reference : Text) : async Result.Result<Types.CryptoPaymentStatus, Types.CryptoPaymentError> {
    await CryptoPaymentsLib.confirmPayment(cryptoPayments, orders, reference, cryptoConfig, selfPrincipal);
  };

  public func sweepCryptoToTreasury(reference : Text) : async Result.Result<Nat, Types.CryptoPaymentError> {
    await CryptoPaymentsLib.sweepToTreasury(cryptoPayments, reference, cryptoConfig, selfPrincipal);
  };

  // Backend timer-based expiry check: scan for expired awaiting_payment orders
  // and release their reserved inventory, marking them expired.
  public func releaseExpiredOrders() : async Nat {
    var released = 0;
    for ((reference, payment) in cryptoPayments.entries()) {
      let st = payment.status;
      switch st {
        case (#paid _) {};
        case (#expired) {};
        case (_) {
          if (Time.now() > payment.expiresAt) {
            switch (await CryptoPaymentsLib.releaseInventoryOnExpiry(products, orders, cryptoPayments, reference)) {
              case (#ok()) { released += 1 };
              case (#err _) {};
            };
          };
        };
      };
    };
    released;
  };

  public shared ({ caller }) func updateTreasury(principal : Principal, subaccount : ?Blob) : async Result.Result<(), Types.CryptoPaymentError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    cryptoConfig.treasuryPrincipal := principal;
    cryptoConfig.treasurySubaccount := subaccount;
    #ok();
  };

  public shared ({ caller }) func updateLedgerConfig(token : Types.Token, canisterId : Principal, decimals : Nat8, fee : Nat) : async Result.Result<(), Types.CryptoPaymentError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    switch token {
      case (#ckUSDC) { cryptoConfig.ckUSDC := { canisterId; decimals; fee } };
      case (#ICP) { cryptoConfig.icp := { canisterId; decimals; fee } };
    };
    #ok();
  };
};
