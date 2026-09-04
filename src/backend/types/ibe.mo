module {
  // The vetKD key identifier used for IBE derivation of the shipping-details
  // decryption key. curve is always #bls12_381_g2; name is the value of the
  // VETKD_KEY_NAME canister environment variable (default "test_key_1"), read
  // transiently at every (re)start in main.mo.
  public type IbeKeyId = {
    curve : { #bls12_381_g2 };
    name : Text;
  };

  // Permanent cache for the IBE public key. The vetKD IBE public key is a
  // constant for a given key name + derivation path, so it is fetched once and
  // cached forever (survives upgrades). Stores the key together with the key
  // name and derivation path it was derived from, so a change to either
  // invalidates the cache and triggers a fresh fetch. Never expired on a timer.
  public type IbePublicKeyCache = {
    var cachedKey : ?Blob;
    var cachedKeyName : Text;
    var cachedDerivationPath : Blob;
  };
};