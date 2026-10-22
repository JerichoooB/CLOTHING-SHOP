import ProductCard from "./ProductCard";
import { useStore } from "../context/StoreContext";
import "./ProductGrid.css";
export default function ProductGrid({ products, home = false }) {
  const { likes, toggleLike, add, setModal } = useStore();
  return (
    <div className={`product-grid ${home ? "home-grid" : ""}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          liked={likes.includes(product.id)}
          onView={() => setModal({ type: "product", product })}
          onAdd={() =>
            add(
              product,
              product.variants.find((v) => v.size === "M" && v.stock > 0)
                ?.size ??
                product.variants.find((v) => v.stock > 0)?.size ??
                product.sizes[0],
            )
          }
          onLike={() => toggleLike(product.id)}
        />
      ))}
    </div>
  );
}
