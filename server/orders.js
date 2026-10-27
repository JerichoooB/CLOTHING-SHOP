import { Router } from "express";
import { randomUUID, createHash } from "node:crypto";
import { transaction } from "./db.js";
import { requireUser, requireAdmin, fail } from "./security.js";
import { salesAnalytics } from "./analytics.js";
import { deliverReceipt, receiptEmailStatus } from "./receipt-email.js";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const transitions = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50)
    fail(400, "Your bag must contain between 1 and 50 items.");
  const grouped = new Map();
  for (const item of items) {
    if (
      !Number.isInteger(item.id) ||
      item.id < 0 ||
      !Number.isInteger(item.qty) ||
      item.qty < 1 ||
      item.qty > 99 ||
      typeof item.size !== "string" ||
      item.size.length > 30
    )
      fail(400, "An item or quantity is invalid.");
    const key = item.id + ":" + item.size;
    const old = grouped.get(key);
    if (old) old.qty += item.qty;
    else grouped.set(key, { id: item.id, size: item.size, qty: item.qty });
  }
  const result = [...grouped.values()].sort(
    (a, b) => a.id - b.id || a.size.localeCompare(b.size),
  );
  if (result.some((item) => item.qty > 99))
    fail(400, "The maximum quantity per size is 99.");
  return result;
}
function address(input) {
  const result = {};
  for (const [key, min, max] of [
    ["name", 2, 80],
    ["phone", 7, 30],
    ["address", 5, 250],
    ["city", 2, 80],
    ["region", 2, 80],
    ["postalCode", 3, 20],
  ]) {
    const value = typeof input?.[key] === "string" ? input[key].trim() : "";
    if (value.length < min || value.length > max)
      fail(
        400,
        `Please enter a valid ${key === "postalCode" ? "postal code" : key}.`,
      );
    result[key] = value;
  }
  if (!/^[+\d ()-]+$/.test(result.phone))
    fail(400, "Please enter a valid phone number.");
  result.country = "PH";
  if (input?.country && input.country !== "PH")
    fail(400, "This demo checkout ships within the Philippines.");
  return result;
}
async function quoteItems(client, items, lock = false) {
  const result = await client.query(
    `SELECT v.id AS variant_id,v.product_id,v.sku,v.size,v.stock,p.name,p.price_cents FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.product_id=ANY($1::int[]) AND v.active AND p.active ORDER BY v.id ${lock ? "FOR UPDATE OF v" : ""}`,
    [items.map((item) => item.id)],
  );
  const lines = items.map((item) => {
    const row = result.rows.find(
      (row) => row.product_id === item.id && row.size === item.size,
    );
    if (!row) fail(400, "A product or selected size is no longer available.");
    if (row.stock < item.qty)
      fail(
        409,
        `${row.name} (${row.size}) has only ${row.stock} left. Please update your bag.`,
      );
    return {
      variantId: row.variant_id,
      id: row.product_id,
      sku: row.sku,
      name: row.name,
      size: row.size,
      qty: item.qty,
      stock: row.stock,
      unitPriceCents: row.price_cents,
      lineTotalCents: row.price_cents * item.qty,
    };
  });
  const subtotalCents = lines.reduce(
      (sum, line) => sum + line.lineTotalCents,
      0,
    ),
    shippingCents = subtotalCents >= 150000 ? 0 : 10000;
  return {
    lines,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}
function publicQuote(quote) {
  return {
    lines: quote.lines.map((line) => ({
      ...line,
      unitPrice: line.unitPriceCents / 100,
      lineTotal: line.lineTotalCents / 100,
    })),
    subtotal: quote.subtotalCents / 100,
    shipping: quote.shippingCents / 100,
    total: quote.totalCents / 100,
    currency: "PHP",
    paymentMode: "demo",
  };
}
const orderSelect = `SELECT o.id,o.order_number,o.user_id,o.status,o.subtotal_cents,o.shipping_cents,o.total_cents,o.currency,o.shipping_address,o.tracking_number,o.created_at,o.updated_at,u.name AS customer_name,u.email AS customer_email,pay.status AS payment_status,pay.reference AS payment_reference,pay.is_simulated,
 COALESCE((SELECT json_agg(json_build_object('id',i.id::text,'productId',i.product_id,'variantId',i.variant_id::text,'name',i.product_name,'sku',i.sku,'size',i.size,'qty',i.quantity,'unitPrice',i.unit_price_cents/100.0,'lineTotal',i.line_total_cents/100.0,'image',p.image,'cell',p.image_cell) ORDER BY i.id) FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id),'[]'::json) AS items,
 COALESCE((SELECT json_agg(json_build_object('id',h.id::text,'previousStatus',h.previous_status,'status',h.status,'note',h.note,'createdAt',h.created_at) ORDER BY h.id) FROM order_status_history h WHERE h.order_id=o.id),'[]'::json) AS history
 ,(SELECT json_build_object('status',d.status,'recipient',d.recipient,'sentAt',d.sent_at,'lastAttemptAt',d.last_attempt_at) FROM receipt_email_deliveries d WHERE d.order_id=o.id) AS receipt_email
 FROM orders o JOIN users u ON u.id=o.user_id JOIN payments pay ON pay.order_id=o.id`;
function orderFrom(row) {
  return {
    id: row.id,
    number: "CLV-" + String(row.order_number).padStart(6, "0"),
    userId: row.user_id,
    status: row.status,
    subtotal: row.subtotal_cents / 100,
    shipping: row.shipping_cents / 100,
    total: row.total_cents / 100,
    currency: row.currency,
    shippingAddress: row.shipping_address,
    trackingNumber: row.tracking_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: { name: row.customer_name, email: row.customer_email },
    payment: {
      status: row.payment_status,
      reference: row.payment_reference,
      isSimulated: row.is_simulated,
    },
    items: row.items,
    history: row.history,
    receiptEmail: row.receipt_email || { status: "not_sent" },
  };
}
async function getOrder(database, id) {
  const result = await database.query(orderSelect + " WHERE o.id=$1", [id]);
  return result.rows[0] ? orderFrom(result.rows[0]) : null;
}
export function commerceRouter(database, receiptEmail) {
  const router = Router();
  router.use(requireUser);
  router.post("/checkout/quote", async (req, res) =>
    res.json(
      publicQuote(await quoteItems(database, normalizeItems(req.body?.items))),
    ),
  );
  router.post("/checkout", async (req, res) => {
    const items = normalizeItems(req.body?.items),
      shipping = address(req.body?.shipping),
      key = req.body?.idempotencyKey;
    if (!UUID.test(key || ""))
      fail(400, "A valid checkout request ID is required.");
    if (req.body?.paymentMethod !== "demo")
      fail(400, "Only simulated demo payments are supported.");
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ items, shipping }))
      .digest("hex");
    const result = await transaction(database, async (client) => {
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        req.user.id,
      ]);
      const previous = await client.query(
        "SELECT id,request_hash FROM orders WHERE user_id=$1 AND idempotency_key=$2",
        [req.user.id, key],
      );
      if (previous.rowCount) {
        if (previous.rows[0].request_hash !== requestHash)
          fail(
            409,
            "This checkout request was already used for different details.",
          );
        return { id: previous.rows[0].id, replayed: true };
      }
      const quote = await quoteItems(client, items, true),
        id = randomUUID();
      await client.query(
        "INSERT INTO orders(id,user_id,subtotal_cents,shipping_cents,total_cents,shipping_address,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id,
          req.user.id,
          quote.subtotalCents,
          quote.shippingCents,
          quote.totalCents,
          shipping,
          key,
          requestHash,
        ],
      );
      for (const line of quote.lines) {
        const updated = await client.query(
          "UPDATE product_variants SET stock=stock-$1 WHERE id=$2 RETURNING stock",
          [line.qty, line.variantId],
        );
        await client.query(
          "INSERT INTO order_items(order_id,product_id,variant_id,product_name,sku,size,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            id,
            line.id,
            line.variantId,
            line.name,
            line.sku,
            line.size,
            line.qty,
            line.unitPriceCents,
          ],
        );
        await client.query(
          "INSERT INTO inventory_movements(variant_id,quantity_change,stock_after,reason,order_id,actor_id) VALUES($1,$2,$3,'Order checkout',$4,$5)",
          [line.variantId, -line.qty, updated.rows[0].stock, id, req.user.id],
        );
      }
      await client.query(
        "INSERT INTO payments(id,order_id,provider,status,amount_cents,reference) VALUES($1,$2,'demo','approved',$3,$4)",
        [randomUUID(), id, quote.totalCents, "DEMO-" + randomUUID()],
      );
      await client.query(
        "INSERT INTO order_status_history(order_id,status,actor_id,note) VALUES($1,'pending',$2,'Order placed; demo payment approved. No money charged.')",
        [id, req.user.id],
      );
      await client.query(
        "INSERT INTO receipt_email_deliveries(order_id,recipient) VALUES($1,$2)",
        [id, req.user.email],
      );
      return { id, replayed: false };
    });
    const order = await getOrder(database, result.id);
    try {
      order.receiptEmail = await deliverReceipt(database, order, receiptEmail);
    } catch {
      order.receiptEmail = { status: "failed" };
      console.error(
        "Clover receipt email could not be recorded; order remains confirmed.",
      );
    }
    return res.status(result.replayed ? 200 : 201).json({
      order,
      replayed: result.replayed,
    });
  });
  router.get("/orders/attempt/:key", async (req, res) => {
    if (!UUID.test(req.params.key)) fail(400, "Invalid checkout request ID.");
    const result = await database.query(
      "SELECT id FROM orders WHERE user_id=$1 AND idempotency_key=$2",
      [req.user.id, req.params.key],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Order not found." });
    return res.json({ order: await getOrder(database, result.rows[0].id) });
  });
  router.get("/orders", async (req, res) =>
    res.json(await listOrders(database, req.query, req.user.id)),
  );
  router.get("/orders/:id/receipt", async (req, res) => {
    if (!UUID.test(req.params.id)) fail(404, "Receipt not found.");
    const found = await database.query(
      "SELECT id FROM orders WHERE id=$1 AND (user_id=$2 OR $3::boolean)",
      [req.params.id, req.user.id, req.user.role === "admin"],
    );
    if (!found.rowCount) fail(404, "Receipt not found.");
    return res.json({ order: await getOrder(database, req.params.id) });
  });
  router.post("/orders/:id/receipt/email", async (req, res) => {
    if (!UUID.test(req.params.id)) fail(404, "Receipt not found.");
    const found = await database.query(
      "SELECT id FROM orders WHERE id=$1 AND (user_id=$2 OR $3::boolean)",
      [req.params.id, req.user.id, req.user.role === "admin"],
    );
    if (!found.rowCount) fail(404, "Receipt not found.");
    const delivery = await receiptEmailStatus(database, req.params.id);
    if (
      delivery.lastAttemptAt &&
      Date.now() - new Date(delivery.lastAttemptAt).getTime() < 60000
    ) {
      res.set("Retry-After", "60");
      fail(429, "Please wait one minute before emailing this receipt again.");
    }
    const order = await getOrder(database, req.params.id);
    return res.json({
      delivery: await deliverReceipt(database, order, receiptEmail, true),
    });
  });
  router.get("/orders/:id", async (req, res) => {
    if (!UUID.test(req.params.id)) fail(404, "Order not found.");
    const found = await database.query(
      "SELECT id FROM orders WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id],
    );
    if (!found.rowCount) fail(404, "Order not found.");
    return res.json({ order: await getOrder(database, req.params.id) });
  });
  return router;
}
function paging(query) {
  const page = Number(query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000)
    fail(400, "Invalid page number.");
  return { page, pageSize: 20, offset: (page - 1) * 20 };
}
async function listOrders(database, query, userId) {
  const { page, pageSize, offset } = paging(query),
    values = [],
    conditions = [];
  if (userId) {
    values.push(userId);
    conditions.push(`o.user_id=$${values.length}`);
  }
  if (query.status && query.status !== "all") {
    if (!Object.hasOwn(transitions, query.status))
      fail(400, "Invalid order status.");
    values.push(query.status);
    conditions.push(`o.status=$${values.length}`);
  }
  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  const count = await database.query(
    "SELECT count(*)::int AS total FROM orders o" + where,
    values,
  );
  const result = await database.query(
    orderSelect +
      where +
      ` ORDER BY o.created_at DESC,o.id LIMIT 20 OFFSET $${values.length + 1}`,
    [...values, offset],
  );
  return {
    orders: result.rows.map(orderFrom),
    total: count.rows[0].total,
    page,
    pageSize,
  };
}
export function adminRouter(database) {
  const router = Router();
  router.use(requireUser, requireAdmin);
  router.get("/analytics", async (req, res) =>
    res.json(await salesAnalytics(database, req.query.days)),
  );
  router.get("/summary", async (req, res) => {
    const [stock, orders] = await Promise.all([
      database.query(
        'SELECT count(DISTINCT product_id)::int AS products,count(*)::int AS variants,COALESCE(sum(stock),0)::int AS units,count(*) FILTER(WHERE stock<=low_stock_threshold)::int AS "lowStock" FROM product_variants WHERE active',
      ),
      database.query(
        "SELECT count(*)::int AS orders,count(*) FILTER(WHERE status='pending')::int AS pending FROM orders",
      ),
    ]);
    res.json({ ...stock.rows[0], ...orders.rows[0] });
  });
  router.get("/orders", async (req, res) =>
    res.json(await listOrders(database, req.query)),
  );
  router.patch("/orders/:id/status", async (req, res) => {
    if (!UUID.test(req.params.id)) fail(404, "Order not found.");
    const { status, expectedStatus } = req.body || {},
      note = typeof req.body?.note === "string" ? req.body.note.trim() : "",
      tracking =
        typeof req.body?.trackingNumber === "string"
          ? req.body.trackingNumber.trim()
          : "";
    if (
      !Object.hasOwn(transitions, status || "") ||
      note.length > 300 ||
      tracking.length > 80
    )
      fail(400, "Invalid order status or note.");
    await transaction(database, async (client) => {
      const result = await client.query(
        "SELECT id,status FROM orders WHERE id=$1 FOR UPDATE",
        [req.params.id],
      );
      const order = result.rows[0];
      if (!order) fail(404, "Order not found.");
      if (order.status !== expectedStatus)
        fail(409, "This order changed. Refresh and try again.");
      if (!transitions[order.status].includes(status))
        fail(409, "That order status transition is not allowed.");
      if (status === "cancelled") {
        const lines = await client.query(
          "SELECT variant_id,quantity FROM order_items WHERE order_id=$1 ORDER BY variant_id",
          [order.id],
        );
        for (const line of lines.rows) {
          const updated = await client.query(
            "UPDATE product_variants SET stock=stock+$1 WHERE id=$2 RETURNING stock",
            [line.quantity, line.variant_id],
          );
          await client.query(
            "INSERT INTO inventory_movements(variant_id,quantity_change,stock_after,reason,order_id,actor_id) VALUES($1,$2,$3,'Order cancelled; stock restored',$4,$5)",
            [
              line.variant_id,
              line.quantity,
              updated.rows[0].stock,
              order.id,
              req.user.id,
            ],
          );
        }
        await client.query(
          "UPDATE payments SET status='reversed',updated_at=now() WHERE order_id=$1",
          [order.id],
        );
      }
      await client.query(
        "UPDATE orders SET status=$1,tracking_number=COALESCE(NULLIF($2,''),tracking_number),updated_at=now() WHERE id=$3",
        [status, tracking, order.id],
      );
      await client.query(
        "INSERT INTO order_status_history(order_id,previous_status,status,actor_id,note) VALUES($1,$2,$3,$4,$5)",
        [order.id, order.status, status, req.user.id, note || null],
      );
    });
    return res.json({ order: await getOrder(database, req.params.id) });
  });
  router.get("/inventory", async (req, res) => {
    const { page, pageSize, offset } = paging(req.query),
      search =
        typeof req.query.search === "string"
          ? req.query.search.slice(0, 80)
          : "",
      low = req.query.lowStock === "1";
    if (req.query.grouped === "1") {
      const values = [`%${search}%`];
      const where = `WHERE p.active AND EXISTS (
        SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active
        AND (p.name ILIKE $1 OR p.sku ILIKE $1 OR v.sku ILIKE $1)
        ${low ? "AND v.stock<=v.low_stock_threshold" : ""})`;
      const count = await database.query(
        "SELECT count(*)::int AS total FROM products p " + where,
        values,
      );
      const result = await database.query(
        `SELECT p.id::text,p.id AS "productId",p.sku,p.name,p.category,p.price_cents AS "priceCents",
        (SELECT json_agg(json_build_object('id',v.id::text,'sku',v.sku,'size',v.size,
          'stock',v.stock,'lowStockThreshold',v.low_stock_threshold) ORDER BY v.id)
          FROM product_variants v WHERE v.product_id=p.id AND v.active) AS variants
        FROM products p ${where} ORDER BY p.id LIMIT 20 OFFSET $2`,
        [...values, offset],
      );
      return res.json({
        items: result.rows,
        total: count.rows[0].total,
        page,
        pageSize,
      });
    }
    const params = [`%${search}%`],
      where = ` WHERE v.active AND p.active AND (p.name ILIKE $1 OR v.sku ILIKE $1) ${low ? "AND v.stock<=v.low_stock_threshold" : ""}`;
    const count = await database.query(
      "SELECT count(*)::int AS total FROM product_variants v JOIN products p ON p.id=v.product_id" +
        where,
      params,
    );
    const result = await database.query(
      'SELECT v.id::text,v.product_id AS "productId",v.sku,p.name,v.size,v.stock,v.low_stock_threshold AS "lowStockThreshold" FROM product_variants v JOIN products p ON p.id=v.product_id' +
        where +
        " ORDER BY p.id,v.id LIMIT 20 OFFSET $2",
      [...params, offset],
    );
    res.json({
      items: result.rows,
      total: count.rows[0].total,
      page,
      pageSize,
    });
  });
  router.patch("/products/:id/price", async (req, res) => {
    const id = Number(req.params.id),
      { expectedPriceCents } = req.body || {};
    const raw =
      typeof req.body?.price === "string" || typeof req.body?.price === "number"
        ? String(req.body.price).trim()
        : "";
    if (
      !/^\d+$/.test(req.params.id) ||
      !Number.isSafeInteger(id) ||
      id > 2147483647
    )
      fail(400, "Invalid product ID.");
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw))
      fail(
        400,
        "Enter a price from ₱150 to ₱700, with up to two decimal places.",
      );
    const [whole, fraction = ""] = raw.split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (
      cents < 15000 ||
      cents > 70000 ||
      !Number.isInteger(expectedPriceCents) ||
      expectedPriceCents < 0
    )
      fail(
        400,
        "Enter a price from ₱150 to ₱700 and refresh the current price before saving.",
      );
    const result = await transaction(database, async (client) => {
      const found = await client.query(
        "SELECT price_cents FROM products WHERE id=$1 AND active FOR UPDATE",
        [id],
      );
      if (!found.rowCount) fail(404, "Product not found.");
      const previous = found.rows[0].price_cents;
      if (previous !== expectedPriceCents)
        fail(
          409,
          "This price changed while you were editing. Refresh the page and try again.",
        );
      if (previous === cents) return { changed: false, priceCents: cents };
      await client.query("UPDATE products SET price_cents=$1 WHERE id=$2", [
        cents,
        id,
      ]);
      await client.query(
        "INSERT INTO product_price_history(product_id,previous_price_cents,new_price_cents,actor_id) VALUES($1,$2,$3,$4)",
        [id, previous, cents, req.user.id],
      );
      return { changed: true, priceCents: cents };
    });
    res.json({ productId: id, ...result });
  });
  router.post("/inventory/:id/adjust", async (req, res) => {
    const { delta } = req.body || {},
      reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (
      !/^\d+$/.test(req.params.id) ||
      !Number.isInteger(delta) ||
      delta === 0 ||
      Math.abs(delta) > 100000 ||
      reason.length < 3 ||
      reason.length > 300
    )
      fail(
        400,
        "Enter a nonzero stock adjustment and a reason (3–300 characters).",
      );
    const updated = await transaction(database, async (client) => {
      const found = await client.query(
        "SELECT id,stock FROM product_variants WHERE id=$1 AND active FOR UPDATE",
        [req.params.id],
      );
      if (!found.rowCount) fail(404, "Variant not found.");
      if (found.rows[0].stock + delta < 0)
        fail(409, "This adjustment would make stock negative.");
      const result = await client.query(
        "UPDATE product_variants SET stock=stock+$1 WHERE id=$2 RETURNING id::text,stock",
        [delta, req.params.id],
      );
      await client.query(
        "INSERT INTO inventory_movements(variant_id,quantity_change,stock_after,reason,actor_id) VALUES($1,$2,$3,$4,$5)",
        [req.params.id, delta, result.rows[0].stock, reason, req.user.id],
      );
      return result.rows[0];
    });
    res.json(updated);
  });
  router.get("/inventory/:id/movements", async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) fail(400, "Invalid variant.");
    const rows = await database.query(
      'SELECT m.id::text,m.quantity_change AS delta,m.stock_after AS "stockAfter",m.reason,m.order_id AS "orderId",m.created_at AS "createdAt",u.name AS actor FROM inventory_movements m LEFT JOIN users u ON u.id=m.actor_id WHERE m.variant_id=$1 ORDER BY m.id DESC LIMIT 100',
      [req.params.id],
    );
    res.json({ movements: rows.rows });
  });
  return router;
}
