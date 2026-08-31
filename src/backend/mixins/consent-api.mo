import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Types "../types/consent";
import PaymentServiceTypes "../types/payment-service";
import ConsentLib "../lib/consent";
import AdminLib "../lib/admin-access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  config : PaymentServiceTypes.PaymentServiceConfig,
  adminAllowlist : Set.Set<Principal>,
) {
  // Admin-only: fetch the list of consenting addresses from the external
  // payment service and return it as CSV, so a mailing list can be built
  // without accidentally including customers who did not opt in. The email
  // addresses are PII that lives off-canister at the payment service; the
  // canister only proxies them through and never persists them.
  public shared ({ caller }) func getConsentListCsv() : async Result.Result<Types.ConsentListExport, Types.ConsentError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    await ConsentLib.fetchConsentListCsv(config, consentServiceTransform);
  };

  // Token-based unsubscribe. The token is minted by the payment service and
  // embedded in the unsubscribe link of marketing emails. The canister forwards
  // it to the payment service, which adds the address to its stored suppression
  // list. Suppressed addresses are never sent marketing email; transactional
  // emails remain exempt. The suppression list lives at the payment service.
  public func unsubscribe(token : Text) : async Result.Result<(), Types.ConsentError> {
    await ConsentLib.unsubscribe(config, token, consentServiceTransform);
  };

  // HTTP outcall transform for the payment service consent endpoints: strips
  // every response header so responses are identical across replicas, returning
  // only the stable JSON/CSV body.
  public query func consentServiceTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
