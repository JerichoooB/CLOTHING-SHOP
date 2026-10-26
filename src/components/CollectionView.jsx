import { useState } from "react";
import { useStore } from "../context/StoreContext";
import Hero from "./Hero";
import CategoryNavigation from "./CategoryNavigation";
import WomenFilters from "./WomenFilters";
import ProductGrid from "./ProductGrid";
import CatalogState from "./CatalogState";
import "./CollectionView.css";
export default function CollectionView({
  page,
  query,
  onClearSearch,
  onNavigate,
}) {
  const { products, status } = useStore();
  const [filter, setFilter] = useState("All"),
    [sort, setSort] = useState("featured"),
    [sizeFilter, setSizeFilter] = useState(""),
    [colorFilter, setColorFilter] = useState(""),
    [priceFilter, setPriceFilter] = useState("");
  const list = products
    .filter(
      (p) =>
        (page === "Shop" || p.collections.includes(page)) &&
        (filter === "All" || p.type === filter) &&
        (!sizeFilter || p.sizes.includes(sizeFilter)) &&
        (!colorFilter || p.colors.includes(colorFilter)) &&
        (!priceFilter ||
          (priceFilter === "under"
            ? p.price >= 150 && p.price < 300
            : priceFilter === "mid"
              ? p.price >= 300 && p.price < 450
              : priceFilter === "upper"
                ? p.price >= 450 && p.price < 600
                : priceFilter === "premium"
                  ? p.price >= 600 && p.price <= 700
                  : false)) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : page === "Accessories"
            ? (a.accessoryOrder ?? a.order) - (b.accessoryOrder ?? b.order)
            : a.order - b.order,
    );
  return (
    <>
      <Hero page={page} go={onNavigate} />
      <div className="section collection-navigation">
        <CategoryNavigation page={page} onNavigate={onNavigate} />
      </div>
      <section
        className={`section collection ${page === "Women" ? "women-collection" : ""}`}
        id="products"
      >
        {page === "Women" && (
          <WomenFilters
            {...{
              filter,
              setFilter,
              sizeFilter,
              setSizeFilter,
              colorFilter,
              setColorFilter,
              priceFilter,
              setPriceFilter,
            }}
          />
        )}
        <div className="catalog-content">
          <div className="filters">
            {page === "Women" ? (
              <span className="results">{list.length} products</span>
            ) : (
              <div>
                {[
                  "All",
                  ...(page === "Accessories"
                    ? ["Bags", "Headwear", "Socks & Small Goods"]
                    : ["Tops", "Bottoms", "Outerwear", "Accessories"]),
                ].map((name) => (
                  <button
                    className={filter === name ? "active" : ""}
                    key={name}
                    onClick={() => setFilter(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <label>
              Sort by:{" "}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          {query && (
            <div className="search-summary">
              <p>Search results for “{query}”</p>
              <button onClick={onClearSearch}>Clear search</button>
            </div>
          )}
          {status === "ready" ? (
            <>
              <ProductGrid products={list} />
              {!list.length ? (
                <div className="collection-empty">
                  <p>No pieces found. Try a different search or filter.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setFilter("All");
                      setSizeFilter("");
                      setColorFilter("");
                      setPriceFilter("");
                      onClearSearch?.();
                    }}
                  >
                    RESET FILTERS
                  </button>
                </div>
              ) : (
                <p className="catalog-result-count">
                  Showing all {list.length} pieces
                </p>
              )}
            </>
          ) : (
            <CatalogState />
          )}
        </div>
      </section>
    </>
  );
}
