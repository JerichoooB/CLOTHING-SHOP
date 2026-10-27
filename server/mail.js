import "./env.js";
import nodemailer from "nodemailer";

export function receiptEmailConfigured() {
  return Boolean(
    (process.env.GMAIL_USER || process.env.SMTP_USER) &&
    (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS),
  );
}
export function resetEmailConfigured() {
  return receiptEmailConfigured() && Boolean(process.env.PUBLIC_APP_URL);
}
function transportConfig() {
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
  return { transport, from: process.env.SMTP_FROM || `Clover <${user}>` };
}
export async function sendResetEmail({ to, resetUrl }) {
  const { transport, from } = transportConfig();
  await transport.sendMail({
    from,
    to,
    subject: "Reset your Clover password",
    text: `You requested a password reset for your Clover account.\n\nOpen this link to choose a new password:\n${resetUrl}\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, you can ignore this email. Your password has not changed.\n\nCLOVER — Simple. Timeless. Yours.`,
  });
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );
export async function sendReceiptEmail({ to, order, attempt = 1 }) {
  const { transport, from } = transportConfig();
  const lines = order.items
    .map(
      (item) =>
        `${item.name} — Size ${item.size} — Qty ${item.qty} — ${money(item.unitPrice)} each — ${money(item.lineTotal)}`,
    )
    .join("\n");
  const state =
    order.payment.status === "approved"
      ? "Demo payment approved"
      : "Demo payment reversed";
  const text = `CLOVER — ORDER RECEIPT\n${order.number}\n\nHello ${order.customer.name},\nThank you for your order.\n\n${lines}\n\nSubtotal: ${money(order.subtotal)}\nShipping: ${money(order.shipping)}\nOrder total: ${money(order.total)}\n\nOrder status: ${order.status}\n${state}. No real money was charged.\nPayment reference: ${order.payment.reference}\n\nThis is a demo order receipt, not a tax invoice or proof of an actual payment. You can view, print, or save a PDF of this receipt from My Orders on the Clover website.\n\nSimple. Timeless. Yours.`;
  const rows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid #e0e4d5">${escapeHtml(item.name)}<br><small>Size ${escapeHtml(item.size)} · Qty ${item.qty} · ${escapeHtml(money(item.unitPrice))} each</small></td><td style="text-align:right;white-space:nowrap;border-bottom:1px solid #e0e4d5">${escapeHtml(money(item.lineTotal))}</td></tr>`,
    )
    .join("");
  const html = `<div style="background:#f7f5ef;padding:30px 15px;font-family:Arial,sans-serif;color:#283528"><div style="max-width:600px;margin:auto;background:#fffefa;padding:30px;border:1px solid #dce1d2;border-radius:8px"><p style="letter-spacing:5px;font-family:Georgia,serif;font-size:23px">CLOVER</p><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:normal">Your order receipt</h1><p>${escapeHtml(order.number)}</p><p>Hello ${escapeHtml(order.customer.name)}, thank you for your order.</p><table style="width:100%;border-collapse:collapse;font-size:13px">${rows}</table><p style="text-align:right;line-height:2;font-size:13px">Subtotal: ${escapeHtml(money(order.subtotal))}<br>Shipping: ${escapeHtml(money(order.shipping))}<br><strong style="font-size:18px">Order total: ${escapeHtml(money(order.total))}</strong></p><p style="background:#edf1e3;padding:14px;font-size:12px">${state} · No real money charged<br>Order status: ${escapeHtml(order.status)}</p><p style="font-size:11px;color:#737f66;overflow-wrap:anywhere">Payment reference: ${escapeHtml(order.payment.reference)}</p><p style="font-size:11px;line-height:1.8;color:#737f66">This is a demo order receipt, not a tax invoice or proof of an actual payment. View, print or save a PDF from My Orders on the Clover website.</p><p style="font-family:Georgia,serif">Simple. Timeless. Yours.</p></div></div>`;
  const host = (
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    "clover.local"
  )
    .split("@")
    .at(-1)
    .replace(/[^a-z0-9.-]/gi, "");
  const info = await transport.sendMail({
    from,
    to,
    subject: `Your Clover receipt — ${order.number}`,
    messageId: `<clover-receipt-${order.id}-${attempt}@${host}>`,
    text,
    html,
  });
  if (!info?.accepted?.length)
    throw Object.assign(new Error("Receipt was not accepted by SMTP"), {
      code: "EENVELOPE",
    });
}
