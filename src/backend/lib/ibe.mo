import Types "../types/ibe";

module {
  // App-specific domain separator for the IBE shipping-details key. Must be
  // byte-identical across getIbePublicKey, getMyEncryptedIbeKey, and the
  // frontend's decryptAndVerify / IbeCiphertext.decrypt calls, or the derived
  // keys will not match.
  public let DOMAIN_SEPARATOR = "nak_strats_ibe_shipping_v1";

  // Builds the vetKD key id for the given key name (the VETKD_KEY_NAME env var
  // value, default "test_key_1"). curve is always #bls12_381_g2.
  public func keyId(keyName : Text) : Types.IbeKeyId {
    { curve = #bls12_381_g2; name = keyName };
  };
};