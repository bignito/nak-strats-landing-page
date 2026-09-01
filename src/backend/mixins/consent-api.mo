import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Types "../types/consent";
import PaymentServiceTypes "../types/payment-service";
import ConsentLib "../lib/consent";
import AdminLib "../lib/admin-access-control";
import AdminTypes "../types/admin-access-control";
import RateLimitTypes "../types/rate-limit";
import RateLimitLib "../lib/rate-limit";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  config : PaymentServiceTypes.PaymentServiceConfig,
  adminUsers : AdminTypes.AdminUsers,
  unsubscribeRateLimit : RateLimitTypes.RateLimitState,
) {
  // Admin-only: fetch the list of consenting addresses from the external
  // payment service and return it as CSV, so a mailing list can be built
  // without accidentally including customers who did not opt in. The email
  // addresses are PII that lives off-canister at the payment service; the
  // canister only proxies them through and never persists them.
  public shared ({ caller }) func getConsentListCsv() : async Result.Result<Types.ConsentListExport, Types.ConsentError> {
    AdminLib.requireAdminOrOwner(adminUsers, caller);
    await ConsentLib.fetchConsentListCsv(config, consentServiceTransform);
  };

  // Token-based unsubscribe. The token is minted by the payment service and
  // embedded in the unsubscribe link of marketing emails. The canister forwards
  // it to the payment service, which adds the address to its stored suppression
  // list. Suppressed addresses are never sent marketing email; transactional
  // emails remain exempt. The suppression list lives at the payment service.
  // Unauthenticated is correct for an unsubscribe link, so the token space is
  // protected by rate limiting per caller principal (the canister cannot see
  // client IPs; anonymous callers all share the anonymous principal, so for
  // them this is a global cap on unsubscribe attempts) to prevent brute-forcing
  // the token space to unsubscribe arbitrary addresses.
  public shared ({ caller }) func unsubscribe(token : Text) : async Result.Result<(), Types.ConsentError> {
    if (not RateLimitLib.checkRateLimit(unsubscribeRateLimit, caller, RateLimitLib.UNSUBSCRIBE_RATE_WINDOW_NANOS, RateLimitLib.UNSUBSCRIBE_RATE_MAX)) {
      return #err(#rateLimited);
    };
    await ConsentLib.unsubscribe(config, token, consentServiceTransform);
  };

  // HTTP outcall transform for the payment service consent endpoints: strips
  // every response header so responses are identical across replicas, returning
  // only the stable JSON/CSV body.
  public query func consentServiceTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
