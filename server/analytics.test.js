import test from "node:test";
import assert from "node:assert/strict";
import { fixture, checkout } from "./testing.js";

test("analytics counts simulated sales once, excludes cancellations, fills Manila dates, and requires admin access", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.api("/api/admin/analytics")).status, 401);
    const admin = await f.register(
      "Analytics Admin",
      "analytics-admin@example.test",
    );
    const customer = await f.register(
      "Analytics Customer",
      "analytics-customer@example.test",
    );
    assert.equal(
      (await f.api("/api/admin/analytics", { cookie: customer.cookie })).status,
      403,
    );
    await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
      admin.user.id,
    ]);
    for (const days of ["bad", "0", "8", "30.0", "7&days=30"])
      assert.equal(
        (
          await f.api("/api/admin/analytics?days=" + days, {
            cookie: admin.cookie,
          })
        ).status,
        400,
      );
    const empty = (
      await f.api("/api/admin/analytics?days=7", { cookie: admin.cookie })
    ).data;
    assert.equal(empty.summary.revenue, 0);
    assert.equal(empty.summary.averageOrder, 0);
    assert.equal(empty.daily.length, 7);
    assert.equal(empty.topProducts.length, 0);
    async function order(items) {
      const result = await f.api("/api/checkout", {
        method: "POST",
        body: checkout(items),
        cookie: customer.cookie,
      });
      assert.equal(result.status, 201);
      return result.data.order;
    }
    const first = await order([
      { id: 0, size: "M", qty: 2 },
      { id: 1, size: "S", qty: 1 },
    ]);
    const second = await order([{ id: 0, size: "L", qty: 1 }]);
    const cancelled = await order([{ id: 0, size: "S", qty: 1 }]);
    const old = await order([{ id: 0, size: "XL", qty: 1 }]);
    await f.database.query(
      "UPDATE orders SET created_at=((now() AT TIME ZONE 'Asia/Manila')::date-6)::timestamp AT TIME ZONE 'Asia/Manila' WHERE id=$1",
      [first.id],
    );
    await f.database.query(
      "UPDATE orders SET created_at=now()-interval '100 days' WHERE id=$1",
      [old.id],
    );
    assert.equal(
      (
        await f.api("/api/admin/orders/" + cancelled.id + "/status", {
          method: "PATCH",
          cookie: admin.cookie,
          body: { status: "cancelled", expectedStatus: "pending" },
        })
      ).status,
      200,
    );
    const result = await f.api("/api/admin/analytics?days=7", {
      cookie: admin.cookie,
    });
    assert.equal(result.status, 200);
    const data = result.data;
    assert.equal(data.simulated, true);
    assert.equal(data.timezone, "Asia/Manila");
    assert.equal(data.summary.orders, 3);
    assert.equal(data.summary.sales, 2);
    assert.equal(data.summary.cancelled, 1);
    assert.equal(data.summary.units, 4);
    assert.equal(data.summary.customers, 1);
    assert.equal(data.summary.revenue, first.total + second.total);
    assert.equal(data.summary.merchandise, first.subtotal + second.subtotal);
    assert.equal(data.summary.shipping, first.shipping + second.shipping);
    assert.equal(data.summary.reversed, cancelled.total);
    assert.equal(data.summary.averageOrder, (first.total + second.total) / 2);
    assert.equal(data.daily.length, 7);
    assert.equal(data.daily[0].revenue, first.total);
    assert.equal(data.daily.at(-1).revenue, second.total);
    assert.equal(
      data.daily.reduce((n, day) => n + day.revenue, 0),
      data.summary.revenue,
    );
    assert.equal(data.daily.filter((day) => day.orders === 0).length, 5);
    assert.equal(data.topProducts[0].id, 0);
    assert.equal(data.topProducts[0].units, 3);
    assert.equal(
      data.topProducts.reduce((n, p) => n + p.revenue, 0),
      data.summary.merchandise,
    );
    assert.equal(data.statuses.find((s) => s.status === "cancelled").orders, 1);
    assert.equal(data.statuses.find((s) => s.status === "pending").orders, 2);
    assert.equal(
      (await f.api("/api/admin/analytics?days=90", { cookie: admin.cookie }))
        .data.daily.length,
      90,
    );
  } finally {
    await f.close();
  }
});

test("grouped stock management paginates products, returns all sizes and filters by size SKU or low stock", async () => {
  const f = await fixture();
  try {
    const admin = await f.register();
    await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
      admin.user.id,
    ]);
    const variants = (
      await f.database.query(
        "SELECT id::text,sku,size,stock FROM product_variants WHERE product_id=0 ORDER BY id",
      )
    ).rows;
    await f.database.query("UPDATE product_variants SET stock=0 WHERE id=$1", [
      variants[0].id,
    ]);
    const all = (
      await f.api("/api/admin/inventory?grouped=1", { cookie: admin.cookie })
    ).data;
    assert.equal(all.items.length, 20);
    assert.equal(new Set(all.items.map((p) => p.id)).size, 20);
    assert.equal(all.total, 31);
    const product = all.items.find((p) => p.productId === 0);
    assert.equal(product.variants.length, variants.length);
    const filtered = (
      await f.api(
        "/api/admin/inventory?grouped=1&search=" +
          encodeURIComponent(variants[1].sku),
        { cookie: admin.cookie },
      )
    ).data;
    assert.equal(filtered.total, 1);
    assert.equal(filtered.items[0].variants.length, variants.length);
    const low = (
      await f.api("/api/admin/inventory?grouped=1&lowStock=1", {
        cookie: admin.cookie,
      })
    ).data;
    assert.equal(low.total, 1);
    assert.equal(low.items[0].productId, 0);
    assert.equal(low.items[0].variants.length, variants.length);
    const inventory = (
      await f.api("/api/admin/analytics?days=7", { cookie: admin.cookie })
    ).data.stock;
    assert.equal(inventory.outOfStock, 1);
    assert.equal(inventory.lowStock, 0);
    assert.equal(
      (
        await f.api("/api/admin/inventory/" + variants[1].id + "/adjust", {
          method: "POST",
          cookie: admin.cookie,
          body: { delta: 3, reason: "Size-specific adjustment" },
        })
      ).status,
      200,
    );
    const updated = (
      await f.database.query(
        "SELECT id::text,stock FROM product_variants WHERE product_id=0 ORDER BY id",
      )
    ).rows;
    assert.equal(updated[0].stock, 0);
    assert.equal(updated[1].stock, variants[1].stock + 3);
    assert.equal(updated[2].stock, variants[2].stock);
  } finally {
    await f.close();
  }
});
