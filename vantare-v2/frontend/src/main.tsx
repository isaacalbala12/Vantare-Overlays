import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { CompositeApp } from "./overlay/CompositeApp";
import { HubApp } from "./hub/HubApp";

// Simple hash-based router: /#/hub → HubApp, else → CompositeApp
function App() {
  const hash = window.location.hash.slice(1) || "/";
  if (hash.startsWith("/hub")) {
    return <HubApp />;
  }
  return <CompositeApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
