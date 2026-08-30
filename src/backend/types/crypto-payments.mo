module {
  public type Token = {
    #ckUSDC;
    #ICP;
  };

  public type LedgerConfig = {
    canisterId : Principal;
    decimals : Nat8;
    fee : Nat;
  };

  public type CryptoConfig = {
    var treasuryPrincipal : Principal;
    var treasurySubaccount : ?Blob;
    var ckUSDC : LedgerConfig;
    var icp : LedgerConfig;
  };

  public type CryptoConfigView = {
    treasuryPrincipal : Principal;
    treasurySubaccount : ?Blob;
    ckUSDC : LedgerConfig;
    icp : LedgerConfig;
  };

  public type CryptoPaymentStatus = {
    #awaiting_payment;
    #paid : { blockIndex : Nat };
    #underpayment : { expected : Nat; received : Nat };
    #overpayment : { expected : Nat; received : Nat };
    #expired;
  };

  public type CryptoPayment = {
    orderId : Nat;
    reference : Text;
    token : Token;
    amountDue : Nat;
    subaccount : Blob;
    status : CryptoPaymentStatus;
    expiresAt : Int;
    confirmedBlockIndex : ?Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  public type DepositInfo = {
    reference : Text;
    token : Token;
    address : Principal;
    subaccount : Blob;
    amountDue : Nat;
    decimals : Nat8;
    expiresAt : Int;
    qrPayload : Text;
  };

  public type CryptoPaymentError = {
    #notFound;
    #notCryptoOrder;
    #alreadyPaid;
    #expired;
    #underpayment : { expected : Nat; received : Nat };
    #overpayment : { expected : Nat; received : Nat };
    #ledgerError : Text;
    #unauthorized;
    #invalidConfig : Text;
    #sweepFailed : Text;
  };
};
