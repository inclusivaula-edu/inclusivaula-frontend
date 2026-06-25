import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://86eab43f2e9f3751ffdeb8f08b8019bc@o4511627861426176.ingest.us.sentry.io/4511627962482693",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
  ],
});

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErroGlobal />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

function ErroGlobal() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f5f9ff", flexDirection: "column", gap: 16
    }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h2 style={{ color: "#2B9EC3", margin: 0 }}>Ocorreu um erro inesperado</h2>
      <p style={{ color: "#5f5e5a", margin: 0 }}>
        Nossa equipe foi notificada automaticamente.
      </p>
      <button
        onClick={() => window.location.href = "/"}
        style={{
          padding: "10px 24px", background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
          color: "#fff", border: "none", borderRadius: 8, fontSize: 14,
          fontWeight: 500, cursor: "pointer", marginTop: 8
        }}
      >
        Voltar ao início
      </button>
    </div>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
