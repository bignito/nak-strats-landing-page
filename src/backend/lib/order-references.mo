import Random "mo:core/Random";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Types "../types/order-references";
import StorefrontTypes "../types/storefront";
import CycleTypes "../types/cycle-monitor";
import CycleCountersLib "../lib/cycle-counters";

module {
  // Draws one random reference body from REFERENCE_ALPHABET using IC raw
  // randomness: Random.blob() from mo:core (backed by the management
  // canister's raw_rand; each call returns 32 random bytes). Each byte is
  // mapped to an alphabet index via rejection sampling so the distribution is
  // uniform. Never a timestamp, a counter, or a hash of the order id. Async
  // because raw randomness is an inter-canister call.
  public func generateReference(counters : CycleTypes.CycleCounters) : async Types.OrderReference {
    let alphabet = Types.REFERENCE_ALPHABET.toArray();
    var body = "";
    while (body.size() < Types.REFERENCE_LENGTH) {
      CycleCountersLib.incRawRandCalls(counters);
      let bytes = await Random.blob();
      for (byte in bytes.toArray().values()) {
        // Rejection sampling: 31 * 8 = 248, so bytes in [0, 248) map
        // uniformly onto the 31-symbol alphabet; bytes >= 248 are rejected
        // and redrawn on the next blob iteration.
        let v = byte.toNat();
        if (v < 248) {
          body := body # alphabet[v % 31].toText();
          if (body.size() >= Types.REFERENCE_LENGTH) { break };
        };
      };
    };
    Types.REFERENCE_PREFIX # body;
  };

  // Generates a reference that does not collide with any existing order
  // reference. Bounded regenerate loop: up to MAX_GENERATION_ATTEMPTS draws,
  // each checked against the orders list by reference equality; traps only
  // when the bound is exhausted (astronomically unlikely at 2^59.4 entropy).
  public func generateUniqueReference(orders : List.List<StorefrontTypes.Order>, counters : CycleTypes.CycleCounters) : async Types.OrderReference {
    var attempt = 0;
    while (attempt < Types.MAX_GENERATION_ATTEMPTS) {
      let ref = await generateReference(counters);
      let collides = switch (orders.find(func o = o.reference == ref)) {
        case (?_) { true };
        case null { false };
      };
      if (not collides) { return ref };
      attempt += 1;
    };
    Runtime.trap("Failed to generate a unique order reference after " # Types.MAX_GENERATION_ATTEMPTS.toText() # " attempts");
  };
};