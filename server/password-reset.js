import { Router } from "express";
import { randomBytes, createHash, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { transaction } from "./db.js";
import { fail } from "./security.js";
import { resetEmailConfigured, sendResetEmail } from "./mail.js";
const scrypt = promisify(scryptCallback);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const message =
  "If an account matches that email, a password-reset link will arrive shortly. Check your inbox and spam folder.";

export function createPasswordResetRouter(
  database,
  {
    sendEmail = sendResetEmail,
    appUrl = process.env.PUBLIC_APP_URL,
    configured = resetEmailConfigured(),
  } = {},
) {
  const router = Router();
  function resetOrigin() {
    let url;
    try {
      url = new URL(appUrl);
    } catch {
      fail(
        503,
        "Password recovery email is not available yet. Please contact Clover support.",
      );
    }
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      fail(
        503,
        "Password recovery email is not available yet. Please contact Clover support.",
      );
    return url.origin;
  }
  async function allowRequest(key, max) {
    const result = await database.query(
      `INSERT INTO password_reset_limits(key_hash,attempts) VALUES($1,1)
      ON CONFLICT(key_hash) DO UPDATE SET
      attempts=CASE WHEN password_reset_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE password_reset_limits.attempts+1 END,
      window_start=CASE WHEN password_reset_limits.window_start<now()-interval '15 minutes' THEN now() ELSE password_reset_limits.window_start END
      RETURNING attempts`,
      [digest(key)],
    );
    return result.rows[0].attempts <= max;
  }
  router.post("/forgot-password", async (req, res) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail(400, "Enter a valid email address.");
    if (!configured)
      fail(
        503,
        "Password recovery email is not available yet. Please contact Clover support.",
      );
    const origin = resetOrigin();
    await database.query(
      "DELETE FROM password_reset_limits WHERE window_start<now()-interval '1 day'",
    );
    const allowed = await allowRequest("request-ip:" + req.ip, 30);
    const emailAllowed = await allowRequest("request-email:" + email, 5);
    if (!allowed || !emailAllowed) {
      res.set("Retry-After", "900");
      fail(429, "Too many reset requests. Please try again in 15 minutes.");
    }
    const raw = randomBytes(32).toString("hex");
    const user = await transaction(database, async (client) => {
      const result = await client.query(
        "SELECT id,email FROM users WHERE email=$1 FOR UPDATE",
        [email],
      );
      if (!result.rowCount) return null;
      const row = result.rows[0];
      const recent = await client.query(
        "SELECT 1 FROM password_reset_tokens WHERE user_id=$1 AND created_at>now()-interval '1 minute' AND used_at IS NULL AND expires_at>now()",
        [row.id],
      );
      if (recent.rowCount) return null;
      await client.query(
        "DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at<now()-interval '1 day'",
        [row.id],
      );
      await client.query(
        "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
        [digest(raw), row.id],
      );
      return row;
    });
    if (user) {
      try {
        await sendEmail({
          to: user.email,
          resetUrl: origin + "/#resetpassword?token=" + raw,
        });
      } catch {
        await database.query(
          "DELETE FROM password_reset_tokens WHERE token_hash=$1",
          [digest(raw)],
        );
        console.error(
          "Clover password-reset email delivery failed. Check server SMTP configuration.",
        );
      }
    }
    res.json({ message });
  });
  router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      fail(400, "This reset link is invalid or expired. Request a new link.");
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      fail(400, "Use a password between 8 and 128 characters.");
    if (!(await allowRequest("consume-ip:" + req.ip, 30))) {
      res.set("Retry-After", "900");
      fail(429, "Too many attempts. Please try again in 15 minutes.");
    }
    const tokenHash = digest(token);
    const found = await database.query(
      "SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()",
      [tokenHash],
    );
    if (!found.rowCount)
      fail(400, "This reset link is invalid or expired. Request a new link.");
    const salt = randomBytes(16).toString("hex"),
      passwordHash = (await scrypt(password, salt, 64)).toString("hex");
    await transaction(database, async (client) => {
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        found.rows[0].user_id,
      ]);
      const valid = await client.query(
        "SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
        [tokenHash],
      );
      if (!valid.rowCount)
        fail(400, "This reset link is invalid or expired. Request a new link.");
      const id = valid.rows[0].user_id;
      await client.query(
        "UPDATE users SET password_salt=$1,password_hash=$2 WHERE id=$3",
        [salt, passwordHash, id],
      );
      await client.query(
        "UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
        [id],
      );
      await client.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    });
    res.clearCookie("clover_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: req.secure || process.env.AUTH_COOKIE_SECURE === "true",
      path: "/",
    });
    res.json({
      message: "Your password has been updated. Log in with your new password.",
    });
  });
  return router;
}
