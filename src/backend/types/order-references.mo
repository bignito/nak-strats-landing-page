module {
  // An order reference: "NAK-" followed by 12 characters from the
  // unambiguous alphabet. Existing orders keep their legacy sequential
  // references ("NAK-<id>") — the field is Text either way, so no migration
  // is required and historical data is never rewritten.
  public type OrderReference = Text;

  // Uppercase alphanumeric alphabet that EXCLUDES the confusable characters
  // 0, O, 1, I and L so a reference can be read aloud and retyped safely.
  // 26 letters + 10 digits - 5 excluded = 31 characters.
  public let REFERENCE_ALPHABET : Text = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  // Length of the reference body (characters after the "NAK-" prefix), within
  // the required 10-12 range. 12 characters from a 31-symbol alphabet gives
  // 31^12 = 2^59.4 bits of entropy: unguessable, and collisions are
  // astronomically unlikely (birthday bound ~6e-9 at 10^5 orders).
  public let REFERENCE_LENGTH : Nat = 12;

  // Prefix of every order reference.
  public let REFERENCE_PREFIX : Text = "NAK-";

  // Upper bound on regeneration attempts when a generated reference collides
  // with an existing one. At 2^59.4 bits of entropy a collision is
  // astronomically unlikely; the bound exists so generation can never loop
  // forever.
  public let MAX_GENERATION_ATTEMPTS : Nat = 5;
};