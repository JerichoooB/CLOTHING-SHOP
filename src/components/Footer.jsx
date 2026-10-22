import Logo from "./Logo";
import { useStore } from "../context/StoreContext";
import "./Footer.css";
export default function Footer({ onNavigate }) {
  const { setModal } = useStore();
  const help = (title, text) => setModal({ type: "help", title, text });
  return (
    <footer>
      <div className="footer-main">
        <div>
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("Home");
            }}
          >
            <Logo />
          </a>
          <p className="tagline">Simple. Timeless. Yours.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          {["Home", "Shop", "About", "Contact"].map((name) => (
            <a
              key={name}
              href={"#" + name.toLowerCase()}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(name);
              }}
            >
              {name}
            </a>
          ))}
        </div>
        <div>
          <h4>Customer Care</h4>
          {["Shipping", "Returns", "FAQ", "Size Guide"].map((name) => (
            <button
              key={name}
              onClick={() =>
                help(
                  name,
                  name === "Size Guide"
                    ? "Sample chest measurements: XS 32–34 in, S 34–36 in, M 38–40 in, L 42–44 in, XL 46–48 in. Confirm product measurements before ordering."
                    : "Your orders are saved by the store. Checkout uses a simulated payment and does not charge money. Shipping and return fulfillment are demonstration workflows.",
                )
              }
            >
              {name}
            </button>
          ))}
        </div>
        <div>
          <h4>Follow Us</h4>
          <div className="social-links">
            <span aria-label="Instagram">◎</span>
            <span aria-label="TikTok">♪</span>
            <span aria-label="Facebook">ⓕ</span>
            <span className="youtube" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M22 6.5c-.3-1-1.7-2-2-2C18.3 4 12 4 12 4s-6.3 0-8 .5c-1 .3-1.7 1-2 2C1.5 8.2 1.5 12 1.5 12s0 3.8.5 5.5c.3 1 1 1.7 2 2 1.7.5 8 .5 8 .5s6.3 0 8-.5c1-.3 1.7-1 2-2 .5-1.7.5-5.5.5-5.5s0-3.8-.5-5.5ZM10 16V8l7 4-7 4Z" />
              </svg>
            </span>
            <span aria-label="X">𝕏</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Clover. All rights reserved.</span>
        <button
          onClick={() =>
            help(
              "Privacy Policy",
              "Your bag is stored in this browser. The store saves your account details, shipping details, orders and simulated payment records. Contact messages, names and email addresses are sent through Formspree. Newsletter signup is not connected.",
            )
          }
        >
          Privacy Policy
        </button>
        <button
          onClick={() =>
            help(
              "Terms of Service",
              "Demo store. Orders are recorded, but payment approvals are simulated and no money is charged.",
            )
          }
        >
          Terms of Service
        </button>
      </div>
    </footer>
  );
}
