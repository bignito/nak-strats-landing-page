import Result "mo:core/Result";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Types "../types/email";
import StorefrontTypes "../types/storefront";
import PaymentServiceTypes "../types/payment-service";
import EmailLib "../lib/email";
import AdminLib "../lib/admin-access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  config : PaymentServiceTypes.PaymentServiceConfig,
  orders : List.List<StorefrontTypes.Order>,
  adminAllowlist : Set.Set<Principal>,
) {
  // Admin-only: mark an order as shipped (with an optional tracking number) and
  // trigger the shipping notification email. Transactional — sends regardless of
  // marketing consent. Binds the caller at the top, rejects the anonymous
  // principal, and traps for a caller that is not a non-anonymous member of the
  // admin allowlist.
  public shared ({ caller }) func markOrderShipped(reference : Text, trackingNumber : ?Text) : async Result.Result<(), Types.EmailError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    switch (EmailLib.markOrderShipped(orders, reference, trackingNumber)) {
      case (#err e) { #err(e) };
      case (#ok()) {
        await EmailLib.sendShippingNotification(config, orders, reference, emailTransform);
      };
    };
  };

  // Admin-only: resend the order confirmation email for an order. Transactional
  // — sends regardless of marketing consent. Binds the caller at the top,
  // rejects the anonymous principal, and traps for a caller that is not a
  // non-anonymous member of the admin allowlist.
  public shared ({ caller }) func resendConfirmationEmail(reference : Text) : async Result.Result<(), Types.EmailError> {
    AdminLib.requireAdmin(adminAllowlist, caller);
    await EmailLib.sendOrderConfirmation(config, orders, reference, emailTransform);
  };

  // HTTP outcall response transform for the payment service email endpoints:
  // strips every response header (Date, request IDs) so responses are identical
  // across replicas, returning only the stable JSON body.
  public query func emailTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
