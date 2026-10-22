import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/libre-caslon-display/400.css";
import "./styles/global.css";
import App from "./App";
import { StoreProvider } from "./context/StoreContext";
createRoot(document.getElementById("app")).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
