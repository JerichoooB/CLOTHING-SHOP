import { ArrowRight, MessageCircle } from "lucide-react";
import "./StayConnected.css";
export default function StayConnected({ onNavigate }) {
  return (
    <section className="stay-connected">
      <span className="stay-connected-icon">
        <MessageCircle aria-hidden="true" />
      </span>
      <p className="eyebrow">A CONVERSATION STARTS HERE</p>
      <h2>A little closer to Clover.</h2>
      <p>
        Questions about a piece, your order, or finding your fit? We’re here to
        help.
      </p>
      <button className="primary" onClick={() => onNavigate("Contact")}>
        GET IN TOUCH <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}
