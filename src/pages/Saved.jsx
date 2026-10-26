import { Heart, ArrowRight } from "lucide-react";
import { useStore } from "../context/StoreContext";
import ProductGrid from "../components/ProductGrid";
import CatalogState from "../components/CatalogState";
import "./Saved.css";

export default function Saved({ onNavigate }) {
  const { products, likes, status } = useStore();
  const pieces = products.filter((product) => likes.includes(product.id));
  return (
    <section className="saved-page section">
      <p className="eyebrow">A LITTLE COLLECTION OF YOUR OWN</p>
      <div className="saved-heading">
        <div>
          <h1>Saved pieces</h1>
          <p>
            The ones you keep coming back to. Saved on this device, ready when
            you are.
          </p>
        </div>
        <span className="saved-counter">
          <Heart aria-hidden="true" />
          {likes.length} saved
        </span>
      </div>
      {status !== "ready" ? (
        <CatalogState />
      ) : pieces.length ? (
        <>
          <ProductGrid products={pieces} />
          {pieces.length < likes.length && (
            <p className="saved-note">
              Some saved pieces are no longer available. We’re showing the ones
              currently in the collection.
            </p>
          )}
          <button
            className="saved-shop-link"
            onClick={() => onNavigate("Shop")}
          >
            Keep exploring <ArrowRight aria-hidden="true" />
          </button>
        </>
      ) : (
        <div className="saved-empty">
          <span className="saved-empty-icon">
            <Heart aria-hidden="true" />
          </span>
          <h2>Keep a few favourites close.</h2>
          <p>
            Tap the heart on a product to save it here.{" "}
            {likes.length
              ? "Your previously saved pieces aren’t available right now."
              : "No account needed."}
          </p>
          <button className="primary" onClick={() => onNavigate("Shop")}>
            EXPLORE THE COLLECTION <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
