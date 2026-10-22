import { useState } from "react";
import Asset from "./Asset";
import { money } from "../lib/catalog";
import "./ProductDetail.css";
export default function ProductDetail({ product: p, onAdd }) {
  const [size, setSize] = useState(
    p.variants.find((v) => v.size === "M" && v.stock > 0)?.size ??
      p.variants.find((v) => v.stock > 0)?.size ??
      p.sizes[0],
  );
  return (
    <div className="detail">
      <Asset src={p.image} cell={p.cell} label={p.name} />
      <div>
        <p className="eyebrow">CLOVER ESSENTIALS</p>
        <h2>{p.name}</h2>
        <p>{money(p.price)}</p>
        <p className="detail-copy">
          An everyday favourite, with a relaxed silhouette and a considered
          finish. Made to fit effortlessly into your wardrobe.
        </p>
        <label>
          Size
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            {p.sizes.map((s) => (
              <option
                key={s}
                disabled={p.variants.find((v) => v.size === s)?.stock === 0}
              >
                {s}
              </option>
            ))}
          </select>
        </label>
        <p className="detail-stock">
          {p.variants.find((v) => v.size === size)?.stock ?? 0} available · SKU{" "}
          {p.variants.find((v) => v.size === size)?.sku}
        </p>
        <button
          className="primary"
          disabled={(p.variants.find((v) => v.size === size)?.stock ?? 0) === 0}
          onClick={() => onAdd(size)}
        >
          ADD TO BAG ⟶
        </button>
        <small>Free shipping on orders over ₱1,500</small>
      </div>
    </div>
  );
}
