import "./SearchDialog.css";
export default function SearchDialog({ onSearch }) {
  return (
    <>
      <p className="eyebrow">FIND SOMETHING YOU LOVE</p>
      <h2>Search the collection</h2>
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(new FormData(e.currentTarget).get("query"));
        }}
      >
        <input
          autoFocus
          required
          name="query"
          aria-label="Search products"
          placeholder="Try hoodie, tote, tee…"
        />
        <button className="primary">SEARCH ⟶</button>
      </form>
    </>
  );
}
