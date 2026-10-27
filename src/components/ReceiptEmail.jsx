import { useEffect, useState } from "react";
import { Mail, CheckCircle2, LoaderCircle } from "lucide-react";
import { api } from "../lib/api";
import "./ReceiptEmail.css";
export default function ReceiptEmail({ order, onDelivery }) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const delivery = order.receiptEmail || { status: "not_sent" };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const last = delivery.lastAttemptAt
    ? new Date(delivery.lastAttemptAt).getTime()
    : 0;
  const seconds = Math.max(
    0,
    Math.ceil(
      (last + (delivery.status === "sending" ? 120000 : 60000) - now) / 1000,
    ),
  );
  async function send() {
    if (pending || seconds) return;
    setPending(true);
    setError("");
    try {
      const result = await api("/api/orders/" + order.id + "/receipt/email", {
        method: "POST",
      });
      onDelivery(result.delivery);
      setNow(Date.now());
      if (result.delivery.status === "failed")
        setError(
          "The receipt couldn’t be emailed. Please try again later or contact Clover.",
        );
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="receipt-email-panel"
      aria-label="Email receipt delivery"
    >
      <div className="receipt-email-copy">
        <span className="receipt-email-icon">
          {delivery.status === "sent" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <Mail aria-hidden="true" />
          )}
        </span>
        <div>
          <strong>
            {delivery.status === "sent"
              ? "Receipt email sent"
              : delivery.status === "sending" && seconds
                ? "Receipt email is being sent"
                : delivery.status === "failed"
                  ? "Receipt email wasn’t sent"
                  : "Send a receipt to your inbox"}
          </strong>
          <p>{delivery.recipient || order.customer.email}</p>
          <small>
            {delivery.status === "sent"
              ? "Check your inbox and spam folder."
              : "You can still print or save the receipt below."}
          </small>
        </div>
      </div>
      <button disabled={pending || seconds > 0} onClick={send}>
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" /> SENDING…
          </>
        ) : seconds ? (
          `WAIT ${seconds}s`
        ) : delivery.status === "sent" ? (
          "RESEND RECEIPT"
        ) : (
          "EMAIL RECEIPT"
        )}
      </button>
      {error && (
        <p className="receipt-email-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
