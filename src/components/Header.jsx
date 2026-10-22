import { Search, User, ShoppingBag } from "lucide-react";
import Logo from "./Logo";
import { categories } from "../lib/catalog";
import { useStore } from "../context/StoreContext";
import "./Header.css";
export default function Header({ page, onNavigate }) {
  const { bag, user, setModal } = useStore();
  return (
    <header>
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
      <nav aria-label="Main navigation">
        {[
          "Home",
          "Shop",
          "About",
          "Contact",
          ...(user ? ["Orders"] : []),
          ...(user?.role === "admin" ? ["Admin"] : []),
        ].map((name) => (
          <a
            href={"#" + name.toLowerCase()}
            key={name}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(name);
            }}
            className={
              page === name || (name === "Shop" && categories.includes(page))
                ? "active"
                : ""
            }
          >
            {name === "Admin" ? "Manage Store" : name}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <button
          aria-label="Search"
          onClick={() => setModal({ type: "search" })}
        >
          <Search />
        </button>
        <button
          aria-label="Account"
          title={
            user ? `Signed in as ${user.name}` : "Log in or create an account"
          }
          onClick={() => setModal({ type: "account" })}
        >
          <User />
          {user && <span className="account-indicator" />}
        </button>
        <button
          aria-label="Shopping bag"
          onClick={() => setModal({ type: "bag" })}
        >
          <ShoppingBag />
          <span className="count">{bag.reduce((s, c) => s + c.qty, 0)}</span>
        </button>
      </div>
    </header>
  );
}
