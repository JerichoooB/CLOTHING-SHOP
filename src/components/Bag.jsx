import {
  Plus,
  Minus,
  X,
  ShoppingBag,
  ArrowRight,
  Truck,
  Check,
  ShieldCheck,
} from "lucide-react";
import Asset from "./Asset";
import CatalogState from "./CatalogState";
import { useStore } from "../context/StoreContext";
import { money } from "../lib/catalog";
import "./Bag.css";
export default function Bag({ onNavigate }) {
  const { bag, products, status, quantity, remove } = useStore();
  const items = bag.map((item) => ({
    ...item,
    product: products.find((product) => product.id === item.id),
  }));
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.qty,
    0,
  );
  const shipping = subtotal >= 1500 ? 0 : 100;
  const needsReview = items.some(
    (item) =>
      !item.product ||
      item.qty >
        (item.product.variants.find((variant) => variant.size === item.size)
          ?.stock || 0),
  );
  return (
    <div className="bag-panel">
      <div className="bag-header">
        <p className="eyebrow">GOOD FINDS. EVERYDAY FAVOURITES.</p>
        <div className="bag-heading">
          <h2>Shopping Bag</h2>
          <span className="bag-count" aria-live="polite">
            {count}
          </span>
        </div>
      </div>
      <div className="bag-body">
        {status !== "ready" ? (
          <CatalogState />
        ) : !items.length ? (
          <div className="bag-empty">
            <span className="bag-empty-icon">
              <ShoppingBag aria-hidden="true" />
            </span>
            <h3>A little room for something good.</h3>
            <p>
              Your bag is empty. Discover the pieces you’ll reach for every day.
            </p>
            <button className="primary" onClick={() => onNavigate("Shop")}>
              EXPLORE THE COLLECTION <ArrowRight aria-hidden="true" />
            </button>
            <span className="bag-empty-note">
              <Truck aria-hidden="true" /> Free shipping from ₱1,500
            </span>
          </div>
        ) : (
          <>
            <div
              className={`bag-shipping ${subtotal >= 1500 ? "qualified" : ""}`}
            >
              <div>
                {subtotal >= 1500 ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Truck aria-hidden="true" />
                )}
                <p>
                  {subtotal >= 1500 ? (
                    "You’ve unlocked free shipping."
                  ) : (
                    <>
                      <strong>{money(1500 - subtotal)}</strong> away from free
                      shipping.
                    </>
                  )}
                </p>
              </div>
              <div
                className="bag-shipping-track"
                role="progressbar"
                aria-label="Progress toward free shipping"
                aria-valuemin={0}
                aria-valuemax={1500}
                aria-valuenow={Math.min(subtotal, 1500)}
              >
                <span
                  style={{
                    width: `${Math.min(100, (subtotal / 1500) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="bag-items">
              {items.map((item) => {
                const stock =
                  item.product?.variants.find(
                    (variant) => variant.size === item.size,
                  )?.stock || 0;
                const name = item.product?.name || "Unavailable product";
                return (
                  <article
                    className="cart-item"
                    key={`${item.id}-${item.size}`}
                  >
                    {item.product ? (
                      <Asset
                        src={item.product.image}
                        cell={item.product.cell}
                        label={name}
                      />
                    ) : (
                      <div className="bag-unavailable-image">
                        <ShoppingBag aria-hidden="true" />
                      </div>
                    )}
                    <div className="cart-item-content">
                      <div className="cart-item-heading">
                        <h4>{name}</h4>
                        <button
                          className="bag-remove"
                          aria-label={`Remove ${name}, size ${item.size}`}
                          title="Remove from bag"
                          onClick={() => remove(item.id, item.size)}
                        >
                          <X />
                        </button>
                      </div>
                      <span className="bag-size">Size {item.size}</span>
                      {item.product && (
                        <p className="bag-unit-price">
                          {money(item.product.price)} each
                        </p>
                      )}
                      <div className="cart-item-bottom">
                        <div className="quantity">
                          <button
                            aria-label={`Decrease quantity of ${name}, size ${item.size}`}
                            disabled={item.qty <= 1}
                            onClick={() => quantity(item.id, item.size, -1)}
                          >
                            <Minus aria-hidden="true" />
                          </button>
                          <span aria-label={`Quantity ${item.qty}`}>
                            {item.qty}
                          </span>
                          <button
                            aria-label={`Increase quantity of ${name}, size ${item.size}`}
                            disabled={item.qty >= Math.min(stock, 99)}
                            onClick={() => quantity(item.id, item.size, 1)}
                          >
                            <Plus aria-hidden="true" />
                          </button>
                        </div>
                        <strong>
                          {item.product
                            ? money(item.product.price * item.qty)
                            : "Unavailable"}
                        </strong>
                      </div>
                      {(!item.product || item.qty > stock) && (
                        <p className="bag-stock-warning" role="alert">
                          {stock
                            ? `Only ${stock} available in this size. Reduce the quantity.`
                            : "This size is unavailable. Remove it to continue."}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="bag-reservation-note">
              Items aren’t reserved until checkout is complete.
            </p>
          </>
        )}
      </div>
      {status === "ready" && items.length > 0 && (
        <div className="bag-footer">
          <div className="bag-summary-line">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="bag-summary-line">
            <span>Estimated shipping</span>
            <span className={shipping === 0 ? "bag-free-shipping" : ""}>
              {shipping === 0 ? "Free" : money(shipping)}
            </span>
          </div>
          <div className="bag-total">
            <span>Estimated total</span>
            <strong>{money(subtotal + shipping)}</strong>
          </div>
          {needsReview && (
            <p className="bag-stock-warning">
              Review unavailable items before checkout.
            </p>
          )}
          <button
            className="primary bag-checkout"
            disabled={needsReview}
            onClick={() => onNavigate("Checkout")}
          >
            CHECKOUT <ArrowRight aria-hidden="true" />
          </button>
          <p className="bag-demo-note">
            <ShieldCheck aria-hidden="true" />
            Demo payment only. No real money charged.
          </p>
          <button className="bag-continue" onClick={() => onNavigate("Shop")}>
            Continue shopping
          </button>
        </div>
      )}
    </div>
  );
}
