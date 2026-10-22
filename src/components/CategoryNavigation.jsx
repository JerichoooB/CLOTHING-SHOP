import { categories } from "../lib/catalog";
import "./CategoryNavigation.css";
export default function CategoryNavigation({ page, onNavigate }) {
  return (
    <nav className="shop-categories" aria-label="Shop categories">
      {["Shop", ...categories].map((name) => (
        <a
          href={"#" + name.toLowerCase()}
          key={name}
          aria-current={page === name ? "page" : undefined}
          className={page === name ? "selected" : ""}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(name);
          }}
        >
          {name === "Shop" ? "All Collections" : name}
        </a>
      ))}
    </nav>
  );
}
