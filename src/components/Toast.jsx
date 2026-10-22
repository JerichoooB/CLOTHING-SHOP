import { useStore } from "../context/StoreContext";
import "./Toast.css";
export default function Toast() {
  const { toast } = useStore();
  return (
    <div id="toast" className={toast ? "visible" : ""} role="status">
      {toast}
    </div>
  );
}
