import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

// Web Crypto's digest/randomUUID require HTTPS; getRandomValues also works
// when the store is opened over HTTP on a local network.
export function checkoutSignature(payload) {
  return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(payload))));
}

export function checkoutKey() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
