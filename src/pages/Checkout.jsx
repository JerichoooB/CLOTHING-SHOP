import { useEffect, useState } from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { money } from "../lib/catalog";
import { checkoutSignature, checkoutKey } from "../lib/checkout-attempt";
import OrderCard from "../components/OrderCard";
import "./Checkout.css";
const readAttempt = () => {
  try {
    return JSON.parse(sessionStorage.getItem("clover-checkout") || "null");
  } catch {
    return null;
  }
};
export default function Checkout({ onNavigate }) {
  const { user, authLoading, bag, setModal, completeCheckout, load, notify } =
    useStore();
  const [quote, setQuote] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [confirmed, setConfirmed] = useState(null);
  const cartKey = JSON.stringify(bag);
  function finish(order) {
    setConfirmed(order);
    completeCheckout(order.items);
    sessionStorage.removeItem("clover-checkout");
    load();
    notify("Order confirmed. Demo payment approved; no money charged.");
  }
  useEffect(() => {
    let active = true;
    if (!user || confirmed) return;
    setLoading(true);
    setError("");
    (async () => {
      const attempt = readAttempt();
      if (attempt?.userId === user.id && attempt.cartKey === cartKey) {
        try {
          const result = await api("/api/orders/attempt/" + attempt.key);
          if (active) {
            finish(result.order);
            return;
          }
        } catch {}
      }
      if (!bag.length) {
        if (active) setLoading(false);
        return;
      }
      try {
        const data = await api("/api/checkout/quote", {
          method: "POST",
          body: JSON.stringify({ items: bag }),
        });
        if (active) setQuote(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, cartKey, confirmed?.id]);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const shipping = Object.fromEntries(new FormData(event.currentTarget));
      const payload = { items: bag, shipping, paymentMethod: "demo" };
      const signature = checkoutSignature(payload);
      let attempt = readAttempt();
      if (attempt?.signature !== signature || attempt?.userId !== user.id)
        attempt = {
          key: checkoutKey(),
          signature,
          userId: user.id,
          cartKey,
        };
      sessionStorage.setItem("clover-checkout", JSON.stringify(attempt));
      const result = await api("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ ...payload, idempotencyKey: attempt.key }),
      });
      finish(result.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  if (authLoading)
    return (
      <section className="checkout-page section">
        <p role="status">Checking your account…</p>
      </section>
    );
  if (!user)
    return (
      <section className="checkout-page section">
        <p className="eyebrow">YOUR EVERYDAY FAVOURITES</p>
        <h1>Checkout</h1>
        <p>Please log in or create an account to place and track your order.</p>
        <button
          className="primary"
          onClick={() => setModal({ type: "account" })}
        >
          LOG IN / CREATE ACCOUNT
        </button>
      </section>
    );
  if (confirmed)
    return (
      <section className="checkout-page section">
        <CheckCircle className="confirmation-icon" />
        <p className="eyebrow">ORDER CONFIRMED</p>
        <h1>Thank you, {user.name}.</h1>
        <p>
          {confirmed.payment.status === "approved"
            ? "Your demo payment was approved. No money was charged."
            : "This order was cancelled and its demo payment was reversed. No money was charged."}
        </p>
        <OrderCard order={confirmed} />
        <button className="primary" onClick={() => onNavigate("Orders")}>
          VIEW MY ORDERS ⟶
        </button>
      </section>
    );
  if (!bag.length)
    return (
      <section className="checkout-page section">
        <h1>Your bag is empty.</h1>
        <button className="primary" onClick={() => onNavigate("Shop")}>
          EXPLORE THE COLLECTION
        </button>
      </section>
    );
  return (
    <section className="checkout-page section">
      <p className="eyebrow">ONE STEP CLOSER TO YOUR EVERYDAY</p>
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <h2>Shipping details</h2>
          <label>
            Full name
            <input
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
              maxLength={80}
              autoComplete="shipping name"
            />
          </label>
          <label>
            Phone number
            <input
              name="phone"
              required
              minLength={7}
              maxLength={30}
              autoComplete="shipping tel"
              placeholder="09XX XXX XXXX"
            />
          </label>
          <label>
            Street address
            <input
              name="address"
              required
              minLength={5}
              maxLength={250}
              autoComplete="shipping street-address"
            />
          </label>
          <div className="checkout-field-row">
            <label>
              City
              <input
                name="city"
                required
                minLength={2}
                maxLength={80}
                autoComplete="shipping address-level2"
              />
            </label>
            <label>
              Province / region
              <input
                name="region"
                required
                minLength={2}
                maxLength={80}
                autoComplete="shipping address-level1"
              />
            </label>
          </div>
          <div className="checkout-field-row">
            <label>
              Postal code
              <input
                name="postalCode"
                required
                minLength={3}
                maxLength={20}
                autoComplete="shipping postal-code"
              />
            </label>
            <label>
              Country
              <select name="country">
                <option value="PH">Philippines</option>
              </select>
            </label>
          </div>
          <div className="demo-payment">
            <ShieldCheck />
            <div>
              <strong>Demo payment — automatically approved</strong>
              <p>
                No card details or real money are involved. Your order will
                appear in My Orders.
              </p>
            </div>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={pending || loading || !quote}>
            {pending ? "PLACING ORDER…" : "PLACE ORDER · DEMO PAYMENT ⟶"}
          </button>
        </form>
        <aside className="checkout-summary">
          <h2>Your order</h2>
          {loading ? (
            <p role="status">Checking prices and availability…</p>
          ) : quote ? (
            <>
              {quote.lines.map((item) => (
                <div className="checkout-summary-line" key={item.variantId}>
                  <span>
                    {item.name}
                    <small>
                      {item.size} · Qty {item.qty}
                    </small>
                  </span>
                  <strong>{money(item.lineTotal)}</strong>
                </div>
              ))}
              <div className="checkout-summary-line">
                <span>Subtotal</span>
                <span>{money(quote.subtotal)}</span>
              </div>
              <div className="checkout-summary-line">
                <span>Shipping</span>
                <span>
                  {quote.shipping === 0 ? "Free" : money(quote.shipping)}
                </span>
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <strong>{money(quote.total)}</strong>
              </div>
              <small>PHP · Free shipping from ₱1,500; otherwise ₱100.</small>
            </>
          ) : (
            <p>Update your bag to resolve availability issues.</p>
          )}
          <button
            className="checkout-edit"
            disabled={pending}
            onClick={() => setModal({ type: "bag" })}
          >
            Edit shopping bag
          </button>
        </aside>
      </div>
    </section>
  );
}
