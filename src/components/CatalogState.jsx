import { useStore } from "../context/StoreContext";
import "./CatalogState.css";
export default function CatalogState() {
  const { status, load } = useStore();
  return status === "loading" ? (
    <p className="catalog-status" role="status">
      Loading the collection…
    </p>
  ) : status === "error" ? (
    <div className="catalog-status">
      <p role="alert">The collection couldn’t load. Please try again.</p>
      <button className="primary" onClick={load}>
        TRY AGAIN
      </button>
    </div>
  ) : null;
}
