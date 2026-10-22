import Asset from "../components/Asset";
import SectionTitle from "../components/SectionTitle";
import { categories } from "../lib/catalog";
import "./Categories.css";
export default function Categories({ onNavigate }) {
  return (
    <section className="section">
      <SectionTitle
        eyebrow="Find your perfect fit."
        title="Shop by Category"
        onClick={() => onNavigate("Shop")}
      />
      <div className="categories">
        {categories.map((name, index) => (
          <button
            className="category"
            key={name}
            onClick={() => onNavigate(name)}
          >
            <Asset
              src="/images/clover-categories.png"
              cell={index}
              grid={[2, 2]}
              label={`${name} collection`}
            />
            <div>
              <h3>{name}</h3>
              <span>SHOP NOW ⟶</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
