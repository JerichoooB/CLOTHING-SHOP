import Asset from "../components/Asset";
import "./InfoPage.css";
import "./About.css";
export default function About({ onNavigate }) {
  return (
    <section className="info section about-page">
      <p className="eyebrow">THE CLOVER WAY</p>
      <h1>Simple. Timeless. Yours.</h1>
      <p>
        Clover is a lifestyle brand built on simplicity, quality, and
        self-expression. Easy silhouettes, a quiet palette, and pieces you can
        make your own.
      </p>
      <Asset cell={5} editorial label="Clover fabric texture" />
      <h2>Made for everyday moments.</h2>
      <button className="primary" onClick={() => onNavigate("Shop")}>
        EXPLORE THE COLLECTION ⟶
      </button>
    </section>
  );
}
