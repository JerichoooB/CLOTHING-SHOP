import { useState } from "react";
import { api } from "../lib/api";
import "./StockProductRow.css";

export default function StockProductRow({
  item,
  selectedId,
  onSelect,
  lowOnly,
  onSaved,
  onHistory,
}) {
  const initial =
    (lowOnly &&
      item.variants.find(
        (variant) => variant.stock <= variant.lowStockThreshold,
      )) ||
    item.variants[0];
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const variant =
    item.variants.find((value) => value.id === selectedId) || initial;
  const total = item.variants.reduce((sum, value) => sum + value.stock, 0);
  async function adjust(event) {
    event.preventDefault();
    if (pending) return;
    const form = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError("");
    try {
      await api(`/api/admin/inventory/${variant.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({
          delta: Number(form.delta),
          reason: form.reason,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <tr className="stock-product-row">
      <td>
        <strong>{item.name}</strong>
        <small>
          Product ID {item.productId} · {item.sku}
        </small>
        <small>
          {total} units across {item.variants.length} sizes
        </small>
      </td>
      <td>
        <select
          className="stock-size-select"
          aria-label={`Size for ${item.name}`}
          value={variant.id}
          disabled={pending}
          onChange={(event) => {
            onSelect(event.target.value);
            setError("");
          }}
        >
          {item.variants.map((value) => (
            <option key={value.id} value={value.id}>
              {value.size} · {value.stock} left
            </option>
          ))}
        </select>
        <small>{variant.sku}</small>
      </td>
      <td>
        <span
          className={
            variant.stock <= variant.lowStockThreshold
              ? "stock-low"
              : "stock-good"
          }
        >
          {variant.stock}
        </span>
        <small>
          Size {variant.size} · Low at {variant.lowStockThreshold}
        </small>
      </td>
      <td>
        <form key={variant.id} className="inventory-adjust" onSubmit={adjust}>
          <input
            type="number"
            name="delta"
            aria-label={`Stock adjustment for ${variant.sku}`}
            disabled={pending}
            required
            min={-100000}
            max={100000}
            step="1"
            placeholder="+ / − qty"
          />
          <input
            name="reason"
            aria-label={`Adjustment reason for ${variant.sku}`}
            disabled={pending}
            required
            minLength={3}
            maxLength={300}
            placeholder="Reason"
          />
          <button disabled={pending}>{pending ? "Saving…" : "Apply"}</button>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </td>
      <td>
        <button
          className="inventory-history"
          disabled={pending}
          onClick={() => onHistory(variant)}
        >
          View log
        </button>
        <small>Size {variant.size}</small>
      </td>
    </tr>
  );
}
