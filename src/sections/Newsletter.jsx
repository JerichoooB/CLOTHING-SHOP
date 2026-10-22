import { useStore } from "../context/StoreContext";
import "./Newsletter.css";
export default function Newsletter() {
  const { notify } = useStore();
  return (
    <section className="newsletter">
      <h2>Stay in the Loop</h2>
      <p>Be the first to know about new drops, exclusive offers, and more.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          notify("Newsletter signup is coming soon. No address was submitted.");
        }}
      >
        <input
          required
          type="email"
          aria-label="Email address"
          placeholder="Enter your email address"
        />
        <button className="primary">SUBSCRIBE ⟶</button>
      </form>
    </section>
  );
}
