import Random "mo:core/Random";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Types "../types/cancellation";
import CycleTypes "../types/cycle-monitor";
import CycleCountersLib "../lib/cycle-counters";

module {
  // Alphabet for cancellation tokens: 31 unambiguous uppercase alphanumeric
  // characters (excluding 0, O, 1, I, L), matching the order-reference scheme.
  let ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // 26 chars from a 31-symbol alphabet ≈ 26 * log2(31) ≈ 129 bits of entropy.
  let TOKEN_LENGTH = 26;
  // Default token lifetime: 30 minutes, matching the card checkout window.
  let DEFAULT_TTL_NANOS : Int = 1_800_000_000_000;

  // Generate a random cancellation token from IC raw randomness (Random.blob(),
  // backed by the management canister's raw_rand). Each byte is mapped to an
  // alphabet index via rejection sampling so the distribution is uniform.
  public func generateToken(counters : CycleTypes.CycleCounters) : async Text {
    let alphabet = ALPHABET.toArray();
    var body = "";
    while (body.size() < TOKEN_LENGTH) {
      CycleCountersLib.incRawRandCalls(counters);
      let bytes = await Random.blob();
      for (byte in bytes.toArray().values()) {
        let v = byte.toNat();
        if (v < 248) {
          body := body # alphabet[v % 31].toText();
          if (body.size() >= TOKEN_LENGTH) { break };
        };
      };
    };
    body;
  };

  // Issue a cancellation token for an order reference, valid for DEFAULT_TTL.
  // Returns the token so the caller can hand it to the browser session.
  public func issueToken(tokens : Map.Map<Text, Types.CancellationToken>, reference : Text, counters : CycleTypes.CycleCounters) : async Text {
    let token = await generateToken(counters);
    tokens.add(reference, { token; expiresAt = Time.now() + DEFAULT_TTL_NANOS });
    token;
  };

  // Validate a cancellation token for an order reference: it must exist, match,
  // and not be expired. Returns true when valid.
  public func validateToken(tokens : Map.Map<Text, Types.CancellationToken>, reference : Text, token : Text) : Bool {
    switch (tokens.get(reference)) {
      case null { false };
      case (?ct) {
        ct.token == token and Time.now() < ct.expiresAt;
      };
    };
  };
};
