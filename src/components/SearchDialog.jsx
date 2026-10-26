import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import "./SearchDialog.css";
export default function SearchDialog({ onSearch }) {
  const [query, setQuery] = useState(""),
    [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setError("Enter a product name to start searching.");
      return;
    }
    onSearch(value);
  }
  return (
    <div className="search-panel">
      <p className="eyebrow">FIND SOMETHING YOU LOVE</p>
      <h2>Search the collection</h2>
      <p className="search-intro">
        An everyday favourite is just a search away.
      </p>
      <form className="search-form" onSubmit={submit}>
        <div className="search-input-wrap">
          <Search aria-hidden="true" />
          <input
            data-autofocus
            name="query"
            type="search"
            aria-label="Search products"
            aria-describedby={error ? "search-error" : undefined}
            aria-invalid={Boolean(error)}
            placeholder="Try hoodie, tote, tee…"
            maxLength={80}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError("");
            }}
          />
        </div>
        <button className="primary">
          SEARCH <ArrowRight aria-hidden="true" />
        </button>
      </form>
      {error && (
        <p id="search-error" className="auth-error" role="alert">
          {error}
        </p>
      )}
      <div className="search-suggestions">
        <span>A few favourites</span>
        {["Tee", "Hoodie", "Tote", "Cap"].map((term) => (
          <button key={term} onClick={() => onSearch(term)}>
            {term} <ArrowRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
