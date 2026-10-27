import { useState, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../context/StoreContext";
import "./ProductPriceEditor.css";
const money = (cents) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    cents / 100,
  );
export default function ProductPriceEditor({ item, onSaved }) {
  const { notify } = useStore();
  const [editing, setEditing] = useState(false),
    [price, setPrice] = useState((item.priceCents / 100).toFixed(2)),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const inFlight = useRef(false);
  async function save(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await api(
        "/api/admin/products/" + item.productId + "/price",
        {
          method: "PATCH",
          body: JSON.stringify({ price, expectedPriceCents: item.priceCents }),
        },
      );
      notify(
        result.changed
          ? "Product price updated."
          : "The product price is unchanged.",
      );
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  if (!editing)
    return (
      <div className="product-price-display">
        <span>{money(item.priceCents)}</span>
        <button
          aria-label={`Edit price for ${item.name}`}
          onClick={() => {
            setPrice((item.priceCents / 100).toFixed(2));
            setError("");
            setEditing(true);
          }}
        >
          <Pencil aria-hidden="true" /> Edit price
        </button>
      </div>
    );
  return (
    <form className="product-price-editor" onSubmit={save} aria-busy={pending}>
      <label htmlFor={"price-" + item.productId}>Product price (PHP)</label>
      <div>
        <input
          id={"price-" + item.productId}
          autoFocus
          type="number"
          inputMode="decimal"
          required
          min={150}
          max={700}
          step="0.01"
          value={price}
          readOnly={pending}
          onChange={(event) => {
            setPrice(event.target.value);
            setError("");
          }}
        />
        <button
          className="price-save"
          type="submit"
          disabled={pending}
          aria-label={`Save price for ${item.name}`}
        >
          <Check aria-hidden="true" />
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="price-cancel"
          disabled={pending}
          aria-label={`Cancel price edit for ${item.name}`}
          onClick={() => setEditing(false)}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <small>₱150–₱700 · Applies to all sizes</small>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
