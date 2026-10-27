import { useState } from "react";
import { FileText } from "lucide-react";
import { useStore } from "../context/StoreContext";
import Asset from "./Asset";
import { money } from "../lib/catalog";
import "./OrderCard.css";
export const statusLabels = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const nextStatuses = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
const when = (value) =>
  new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export default function OrderCard({ order, admin = false, onUpdate }) {
  const { setModal } = useStore();
  const [next, setNext] = useState(""),
    [note, setNote] = useState(""),
    [tracking, setTracking] = useState(order.trackingNumber || ""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [expanded, setExpanded] = useState(false);
  async function update(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await onUpdate(order, {
        status: next,
        expectedStatus: order.status,
        note,
        trackingNumber: tracking,
      });
      setNext("");
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="order-card">
      <div className="order-heading">
        <div>
          <h2>{order.number}</h2>
          <small>{when(order.createdAt)}</small>
        </div>
        <span className={`order-status status-${order.status}`}>
          {statusLabels[order.status]}
        </span>
      </div>
      <div className="order-payment">
        <span>
          Demo payment{" "}
          {order.payment.status === "approved" ? "approved" : "reversed"} · No
          real charge
        </span>
        <strong>{money(order.total)}</strong>
      </div>
      {admin && (
        <p className="order-customer">
          {order.customer.name} · {order.customer.email}
        </p>
      )}
      <div className="order-items">
        {order.items.map((item) => (
          <div className="order-line" key={item.id}>
            <Asset src={item.image} cell={item.cell} label={item.name} />
            <div>
              <h3>{item.name}</h3>
              <small>
                {item.size} · Qty {item.qty} · {item.sku}
              </small>
            </div>
            <strong>{money(item.lineTotal)}</strong>
          </div>
        ))}
      </div>
      {order.trackingNumber && (
        <p className="order-tracking">
          Tracking reference: {order.trackingNumber}
        </p>
      )}
      <div className="order-actions">
        <button
          className="order-details-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide" : "View"} delivery details & status history
        </button>
        <button
          className="order-receipt-button"
          onClick={() =>
            setModal({
              type: "receipt",
              orderId: order.id,
              title: "Order receipt",
            })
          }
        >
          <FileText aria-hidden="true" /> View receipt
        </button>
      </div>
      {expanded && (
        <div className="order-details">
          <div>
            <h3>Ship to</h3>
            <p>
              {order.shippingAddress.name}
              <br />
              {order.shippingAddress.address}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.region}{" "}
              {order.shippingAddress.postalCode}
              <br />
              Philippines · {order.shippingAddress.phone}
            </p>
            <p>
              Subtotal {money(order.subtotal)} · Shipping{" "}
              {money(order.shipping)}
            </p>
            <small>Payment reference: {order.payment.reference}</small>
          </div>
          <ol className="order-timeline">
            {order.history.map((event) => (
              <li key={event.id}>
                <strong>{statusLabels[event.status]}</strong>
                <time>{when(event.createdAt)}</time>
                {event.note && <p>{event.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {admin && nextStatuses[order.status].length > 0 && (
        <form className="order-update-form" onSubmit={update}>
          <label>
            Next status
            <select
              aria-label="Next status"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            >
              <option value="">Choose status</option>
              {nextStatuses[order.status].map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tracking reference (optional)
            <input
              value={tracking}
              maxLength={80}
              onChange={(e) => setTracking(e.target.value)}
            />
          </label>
          <label>
            Note (optional)
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {next === "cancelled" && (
            <p>
              Cancellation restores stock and reverses the simulated payment.
            </p>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={pending || !next}>
            {pending ? "UPDATING…" : "UPDATE STATUS"}
          </button>
        </form>
      )}
    </article>
  );
}
