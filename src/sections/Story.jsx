import { ArrowRight } from "lucide-react";
import Asset from "../components/Asset";
import "./Story.css";
export default function Story({ onNavigate }) {
  return (
    <section className="story section">
      <Asset cell={5} editorial label="Clover embroidery on black cotton" />
      <div>
        <p className="eyebrow">OUR STORY —</p>
        <h2>More Than Just Clothing.</h2>
        <p>
          Clover is a lifestyle brand built on simplicity, quality, and
          self-expression. We create timeless pieces for everyday people who
          move with purpose.
        </p>
        <button className="primary" onClick={() => onNavigate("About")}>
          LEARN MORE <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
