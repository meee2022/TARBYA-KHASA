import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./index.css";

// Offline in class: the service worker keeps the last copy of the site. Production only, so development always shows fresh code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined); });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
