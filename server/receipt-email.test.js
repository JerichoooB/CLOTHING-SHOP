import test from "node:test";
import assert from "node:assert/strict";
import { fixture, checkout } from "./testing.js";

test("checkout emails one receipt across concurrent retries and owners can resend old receipts safely", async () => {
  const mails = [];
  const f = await fixture({
    receiptEmail: {
      configured: true,
      sendEmail: async (mail) => {
        mails.push(mail);
        await new Promise((resolve) => setTimeout(resolve, 15));
      },
    },
  });
  try {
    const owner = await f.register(
        "Receipt Customer",
        "email-receipt@example.test",
      ),
      other = await f.register(
        "Other Customer",
        "other-email-receipt@example.test",
      );
    const body = checkout([{ id: 0, size: "M", qty: 1 }]);
    const results = await Promise.all(
      [1, 2].map(() =>
        f.api("/api/checkout", { method: "POST", cookie: owner.cookie, body }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, owner.user.email);
    assert.equal(mails[0].order.total, 450);
    const id = results[0].data.order.id,
      path = "/api/orders/" + id + "/receipt/email";
    assert.equal(
      (
        await f.database.query(
          "SELECT status FROM receipt_email_deliveries WHERE order_id=$1",
          [id],
        )
      ).rows[0].status,
      "sent",
    );
    assert.equal((await f.api(path, { method: "POST" })).status, 401);
    assert.equal(
      (await f.api(path, { method: "POST", cookie: other.cookie })).status,
      404,
    );
    assert.equal(
      (await f.api(path, { method: "POST", cookie: owner.cookie })).status,
      429,
    );
    await f.database.query(
      "UPDATE receipt_email_deliveries SET last_attempt_at=now()-interval '2 minutes' WHERE order_id=$1",
      [id],
    );
    await f.database.query("UPDATE products SET price_cents=70000 WHERE id=0");
    const resent = await f.api(path, {
      method: "POST",
      cookie: owner.cookie,
      body: { to: "untrusted@example.test" },
    });
    assert.equal(resent.status, 200);
    assert.equal(resent.data.delivery.status, "sent");
    assert.equal(mails.length, 2);
    assert.equal(mails[1].to, owner.user.email);
    assert.equal(mails[1].order.items[0].unitPrice, 350);
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM orders")).rows[0]
        .n,
      1,
    );
    await f.database.query(
      "DELETE FROM receipt_email_deliveries WHERE order_id=$1",
      [id],
    );
    assert.equal(
      (await f.api("/api/orders/" + id + "/receipt", { cookie: owner.cookie }))
        .data.order.receiptEmail.status,
      "not_sent",
    );
    assert.equal(
      (await f.api(path, { method: "POST", cookie: owner.cookie })).data
        .delivery.status,
      "sent",
    );
    assert.equal(mails.length, 3);
  } finally {
    await f.close();
  }
});

test("email failures do not fail or duplicate orders and delivery can be retried", async () => {
  let enabled = false,
    sends = 0;
  const f = await fixture({
    receiptEmail: {
      configured: true,
      sendEmail: async () => {
        sends++;
        if (!enabled)
          throw Object.assign(new Error("Test failure"), { code: "EAUTH" });
      },
    },
  });
  try {
    const owner = await f.register();
    const body = checkout([{ id: 0, size: "M", qty: 1 }]);
    const first = await f.api("/api/checkout", {
      method: "POST",
      cookie: owner.cookie,
      body,
    });
    assert.equal(first.status, 201);
    assert.equal(first.data.order.receiptEmail.status, "failed");
    assert.equal(
      (
        await f.database.query(
          "SELECT stock FROM product_variants WHERE product_id=0 AND size='M'",
        )
      ).rows[0].stock,
      19,
    );
    assert.equal(
      (
        await f.api("/api/checkout", {
          method: "POST",
          cookie: owner.cookie,
          body,
        })
      ).status,
      200,
    );
    assert.equal(sends, 1);
    enabled = true;
    await f.database.query(
      "UPDATE receipt_email_deliveries SET last_attempt_at=now()-interval '2 minutes'",
    );
    const retry = await f.api(
      "/api/orders/" + first.data.order.id + "/receipt/email",
      { method: "POST", cookie: owner.cookie },
    );
    assert.equal(retry.data.delivery.status, "sent");
    assert.equal(sends, 2);
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM payments"))
        .rows[0].n,
      1,
    );
  } finally {
    await f.close();
  }
});

test("receipt emails use escaped order snapshots and Gmail accepts the recipient before marking delivery sent", async () => {
  const { default: nodemailer } = await import("nodemailer");
  const { sendReceiptEmail } = await import("./mail.js");
  const original = nodemailer.createTransport;
  let letter;
  try {
    nodemailer.createTransport = () => ({
      sendMail: async (data) => {
        letter = data;
        return { accepted: ["customer@example.test"] };
      },
    });
    await sendReceiptEmail({
      to: "customer@example.test",
      order: {
        id: "test-id",
        number: "CLV-000001",
        customer: { name: "<img src=x onerror=alert(1)>" },
        items: [
          {
            name: "<script>test</script>",
            size: "M",
            qty: 2,
            unitPrice: 350,
            lineTotal: 700,
          },
        ],
        subtotal: 700,
        shipping: 100,
        total: 800,
        status: "pending",
        payment: { status: "approved", reference: "DEMO-test" },
      },
    });
    assert.equal(letter.to, "customer@example.test");
    assert.ok(letter.text.includes("800.00"));
    assert.ok(letter.html.includes("&lt;script&gt;"));
    assert.equal(letter.html.includes("<script>"), false);
    assert.equal(letter.html.includes("<img src=x"), false);
    assert.ok(letter.text.includes("No real money"));
    nodemailer.createTransport = () => ({
      sendMail: async () => ({ accepted: [] }),
    });
    await assert.rejects(
      sendReceiptEmail({
        to: "customer@example.test",
        order: {
          id: "test-id",
          number: "CLV-000001",
          customer: { name: "Test" },
          items: [],
          subtotal: 0,
          shipping: 0,
          total: 0,
          status: "pending",
          payment: { status: "approved", reference: "test" },
        },
      }),
      /not accepted/,
    );
  } finally {
    nodemailer.createTransport = original;
  }
});
