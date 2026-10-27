import { Router } from "express";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { transaction } from "./db.js";
import { fail } from "./security.js";
const scrypt = promisify(scryptCallback),
  cookieName = "clover_session",
  sessionLifetime = 8 * 60 * 60 * 1000;
const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});
const hash = (token) => createHash("sha256").update(token).digest("hex");
function token(req) {
  return (
    (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) || ""
  );
}
const cookieOptions = (req) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: req.secure || process.env.AUTH_COOKIE_SECURE === "true",
  path: "/",
});
export function sessionMiddleware(database) {
  return async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const value = token(req);
    if (value) {
      const result = await database.query(
        "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
        [hash(value)],
      );
      req.user = result.rows[0] || null;
    } else req.user = null;
    next();
  };
}
export function createAuthRouter(database) {
  const router = Router(),
    attempts = new Map();
  function throttle(req, res, next) {
    const now = Date.now();
    for (const [ip, row] of attempts) if (row.reset < now) attempts.delete(ip);
    const row = attempts.get(req.ip) || {
      count: 0,
      reset: now + 15 * 60 * 1000,
    };
    row.count++;
    attempts.set(req.ip, row);
    if (row.count > 30) {
      res.set("Retry-After", String(Math.ceil((row.reset - now) / 1000)));
      return res
        .status(429)
        .json({ error: "Too many attempts. Please try again in 15 minutes." });
    }
    next();
  }
  async function issue(req, res, user) {
    const value = randomBytes(32).toString("hex");
    await transaction(database, async (client) => {
      const current = await client.query(
        "SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",
        [user.id],
      );
      if (
        !current.rowCount ||
        (user.password_hash &&
          current.rows[0].password_hash !== user.password_hash)
      )
        fail(401, "Email or password is incorrect.");
      await client.query(
        "DELETE FROM sessions WHERE expires_at<=now() OR token_hash=$1",
        [hash(token(req))],
      );
      await client.query(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
        [hash(value), user.id, new Date(Date.now() + sessionLifetime)],
      );
    });
    res.cookie(cookieName, value, {
      ...cookieOptions(req),
      maxAge: sessionLifetime,
    });
    return publicUser(user);
  }
  router.get("/me", (req, res) =>
    res.json({ user: req.user ? publicUser(req.user) : null }),
  );
  router.post("/register", throttle, async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "",
      email =
        typeof req.body?.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "",
      password = req.body?.password;
    if (name.length < 2 || name.length > 80)
      return res
        .status(400)
        .json({ error: "Enter a name between 2 and 80 characters." });
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Enter a valid email address." });
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return res
        .status(400)
        .json({ error: "Use a password between 8 and 128 characters." });
    const salt = randomBytes(16).toString("hex"),
      passwordHash = (await scrypt(password, salt, 64)).toString("hex");
    let result;
    try {
      result = await database.query(
        "INSERT INTO users(id,name,email,password_salt,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role",
        [randomUUID(), name, email, salt, passwordHash],
      );
    } catch (error) {
      if (error.code === "23505")
        return res.status(409).json({
          error: "An account with this email already exists. Please log in.",
        });
      throw error;
    }
    return res
      .status(201)
      .json({ user: await issue(req, res, result.rows[0]) });
  });
  router.post("/login", throttle, async (req, res) => {
    const email =
        typeof req.body?.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "",
      password = req.body?.password;
    if (
      email.length > 254 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return res.status(401).json({ error: "Email or password is incorrect." });
    const result = await database.query("SELECT * FROM users WHERE email=$1", [
        email,
      ]),
      user = result.rows[0],
      computed = await scrypt(
        password,
        user?.password_salt || "clover-nonexistent-user",
        64,
      ),
      expected = user
        ? Buffer.from(user.password_hash, "hex")
        : Buffer.alloc(64);
    if (
      !user ||
      expected.length !== computed.length ||
      !timingSafeEqual(computed, expected)
    )
      return res.status(401).json({ error: "Email or password is incorrect." });
    return res.json({ user: await issue(req, res, user) });
  });
  router.post("/logout", async (req, res) => {
    await database.query("DELETE FROM sessions WHERE token_hash=$1", [
      hash(token(req)),
    ]);
    res.clearCookie(cookieName, cookieOptions(req));
    return res.json({ ok: true });
  });
  return router;
}
