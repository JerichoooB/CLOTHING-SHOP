import { useEffect, useState } from "react";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import Logo from "./Logo";
import { categories } from "../lib/catalog";
import { useStore } from "../context/StoreContext";
import "./Header.css";
export default function Header({ page, onNavigate }) {
  const { bag, user, setModal } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    setMenuOpen(false);
  }, [page]);
  function navigate(name) {
    setMenuOpen(false);
    onNavigate(name);
  }
  function openModal(type) {
    setMenuOpen(false);
    setModal({ type });
  }
  return (
    <>
      <div className="announcement">
        Thoughtful essentials. Everyday comfort.
        <span>Free shipping from ₱1,500</span>
      </div>
      <header className="site-header">
        <a
          className="brand"
          href="#home"
          aria-label="Clover home"
          onClick={(event) => {
            event.preventDefault();
            navigate("Home");
          }}
        >
          <Logo />
        </a>
        <nav
          id="main-navigation"
          className={menuOpen ? "menu-open" : ""}
          aria-label="Main navigation"
        >
          {[
            "Home",
            "Shop",
            "About",
            "Contact",
            ...(user ? ["Orders"] : []),
            ...(user?.role === "admin" ? ["Admin"] : []),
          ].map((name) => {
            const active =
              page === name || (name === "Shop" && categories.includes(page));
            return (
              <a
                href={"#" + name.toLowerCase()}
                key={name}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(name);
                }}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {name === "Admin" ? "Manage Store" : name}
              </a>
            );
          })}
        </nav>
        <div className="header-actions">
          <button
            aria-label="Search"
            title="Search the collection"
            onClick={() => openModal("search")}
          >
            <Search />
          </button>
          <button
            aria-label="Account"
            title={
              user ? `Signed in as ${user.name}` : "Log in or create an account"
            }
            onClick={() => openModal("account")}
          >
            <User />
            {user && <span className="account-indicator" />}
          </button>
          <button
            aria-label="Shopping bag"
            title="Open shopping bag"
            onClick={() => openModal("bag")}
          >
            <ShoppingBag />
            <span className="count">
              {bag.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          </button>
          <button
            className="mobile-menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
