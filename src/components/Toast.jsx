import { useState, useEffect } from "react";

export function showToast(message, type = "error") {
  window.dispatchEvent(new CustomEvent("inclusivaula:toast", { detail: { message, type } }));
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handler(e) {
      const { message, type } = e.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }
    window.addEventListener("inclusivaula:toast", handler);
    return () => window.removeEventListener("inclusivaula:toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" role="status" style={{
      position: "fixed", top: 16, right: 16, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8,
      maxWidth: "calc(100vw - 32px)"
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "warning" ? "#FFF3CD" : t.type === "success" ? "#D4EDDA" : "#f8d7da",
          border: `1px solid ${t.type === "warning" ? "#ffc107" : t.type === "success" ? "#4CAF82" : "#a32d2d"}`,
          borderRadius: 10, padding: "12px 16px",
          fontSize: 14, fontWeight: 500,
          color: t.type === "warning" ? "#856404" : t.type === "success" ? "#0F6E56" : "#721c24",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          animation: "slideIn 0.2s ease"
        }}>
          {t.type === "warning" ? "⚠️ " : t.type === "success" ? "✅ " : "🚫 "}{t.message}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  );
}
