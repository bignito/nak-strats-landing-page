import type { Backend } from "@/backend";
import { Principal } from "@icp-sdk/core/principal";
import {
  DerivedPublicKey,
  EncryptedVetKey,
  IbeCiphertext,
  IbeIdentity,
  IbeSeed,
  TransportSecretKey,
  type VetKey,
} from "@icp-sdk/vetkeys";

/**
 * Domain separator shared with the backend. This value MUST match the backend
 * exactly — it is used as the derivation context for the IBE public key, so any
 * drift between the two sides makes encryption/decryption fail.
 */
export const DOMAIN_SEPARATOR = "nak_strats_ibe_shipping_v1";

/** The plaintext shipping payload that is IBE-encrypted to each admin. */
export interface ShippingPayload {
  name: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

/** Serialize the shipping payload to the JSON string that gets encrypted. */
export function serializeShipping(payload: ShippingPayload): string {
  return JSON.stringify(payload);
}

/** Parse a decrypted shipping JSON string back into a structured payload. */
export function deserializeShipping(json: string): ShippingPayload {
  return JSON.parse(json) as ShippingPayload;
}

/**
 * Concatenate a list of segments into a single blob using a 4-byte
 * big-endian length prefix per segment. The blob is stored opaquely by the
 * backend as `encrypted_shipping`; only the frontend interprets its layout.
 */
function concatLengthPrefixed(segments: Uint8Array[]): Uint8Array {
  const total = segments.reduce((sum, seg) => sum + 4 + seg.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const seg of segments) {
    const view = new DataView(out.buffer);
    view.setUint32(offset, seg.length, false);
    offset += 4;
    out.set(seg, offset);
    offset += seg.length;
  }
  return out;
}

/**
 * Split a length-prefixed concatenated blob back into its individual
 * ciphertext segments, in order.
 */
function splitLengthPrefixed(blob: Uint8Array): Uint8Array[] {
  const segments: Uint8Array[] = [];
  let offset = 0;
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  while (offset < blob.length) {
    const length = view.getUint32(offset, false);
    offset += 4;
    if (offset + length > blob.length) {
      throw new Error(
        "Malformed encrypted shipping blob: segment overruns buffer",
      );
    }
    segments.push(blob.slice(offset, offset + length));
    offset += length;
  }
  return segments;
}

/**
 * IBE-encrypt a cleartext string to every admin principal, returning a single
 * length-prefixed concatenated blob. Each segment is keyed by the admin
 * principal it was encrypted to, so decryptShipping can find its segment
 * without depending on the current admin-list order.
 *
 * This path is fully client-side and has NO identity dependency, so it works
 * for anonymous guests. The backend public key is fetched once and reused for
 * every admin principal.
 */
export async function encryptShippingToAdmins(
  cleartext: string,
  adminPrincipals: string[],
  backend: Backend,
): Promise<Uint8Array> {
  const publicKeyBytes = await backend.getIbePublicKey();
  const derivedPublicKey = DerivedPublicKey.deserialize(publicKeyBytes);
  const cleartextBytes = new TextEncoder().encode(cleartext);

  const segments: Uint8Array[] = [];
  for (const admin of adminPrincipals) {
    const identity = IbeIdentity.fromPrincipal(Principal.fromText(admin));
    const ciphertext = IbeCiphertext.encrypt(
      derivedPublicKey,
      identity,
      cleartextBytes,
      IbeSeed.random(),
    );
    segments.push(encodeAdminSegment(admin, ciphertext.serialize()));
  }

  return concatLengthPrefixed(segments);
}

/**
 * Encode one admin's segment as [4-byte principal length][principal text]
 * [4-byte ciphertext length][ciphertext]. Keying by principal lets
 * decryptShipping locate the right segment even if the admin allowlist
 * changes between order creation and decryption.
 */
function encodeAdminSegment(
  adminPrincipal: string,
  ciphertext: Uint8Array,
): Uint8Array {
  const principalBytes = new TextEncoder().encode(adminPrincipal);
  const segment = new Uint8Array(
    4 + principalBytes.length + 4 + ciphertext.length,
  );
  const view = new DataView(segment.buffer);
  let offset = 0;
  view.setUint32(offset, principalBytes.length, false);
  offset += 4;
  segment.set(principalBytes, offset);
  offset += principalBytes.length;
  view.setUint32(offset, ciphertext.length, false);
  offset += 4;
  segment.set(ciphertext, offset);
  return segment;
}

/**
 * Extract the ciphertext for `adminPrincipal` from a segment encoded by
 * encodeAdminSegment, or undefined when the segment belongs to another
 * principal.
 */
function decodeAdminSegment(
  segment: Uint8Array,
  adminPrincipal: string,
): Uint8Array | undefined {
  const view = new DataView(
    segment.buffer,
    segment.byteOffset,
    segment.byteLength,
  );
  const principalLength = view.getUint32(0, false);
  const principal = new TextDecoder().decode(
    segment.slice(4, 4 + principalLength),
  );
  if (principal !== adminPrincipal) {
    return undefined;
  }
  const ciphertextLength = view.getUint32(4 + principalLength, false);
  return segment.slice(
    4 + principalLength + 4,
    4 + principalLength + 4 + ciphertextLength,
  );
}

/**
 * Module-level cache of the admin's derived VetKey, keyed by principal. The
 * key is derived once per admin session and reused across order rows so we do
 * not burn vetkd_derive_key cycles for every order.
 */
const adminKeyCache = new Map<string, VetKey>();

/**
 * Derive (and cache) the admin's IBE VetKey for the current session. The
 * derivation input is the caller's own principal, matching the backend's
 * admin-only vetkd_derive_key endpoint.
 */
export async function getAdminIbeKey(
  backend: Backend,
  myPrincipal: Principal,
): Promise<VetKey> {
  const cached = adminKeyCache.get(myPrincipal.toText());
  if (cached) {
    return cached;
  }

  const tsk = TransportSecretKey.random();
  const [encryptedKeyBytes, publicKeyBytes] = await Promise.all([
    backend.getMyEncryptedIbeKey(tsk.publicKeyBytes()),
    backend.getIbePublicKey(),
  ]);

  const encryptedKey = EncryptedVetKey.deserialize(encryptedKeyBytes);
  const derivedPublicKey = DerivedPublicKey.deserialize(publicKeyBytes);
  const vetKey = encryptedKey.decryptAndVerify(
    tsk,
    derivedPublicKey,
    myPrincipal.toUint8Array(),
  );

  adminKeyCache.set(myPrincipal.toText(), vetKey);
  return vetKey;
}

/**
 * Decrypt the shipping details for a single admin principal from a
 * length-prefixed concatenated blob. Each segment is keyed by the admin
 * principal it was encrypted to, so the segment is found by matching the
 * principal rather than by list position — the blob stays decryptable even if
 * the admin allowlist changes between order creation and decryption.
 */
export async function decryptShipping(
  encryptedBlob: Uint8Array,
  adminPrincipal: string,
  backend: Backend,
): Promise<string> {
  const segments = splitLengthPrefixed(encryptedBlob);
  let ciphertextBytes: Uint8Array | undefined;
  for (const segment of segments) {
    ciphertextBytes = decodeAdminSegment(segment, adminPrincipal);
    if (ciphertextBytes) {
      break;
    }
  }
  if (!ciphertextBytes) {
    throw new Error("Encrypted shipping blob has no segment for this admin");
  }

  const vetKey = await getAdminIbeKey(
    backend,
    Principal.fromText(adminPrincipal),
  );
  const ciphertext = IbeCiphertext.deserialize(ciphertextBytes);
  const plaintextBytes = ciphertext.decrypt(vetKey);
  return new TextDecoder().decode(plaintextBytes);
}

/**
 * Fetch the current encryption-recipient principal list from the backend.
 *
 * Uses the public `getEncryptionRecipients` query (returns only OWNER/ADMIN
 * principals) instead of the admin-only `listAdmins`, so anonymous guests can
 * encrypt shipping details during checkout without trapping on an
 * authorization check.
 */
export async function fetchAdminPrincipals(
  backend: Backend,
): Promise<Principal[]> {
  return backend.getEncryptionRecipients();
}
