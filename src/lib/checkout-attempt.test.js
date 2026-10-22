import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { checkoutSignature, checkoutKey } from "./checkout-attempt.js";

test("checkout works without secure-context digest or randomUUID", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
  });
  try {
    const payload = { items: [{ id: 1, qty: 2 }], shipping: { name: "José" } };
    assert.equal(
      checkoutSignature(payload),
      createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    );
    assert.notEqual(checkoutSignature(payload), checkoutSignature({ ...payload, items: [] }));
    const key = checkoutKey();
    assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(key, checkoutKey());
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else delete globalThis.crypto;
  }
});
