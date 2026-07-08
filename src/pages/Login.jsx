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
          <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
            Entrar na InclusivAula
          </h1>
          <p style={{ fontSize: 13, color: "#5f5e5a" }}>
            Educação adaptada. Inclusão de verdade.
          </p>
        </div>

        {error && (
          <div role="alert" style={{
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

        <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="login-email" style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="professor@escola.com"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label htmlFor="login-password" style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
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
        </form>

        <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a", marginTop: 12 }}>
          <button type="button"
            style={{ color: "#2B9EC3", cursor: "pointer", background: "none", border: "none", fontSize: 13, padding: 0 }}
            onClick={() => navigate("/recuperar-senha")}
          >
            Esqueci minha senha
          </button>
        </p>

        <p style={{ fontSize: 13, textAlign: "center", color: "#5f5e5a", marginTop: 8 }}>
          Primeira vez aqui?{" "}
          <button type="button" style={{ color: "#2B9EC3", cursor: "pointer", background: "none", border: "none", fontSize: 13, padding: 0 }} onClick={() => navigate("/cadastro")}>
            Criar conta
          </button>
        </p>

        <p style={{ fontSize: 11, textAlign: "center", color: "#9b9a96", marginTop: 20, lineHeight: 1.6 }}>
          Ao entrar, você concorda com nossos{" "}
          <a href="/termos" style={{ color: "#5f5e5a" }}>Termos de Uso</a>
          {" "}e{" "}
          <a href="/privacidade" style={{ color: "#5f5e5a" }}>Política de Privacidade</a>.
        </p>

      </div>
    </div>
  );
}