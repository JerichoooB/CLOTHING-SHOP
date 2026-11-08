import { useEffect, useRef, useState } from "react";

// Only confirm additions accepted by the stock-aware cart action.
export default function useAddedFeedback(onAdd) {
  const [added, setAdded] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  function add(...args) {
    if (onAdd(...args) !== true) return;
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1400);
  }
  return [added, add];
}
