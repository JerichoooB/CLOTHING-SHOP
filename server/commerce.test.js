import test from "node:test";
import assert from "node:assert/strict";
import { fixture, checkout } from "./testing.js";
async function admin(f) {
  const account = await f.register("Store Admin", "admin@example.test");
  await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
    account.user.id,
  ]);
  return account;
}
test("checkout is server-priced, atomic and idempotent; orders are private and admin-only transitions are enforced", async () => {
  const f = await fixture();
  try {
    const customer = await f.register(),
      manager = await admin(f),
      body = checkout([{ id: 0, size: "M", qty: 2 }]);
    body.total = 1;
    assert.equal(
      (await f.api("/api/checkout", { method: "POST", body })).status,
      401,
    );
    const responses = await Promise.all([
      f.api("/api/checkout", { method: "POST", body, cookie: customer.cookie }),
      f.api("/api/checkout", { method: "POST", body, cookie: customer.cookie }),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
    const order = responses[0].data.order;
    assert.equal(order.total, 1798);
    assert.equal(order.shipping, 0);
    assert.equal(order.payment.status, "approved");
    assert.equal(order.payment.isSimulated, true);
    assert.equal(order.status, "pending");
    assert.equal(order.items[0].unitPrice, 899);
    assert.equal(
      (
        await f.database.query(
          "SELECT stock FROM product_variants WHERE product_id=0 AND size='M'",
        )
      ).rows[0].stock,
      18,
    );
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM orders")).rows[0]
        .n,
      1,
    );
    assert.equal(
      (
        await f.api("/api/checkout", {
          method: "POST",
          cookie: customer.cookie,
          body: { ...body, items: [{ id: 0, size: "M", qty: 3 }] },
        })
      ).status,
      409,
    );
    const other = await f.register("Other Customer", "other@example.test");
    assert.equal(
      (await f.api("/api/orders/" + order.id, { cookie: other.cookie })).status,
      404,
    );
    assert.equal(
      (await f.api("/api/admin/inventory", { cookie: customer.cookie })).status,
      403,
    );
    assert.equal(
      (
        await f.api("/api/admin/orders/" + order.id + "/status", {
          method: "PATCH",
          cookie: customer.cookie,
          body: { status: "processing", expectedStatus: "pending" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.api("/api/admin/orders/" + order.id + "/status", {
          method: "PATCH",
          cookie: manager.cookie,
          body: { status: "delivered", expectedStatus: "pending" },
        })
      ).status,
      409,
    );
    let previous = "pending";
    for (const status of ["processing", "shipped", "delivered"]) {
      const changed = await f.api("/api/admin/orders/" + order.id + "/status", {
        method: "PATCH",
        cookie: manager.cookie,
        body: {
          status,
          expectedStatus: previous,
          trackingNumber: status === "shipped" ? "DEMO-TRACK-1" : "",
        },
      });
      assert.equal(changed.status, 200);
      assert.equal(changed.data.order.status, status);
      previous = status;
    }
    const final = await f.api("/api/orders/" + order.id, {
      cookie: customer.cookie,
    });
    assert.equal(final.data.order.history.length, 4);
    assert.equal(final.data.order.trackingNumber, "DEMO-TRACK-1");
    assert.equal(
      (
        await f.api("/api/admin/orders/" + order.id + "/status", {
          method: "PATCH",
          cookie: manager.cookie,
          body: { status: "cancelled", expectedStatus: "delivered" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.api("/api/orders/attempt/" + body.idempotencyKey, {
          cookie: customer.cookie,
        })
      ).data.order.id,
      order.id,
    );
  } finally {
    await f.close();
  }
});
test("concurrent buyers cannot oversell and failed multi-item checkout rolls back all writes", async () => {
  const f = await fixture();
  try {
    const a = await f.register(),
      b = await f.register("Second Buyer", "second@example.test");
    await f.database.query(
      "UPDATE product_variants SET stock=1 WHERE product_id=4",
    );
    const results = await Promise.all(
      [a, b].map((customer) =>
        f.api("/api/checkout", {
          method: "POST",
          cookie: customer.cookie,
          body: checkout([{ id: 4, size: "One size", qty: 1 }]),
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal(
      (
        await f.database.query(
          "SELECT stock FROM product_variants WHERE product_id=4",
        )
      ).rows[0].stock,
      0,
    );
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM payments"))
        .rows[0].n,
      1,
    );
    await f.database.query(
      "UPDATE product_variants SET stock=0 WHERE product_id=1 AND size='M'",
    );
    const count = (
      await f.database.query("SELECT count(*)::int AS n FROM orders")
    ).rows[0].n;
    const invalid = await f.api("/api/checkout", {
      method: "POST",
      cookie: a.cookie,
      body: checkout([
        { id: 0, size: "M", qty: 1 },
        { id: 1, size: "M", qty: 1 },
      ]),
    });
    assert.equal(invalid.status, 409);
    assert.equal(
      (
        await f.database.query(
          "SELECT stock FROM product_variants WHERE product_id=0 AND size='M'",
        )
      ).rows[0].stock,
      20,
    );
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM orders")).rows[0]
        .n,
      count,
    );
    assert.equal(
      (
        await f.api("/api/checkout/quote", {
          method: "POST",
          cookie: a.cookie,
          body: { items: [{ id: 0, size: "M", qty: -1 }] },
        })
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});
test("cancellation restores stock once, reverses demo payment, and inventory adjustments leave audit records", async () => {
  const f = await fixture();
  try {
    const customer = await f.register(),
      manager = await admin(f);
    const placed = await f.api("/api/checkout", {
      method: "POST",
      cookie: customer.cookie,
      body: checkout([{ id: 4, size: "One size", qty: 2 }]),
    });
    assert.equal(placed.data.order.total, 1298);
    assert.equal(placed.data.order.shipping, 100);
    const id = placed.data.order.id,
      change = {
        method: "PATCH",
        cookie: manager.cookie,
        body: { status: "cancelled", expectedStatus: "pending" },
      };
    const cancelled = await f.api(
      "/api/admin/orders/" + id + "/status",
      change,
    );
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.data.order.payment.status, "reversed");
    assert.equal(
      (await f.api("/api/admin/orders/" + id + "/status", change)).status,
      409,
    );
    const variant = (
      await f.database.query(
        "SELECT id,stock FROM product_variants WHERE product_id=4",
      )
    ).rows[0];
    assert.equal(variant.stock, 20);
    assert.equal(
      (
        await f.api("/api/admin/inventory/" + variant.id + "/adjust", {
          method: "POST",
          cookie: manager.cookie,
          body: { delta: -21, reason: "Invalid reduction" },
        })
      ).status,
      409,
    );
    const adjustment = await f.api(
      "/api/admin/inventory/" + variant.id + "/adjust",
      {
        method: "POST",
        cookie: manager.cookie,
        body: { delta: -17, reason: "Stock count correction" },
      },
    );
    assert.equal(adjustment.status, 200);
    assert.equal(adjustment.data.stock, 3);
    const low = await f.api("/api/admin/inventory?lowStock=1", {
      cookie: manager.cookie,
    });
    assert.ok(low.data.items.some((item) => item.id === variant.id));
    const history = await f.api(
      "/api/admin/inventory/" + variant.id + "/movements",
      { cookie: manager.cookie },
    );
    assert.equal(history.data.movements.length, 4);
    assert.equal(history.data.movements[0].delta, -17);
    assert.equal(
      (await f.api("/api/admin/summary", { cookie: manager.cookie })).data
        .lowStock,
      1,
    );
  } finally {
    await f.close();
  }
});
