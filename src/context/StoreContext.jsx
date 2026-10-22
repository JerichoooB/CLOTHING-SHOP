import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
const Context = createContext(null);
function readBag() {
  try {
    const value = JSON.parse(localStorage.getItem("clover-cart") || "[]");
    return Array.isArray(value)
      ? value.filter(
          (item) =>
            Number.isInteger(item.id) &&
            Number.isInteger(item.qty) &&
            item.qty > 0 &&
            typeof item.size === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]),
    [status, setStatus] = useState("loading"),
    [bag, setBag] = useState(readBag),
    [likes, setLikes] = useState([]),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(true);
  const timer = useRef();
  async function load() {
    setStatus("loading");
    try {
      const data = await api("/api/products");
      if (!Array.isArray(data)) throw Error();
      setProducts(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }
  useEffect(() => {
    load();
    let active = true;
    api("/api/auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("clover-cart", JSON.stringify(bag));
    } catch {}
  }, [bag]);
  function notify(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3000);
  }
  function add(product, size) {
    const stock =
      product.variants?.find((variant) => variant.size === size)?.stock ?? 0;
    const existing =
      bag.find((item) => item.id === product.id && item.size === size)?.qty ??
      0;
    if (existing >= Math.min(stock, 99)) {
      notify(
        stock === 0
          ? "This size is out of stock."
          : "You’ve reached the available quantity for this size.",
      );
      return;
    }
    setBag((old) => {
      const found = old.find(
        (item) => item.id === product.id && item.size === size,
      );
      return found
        ? old.map((item) =>
            item === found ? { ...item, qty: item.qty + 1 } : item,
          )
        : [...old, { id: product.id, size, qty: 1 }];
    });
    notify("Added to your bag");
  }
  function quantity(id, size, delta) {
    const current = bag.find((item) => item.id === id && item.size === size);
    const stock =
      products
        .find((product) => product.id === id)
        ?.variants?.find((variant) => variant.size === size)?.stock ?? 0;
    if (delta > 0 && current?.qty >= Math.min(stock, 99)) {
      notify("No more stock is available for this size.");
      return;
    }
    setBag((old) =>
      old
        .map((item) =>
          item.id === id && item.size === size
            ? { ...item, qty: item.qty + delta }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  }
  function completeCheckout(items) {
    setBag((old) =>
      old
        .map((item) => {
          const bought = items.find(
            (line) => line.productId === item.id && line.size === item.size,
          );
          return bought ? { ...item, qty: item.qty - bought.qty } : item;
        })
        .filter((item) => item.qty > 0),
    );
  }
  const remove = (id, size) =>
    setBag((old) =>
      old.filter((item) => !(item.id === id && item.size === size)),
    );
  const toggleLike = (id) =>
    setLikes((old) =>
      old.includes(id) ? old.filter((value) => value !== id) : [...old, id],
    );
  return (
    <Context.Provider
      value={{
        products,
        status,
        load,
        bag,
        likes,
        modal,
        setModal,
        toast,
        notify,
        add,
        completeCheckout,
        quantity,
        remove,
        toggleLike,
        user,
        setUser,
        authLoading,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  return useContext(Context);
}
