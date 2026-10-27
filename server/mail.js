import "./env.js";
import nodemailer from "nodemailer";

export function resetEmailConfigured() {
  return Boolean(
    (process.env.GMAIL_USER || process.env.SMTP_USER) &&
    (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS) &&
    process.env.PUBLIC_APP_URL,
  );
}
export async function sendResetEmail({ to, resetUrl }) {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const password = process.env.GMAIL_APP_PASSWORD
    ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "")
    : process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || `Clover <${user}>`,
    to,
    subject: "Reset your Clover password",
    text: `You requested a password reset for your Clover account.\n\nOpen this link to choose a new password:\n${resetUrl}\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, you can ignore this email. Your password has not changed.\n\nCLOVER — Simple. Timeless. Yours.`,
  });
}
