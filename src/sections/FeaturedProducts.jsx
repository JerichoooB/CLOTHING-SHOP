import { useStore } from "../context/StoreContext";
import SectionTitle from "../components/SectionTitle";
import ProductGrid from "../components/ProductGrid";
import CatalogState from "../components/CatalogState";
import "./FeaturedProducts.css";
export default function FeaturedProducts({ onNavigate }) {
  const { products, status } = useStore();
  return (
    <section className="section featured">
      <SectionTitle
        title="Featured Products —"
        onClick={() => onNavigate("Shop")}
      />
      {status === "ready" ? (
        <ProductGrid
          products={[25, 1, 2, 3, 4]
            .map((id) => products.find((p) => p.id === id))
            .filter(Boolean)}
          home
        />
      ) : (
        <CatalogState />
      )}
    </section>
  );
}
