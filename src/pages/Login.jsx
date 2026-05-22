import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
      background: "#f5f5f3"
    }}>
      <div style={{
        background: "#fff",
        border: "0.5px solid #d3d1c7",
        borderRadius: 12,
        padding: "2.5rem",
        width: "100%",
        maxWidth: 400
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
          InclusivAula
        </h1>
        <p style={{ fontSize: 14, color: "#5f5e5a", marginBottom: 32 }}>
          Plataforma de aulas adaptadas com IA
        </p>

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
          style={{ width: "100%" }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}