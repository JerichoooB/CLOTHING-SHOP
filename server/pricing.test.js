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

test("web price editing requires admin, accepts prices above PHP700, records changes and preserves order snapshots", async () => {
  const f = await fixture();
  try {
    const admin = await f.register("Price Admin", "price-admin@example.test"),
      customer = await f.register(
        "Price Customer",
        "price-customer@example.test",
      );
    await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
      admin.user.id,
    ]);
    const path = "/api/admin/products/0/price",
      body = { price: "399.95", expectedPriceCents: 35000 };
    assert.equal((await f.api(path, { method: "PATCH", body })).status, 401);
    assert.equal(
      (await f.api(path, { method: "PATCH", body, cookie: customer.cookie }))
        .status,
      403,
    );
    for (const price of [
      "149.99",
      "21474836.48",
      "-20",
      "350.001",
      "1e2",
      null,
      "",
      "0",
    ])
      assert.equal(
        (
          await f.api(path, {
            method: "PATCH",
            body: { price, expectedPriceCents: 35000 },
            cookie: admin.cookie,
          })
        ).status,
        400,
      );
    const old = await f.api("/api/checkout", {
      method: "POST",
      cookie: customer.cookie,
      body: checkout([{ id: 0, size: "M", qty: 1 }]),
    });
    assert.equal(old.status, 201);
    const stock = (
      await f.database.query(
        "SELECT id,stock FROM product_variants ORDER BY id",
      )
    ).rows;
    const changed = await f.api(path, {
      method: "PATCH",
      body,
      cookie: admin.cookie,
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.priceCents, 39995);
    assert.equal(changed.data.changed, true);
    const history = (
      await f.database.query(
        "SELECT previous_price_cents,new_price_cents,actor_id FROM product_price_history",
      )
    ).rows;
    assert.equal(history.length, 1);
    assert.equal(history[0].previous_price_cents, 35000);
    assert.equal(history[0].new_price_cents, 39995);
    assert.equal(history[0].actor_id, admin.user.id);
    assert.equal(
      (
        await f.api(path, {
          method: "PATCH",
          body: { price: "450", expectedPriceCents: 35000 },
          cookie: admin.cookie,
        })
      ).status,
      409,
    );
    const same = await f.api(path, {
      method: "PATCH",
      body: { price: "399.95", expectedPriceCents: 39995 },
      cookie: admin.cookie,
    });
    assert.equal(same.data.changed, false);
    assert.equal(
      (
        await f.database.query(
          "SELECT count(*)::int AS n FROM product_price_history",
        )
      ).rows[0].n,
      1,
    );
    await initializeDatabase(f.database);
    assert.equal((await f.api("/api/products/0")).data.price, 399.95);
    const quote = (
      await f.api("/api/checkout/quote", {
        method: "POST",
        cookie: customer.cookie,
        body: { items: [{ id: 0, size: "M", qty: 1 }] },
      })
    ).data;
    assert.equal(quote.subtotal, 399.95);
    assert.equal(quote.total, 499.95);
    const receipt = (
      await f.api("/api/orders/" + old.data.order.id + "/receipt", {
        cookie: customer.cookie,
      })
    ).data.order;
    assert.equal(receipt.items[0].unitPrice, 350);
    assert.equal(receipt.total, 450);
    assert.deepEqual(
      (
        await f.database.query(
          "SELECT id,stock FROM product_variants ORDER BY id",
        )
      ).rows,
      stock,
    );
    const bounds = await f.api(path, {
      method: "PATCH",
      body: { price: "700", expectedPriceCents: 39995 },
      cookie: admin.cookie,
    });
    assert.equal(bounds.status, 200);
    const higher = await f.api(path, {
      method: "PATCH",
      cookie: admin.cookie,
      body: { price: "1250.50", expectedPriceCents: 70000 },
    });
    assert.equal(higher.status, 200);
    assert.equal(higher.data.priceCents, 125050);
    assert.equal((await f.api("/api/products/0")).data.price, 1250.5);
    assert.equal(
      (
        await f.api(path, {
          method: "PATCH",
          body: { price: "150", expectedPriceCents: 125050 },
          cookie: admin.cookie,
        })
      ).status,
      200,
    );
  } finally {
    await f.close();
  }
});

test("concurrent admin edits cannot silently overwrite the same product price", async () => {
  const f = await fixture();
  try {
    const admin = await f.register();
    await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
      admin.user.id,
    ]);
    const results = await Promise.all(
      ["400", "450"].map((price) =>
        f.api("/api/admin/products/0/price", {
          method: "PATCH",
          cookie: admin.cookie,
          body: { price, expectedPriceCents: 35000 },
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (
        await f.database.query(
          "SELECT count(*)::int AS n FROM product_price_history",
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await f.close();
  }
});

test("large supported product prices fail oversized checkouts cleanly rather than overflowing database totals", async () => {
  const f = await fixture();
  try {
    const admin = await f.register();
    await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
      admin.user.id,
    ]);
    const update = await f.api("/api/admin/products/0/price", {
      method: "PATCH",
      cookie: admin.cookie,
      body: { price: "21474836.47", expectedPriceCents: 35000 },
    });
    assert.equal(update.status, 200);
    const quote = await f.api("/api/checkout/quote", {
      method: "POST",
      cookie: admin.cookie,
      body: { items: [{ id: 0, size: "M", qty: 2 }] },
    });
    assert.equal(quote.status, 400);
    assert.match(quote.data.error, /total is too large/);
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM orders")).rows[0]
        .n,
      0,
    );
  } finally {
    await f.close();
  }
});
