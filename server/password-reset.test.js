import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fixture, checkout } from "./testing.js";
const tokenFrom = (mail) =>
  new URLSearchParams(new URL(mail.resetUrl).hash.split("?")[1]).get("token");
test("password reset uses private one-time hashes, keeps responses generic, and revokes sessions atomically", async () => {
  const mail = [];
  const f = await fixture({
    passwordReset: {
      configured: true,
      appUrl: "https://clover.example",
      sendEmail: async (message) => mail.push(message),
    },
  });
  try {
    const account = await f.register();
    const other = await f.api("/api/auth/login", {
      method: "POST",
      body: { email: account.user.email, password: "test-password-123" },
    });
    assert.equal(other.status, 200);
    const known = await f.api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: account.user.email },
      headers: { Host: "untrusted.example" },
    });
    const unknown = await f.api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: "unknown@example.test" },
    });
    assert.equal(known.status, 200);
    assert.deepEqual(known.data, unknown.data);
    assert.equal(mail.length, 1);
    assert.equal(new URL(mail[0].resetUrl).origin, "https://clover.example");
    const token = tokenFrom(mail[0]);
    const row = (
      await f.database.query(
        "SELECT token_hash,expires_at,used_at FROM password_reset_tokens",
      )
    ).rows[0];
    assert.notEqual(row.token_hash, token);
    assert.equal(
      row.token_hash,
      createHash("sha256").update(token).digest("hex"),
    );
    assert.equal(row.used_at, null);
    assert.ok(new Date(row.expires_at) > new Date());
    assert.ok(new Date(row.expires_at) < new Date(Date.now() + 16 * 60000));
    assert.equal(JSON.stringify(known.data).includes(token), false);
    await f.api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: account.user.email },
    });
    assert.equal(mail.length, 1);
    assert.equal(
      (
        await f.api("/api/auth/reset-password", {
          method: "POST",
          body: { token, password: "short" },
        })
      ).status,
      400,
    );
    const results = await Promise.all(
      [1, 2].map(() =>
        f.api("/api/auth/reset-password", {
          method: "POST",
          body: { token, password: "replacement-password-123" },
        }),
      ),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    assert.ok(
      results
        .find((r) => r.status === 200)
        .headers.get("set-cookie")
        .includes("clover_session="),
    );
    assert.equal(
      (await f.api("/api/auth/me", { cookie: account.cookie })).data.user,
      null,
    );
    assert.equal(
      (await f.api("/api/auth/me", { cookie: other.cookie })).data.user,
      null,
    );
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS n FROM sessions"))
        .rows[0].n,
      0,
    );
    assert.equal(
      (
        await f.api("/api/auth/login", {
          method: "POST",
          body: { email: account.user.email, password: "test-password-123" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.api("/api/auth/login", {
          method: "POST",
          body: {
            email: account.user.email,
            password: "replacement-password-123",
          },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await f.api("/api/auth/reset-password", {
          method: "POST",
          body: { token, password: "another-password-123" },
        })
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});
test("expired reset links fail and persistent per-email limits apply", async () => {
  const mail = [];
  const f = await fixture({
    passwordReset: {
      configured: true,
      appUrl: "https://clover.example",
      sendEmail: async (data) => mail.push(data),
    },
  });
  try {
    const account = await f.register();
    await f.api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: account.user.email },
    });
    await f.database.query(
      "UPDATE password_reset_tokens SET expires_at=now()-interval '1 minute'",
    );
    assert.equal(
      (
        await f.api("/api/auth/reset-password", {
          method: "POST",
          body: { token: tokenFrom(mail[0]), password: "replacement-password" },
        })
      ).status,
      400,
    );
    for (let i = 0; i < 4; i++)
      assert.equal(
        (
          await f.api("/api/auth/forgot-password", {
            method: "POST",
            body: { email: account.user.email },
          })
        ).status,
        200,
      );
    await f.restart();
    const limited = await f.api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: account.user.email },
    });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "900");
  } finally {
    await f.close();
  }
});
test("unconfigured recovery fails honestly and receipt access is limited to the owner and admins", async () => {
  const f = await fixture({ passwordReset: { configured: false } });
  try {
    const owner = await f.register(),
      other = await f.register("Other User", "other-receipt@example.test");
    assert.equal(
      (
        await f.api("/api/auth/forgot-password", {
          method: "POST",
          body: { email: owner.user.email },
        })
      ).status,
      503,
    );
    const order = (
      await f.api("/api/checkout", {
        method: "POST",
        cookie: owner.cookie,
        body: checkout([{ id: 0, size: "M", qty: 1 }]),
      })
    ).data.order;
    const path = "/api/orders/" + order.id + "/receipt";
    assert.equal((await f.api(path)).status, 401);
    assert.equal((await f.api(path, { cookie: other.cookie })).status, 404);
    const receipt = await f.api(path, { cookie: owner.cookie });
    assert.equal(receipt.status, 200);
    assert.equal(receipt.data.order.total, 450);
    await f.database.query("UPDATE products SET price_cents=70000 WHERE id=0");
    assert.equal(
      (await f.api(path, { cookie: owner.cookie })).data.order.items[0]
        .unitPrice,
      350,
    );
    await f.database.query("UPDATE users SET role='admin' WHERE id=$1", [
      other.user.id,
    ]);
    assert.equal((await f.api(path, { cookie: other.cookie })).status, 200);
  } finally {
    await f.close();
  }
});

test("Gmail variable names configure the reset sender without exposing app passwords", async () => {
  const { default: nodemailer } = await import("nodemailer");
  const { resetEmailConfigured, sendResetEmail } = await import("./mail.js");
  const keys = [
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "PUBLIC_APP_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_FROM",
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  const original = nodemailer.createTransport;
  let options, letter;
  try {
    process.env.GMAIL_USER = "sender@example.test";
    process.env.GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    process.env.PUBLIC_APP_URL = "https://clover.example";
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
    nodemailer.createTransport = (config) => {
      options = config;
      return {
        sendMail: async (data) => {
          letter = data;
        },
      };
    };
    assert.equal(resetEmailConfigured(), true);
    await sendResetEmail({
      to: "customer@example.test",
      resetUrl: "https://clover.example/#resetpassword?token=test-token",
    });
    assert.equal(options.host, "smtp.gmail.com");
    assert.equal(options.secure, true);
    assert.equal(options.auth.user, "sender@example.test");
    assert.equal(options.auth.pass, "abcdefghijklmnop");
    assert.equal(letter.to, "customer@example.test");
    assert.match(letter.text, /expires in 15 minutes/);
    assert.equal(letter.text.includes("abcdefghijklmnop"), false);
  } finally {
    nodemailer.createTransport = original;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
