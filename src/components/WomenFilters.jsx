import { useState } from "react";
import { RotateCcw, SlidersHorizontal, ChevronDown } from "lucide-react";
import "./WomenFilters.css";
export default function WomenFilters({
  filter,
  setFilter,
  sizeFilter,
  setSizeFilter,
  colorFilter,
  setColorFilter,
  priceFilter,
  setPriceFilter,
}) {
  const [open, setOpen] = useState(false);
  const activeCount =
    Number(filter !== "All") +
    Number(Boolean(sizeFilter)) +
    Number(Boolean(colorFilter)) +
    Number(Boolean(priceFilter));
  return (
    <aside className="sidebar">
      <button
        className="sidebar-toggle"
        aria-expanded={open}
        aria-controls="women-filter-controls"
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal /> Filters{" "}
        {activeCount > 0 && <span>{activeCount} active</span>}
        <ChevronDown />
      </button>
      <div
        id="women-filter-controls"
        className={`sidebar-filter-content ${open ? "open" : ""}`}
      >
        <h4>CATEGORIES</h4>
        <div className="sidebar-categories">
          {[
            "All",
            "Tops",
            "Bottoms",
            "Dresses",
            "Outerwear",
            "Accessories",
          ].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "All" ? "All Women" : f}
            </button>
          ))}
        </div>
        <div className="sidebar-group">
          <h4>SIZE</h4>
          <div className="size-options">
            {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
              <button
                key={s}
                className={sizeFilter === s ? "selected" : ""}
                onClick={() => setSizeFilter(sizeFilter === s ? "" : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-group">
          <h4>COLOR</h4>
          <div className="color-options">
            {[
              "#22231f",
              "#f7f5eb",
              "#c4b9a7",
              "#ca9d94",
              "#959f8d",
              "#969794",
            ].map((c, i) => (
              <button
                key={c}
                style={{ background: c }}
                aria-label={
                  ["Black", "Cream", "Taupe", "Pink", "Sage", "Grey"][i]
                }
                aria-pressed={colorFilter === c}
                className={colorFilter === c ? "selected" : ""}
                onClick={() => setColorFilter(colorFilter === c ? "" : c)}
              />
            ))}
          </div>
        </div>
        <div className="sidebar-group">
          <h4>PRICE</h4>
          {[
            ["under", "Under ₱1,000"],
            ["mid", "₱1,000 – ₱1,500"],
            ["upper", "₱1,500 – ₱2,500"],
            ["premium", "₱2,500 – ₱4,000"],
            ["luxury", "Over ₱4,000"],
          ].map(([v, t]) => (
            <label className="price-option" key={v}>
              <input
                type="radio"
                name="price"
                value={v}
                checked={priceFilter === v}
                onChange={() => setPriceFilter(v)}
              />
              {t}
            </label>
          ))}
        </div>
        <button
          className="reset-filters"
          onClick={() => {
            setFilter("All");
            setSizeFilter("");
            setColorFilter("");
            setPriceFilter("");
          }}
        >
          <RotateCcw size={12} /> Reset Filters
        </button>
      </div>
    </aside>
  );
}
