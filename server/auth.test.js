import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./testing.js";
test("PostgreSQL accounts and sessions persist, hashes stay private, logout revokes the session", async () => {
  const f = await fixture();
  try {
    const account = await f.register();
    assert.equal(account.user.role, "customer");
    const user = (
      await f.database.query("SELECT * FROM users WHERE id=$1", [
        account.user.id,
      ])
    ).rows[0];
    assert.match(user.password_hash, /^[0-9a-f]{128}$/);
    assert.equal(user.password_salt.length, 32);
    assert.notEqual(user.password_hash, "test-password-123");
    assert.equal(account.user.password_hash, undefined);
    await f.restart();
    assert.equal(
      (await f.api("/api/auth/me", { cookie: account.cookie })).data.user.id,
      user.id,
    );
    assert.equal(
      (
        await f.api("/api/auth/register", {
          method: "POST",
          body: {
            name: "Another",
            email: user.email,
            password: "test-password-123",
          },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.api("/api/auth/login", {
          method: "POST",
          body: { email: user.email, password: "incorrect-password" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.api("/api/auth/login", {
          method: "POST",
          body: { email: user.email, password: "test-password-123" },
          headers: { Origin: "https://other.example" },
        })
      ).status,
      403,
    );
    const logged = await f.api("/api/auth/login", {
      method: "POST",
      body: { email: user.email.toUpperCase(), password: "test-password-123" },
    });
    assert.equal(logged.status, 200);
    assert.match(logged.headers.get("set-cookie"), /HttpOnly/i);
    assert.match(logged.headers.get("set-cookie"), /SameSite=Lax/i);
    await f.api("/api/auth/logout", { method: "POST", cookie: logged.cookie });
    assert.equal(
      (await f.api("/api/auth/me", { cookie: logged.cookie })).data.user,
      null,
    );
  } finally {
    await f.close();
  }
});
test("registration validation and database uniqueness prevent duplicate accounts", async () => {
  const f = await fixture();
  try {
    const body = {
      name: "Test",
      email: "unique@example.test",
      password: "test-password-123",
    };
    assert.equal(
      (
        await f.api("/api/auth/register", {
          method: "POST",
          body: { ...body, password: "short" },
        })
      ).status,
      400,
    );
    const result = await Promise.all([
      f.api("/api/auth/register", { method: "POST", body }),
      f.api("/api/auth/register", { method: "POST", body }),
    ]);
    assert.deepEqual(result.map((r) => r.status).sort(), [201, 409]);
    assert.equal(
      (await f.database.query("SELECT count(*)::int AS count FROM users"))
        .rows[0].count,
      1,
    );
  } finally {
    await f.close();
  }
});

test("legacy JSON accounts import without changing passwords or overwriting existing accounts", async () => {
  const f = await fixture();
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises"),
    { tmpdir } = await import("node:os"),
    { join } = await import("node:path"),
    { randomBytes, scryptSync } = await import("node:crypto"),
    { importLegacyAccounts } = await import("./db.js");
  const directory = await mkdtemp(join(tmpdir(), "clover-legacy-")),
    source = join(directory, "users.json"),
    salt = randomBytes(16).toString("hex"),
    record = {
      id: randomBytes(16).toString("hex"),
      name: "Legacy Shopper",
      email: "legacy@example.test",
      salt,
      passwordHash: scryptSync("legacy-password-123", salt, 64).toString("hex"),
    };
  const original = JSON.stringify([record]);
  await writeFile(source, original, { mode: 0o600 });
  try {
    assert.equal(await importLegacyAccounts(f.database, source), 1);
    assert.equal(await importLegacyAccounts(f.database, source), 0);
    assert.equal(await readFile(source, "utf8"), original);
    assert.equal(
      (
        await f.api("/api/auth/login", {
          method: "POST",
          body: { email: record.email, password: "legacy-password-123" },
        })
      ).status,
      200,
    );
  } finally {
    await f.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("admin promotion command grants an existing account access without a new session", async () => {
  const f = await fixture();
  try {
    const customer = await f.register();
    assert.equal(
      (await f.api("/api/admin/summary", { cookie: customer.cookie })).status,
      403,
    );
    const { execFile } = await import("node:child_process"),
      { promisify } = await import("node:util");
    await promisify(execFile)(
      process.execPath,
      ["scripts/admin-grant.mjs", customer.user.email],
      {
        cwd: new URL("..", import.meta.url),
        env: { ...process.env, PGOPTIONS: `-c search_path=${f.schema}` },
      },
    );
    assert.equal(
      (await f.api("/api/auth/me", { cookie: customer.cookie })).data.user.role,
      "admin",
    );
    assert.equal(
      (await f.api("/api/admin/summary", { cookie: customer.cookie })).status,
      200,
    );
  } finally {
    await f.close();
  }
});
