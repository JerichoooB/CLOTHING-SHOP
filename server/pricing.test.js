import test from "node:test";
import assert from "node:assert/strict";
import { fixture, checkout } from "./testing.js";
import { initializeDatabase } from "./db.js";

test("price migration updates existing products to PHP150–700 without changing historic orders or stock", async () => {
  const f = await fixture();
  try {
    const user = await f.register();
    await f.database.query("DELETE FROM schema_migrations WHERE version=2");
    await f.database.query("UPDATE products SET price_cents=89900 WHERE id=0");
    const original = await f.api("/api/checkout", {
      method: "POST",
      cookie: user.cookie,
      body: checkout([{ id: 0, size: "M", qty: 1 }]),
    });
    assert.equal(original.status, 201);
    assert.equal(original.data.order.items[0].unitPrice, 899);
    const stock = (
      await f.database.query(
        "SELECT id,stock FROM product_variants ORDER BY id",
      )
    ).rows;
    const movements = (
      await f.database.query(
        "SELECT count(*)::int AS n FROM inventory_movements",
      )
    ).rows[0].n;
    await initializeDatabase(f.database);
    const products = (await f.api("/api/products")).data;
    assert.equal(Math.min(...products.map((p) => p.price)), 150);
    assert.equal(Math.max(...products.map((p) => p.price)), 700);
    assert.ok(products.every((p) => p.price >= 150 && p.price <= 700));
    assert.deepEqual(
      (
        await f.database.query(
          "SELECT id,stock FROM product_variants ORDER BY id",
        )
      ).rows,
      stock,
    );
    assert.equal(
      (
        await f.database.query(
          "SELECT count(*)::int AS n FROM inventory_movements",
        )
      ).rows[0].n,
      movements,
    );
    const preserved = (
      await f.api("/api/orders/" + original.data.order.id, {
        cookie: user.cookie,
      })
    ).data.order;
    assert.equal(preserved.items[0].unitPrice, 899);
    assert.equal(preserved.total, 999);
    const quote = (
      await f.api("/api/checkout/quote", {
        method: "POST",
        cookie: user.cookie,
        body: { items: [{ id: 0, size: "M", qty: 1 }] },
      })
    ).data;
    assert.equal(quote.subtotal, 350);
    assert.equal(quote.shipping, 100);
    assert.equal(quote.total, 450);
    const free = (
      await f.api("/api/checkout/quote", {
        method: "POST",
        cookie: user.cookie,
        body: { items: [{ id: 0, size: "M", qty: 5 }] },
      })
    ).data;
    assert.equal(free.subtotal, 1750);
    assert.equal(free.shipping, 0);
    await initializeDatabase(f.database);
    assert.equal(
      (
        await f.database.query(
          "SELECT count(*)::int AS n FROM schema_migrations WHERE version=2",
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await f.close();
  }
});
