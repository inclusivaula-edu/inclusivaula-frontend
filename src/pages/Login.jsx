import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f0f9ff 0%, #f0fff8 100%)"
    }}>
      <div style={{
        background: "#fff",
        border: "0.5px solid #d3d1c7",
        borderRadius: 16,
        padding: "2.5rem",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 4px 24px rgba(43,158,195,0.08)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logo} alt="InclusivAula" style={{ height: 60, marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "#5f5e5a" }}>
            Educação adaptada. Inclusão de verdade.
          </p>
        </div>

        {error && (
          <div style={{
            background: "#fcebeb",
            border: "0.5px solid #a32d2d",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#791f1f",
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="professor@escola.com"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(135deg, #2B9EC3, #4CAF82)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a", marginTop: 16 }}>
          Primeira vez aqui?{" "}
          <span style={{ color: "#2B9EC3", cursor: "pointer" }} onClick={() => navigate("/cadastro")}>
            Criar conta
          </span>
        </p>

      </div>
    </div>
  );
}