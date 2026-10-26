import { useEffect, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Modal from "./components/Modal";
import ProductDetail from "./components/ProductDetail";
import SearchDialog from "./components/SearchDialog";
import AccountDialog from "./components/AccountDialog";
import Bag from "./components/Bag";
import Toast from "./components/Toast";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Men from "./pages/Men";
import Women from "./pages/Women";
import Unisex from "./pages/Unisex";
import Accessories from "./pages/Accessories";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Saved from "./pages/Saved";
import usePage from "./hooks/usePage";
import { useStore } from "./context/StoreContext";
const pageComponents = {
  Checkout,
  Orders,
  Admin,
  Home,
  Shop,
  Men,
  Women,
  Unisex,
  Accessories,
  About,
  Contact,
  Saved,
};
export default function App() {
  const [page, navigate] = usePage(),
    [query, setQuery] = useState("");
  const { modal, setModal, add } = useStore();
  useEffect(() => {
    document.title = `${page} — CLOVER`;
  }, [page]);
  function go(name, search = "") {
    setQuery(search);
    setModal(null);
    navigate(name);
  }
  const Page = pageComponents[page];
  return (
    <div className={`site page-${page.toLowerCase()}`}>
      <Header page={page} onNavigate={go} />
      <main>
        <Page
          key={page + query}
          onNavigate={go}
          query={query}
          onClearSearch={() => setQuery("")}
        />
      </main>
      <Footer onNavigate={go} />
      {modal && (
        <Modal
          label={
            modal.type === "bag"
              ? "Shopping bag"
              : modal.type === "account"
                ? "Clover account"
                : modal.type === "search"
                  ? "Search the collection"
                  : modal.type === "product"
                    ? modal.product.name
                    : modal.title || "Clover details"
          }
          drawer={modal.type === "bag"}
          onClose={() => setModal(null)}
        >
          {modal.type === "product" ? (
            <ProductDetail
              product={modal.product}
              onAdd={(size) => add(modal.product, size)}
            />
          ) : modal.type === "search" ? (
            <SearchDialog onSearch={(search) => go("Shop", search)} />
          ) : modal.type === "account" ? (
            <AccountDialog onNavigate={go} />
          ) : modal.type === "bag" ? (
            <Bag onNavigate={go} />
          ) : (
            <>
              <h2>{modal.title}</h2>
              <p>{modal.text}</p>
            </>
          )}
        </Modal>
      )}
      <Toast />
    </div>
  );
}
