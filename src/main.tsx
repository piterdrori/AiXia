import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/dashboard/tokens.css";
import "./styles/dashboard/layout.css";
import "./styles/dashboard/visual.css";
import "./styles/projects/projects-visual.css";
import "./styles/aixia-design-system.css";
import "./styles/aixia-process-book.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
