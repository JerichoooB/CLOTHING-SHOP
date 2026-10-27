import { useEffect, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import Logo from "./Logo";
import { statusLabels } from "./OrderCard";
import "./Receipt.css";
const money = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );
export default function Receipt({ orderId }) {
  const [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setError("");
    api("/api/orders/" + orderId + "/receipt", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setOrder(data.order);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [orderId, refresh]);
  if (error)
    return (
      <div className="receipt-state" role="alert">
        <p>{error}</p>
        <button
          className="primary"
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw aria-hidden="true" /> TRY AGAIN
        </button>
      </div>
    );
  if (!order)
    return (
      <p className="receipt-state" role="status">
        Preparing your receipt…
      </p>
    );
  const address = order.shippingAddress;
  return (
    <div className="receipt-view">
      <div className="receipt-toolbar">
        <div>
          <p className="eyebrow">YOUR ORDER RECORD</p>
          <h2>Order receipt</h2>
        </div>
        <button className="primary" onClick={() => window.print()}>
          <Printer aria-hidden="true" /> PRINT / SAVE PDF
        </button>
      </div>
      <article
        className="receipt-sheet"
        aria-label={`Receipt for ${order.number}`}
      >
        <div className="receipt-brand">
          <div className="brand">
            <Logo />
          </div>
          <span>
            ORDER RECEIPT
            <br />
            <strong>{order.number}</strong>
          </span>
        </div>
        <div className="receipt-demo">
          {order.payment.status === "approved"
            ? "Demo payment approved"
            : "Demo payment reversed"}{" "}
          · No money charged
        </div>
        <div className="receipt-meta">
          <div>
            <span>ISSUED</span>
            <p>
              {new Date(order.createdAt).toLocaleString("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Manila",
              })}
              <small>Philippine time</small>
            </p>
          </div>
          <div>
            <span>ORDER STATUS</span>
            <p>{statusLabels[order.status]}</p>
          </div>
        </div>
        <div className="receipt-address">
          <span>DELIVER TO</span>
          <p>
            <strong>{address.name}</strong>
            <br />
            {address.address}
            <br />
            {address.city}, {address.region} {address.postalCode}
            <br />
            Philippines
            <br />
            {address.phone}
          </p>
          <p>{order.customer.email}</p>
        </div>
        <div className="receipt-items-wrap">
          <table className="receipt-items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>
                      Size {item.size} · {item.sku}
                    </small>
                  </td>
                  <td>{item.qty}</td>
                  <td>{money(item.unitPrice)}</td>
                  <td>{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="receipt-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{money(order.shipping)}</dd>
          </div>
          <div className="receipt-grand-total">
            <dt>Order total</dt>
            <dd>{money(order.total)}</dd>
          </div>
        </dl>
        <div className="receipt-reference">
          <span>DEMO PAYMENT REFERENCE</span>
          <p>{order.payment.reference}</p>
        </div>
        <p className="receipt-disclaimer">
          This is a demo order receipt, not a tax invoice or proof of an actual
          payment. No real money was collected.
          {order.status === "cancelled"
            ? " This order has been cancelled."
            : ""}
        </p>
        <p className="receipt-thanks">
          Thank you for choosing Clover.
          <br />
          <small>Simple. Timeless. Yours.</small>
        </p>
      </article>
    </div>
  );
}
