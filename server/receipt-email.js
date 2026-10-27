import { receiptEmailConfigured, sendReceiptEmail } from "./mail.js";
export async function deliverReceipt(
  database,
  order,
  { sendEmail = sendReceiptEmail, configured = receiptEmailConfigured() } = {},
  resend = false,
) {
  await database.query(
    "INSERT INTO receipt_email_deliveries(order_id,recipient) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [order.id, order.customer.email],
  );
  const claim = await database.query(
    `UPDATE receipt_email_deliveries SET status='sending',recipient=$2,attempts=attempts+1,last_attempt_at=now(),failure_code=NULL
 WHERE order_id=$1 AND (status IN ('pending','failed') OR ($3 AND status='sent') OR (status='sending' AND last_attempt_at<now()-interval '2 minutes'))
 AND (last_attempt_at IS NULL OR last_attempt_at<now()-interval '1 minute') RETURNING attempts`,
    [order.id, order.customer.email, resend],
  );
  if (!claim.rowCount) return receiptEmailStatus(database, order.id);
  try {
    if (!configured)
      throw Object.assign(new Error("Email not configured"), {
        code: "NOT_CONFIGURED",
      });
    await sendEmail({
      to: order.customer.email,
      order,
      attempt: claim.rows[0].attempts,
    });
    await database.query(
      "UPDATE receipt_email_deliveries SET status='sent',sent_at=now(),failure_code=NULL WHERE order_id=$1",
      [order.id],
    );
  } catch (error) {
    const code = [
      "EAUTH",
      "ESOCKET",
      "ETIMEDOUT",
      "ECONNECTION",
      "EENVELOPE",
      "NOT_CONFIGURED",
    ].includes(error?.code)
      ? error.code
      : "DELIVERY_FAILED";
    await database.query(
      "UPDATE receipt_email_deliveries SET status='failed',failure_code=$2 WHERE order_id=$1",
      [order.id, code],
    );
    if (code !== "NOT_CONFIGURED")
      console.error("Clover receipt email delivery failed:", code);
  }
  return receiptEmailStatus(database, order.id);
}
export async function receiptEmailStatus(database, id) {
  const result = await database.query(
    'SELECT status,recipient,sent_at AS "sentAt",last_attempt_at AS "lastAttemptAt" FROM receipt_email_deliveries WHERE order_id=$1',
    [id],
  );
  return result.rows[0] || { status: "not_sent" };
}
