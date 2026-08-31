module {
  // The vetKD key identifier used for IBE derivation of the shipping-details
  // decryption key. curve is always #bls12_381_g2; name is the value of the
  // VETKD_KEY_NAME canister environment variable (default "test_key_1"), read
  // transiently at every (re)start in main.mo.
  public type IbeKeyId = {
    curve : { #bls12_381_g2 };
    name : Text;
  };
};