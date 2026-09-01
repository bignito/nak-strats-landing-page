module {
  // A short-lived cancellation token issued to the browser session that created
  // an order, keyed by the order reference. Generated from IC raw randomness so
  // it is unguessable. Used to prove session ownership for guest self-
  // cancellation without relying on the (leakable) order reference alone.
  public type CancellationToken = {
    token : Text;
    // Unix timestamp (ns since epoch) after which the token is invalid.
    expiresAt : Int;
  };
};
