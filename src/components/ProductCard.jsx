import { Heart, ShoppingBag } from "lucide-react";
import Asset from "./Asset";
import { money } from "../lib/catalog";
import "./ProductCard.css";
export default function ProductCard({
  product: p,
  liked,
  onView,
  onAdd,
  onLike,
}) {
  return (
    <article className="product">
      <div className="product-image">
        <button
          className="w-full h-full block"
          onClick={onView}
          aria-label={`View ${p.name}`}
        >
          <Asset src={p.image} cell={p.cell} label={p.name} />
          <span className="quick">QUICK VIEW +</span>
        </button>
        <button
          className={`favorite ${liked ? "liked" : ""}`}
          aria-label={`Save ${p.name}`}
          aria-pressed={liked}
          onClick={onLike}
        >
          <Heart />
        </button>
        {p.badge && <span className="badge">{p.badge}</span>}
      </div>
      <div className="product-meta">
        <button className="product-name" onClick={onView}>
          {p.name}
        </button>
        <span>{money(p.price)}</span>
        {p.stock === 0 && <small className="product-stock">Out of stock</small>}
        <div className="product-bottom">
          <div className="swatches" aria-label="Neutral color palette">
            {p.colors.map((c) => (
              <i key={c} style={{ "--swatch": c }} />
            ))}
          </div>
          <button
            className="add-small"
            disabled={p.stock === 0}
            aria-label={`Add ${p.name} to bag`}
            onClick={onAdd}
          >
            <ShoppingBag />
          </button>
        </div>
      </div>
    </article>
  );
}
