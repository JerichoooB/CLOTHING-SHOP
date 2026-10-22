import { Plus, Minus, X } from "lucide-react";
import Asset from "./Asset";
import CatalogState from "./CatalogState";
import { useStore } from "../context/StoreContext";
import { money } from "../lib/catalog";
import "./Bag.css";
export default function Bag({ onNavigate }) {
  const { bag, products, status, quantity, remove } = useStore();
  const items = bag.flatMap((item) => {
    const product = products.find((p) => p.id === item.id);
    return product ? [{ ...item, product }] : [];
  });
  return (
    <>
      <p className="eyebrow">YOUR EVERYDAY FAVOURITES</p>
      <h2>Shopping Bag</h2>
      {status !== "ready" ? (
        <CatalogState />
      ) : items.length ? (
        items.map((item) => (
          <div className="cart-item" key={`${item.id}-${item.size}`}>
            <Asset
              src={item.product.image}
              cell={item.product.cell}
              label={item.product.name}
            />
            <div>
              <h4>{item.product.name}</h4>
              <small>Size: {item.size}</small>
              <p>{money(item.product.price)}</p>
              <div className="quantity">
                <button
                  aria-label="Decrease quantity"
                  onClick={() => quantity(item.id, item.size, -1)}
                >
                  <Minus size={12} />
                </button>
                <span>{item.qty}</span>
                <button
                  aria-label="Increase quantity"
                  onClick={() => quantity(item.id, item.size, 1)}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <button
              aria-label={`Remove ${item.product.name}`}
              onClick={() => remove(item.id, item.size)}
            >
              <X size={18} />
            </button>
          </div>
        ))
      ) : (
        <p className="empty">Your bag is waiting for something good.</p>
      )}
      <div className="subtotal">
        <span>Subtotal</span>
        <strong>
          {money(
            items.reduce((sum, item) => sum + item.product.price * item.qty, 0),
          )}
        </strong>
      </div>
      <p className="form-note">
        Checkout uses an automatically approved demo payment. No real money is
        charged.
      </p>
      {items.length > 0 && (
        <button
          className="primary bag-checkout"
          onClick={() => onNavigate("Checkout")}
        >
          CHECKOUT ⟶
        </button>
      )}
      <button className="primary" onClick={() => onNavigate("Shop")}>
        CONTINUE SHOPPING ⟶
      </button>
    </>
  );
}
