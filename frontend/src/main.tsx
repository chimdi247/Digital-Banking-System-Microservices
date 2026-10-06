// Must be first: starts browser-side OpenTelemetry tracing (and W3C
// trace-context propagation to the API gateway) before any app code or
// API call runs. Side-effect-only import -- see src/otel.js.
import "./otel";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
