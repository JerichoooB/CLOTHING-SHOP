import { X } from "lucide-react";
import { useRef, useEffect } from "react";
import "./Modal.css";
export default function Modal({ children, drawer, onClose }) {
  const ref = useRef();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    ref.current.querySelector("button")?.focus();
    function key(e) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = [
          ...ref.current.querySelectorAll(
            "button,a[href],input,select,textarea,[tabindex]",
          ),
        ].filter(
          (element) =>
            !element.disabled &&
            element.tabIndex >= 0 &&
            element.getClientRects().length > 0,
        );
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="shade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={`modal ${drawer ? "drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Clover details"
      >
        <button className="close" aria-label="Close" onClick={onClose}>
          <X />
        </button>
        {children}
      </section>
    </div>
  );
}
