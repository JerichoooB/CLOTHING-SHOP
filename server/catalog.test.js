import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { initializeDatabase } from "./db.js";
import { fixture } from "./testing.js";
test("PostgreSQL catalog exposes product IDs, size SKUs and stock; reseeding preserves stock", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.api("/api/health")).data.database, "postgresql");
    const result = await f.api("/api/products");
    assert.equal(result.status, 200);
    const products = result.data;
    assert.equal(products.length, 31);
    assert.equal(new Set(products.map((p) => p.id)).size, 31);
    for (const product of products) {
      assert.ok(product.sku);
      assert.ok(product.variants.length);
      assert.ok(product.variants.every((v) => v.stock === 20 && v.sku && v.id));
      assert.ok(product.price > 0);
    }
    for (const [category, count] of [
      ["Men", 8],
      ["Women", 8],
      ["Unisex", 10],
      ["Accessories", 9],
    ])
      assert.equal(
        products.filter((p) => p.collections.includes(category)).length,
        count,
      );
    const variant = products[0].variants[0];
    await f.database.query("UPDATE product_variants SET stock=7 WHERE id=$1", [
      variant.id,
    ]);
    const movements = (
      await f.database.query(
        "SELECT count(*)::int AS n FROM inventory_movements",
      )
    ).rows[0].n;
    await initializeDatabase(f.database);
    assert.equal(
      (
        await f.database.query(
          "SELECT stock FROM product_variants WHERE id=$1",
          [variant.id],
        )
      ).rows[0].stock,
      7,
    );
    assert.equal(
      (
        await f.database.query(
          "SELECT count(*)::int AS n FROM inventory_movements",
        )
      ).rows[0].n,
      movements,
    );
    assert.equal((await f.api("/api/products/not-an-id")).status, 404);
    for (const image of new Set(products.map((p) => p.image))) {
      const data = await readFile(
        new URL("../public" + image, import.meta.url),
      );
      assert.equal(data.subarray(1, 4).toString(), "PNG");
    }
    const logo = await readFile(
      new URL("../public/images/clover-five-leaf.svg", import.meta.url),
      "utf8",
    );
    assert.equal((logo.match(/transform="rotate/g) || []).length, 5);
  } finally {
    await f.close();
  }
});
