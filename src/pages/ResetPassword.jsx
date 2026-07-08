import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import logo from "../assets/logo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase injeta o token na URL como hash — detectamos o evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      setError(err.message || "Erro ao redefinir senha.");
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

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#4CAF82", marginBottom: 10 }}>
              Senha redefinida!
            </h2>
            <p style={{ fontSize: 14, color: "#5f5e5a", lineHeight: 1.6 }}>
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#2B9EC3", marginBottom: 10 }}>
              Aguardando autenticação...
            </h2>
            <p style={{ fontSize: 13, color: "#5f5e5a", lineHeight: 1.6 }}>
              Se você chegou aqui por um link de e-mail, aguarde um instante.
              Se o link expirou, solicite um novo em{" "}
              <button type="button" onClick={() => navigate("/recuperar-senha")} style={{ color: "#2B9EC3", cursor: "pointer", background: "none", border: "none", fontSize: "inherit", padding: 0 }}>
                recuperar senha
              </button>.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2B9EC3", margin: "0 0 8px" }}>
              Criar nova senha
            </h2>
            <p style={{ fontSize: 13, color: "#5f5e5a", margin: "0 0 24px", lineHeight: 1.6 }}>
              Digite sua nova senha abaixo.
            </p>

            {error && (
              <div role="alert" style={{
                background: "#fcebeb", border: "0.5px solid #a32d2d", borderRadius: 8,
                padding: "10px 14px", fontSize: 13, color: "#791f1f", marginBottom: 20
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  Nova senha (mínimo 8 caracteres)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#5f5e5a", display: "block", marginBottom: 6 }}>
                  Confirmar nova senha
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
