import { useEffect, useState } from "react";
import { pages } from "../lib/catalog";
const readPage = () =>
  pages.find((page) => page.toLowerCase() === location.hash.slice(1)) || "Home";
export default function usePage() {
  const [page, setPage] = useState(readPage);
  useEffect(() => {
    const update = () => setPage(readPage());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  const navigate = (name) => {
    history.pushState(null, "", "#" + name.toLowerCase());
    setPage(name);
    window.scrollTo(0, 0);
  };
  return [page, navigate];
}
