import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import logo from "../assets/logo.png";

export default function RecoverPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err.message || "Erro ao enviar e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)",
      padding: "1rem"
    }}>
      <div style={{
        background: "#fff", border: "0.5px solid #d3d1c7", borderRadius: 16,
        padding: "2.5rem", width: "100%", maxWidth: 400,
        boxShadow: "0 4px 24px rgba(43,158,195,0.08)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={logo} alt="InclusivAula" style={{ height: 52, marginBottom: 10 }} />
        </div>

        {!sent ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2B9EC3", margin: "0 0 8px" }}>
              Recuperar senha
            </h2>
            <p style={{ fontSize: 13, color: "#5f5e5a", margin: "0 0 24px", lineHeight: 1.6 }}>
              Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.
            </p>

            {error && (
              <div style={{
                background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8,
                padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 20
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="professor@escola.com.br"
                  autoComplete="email"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "12px",
                  background: loading ? "#ccc" : "linear-gradient(135deg, #2B9EC3, #4CAF82)",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 15, fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#4CAF82", marginBottom: 10 }}>
              E-mail enviado!
            </h2>
            <p style={{ fontSize: 14, color: "#5f5e5a", lineHeight: 1.6, marginBottom: 8 }}>
              Enviamos um link de recuperação para:
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#2c2c2a", marginBottom: 20 }}>
              {email}
            </p>
            <p style={{ fontSize: 13, color: "#5f5e5a", lineHeight: 1.6, marginBottom: 28 }}>
              Clique no link do e-mail para criar uma nova senha.
              Verifique também a pasta de spam ou lixo eletrônico.
            </p>
          </div>
        )}

        <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a", marginTop: 20 }}>
          <span
            onClick={() => navigate("/")}
            style={{ color: "#2B9EC3", cursor: "pointer", fontWeight: 500 }}
          >
            ← Voltar ao login
          </span>
        </p>
      </div>
    </div>
  );
}
