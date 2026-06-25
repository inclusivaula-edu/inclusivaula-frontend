import { useState, useEffect } from "react";

const COOKIE_KEY = "inclusivaula_cookies_accepted";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_KEY);
    if (!accepted) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "#fff", borderTop: "0.5px solid #d3d1c7",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
      padding: "16px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap"
    }}>
      <p style={{ fontSize: 13, color: "#5f5e5a", margin: 0, lineHeight: 1.6, flex: 1, minWidth: 240 }}>
        🍪 Usamos cookies estritamente necessários para o funcionamento da plataforma (autenticação e sessão).
        Ao continuar, você concorda com nossa{" "}
        <a href="/privacidade" style={{ color: "#2B9EC3", fontWeight: 500 }}>Política de Privacidade</a>
        {" "}e{" "}
        <a href="/termos" style={{ color: "#2B9EC3", fontWeight: 500 }}>Termos de Uso</a>.
      </p>
      <button
        onClick={accept}
        style={{
          padding: "10px 24px", whiteSpace: "nowrap",
          background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
          color: "#fff", border: "none", borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0
        }}
      >
        Entendi e aceito
      </button>
    </div>
  );
}
